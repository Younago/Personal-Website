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

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  // Findings are classified on two axes (see the worker for the reasoning):
  // a closed `type` axis saying what kind of work an item is, and a
  // `severity` axis which — together with the mention count — says what to
  // do about it first. Cards group by type because that is how work gets
  // routed; ordering within and above them is driven by severity, because
  // that is how work gets prioritised.
  var TYPE_ORDER = ["bug", "performance", "usability", "balance", "content", "request", "other", "positive"];
  var TYPE_COLORS = {
    bug: "#d9534f",
    performance: "#d97a2b",
    usability: "#e0a233",
    balance: "#4a7fd9",
    content: "#9d6bd9",
    request: "#4a9d5f",
    other: "#8a8f98",
    positive: "#3f9d6b",
  };
  // "unrated" is what a response from an older worker revision gets: those
  // shapes carry no severity at all, and labelling every item "minor" would
  // be inventing data. It sorts last and renders as a dash.
  var SEVERITY_ORDER = { critical: 0, major: 1, minor: 2, unrated: 3 };

  function label(group, key, fallback) {
    var table = dict && dict[group];
    return (table && table[key]) || fallback || key;
  }

  function byPriority(a, b) {
    var d = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return d !== 0 ? d : b.mentions - a.mentions;
  }

  function findingRow(f) {
    var li = document.createElement("li");

    var sev = document.createElement("span");
    sev.className = "ai-sev ai-sev-" + f.severity;
    sev.textContent = label("severityLabels", f.severity, f.severity);
    li.appendChild(sev);

    var note = document.createElement("span");
    note.className = "ai-note";
    note.textContent = f.note;
    li.appendChild(note);

    if (f.mentions > 1) {
      var m = document.createElement("span");
      m.className = "ai-mentions";
      m.textContent = fmt(dict.mentionsLabel || "x{n}", { n: f.mentions });
      li.appendChild(m);
    }
    // The player's proposed fix is shown but visibly separated from what
    // they observed: the observation is evidence, the fix is a suggestion,
    // and players are far more reliable at the former than the latter.
    if (f.playerFix) {
      var fix = document.createElement("span");
      fix.className = "ai-playerfix";
      fix.textContent = (dict.playerFixLabel || "Player's fix") + ": " + f.playerFix;
      li.appendChild(fix);
    }
    return li;
  }

  function renderPriority(findings) {
    var wrap = document.getElementById("aiToolPriority");
    if (!wrap) return;
    wrap.innerHTML = "";
    // Positives are excluded: this list answers "what do I fix first", and
    // praise is not work.
    var ranked = findings
      .filter(function (f) { return f.type !== "positive"; })
      .sort(byPriority)
      .slice(0, 3);
    if (!ranked.length) return;

    var h = document.createElement("h3");
    h.textContent = dict.priorityHeading || "Fix first";
    wrap.appendChild(h);
    var ul = document.createElement("ul");
    ranked.forEach(function (f) {
      var li = findingRow(f);
      var tag = document.createElement("span");
      tag.className = "ai-type-tag";
      tag.textContent = label("typeLabels", f.type, f.type);
      tag.style.color = TYPE_COLORS[f.type];
      li.insertBefore(tag, li.childNodes[1]);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
  }

  function renderTypeCards(findings) {
    var grid = document.getElementById("aiToolCategoryGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if (!findings.length) {
      var empty = document.createElement("p");
      empty.className = "ai-tool-empty";
      empty.textContent = dict.emptyCategoryNote;
      grid.appendChild(empty);
      return;
    }
    TYPE_ORDER.forEach(function (type) {
      var group = findings.filter(function (f) { return f.type === type; });
      if (!group.length) return; // a type with nothing in it is omitted, not shown empty
      group.sort(byPriority);

      var card = document.createElement("div");
      card.className = "ai-tool-card";
      card.style.borderLeftColor = TYPE_COLORS[type];

      var h3 = document.createElement("h3");
      h3.textContent = label("typeLabels", type, type);
      var count = document.createElement("span");
      count.className = "ai-count";
      count.textContent = group.length;
      h3.appendChild(count);
      card.appendChild(h3);

      var ul = document.createElement("ul");
      group.forEach(function (f) { ul.appendChild(findingRow(f)); });
      card.appendChild(ul);
      grid.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------
  // Response normalisation
  // ---------------------------------------------------------------------
  // Three shapes have existed for this endpoint: the current two-axis
  // {findings:[{type, severity, ...}]}, an intermediate {categories:[{label,
  // items}]} with model-invented labels, and the original four fixed
  // buckets. A deployment still running an older revision would otherwise
  // render as an empty "nothing to categorise" panel — indistinguishable
  // from the classifier failing — so older shapes are lifted into the
  // current one instead, minus the severity they never carried.
  var LEGACY_BUCKETS = [
    { key: "bugs", type: "bug" },
    { key: "uxIssues", type: "usability" },
    { key: "positive", type: "positive" },
    { key: "suggestions", type: "request" },
  ];

  function guessType(text) {
    var v = String(text || "").toLowerCase();
    if (/bug|crash|broken|错误|崩溃/.test(v)) return "bug";
    if (/perf|fps|lag|load|性能|帧/.test(v)) return "performance";
    if (/balanc|difficult|平衡|难度/.test(v)) return "balance";
    if (/request|feature|suggest|建议|需求/.test(v)) return "request";
    if (/positive|praise|好评|正面|喜欢/.test(v)) return "positive";
    if (/art|audio|music|story|level|美术|音|剧情|关卡/.test(v)) return "content";
    if (/ux|usab|confus|control|体验|操作|困惑/.test(v)) return "usability";
    return "other";
  }

  function toFindings(data) {
    if (data && Array.isArray(data.findings)) return data.findings;
    var out = [];
    if (data && Array.isArray(data.categories)) {
      data.categories.forEach(function (c) {
        var type = guessType(c && c.label);
        (c && c.items ? c.items : []).forEach(function (item) {
          out.push({ type: type, severity: "unrated", note: String(item), playerFix: "", mentions: 1 });
        });
      });
      return out;
    }
    LEGACY_BUCKETS.forEach(function (b) {
      var items = data && data[b.key];
      if (!Array.isArray(items)) return;
      items.forEach(function (item) {
        out.push({ type: b.type, severity: "unrated", note: String(item), playerFix: "", mentions: 1 });
      });
    });
    return out;
  }

  function showResults(data) {
    var results = document.getElementById("aiToolResults");
    if (!results) return;
    results.style.display = "";
    var summaryEl = document.getElementById("aiToolSummary");
    if (summaryEl) summaryEl.textContent = data.summary || "";
    var findings = toFindings(data);
    renderPriority(findings);
    renderTypeCards(findings);
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
