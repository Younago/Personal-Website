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

  function renderList(id, items, emptyNote) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    if (!items || !items.length) {
      var li = document.createElement("li");
      li.className = "ai-tool-empty";
      li.textContent = emptyNote;
      el.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      var row = document.createElement("li");
      row.textContent = item;
      el.appendChild(row);
    });
  }

  function showResults(data) {
    var results = document.getElementById("aiToolResults");
    if (!results) return;
    results.style.display = "";
    var summaryEl = document.getElementById("aiToolSummary");
    if (summaryEl) summaryEl.textContent = data.summary || "";
    renderList("aiToolBugs", data.bugs, dict.emptyCategoryNote);
    renderList("aiToolUx", data.uxIssues, dict.emptyCategoryNote);
    renderList("aiToolPositive", data.positive, dict.emptyCategoryNote);
    renderList("aiToolSuggestions", data.suggestions, dict.emptyCategoryNote);
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
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.error) throw new Error(data.error);
        incUsage();
        showResults(data);
        updateRateLimitNote();
      })
      .catch(function () {
        setStatus(dict.errorRequestFailed, true);
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
