/**
 * Backend for the "AI Playtest Feedback Triage" demo on gogo.fyi.
 *
 * Deploy this as a Cloudflare Worker with a Workers AI binding. It accepts a
 * POST body of { feedback: string, lang: "en" | "zh" }, asks a small LLM to
 * sort the feedback into bugs / uxIssues / positive / suggestions, and
 * returns that as JSON.
 *
 * See README.md in this folder for step-by-step deployment instructions.
 */

// Change this to your site's real origin before deploying. Using "*" is
// fine while you're testing locally, but restricting it to your own domain
// stops other sites from calling your Worker (and burning your free quota)
// once the URL is public.
const ALLOWED_ORIGIN = "https://gogo.fyi";

const MAX_FEEDBACK_CHARS = 4000;

const SYSTEM_PROMPT = {
  en:
    "You are an assistant for a game producer triaging playtest feedback. " +
    "Categorize the input into four buckets: bugs (technical/bugs), " +
    "uxIssues (usability/experience issues), positive (positive feedback), " +
    "suggestions (improvement ideas). Output STRICT JSON only, in the shape " +
    '{"summary": "one-line summary", "bugs": [...], "uxIssues": [...], ' +
    '"positive": [...], "suggestions": [...]}. Each array holds short ' +
    "string entries; use an empty array for categories with nothing to " +
    "report. Output nothing but the JSON — no markdown, no commentary.",
  zh:
    "你是一名游戏制作人的助手，负责整理 playtest 玩家反馈。将输入的反馈归类到" +
    "四个类别：bugs（bug/技术问题）、uxIssues（体验/易用性问题）、positive" +
    "（正向反馈）、suggestions（改进建议）。只输出严格的 JSON，格式为 " +
    '{"summary": "一句话总结", "bugs": [...], "uxIssues": [...], ' +
    '"positive": [...], "suggestions": [...]}，每个数组里是简短的字符串条目，' +
    "没有内容的类别给空数组。不要输出 JSON 以外的任何文字，不要用 markdown。",
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

      const raw = (aiResponse && aiResponse.response) || "";
      let parsed;
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch (parseErr) {
        // Model didn't return clean JSON — fall back to a minimal shape
        // rather than surfacing a raw-text blob as if it were structured.
        parsed = { summary: raw.slice(0, 300), bugs: [], uxIssues: [], positive: [], suggestions: [] };
      }

      return jsonResponse(parsed);
    } catch (err) {
      // Log the real error server-side so `wrangler tail` shows the actual
      // cause (auth/quota/model-name issue, etc.) instead of just a generic
      // 500 with no detail in the browser console.
      console.error("AI request failed:", err && err.message ? err.message : err);
      return jsonResponse({ error: "AI request failed", detail: err && err.message ? err.message : String(err) }, 500);
    }
  },
};
