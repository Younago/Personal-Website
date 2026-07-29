/**
 * Backend for the "AI Playtest Feedback Triage" demo on gogo.fyi.
 *
 * Deploy this as a Cloudflare Worker with a Workers AI binding. It accepts a
 * POST body of { feedback: string, lang: "en" | "zh" } and returns
 *
 *   { summary, findings: [{ type, severity, note, playerFix, mentions }] }
 *
 * ---------------------------------------------------------------------------
 * Why a fixed taxonomy plus a severity axis
 * ---------------------------------------------------------------------------
 * The previous revision let the model invent its own category labels per
 * request. That reads well on a single batch and falls apart across batches:
 * the same issue lands under "Controls" one session and "Feel" the next, so
 * nothing can be counted, compared, or tracked over time — and there is no
 * defensible answer to "what are you classifying by?".
 *
 * So the type axis is now closed, and modelled on how playability heuristics
 * actually split game problems (Desurvire et al.'s HEP/PLAY work separates
 * game play, mechanics and usability rather than lumping all "UX" together):
 *
 *   bug · usability · balance · content · performance · request · positive
 *
 * A type alone can't be prioritised, though — "a bug" says nothing about
 * whether it ships. Hence the second axis, severity, which is the standard QA
 * triage dimension (blocker/major/minor crossed with how often it shows up).
 * Type says what kind of work it is; severity and mention count say what to
 * do first. The frontend sorts on the second axis, not the first.
 *
 * One more split worth keeping: `note` records what the player *observed*,
 * `playerFix` records the solution they proposed, if any. Players are
 * reliable at reporting that something feels wrong and unreliable at
 * prescribing the fix, so the two are stored separately rather than merged
 * into one "feedback" string.
 *
 * See README.md in this folder for step-by-step deployment instructions.
 */

// Change this to your site's real origin before deploying. Using "*" is
// fine while you're testing locally, but restricting it to your own domain
// stops other sites from calling your Worker (and burning your free quota)
// once the URL is public.
const ALLOWED_ORIGIN = "https://gogo.fyi";

const MAX_FEEDBACK_CHARS = 4000;
const MAX_FINDINGS = 24;

// The closed type axis. "other" exists so an item the model can't place is
// filed visibly rather than silently mis-filed into a real category.
const TYPES = ["bug", "usability", "balance", "content", "performance", "request", "positive", "other"];
const SEVERITIES = ["critical", "major", "minor"];

const SYSTEM_PROMPT = {
  en:
    "You are an assistant for a game producer triaging playtest feedback. " +
    "Split the feedback into individual findings. Classify each finding on " +
    "TWO axes.\n" +
    "Axis 1 — type, exactly one of: bug (something is broken or behaves " +
    "wrongly), usability (confusing, hard to control, unclear feedback to " +
    "the player), balance (too hard, too easy, an option dominates), " +
    "content (art, audio, story, level content), performance (frame rate, " +
    "load times, crashes from resources), request (the player asks for a " +
    "feature that does not exist), positive (something the player liked).\n" +
    "Axis 2 — severity, exactly one of: critical (blocks play or ruins the " +
    "session), major (clearly hurts the experience but playable), minor " +
    "(small friction or polish). Use \"minor\" for positive findings.\n" +
    "For each finding also give: note = what the PLAYER OBSERVED, in their " +
    "terms, under ~15 words; playerFix = the solution the player proposed, " +
    "or \"\" if they proposed none (never invent one); mentions = how many " +
    "separate times this came up in the text (integer, at least 1).\n" +
    "Output STRICT JSON only, in the shape " +
    '{"summary": "one-line overall summary", "findings": [{"type": "bug", ' +
    '"severity": "major", "note": "...", "playerFix": "...", "mentions": 1}]}. ' +
    "Output nothing but the JSON — no markdown, no commentary.",
  zh:
    "你是一名游戏制作人的助手，负责整理 playtest 玩家反馈。把反馈拆成一条条独立" +
    "的条目，每条从**两个维度**分类。\n" +
    "维度一——类型，只能是以下之一：bug（功能损坏或行为错误）、usability" +
    "（困惑、操作困难、反馈不清晰）、balance（过难、过易、某个选择过强）、" +
    "content（美术、音频、剧情、关卡内容）、performance（帧率、加载、资源导致的" +
    "崩溃）、request（玩家希望增加目前没有的功能）、positive（玩家喜欢的地方）。\n" +
    "维度二——严重度，只能是以下之一：critical（阻断游玩或毁掉整局体验）、" +
    "major（明显损害体验但仍可玩）、minor（轻微摩擦或打磨问题）。positive 类型" +
    "一律用 minor。\n" +
    "每条还要给出：note = **玩家观察到的现象**，用玩家的说法，不超过约 20 个字；" +
    "playerFix = 玩家自己提出的解决方案，如果没有提就填 \"\"（绝对不要替他编造）；" +
    "mentions = 这一点在文本中被单独提到的次数（整数，至少为 1）。\n" +
    "只输出严格的 JSON，格式为 " +
    '{"summary": "一句话总体总结", "findings": [{"type": "bug", "severity": ' +
    '"major", "note": "...", "playerFix": "...", "mentions": 1}]}。' +
    "不要输出 JSON 以外的任何文字，不要用 markdown。",
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders()),
  });
}

