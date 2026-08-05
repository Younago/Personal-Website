// ---------------------------------------------------------------------------
// The Games page: the play-history log, organised by tag.
//
// Everything on the page is derived from window.SITE_GAMES and
// window.SITE_GAME_TAGS (js/games-data.js). The tag cloud at the top is built
// from the tag counts, so a cloud entry can never disagree with the section
// under it, and the sections are the tags — a title with four tags appears in
// four sections on purpose.
//
// Order inside a section is the hand-set `rank` (how well-known and how
// relevant the title is), never playtime.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var content = window.SITE_CONTENT;
  var GAMES = window.SITE_GAMES || { console: [], mobile: [] };
  var TAGS = window.SITE_GAME_TAGS || [];
  var root = document.body.getAttribute("data-root") || "";

  var currentLang = (function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) {}
    return "en";
  })();

  // Kept outside render() so switching language does not reset the filter.
  var view = { query: "", active: "" };

  var ALL = GAMES.console.concat(GAMES.mobile).slice().sort(function (a, b) {
    return (a.rank || 999) - (b.rank || 999);
  });

  var TAG_BY_KEY = {};
  TAGS.forEach(function (t) { TAG_BY_KEY[t.key] = t; });

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function get(obj, path) {
    return path.split(".").reduce(function (acc, k) {
      return acc && acc[k] !== undefined ? acc[k] : undefined;
    }, obj);
  }

  function gamesFor(key) {
    return ALL.filter(function (g) { return (g.tags || []).indexOf(key) !== -1; });
  }

  // Tags by weight, heaviest first: the shape of the play history should be
  // legible before anything is clicked.
  var ORDER = TAGS.map(function (t) {
    return { key: t.key, count: gamesFor(t.key).length };
  }).filter(function (t) { return t.count > 0; })
    .sort(function (a, b) { return b.count - a.count; });

  var MAX = ORDER.length ? ORDER[0].count : 1;
  var MIN = ORDER.length ? ORDER[ORDER.length - 1].count : 1;

  // Square-root scaling: a tag with four times the titles reads as roughly
  // twice the size rather than four times, which keeps the biggest entries
  // from swallowing the rest of the cloud.
  function weight(count) {
    if (MAX === MIN) return 0.5;
    return (Math.sqrt(count) - Math.sqrt(MIN)) / (Math.sqrt(MAX) - Math.sqrt(MIN));
  }

  // ------------------------------------------------------------- cloud
  function renderCloud(lang) {
    var wrap = document.getElementById("tagCloud");
    if (!wrap) return;
    // The visual order is deliberately off the count order — a strictly
    // descending run reads as a bar chart, not a cloud — but it is a fixed
    // interleave rather than random, so the layout is identical on every load.
    var laid = [];
    ORDER.forEach(function (t, i) {
      if (i % 2 === 0) laid.push(t);
      else laid.unshift(t);
    });
    wrap.innerHTML = laid.map(function (t, i) {
      var w = weight(t.count);
      return '<button type="button" class="tag-chip" data-tag="' + t.key + '"' +
        ' style="--w:' + w.toFixed(3) + ';--i:' + i + '"' +
        ' aria-pressed="false">' +
        '<span class="tc-name">' + esc(TAG_BY_KEY[t.key][lang]) + "</span>" +
        '<span class="tc-count mono">' + t.count + "</span>" +
        "</button>";
    }).join("");
  }

  // ------------------------------------------------------------- sections
  function chip(lang, key, self) {
    return '<button type="button" class="tg-chip' + (self ? " is-self" : "") +
      '" data-tag="' + key + '">' + esc(TAG_BY_KEY[key][lang]) + "</button>";
  }

  function card(lang, g, sectionKey) {
    var tags = (g.tags || []).map(function (k) {
      return chip(lang, k, k === sectionKey);
    }).join("");
    return '<article class="tg-card" data-name="' +
      esc((g.en.name + " " + g.zh.name).toLowerCase()) + '">' +
      "<h4>" + esc(g[lang].name) + "</h4>" +
      '<p class="tg-time mono">' + esc(g[lang].time) + "</p>" +
      // A few titles are logged with hours but no completion state. The line is
      // dropped rather than rendered empty, which would leave a phantom gap.
      (g[lang].note ? '<p class="tg-note">' + esc(g[lang].note) + "</p>" : '<div class="tg-note"></div>') +
      '<div class="tg-tags">' + tags + "</div>" +
      "</article>";
  }

  function renderSections(lang) {
    var wrap = document.getElementById("tagSections");
    if (!wrap) return;
    wrap.innerHTML = ORDER.map(function (t) {
      var list = gamesFor(t.key);
      return '<section class="tag-section" id="tag-' + t.key + '" data-tag="' + t.key + '">' +
        '<h3 class="tag-title"><span>' + esc(TAG_BY_KEY[t.key][lang]) + "</span>" +
        '<span class="tag-n mono">' + list.length + "</span></h3>" +
        '<div class="tg-grid">' + list.map(function (g) { return card(lang, g, t.key); }).join("") +
        "</div></section>";
    }).join("");
  }

  // A single filter pass over the rendered cards: hide non-matching cards, and
  // hide a whole section once nothing in it is left.
  function applyFilter(d) {
    var q = view.query.trim().toLowerCase();
    var total = 0;
    document.querySelectorAll(".tag-section").forEach(function (sec) {
      var shown = 0;
      sec.querySelectorAll(".tg-card").forEach(function (c) {
        var hit = !q || c.getAttribute("data-name").indexOf(q) !== -1;
        c.hidden = !hit;
        if (hit) shown++;
      });
      sec.hidden = shown === 0;
      var n = sec.querySelector(".tag-n");
      if (n) n.textContent = shown;
      total += shown;
    });
    var empty = document.getElementById("gamesEmpty");
    if (empty) {
      empty.hidden = total > 0;
      empty.textContent = d.empty;
    }
    document.querySelectorAll(".tag-chip").forEach(function (btn) {
      var sec = document.getElementById("tag-" + btn.getAttribute("data-tag"));
      btn.classList.toggle("is-dim", !!(sec && sec.hidden));
    });
  }

  function goToTag(key) {
    var sec = document.getElementById("tag-" + key);
    if (!sec || sec.hidden) return;
    view.active = key;
    document.querySelectorAll(".tag-chip").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-tag") === key ? "true" : "false");
    });
    document.querySelectorAll(".tag-section").forEach(function (s) {
      s.classList.toggle("is-active", s === sec);
    });
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sec.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  // One delegated listener on the page rather than a listener per chip: the
  // cards are re-rendered on every language switch, and the cloud chips and
  // the per-card chips want identical behaviour.
  function wire(getD) {
    var page = document.getElementById("gamesMain");
    if (page && !page.dataset.wired) {
      page.dataset.wired = "1";
      page.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-tag]");
        if (!btn) return;
        goToTag(btn.getAttribute("data-tag"));
      });
    }
    var search = document.getElementById("gameSearch");
    if (search && !search.dataset.wired) {
      search.dataset.wired = "1";
      search.addEventListener("input", function () {
        view.query = search.value;
        applyFilter(getD());
      });
    }
  }

  // ------------------------------------------------------------- page
  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && typeof value === "string") el.textContent = value;
  }

  function render(lang) {
    var d = content[lang].experiencePage;
    if (!d) return;
    document.title = d.gamesPageTitle;
    setText("gamesTag", d.gamesTagLabel);
    setText("gamesTitle", d.gamesHeading);
    setText("cloudHint", d.cloudHint);
    var back = document.getElementById("gamesBack");
    if (back) back.textContent = content[lang].resumePage.backHome || "←";
    var search = document.getElementById("gameSearch");
    if (search) search.setAttribute("placeholder", d.searchPlaceholder);

    renderCloud(lang);
    renderSections(lang);
    applyFilter(d);
    if (view.active) {
      document.querySelectorAll(".tag-chip").forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-tag") === view.active ? "true" : "false");
      });
      var sec = document.getElementById("tag-" + view.active);
      if (sec) sec.classList.add("is-active");
    }
    wire(function () { return content[currentLang].experiencePage; });
  }

  function applyStaticText(lang) {
    var dict = content[lang];
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = get(dict, el.getAttribute("data-i18n"));
      if (typeof value === "string") el.textContent = value;
    });
  }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });
    applyStaticText(lang);
    render(lang);
    var cta = document.getElementById("pageContactCta");
    if (cta) {
      var c = content[lang].contact;
      cta.innerHTML =
        '<p class="lead">' + c.lead + "</p>" +
        '<div class="details">' +
        c.locationLabel + ": " + c.location + "<br>" +
        c.emailLabel + ': <a href="mailto:' + c.email + '">' + c.email + "</a><br>" +
        c.websiteLabel + ": " + c.website + "</div>";
    }
    window.SITE_CHROME.renderNav(lang, content, "games");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SITE_CHROME.buildAll(root);
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });
    setLang(currentLang);
  });
})();
