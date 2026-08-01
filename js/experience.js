// ---------------------------------------------------------------------------
// The Experience page: a horizontal timeline from university to now, and the
// full play-history log underneath it.
//
// Both halves are driven by data — the timeline from content.experiencePage,
// the log from window.SITE_GAMES (js/games-data.js) — so adding a milestone or
// a game is a data edit, and every summary figure on the page is derived
// rather than typed in.
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
  var view = { group: "console", sort: "default", dir: 1, query: "", open: false };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function get(obj, path) {
    return path.split(".").reduce(function (acc, k) {
      return acc && acc[k] !== undefined ? acc[k] : undefined;
    }, obj);
  }

  // ------------------------------------------------------------- timeline
  function renderTimeline(d) {
    var rail = document.getElementById("timelineRail");
    if (!rail) return;
    var items = (d.items || []).slice().sort(function (a, b) { return a.sort - b.sort; });

    rail.innerHTML = items
      .map(function (it, n) {
        var kind = d.kinds && d.kinds[it.kind] ? d.kinds[it.kind] : "";
        // A year label is only drawn when the year actually changes, so the
        // rail reads as a run of years rather than repeating 2025 three times.
        var newYear = n === 0 || items[n - 1].year !== it.year;
        return (
          '<li class="tl-item is-' + esc(it.kind) + (newYear ? " is-year-start" : "") + '" tabindex="0">' +
          (newYear ? '<span class="tl-year mono">' + esc(it.year) + "</span>" : "") +
          '<span class="tl-dot" aria-hidden="true"></span>' +
          '<div class="tl-card">' +
          '<p class="tl-dates mono">' + esc(it.dates) + (kind ? ' <span class="tl-kind">' + esc(kind) + "</span>" : "") + "</p>" +
          "<h3>" + esc(it.title) + "</h3>" +
          (it.org ? '<p class="tl-org">' + esc(it.org) + "</p>" : "") +
          (it.note ? '<p class="tl-note">' + esc(it.note) + "</p>" : "") +
          "</div></li>"
        );
      })
      .join("");
  }

  // Horizontal rails are easy to make and easy to make unusable. This wires up
  // the three ways people actually try to move one — dragging, the wheel, and
  // the arrow keys — and leaves native touch scrolling alone.
  function wireRail() {
    var rail = document.getElementById("timelineRail");
    if (!rail || rail.dataset.wired) return;
    rail.dataset.wired = "1";

    var down = false, startX = 0, startScroll = 0, moved = 0;

    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;   // let the browser do touch itself
      down = true; moved = 0;
      startX = e.clientX; startScroll = rail.scrollLeft;
      rail.classList.add("is-dragging");
    });
    rail.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      rail.scrollLeft = startScroll - dx;
      // Only capture the pointer once it's clearly a drag, so a plain click
      // still lands on the card underneath.
      if (moved > 4 && rail.setPointerCapture) {
        try { rail.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    function release() { down = false; rail.classList.remove("is-dragging"); }
    rail.addEventListener("pointerup", release);
    rail.addEventListener("pointercancel", release);
    rail.addEventListener("mouseleave", release);

    // A vertical wheel over the rail scrolls it sideways — but only while the
    // rail still has somewhere to go. At either end the event is left alone so
    // the page keeps scrolling and the rail never traps the reader.
    rail.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var max = rail.scrollWidth - rail.clientWidth;
      if (max <= 0) return;
      var next = rail.scrollLeft + e.deltaY;
      if (next < 0 || next > max) return;
      e.preventDefault();
      rail.scrollLeft = next;
    }, { passive: false });

    rail.addEventListener("keydown", function (e) {
      var step = rail.clientWidth * 0.7;
      if (e.key === "ArrowRight") { rail.scrollLeft += step; e.preventDefault(); }
      else if (e.key === "ArrowLeft") { rail.scrollLeft -= step; e.preventDefault(); }
      else if (e.key === "Home") { rail.scrollLeft = 0; e.preventDefault(); }
      else if (e.key === "End") { rail.scrollLeft = rail.scrollWidth; e.preventDefault(); }
    });

    // Progress bar + end fades, so it's obvious there is more to the right.
    var bar = document.getElementById("timelineProgress");
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth;
      var p = max > 0 ? rail.scrollLeft / max : 1;
      if (bar) bar.style.transform = "scaleX(" + Math.max(0.04, p) + ")";
      rail.classList.toggle("at-start", rail.scrollLeft <= 2);
      rail.classList.toggle("at-end", max <= 0 || rail.scrollLeft >= max - 2);
    }
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
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
    return [
      { value: all.length, label: d.statTitles, note: GAMES.console.length + " / " + GAMES.mobile.length },
      { value: total.toLocaleString("en-US") + "h", label: d.statHours, note: withHours.length + " " + d.statTracked },
      { value: longest ? longest.hours + "h" : "—", label: d.statLongest, note: longest ? longest[lang].name : "" },
      { value: live, label: d.statLive, note: d.statLiveNote },
    ];
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

    var list = (GAMES[view.group] || []).slice();
    var q = view.query.trim().toLowerCase();
    if (q) {
      list = list.filter(function (g) {
        return (g.en.name + " " + g.zh.name).toLowerCase().indexOf(q) !== -1;
      });
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
          return "<tr><td>" + esc(g[lang].name) + "</td>" +
            '<td class="mono nowrap">' + esc(g[lang].time) + "</td>" +
            '<td class="note">' + esc(g[lang].note) + "</td></tr>";
        }).join("")
      : '<tr><td colspan="3" class="note">' + esc(d.empty) + "</td></tr>";

    var count = document.getElementById("gameCount");
    if (count) count.textContent = list.length + " / " + (GAMES[view.group] || []).length;
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
    document.title = d.pageTitle;
    setText("expTag", d.tagLabel);
    setText("expHeading", d.heading);
    setText("expLead", d.lead);
    setText("timelineHeading", d.timelineHeading);
    setText("timelineHint", d.timelineHint);
    setText("gamesHeading", d.gamesHeading);
    setText("gamesLead", d.gamesLead);
    setText("tabConsole", d.tabConsole);
    setText("tabMobile", d.tabMobile);
    setText("colName", d.colName);
    setText("colTime", d.colTime);
    setText("colNote", d.colNote);
    setText("sortHint", d.sortHint);
    var back = document.getElementById("expBack");
    if (back) back.textContent = content[lang].resumePage.backHome || "←";
    var search = document.getElementById("gameSearch");
    if (search) search.setAttribute("placeholder", d.searchPlaceholder);

    renderTimeline(d);
    wireRail();
    renderStats(lang, d);
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
    window.SITE_CHROME.renderNav(lang, content, "experience");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SITE_CHROME.buildAll(root);
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });
    setLang(currentLang);
  });
})();