// Small models drift on enum values — "Bug", "bugs", "UX" and "ux_issue" all
// turn up. Normalise here rather than letting an unrecognised string reach
// the frontend, where it would render as an empty group.
function normaliseType(value) {
  const v = String(value || "").toLowerCase().trim();
  if (TYPES.indexOf(v) !== -1) return v;
  if (/bug|crash|broken|defect/.test(v)) return "bug";
  if (/usab|ux|confus|control|onboard|tutorial|ui/.test(v)) return "usability";
  if (/balanc|difficult|hard|easy|tuning/.test(v)) return "balance";
  if (/perf|fps|frame|load|lag|stutter/.test(v)) return "performance";
  if (/request|feature|wish|want/.test(v)) return "request";
  if (/positive|praise|like|good/.test(v)) return "positive";
  if (/content|art|audio|sound|music|story|level|visual/.test(v)) return "content";
  return "other";
}

function normaliseSeverity(value, type) {
  const v = String(value || "").toLowerCase().trim();
  if (type === "positive") return "minor";
  if (SEVERITIES.indexOf(v) !== -1) return v;
  if (/block|crit|severe|high/.test(v)) return "critical";
  if (/major|medium|moderate/.test(v)) return "major";
  return "minor";
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const feedback = (body.feedback || "").toString().slice(0, MAX_FEEDBACK_CHARS).trim();
    const lang = body.lang === "zh" ? "zh" : "en";

    if (!feedback) {
      return jsonResponse({ error: "Empty feedback" }, 400);
    }

    try {
      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages: [
          { role: "system", content: SYSTEM_PROMPT[lang] },
          { role: "user", content: feedback },
        ],
      });

      // Different Workers AI models (and even different variants of the
      // "same" model) don't all shape their output identically — most put
      // generated text in a string `response` field, but some return an
      // object, or put the text somewhere else entirely. Coerce to a string
      // up front so the rest of this function never has to guess.
      const responseField = aiResponse && aiResponse.response;
      const raw =
        typeof responseField === "string"
          ? responseField
          : JSON.stringify(responseField !== undefined ? responseField : aiResponse || {});

      let parsed;
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch (parseErr) {
        // Model didn't return clean JSON — fall back to a minimal shape
        // rather than surfacing a raw-text blob as if it were structured.
        parsed = { summary: raw.slice(0, 300), findings: [] };
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        parsed = { summary: raw.slice(0, 300), findings: [] };
      }

      const summary = typeof parsed.summary === "string" ? parsed.summary : "";
      const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : [];
      const findings = rawFindings
        .filter(function (f) {
          return f && typeof f === "object" && typeof f.note === "string" && f.note.trim();
        })
        .slice(0, MAX_FINDINGS)
        .map(function (f) {
          const type = normaliseType(f.type);
          const mentions = Math.max(1, Math.min(99, parseInt(f.mentions, 10) || 1));
          return {
            type: type,
            severity: normaliseSeverity(f.severity, type),
            note: f.note.trim().slice(0, 300),
            playerFix: typeof f.playerFix === "string" ? f.playerFix.trim().slice(0, 300) : "",
            mentions: mentions,
          };
        });

      return jsonResponse({ summary: summary, findings: findings });
    } catch (err) {
      // Log the real error server-side so `wrangler tail` shows the actual
      // cause (auth/quota/model-name issue, etc.) instead of just a generic
      // 500 with no detail in the browser console.
      console.error("AI request failed:", err && err.message ? err.message : err);
      return jsonResponse({ error: "AI request failed", detail: err && err.message ? err.message : String(err) }, 500);
    }
  },
};
