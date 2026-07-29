// ---------------------------------------------------------------------------
// AI Playtest Feedback Triage — a small interactive demo of applying AI to a
// real production workflow (sorting raw playtest feedback into bugs / UX
// issues / positive notes / suggestions).
//
// This is intentionally a *thin client* — all it does is POST the pasted
// text to a small serverless function (see /cloudflare-worker/ in this repo
// for the deployable backend + README) and render whatever JSON comes back.
// The endpoint below is left blank on purpose: until you deploy your own
// backend and paste its URL in, the page shows a friendly "not configured
// yet" message instead of silently failing or pretending to work.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  // Deployed Cloudflare Worker backend (see /cloudflare-worker/README.md).
  var AI_TOOL_ENDPOINT = "https://playtest-feedback-worker.younggou.workers.dev";

  var DAILY_LIMIT = 8;
  var MAX_CHARS = 4000;
  var RATE_KEY = "ai-tool-usage";

  var bound = false;
  var dict = null;
  var lang = "en";

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function getUsage() {
    try {
      var raw = JSON.parse(localStorage.getItem(RATE_KEY) || "null");
      if (raw && raw.date === todayKey()) return raw.count;
    } catch (e) {
      /* localStorage unavailable — treat as unused */
    }
    return 0;
  }

  function incUsage() {
    try {
      localStorage.setItem(RATE_KEY, JSON.stringify({ date: todayKey(), count: getUsage() + 1 }));
    } catch (e) {}
  }

  function fmt(str, vars) {
    return String(str || "").replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] !== undefined ? vars[k] : "";
    });
  }

  function setStatus(msg, isError) {
    var el = document.getElementById("aiToolStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("is-error", !!isError);
  }

  // The backend no longer forces feedback into a fixed bugs/UX/positive/
  // suggestions split — it returns however many thematic categories (with
  // AI-chosen labels) genuinely fit the input. Since the count and labels
  // are unknown ahead of time, cards are built on the fly and colored by
  // cycling through this palette instead of relying on fixed CSS classes
  // keyed to fixed category names.
  var CATEGORY_COLORS = ["#d9534f", "#e0a233", "#4a9d5f", "#4a7fd9", "#9d6bd9", "#d94a9c"];

  function renderCategoryCards(categories) {
    var grid = document.getElementById("aiToolCategoryGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if (!categories || !categories.length) {
      var empty = document.createElement("p");
      empty.className = "ai-tool-empty";
      empty.textContent = dict.emptyCategoryNote;
      grid.appendChild(empty);
      return;
    }
    categories.forEach(function (cat, i) {
      var card = document.createElement("div");
      card.className = "ai-tool-card";
      card.style.borderLeftColor = CATEGORY_COLORS[i % CATEGORY_COLORS.length];

      var h3 = document.createElement("h3");
      h3.textContent = cat.label || "";
      card.appendChild(h3);

      var ul = document.createElement("ul");
      (cat.items || []).forEach(function (item) {
        var row = document.createElement("li");
        row.textContent = item;
        ul.appendChild(row);
      });
      card.appendChild(ul);

      grid.appendChild(card);
    });
  }

  // The worker originally answered with four fixed buckets
  // ({bugs, uxIssues, positive, suggestions}); it was later changed to return
  // an open-ended {categories:[{label, items}]}. A deployment running the old
  // version therefore hands back data this page finds no `categories` in, and
  // the result is an empty "nothing to categorise" panel that looks exactly
  // like the classifier failing. Rather than depend on which revision happens
  // to be live, accept both shapes and translate the old one.
  var LEGACY_BUCKETS = [
    { key: "bugs", en: "Bugs", zh: "Bug" },
    { key: "uxIssues", en: "UX Issues", zh: "体验问题" },
    { key: "positive", en: "Positive Feedback", zh: "正面反馈" },
    { key: "suggestions", en: "Suggestions", zh: "改进建议" },
  ];

  function toCategories(data) {
    if (data && Array.isArray(data.categories)) return data.categories;
    var out = [];
    LEGACY_BUCKETS.forEach(function (b) {
      var items = data && data[b.key];
      if (Array.isArray(items) && items.length) {
        out.push({ label: lang === "zh" ? b.zh : b.en, items: items });
      }
    });
    return out;
  }

  function showResults(data) {
    var results = document.getElementById("aiToolResults");
    if (!results) return;
    results.style.display = "";
    var summaryEl = document.getElementById("aiToolSummary");
    if (summaryEl) summaryEl.textContent = data.summary || "";
    renderCategoryCards(toCategories(data));
  }

  function updateRateLimitNote() {
    if (!dict) return;
    var used = getUsage();
    var remaining = Math.max(0, DAILY_LIMIT - used);
    if (remaining <= 0) {
      setStatus(fmt(dict.rateLimitReached, { limit: DAILY_LIMIT }), true);
    } else {
      setStatus(fmt(dict.rateLimitNote, { limit: DAILY_LIMIT, remaining: remaining }), false);
    }
  }

  function handleSubmit() {
    var input = document.getElementById("aiToolInput");
    var submitBtn = document.getElementById("aiToolSubmitBtn");
    if (!input || !submitBtn || !dict) return;
    var text = input.value.trim();

    if (!text) {
      setStatus(dict.errorEmpty, true);
      return;
    }
    if (text.length > MAX_CHARS) {
      setStatus(dict.errorTooLong, true);
      return;
    }
    if (getUsage() >= DAILY_LIMIT) {
      setStatus(fmt(dict.rateLimitReached, { limit: DAILY_LIMIT }), true);
      return;
    }
    if (!AI_TOOL_ENDPOINT) {
      setStatus(dict.errorNotConfigured, true);
      return;
    }

    submitBtn.disabled = true;
    var originalLabel = submitBtn.textContent;
    submitBtn.textContent = dict.loadingLabel;
    setStatus(dict.loadingLabel, false);

    fetch(AI_TOOL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: text, lang: lang }),
    })
      .then(function (res) {
        // Read the body even on a non-2xx: the worker puts its actual
        // complaint in there, and throwing on status alone discards the one
        // piece of information worth having.
        return res.text().then(function (body) {
          var data = null;
          try { data = JSON.parse(body); } catch (e) { /* not JSON */ }
          if (!res.ok) {
            throw new Error("HTTP " + res.status + ((data && data.error) ? " — " + data.error : (body ? " — " + body.slice(0, 160) : "")));
          }
          if (!data) throw new Error("Malformed response: " + body.slice(0, 160));
          if (data.error) throw new Error(data.error);
          return data;
        });
      })
      .then(function (data) {
        incUsage();
        showResults(data);
        updateRateLimitNote();
      })
      .catch(function (err) {
        // Surfacing the real reason turns "it just stopped working" into
        // something diagnosable without server logs. Previously every
        // failure — network, CORS, 500, bad JSON — produced one identical
        // sentence.
        var detail = err && err.message ? err.message : "";
        setStatus(dict.errorRequestFailed + (detail ? "\n(" + detail + ")" : ""), true);
        if (window.console) console.error("[playtest tool]", err);
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      });
  }

  function bindOnce() {
    if (bound) return;
    bound = true;
    var submitBtn = document.getElementById("aiToolSubmitBtn");
    var sampleBtn = document.getElementById("aiToolSampleBtn");
    if (submitBtn) submitBtn.addEventListener("click", handleSubmit);
    if (sampleBtn) {
      sampleBtn.addEventListener("click", function () {
        var input = document.getElementById("aiToolInput");
        if (input && dict) input.value = dict.sampleText;
      });
    }
  }

  // Called by pages.js's "ai-tool" renderer every time the page loads or the
  // language toggle switches, so this stays in sync with the current dict
  // without needing its own language-storage logic.
  window.SITE_AI_TOOL = {
    setLang: function (newLang, newDict) {
      lang = newLang;
      dict = newDict;
      bindOnce();
      updateRateLimitNote();
    },
  };
})();
