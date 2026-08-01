// ---------------------------------------------------------------------------
// The Games page: the play-history log.
//
// Driven entirely by window.SITE_GAMES (js/games-data.js) — adding a game is a
// data edit, and every summary figure on the page is derived from the rows
// rather than typed in, so a number here can never drift from the list under
// it. The career timeline used to share this file and now lives on the About
// page via js/timeline.js.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var content = window.SITE_CONTENT;
  var GAMES = window.SITE_GAMES || { console: [], mobile: [] };
  var root = document.body.getAttribute("data-root") || "";

  var currentLang = (function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) {}
    return "en";
  })();

  // View state for the log. Kept outside render() so switching language does
  // not silently reset the visitor's filter, sort or open/closed choice.
  var view = { group: "anime", sort: "default", dir: 1, query: "", open: false };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function get(obj, path) {
    return path.split(".").reduce(function (acc, k) {
      return acc && acc[k] !== undefined ? acc[k] : undefined;
    }, obj);
  }

  // ------------------------------------------------------------- play log
  function stats(lang, d) {
    var all = GAMES.console.concat(GAMES.mobile);
    var withHours = GAMES.console.filter(function (g) { return typeof g.hours === "number"; });
    var total = withHours.reduce(function (s, g) { return s + g.hours; }, 0);
    var longest = withHours.slice().sort(function (a, b) { return b.hours - a.hours; })[0];
    // "Live-service" here means exactly the rows with no hour count — the
    // seasons-and-years titles — so the two figures can never disagree.
    var live = GAMES.console.length - withHours.length;
    var anime = all.filter(function (g) { return g.anime; }).length;
    return [
      { value: anime, label: d.statAnime, note: d.statAnimeNote },
      { value: all.length, label: d.statTitles, note: GAMES.console.length + " / " + GAMES.mobile.length },
      { value: total.toLocaleString("en-US") + "h", label: d.statHours, note: withHours.length + " " + d.statTracked },
      { value: longest ? longest.hours + "h" : "—", label: d.statLongest, note: longest ? longest[lang].name : "" },
      { value: live, label: d.statLive, note: d.statLiveNote },
    ];
  }

  // The tagged titles, always on screen. This is the part a hiring reader is
  // meant to see without clicking anything.
  function renderFeatured(lang, d) {
    var wrap = document.getElementById("gameFeatured");
    if (!wrap) return;
    var list = groupRows("anime");
    wrap.innerHTML = list
      .map(function (g) {
        return '<article class="gf-card">' +
          '<p class="gf-time mono">' + esc(g[lang].time) + "</p>" +
          "<h4>" + esc(g[lang].name) + "</h4>" +
          '<p class="gf-note">' + esc(g[lang].note) + "</p>" +
          "</article>";
      })
      .join("");
  }

  // Hours as bars: the one part of the log that reads instantly at a glance.
  // Console only, because the mobile rows have no hour count to scale against.
  function renderBars(lang) {
    var wrap = document.getElementById("gameBars");
    if (!wrap) return;
    var top = GAMES.console
      .filter(function (g) { return typeof g.hours === "number"; })
      .sort(function (a, b) { return b.hours - a.hours; })
      .slice(0, 10);
    if (!top.length) return;
    var max = top[0].hours;
    wrap.innerHTML = top
      .map(function (g) {
        var pct = Math.round((g.hours / max) * 100);
        return '<div class="gb-row">' +
          '<span class="gb-name">' + esc(g[lang].name) + "</span>" +
          '<span class="gb-track"><span class="gb-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="gb-value mono">' + g.hours + "h</span>" +
          "</div>";
      })
      .join("");
  }

  function renderStats(lang, d) {
    var wrap = document.getElementById("gameStats");
    if (!wrap) return;
    wrap.innerHTML = stats(lang, d)
      .map(function (s) {
        return '<div class="game-stat"><p class="value">' + esc(s.value) + "</p>" +
          '<p class="label">' + esc(s.label) + "</p>" +
          (s.note ? '<p class="note mono">' + esc(s.note) + "</p>" : "") + "</div>";
      })
      .join("");
  }

  // "anime" is not a third platform — it selects the tagged rows out of both
  // groups. Mobile leads, because the gacha titles are the ones this section
  // exists to put in front; the console JRPGs follow.
  function groupRows(key) {
    if (key === "anime") {
      return GAMES.mobile.filter(function (g) { return g.anime; })
        .concat(GAMES.console.filter(function (g) { return g.anime; }));
    }
    return (GAMES[key] || []).slice();
  }

  function sortValue(g) {
    // One comparable number across both groups: console rows sort by hours,
    // mobile rows by months. They are never sorted against each other because
    // only one group is on screen at a time.
    return typeof g.hours === "number" ? g.hours : (typeof g.months === "number" ? g.months : -1);
  }

  function renderTable(lang, d) {
    var body = document.getElementById("gameRows");
    var wrap = document.getElementById("gameTableWrap");
    if (!body || !wrap) return;

    wrap.hidden = !view.open;
    var toggle = document.getElementById("gamesToggle");
    if (toggle) {
      toggle.textContent = view.open ? d.hideAll : d.showAll;
      toggle.setAttribute("aria-expanded", view.open ? "true" : "false");
    }
    if (!view.open) return;

    var list = groupRows(view.group);
    var q = view.query.trim().toLowerCase();
    if (q) {
      list = list.filter(function (g) {
        return (g.en.name + " " + g.zh.name).toLowerCase().indexOf(q) !== -1;
      });
    }
    if (view.sort === "default" && view.group !== "anime") {
      // Stable partition rather than a sort, so the hand-ordered sequence
      // inside each half is preserved.
      list = list.filter(function (g) { return g.anime; })
        .concat(list.filter(function (g) { return !g.anime; }));
    }
    if (view.sort === "name") {
      list.sort(function (a, b) { return a[lang].name.localeCompare(b[lang].name, lang === "zh" ? "zh" : "en") * view.dir; });
    } else if (view.sort === "time") {
      list.sort(function (a, b) { return (sortValue(b) - sortValue(a)) * view.dir; });
    }

    document.querySelectorAll("[data-sort]").forEach(function (th) {
      var active = th.getAttribute("data-sort") === view.sort;
      th.setAttribute("aria-sort", active ? (view.dir === 1 ? "descending" : "ascending") : "none");
      th.classList.toggle("is-active", active);
    });

    body.innerHTML = list.length
      ? list.map(function (g) {
          return '<tr' + (g.anime ? ' class="is-anime"' : "") + "><td>" + esc(g[lang].name) +
            (g.anime && view.group !== "anime" ? ' <span class="game-chip mono">' + esc(d.animeChip) + "</span>" : "") + "</td>" +
            '<td class="mono nowrap">' + esc(g[lang].time) + "</td>" +
            '<td class="note">' + esc(g[lang].note) + "</td></tr>";
        }).join("")
      : '<tr><td colspan="3" class="note">' + esc(d.empty) + "</td></tr>";

    var count = document.getElementById("gameCount");
    if (count) count.textContent = list.length + " / " + groupRows(view.group).length;
  }

  function wireLog(getD) {
    var toggle = document.getElementById("gamesToggle");
    if (toggle && !toggle.dataset.wired) {
      toggle.dataset.wired = "1";
      toggle.addEventListener("click", function () {
        view.open = !view.open;
        renderTable(currentLang, getD());
      });
    }
    document.querySelectorAll("[data-group]").forEach(function (btn) {
      if (btn.dataset.wired) return;
      btn.dataset.wired = "1";
      btn.addEventListener("click", function () {
        view.group = btn.getAttribute("data-group");
        document.querySelectorAll("[data-group]").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        renderTable(currentLang, getD());
      });
    });
    document.querySelectorAll("[data-sort]").forEach(function (th) {
      if (th.dataset.wired) return;
      th.dataset.wired = "1";
      th.addEventListener("click", function () {
        var key = th.getAttribute("data-sort");
        if (view.sort === key) view.dir = -view.dir;
        else { view.sort = key; view.dir = key === "name" ? -1 : 1; }
        renderTable(currentLang, getD());
      });
    });
    var search = document.getElementById("gameSearch");
    if (search && !search.dataset.wired) {
      search.dataset.wired = "1";
      search.addEventListener("input", function () {
        view.query = search.value;
        // Typing a filter with the log collapsed should show the results
        // rather than filtering something nobody can see.
        if (!view.open && view.query) view.open = true;
        renderTable(currentLang, getD());
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
    setText("gamesSubtitle", d.gamesSubtitle);
    setText("gamesHeading", d.gamesHeading);
    setText("featuredHeading", d.featuredHeading);
    setText("barsHeading", d.barsHeading);
    setText("barsNote", d.barsNote);
    setText("fullHeading", d.fullHeading);
    setText("unitNote", d.unitNote);
    setText("tabAnime", d.tabAnime);
    setText("tabConsole", d.tabConsole);
    setText("tabMobile", d.tabMobile);
    setText("colName", d.colName);
    setText("colTime", d.colTime);
    setText("colNote", d.colNote);
    setText("sortHint", d.sortHint);
    var back = document.getElementById("gamesBack");
    if (back) back.textContent = content[lang].resumePage.backHome || "←";
    var search = document.getElementById("gameSearch");
    if (search) search.setAttribute("placeholder", d.searchPlaceholder);

    renderStats(lang, d);
    renderFeatured(lang, d);
    renderBars(lang);
    renderTable(lang, d);
    wireLog(function () { return content[currentLang].experiencePage; });
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
