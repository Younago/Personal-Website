/**
 * Backend for the "AI Playtest Feedback Triage" demo on gogo.fyi.
 *
 * Deploy this as a Cloudflare Worker with a Workers AI binding. It accepts a
 * POST body of { feedback: string, lang: "en" | "zh" }, asks a small LLM to
 * organize it into a summary plus however many thematic categories genuinely
 * fit the content (the model picks its own category labels, 2-6 of them,
 * rather than being forced into a fixed bugs/UX/positive/suggestions split),
 * and returns { summary, categories: [{ label, items }] } as JSON.
 *
 * See README.md in this folder for step-by-step deployment instructions.
 */

// Change this to your site's real origin before deploying. Using "*" is
// fine while you're testing locally, but restricting it to your own domain
// stops other sites from calling your Worker (and burning your free quota)
// once the URL is public.
const ALLOWED_ORIGIN = "https://gogo.fyi";

const MAX_FEEDBACK_CHARS = 4000;
const MAX_CATEGORIES = 8;
const MAX_ITEMS_PER_CATEGORY = 12;

// The model chooses its own category labels per request (rather than being
// forced into a fixed bugs/UX/positive/suggestions split) — a "balance
// issues" or "audio" cluster can show up as its own card when the feedback
// actually warrants it, instead of getting mashed into "suggestions".
const SYSTEM_PROMPT = {
  en:
    "You are an assistant for a game producer triaging playtest feedback. " +
    "Read the feedback and organize it into short thematic categories that " +
    "genuinely fit what's in THIS feedback — do not force it into a fixed " +
    "set of buckets. Typical categories include things like Bugs, UX Issues, " +
    "Positive Feedback, Suggestions, Balance, Audio, Performance, Onboarding " +
    "— but invent whatever labels best fit the actual content, and skip " +
    "categories that have nothing to report. Use 2 to 6 categories total. " +
    "Output STRICT JSON only, in the shape " +
    '{"summary": "one-line overall summary", "categories": [{"label": ' +
    '"short category name", "items": ["short point", "short point"]}]}. ' +
    "Each item should be a short, specific point (under ~15 words). " +
    "Output nothing but the JSON — no markdown, no commentary.",
  zh:
    "你是一名游戏制作人的助手，负责整理 playtest 玩家反馈。阅读这段反馈，" +
    "把它整理成几个真正贴合这段内容的简短主题分类——不要强行套用固定的几个类别。" +
    "常见的分类可能包括 Bug、体验问题、正向反馈、改进建议、数值平衡、音效、" +
    "性能、新手引导等，但请根据实际内容自己想出最合适的分类名称，没有内容的" +
    "类别就不要列出来。总共用 2 到 6 个分类。只输出严格的 JSON，格式为 " +
    '{"summary": "一句话总体总结", "categories": [{"label": "简短分类名", ' +
    '"items": ["简短要点", "简短要点"]}]}。每条 item 要简短具体（不超过约' +
    "20个字）。不要输出 JSON 以外的任何文字，不要用 markdown。",
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
        parsed = { summary: raw.slice(0, 300), categories: [] };
      }

      // Guard against a "valid JSON but wrong shape" response too (e.g. the
      // model returns a JSON array, or an object missing the fields we
      // expect) — normalize so the frontend always gets fields it can render,
      // however many (or few) categories the model decided to use.
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        parsed = { summary: raw.slice(0, 300), categories: [] };
      }
      const summary = typeof parsed.summary === "string" ? parsed.summary : "";
      const rawCategories = Array.isArray(parsed.categories) ? parsed.categories : [];
      const categories = rawCategories
        .filter(function (c) { return c && typeof c === "object" && typeof c.label === "string" && c.label.trim(); })
        .slice(0, MAX_CATEGORIES)
        .map(function (c) {
          const items = Array.isArray(c.items) ? c.items : [];
          return {
            label: c.label.trim().slice(0, 60),
            items: items
              .filter(function (i) { return typeof i === "string" && i.trim(); })
              .slice(0, MAX_ITEMS_PER_CATEGORY)
              .map(function (i) { return i.trim().slice(0, 300); }),
          };
        })
        .filter(function (c) { return c.items.length > 0; });

      return jsonResponse({ summary: summary, categories: categories });
    } catch (err) {
      // Log the real error server-side so `wrangler tail` shows the actual
      // cause (auth/quota/model-name issue, etc.) instead of just a generic
      // 500 with no detail in the browser console.
      console.error("AI request failed:", err && err.message ? err.message : err);
      return jsonResponse({ error: "AI request failed", detail: err && err.message ? err.message : String(err) }, 500);
    }
  },
};
