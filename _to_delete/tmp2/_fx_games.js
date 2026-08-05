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

  // Not genres. These stay on the cards as labels but are kept out of the
  // cloud and out of the sections: "PC", "mobile" and "live service" would be
  // three of the biggest words on screen and none of them says anything about
  // taste.
  var LABEL_ONLY = { duanyou: 1, shouyou: 1, changxian: 1 };

  // The tag this play history is actually about. It leads the sections and is
  // placed first — therefore dead centre — in the cloud.
  var LEAD = "erciyuan";

  // Tags whose size is raised above what their raw count would give them,
  // because they are the ones worth noticing. The cloud is a statement about
  // what the play history is, not a bar chart of it.
  var EMPHASIS = { erciyuan: 1, zizouqi: 0.72, rougu: 0.72, xushi: 0.72, hezuo: 0.72 };

  var COUNTS = TAGS.map(function (t) {
    return { key: t.key, count: gamesFor(t.key).length };
  }).filter(function (t) { return t.count > 0 && !LABEL_ONLY[t.key]; });

  var MAX = COUNTS.reduce(function (m, t) { return Math.max(m, t.count); }, 1);
  var MIN = COUNTS.reduce(function (m, t) { return Math.min(m, t.count); }, MAX);

  // Square-root scaling: a tag with four times the titles reads as roughly
  // twice the size rather than four times, which keeps the biggest entries
  // from swallowing the rest of the cloud.
  function weight(t) {
    var w = MAX === MIN ? 0.5
      : (Math.sqrt(t.count) - Math.sqrt(MIN)) / (Math.sqrt(MAX) - Math.sqrt(MIN));
    return Math.max(w, EMPHASIS[t.key] || 0);
  }

  // Sections read 二次元 first, then by weight.
  var ORDER = COUNTS.slice().sort(function (a, b) {
    if (a.key === LEAD) return -1;
    if (b.key === LEAD) return 1;
    return weight(b) - weight(a) || b.count - a.count;
  });

  // ------------------------------------------------------------- cloud
  //
  // A real packed cloud, not a wrapped line of text. Words are measured on a
  // canvas at their final size, then placed largest-first along an Archimedean
  // spiral out from the centre, rejecting any position that overlaps a word
  // already placed. That is what produces the interlocking silhouette a word
  // cloud is supposed to have — CSS flex wrapping cannot, because it reserves
  // a full line-box for every word regardless of size.
  //
  // Layout runs against measured pixel widths, so it has to re-run whenever the
  // container resizes or the display webfont finishes loading.

  var measureCtx = null;
  // canvas measureText knows nothing about CSS text-transform or
  // letter-spacing, and the cloud uses both — measuring the raw string gives a
  // width several percent short, which is exactly enough for placed words to
  // collide. So the transform is applied first and the tracking added back.
  function measure(text, size, family, wgt, upper, ls) {
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    measureCtx.font = wgt + " " + size + "px " + family;
    var s = upper ? text.toUpperCase() : text;
    return measureCtx.measureText(s).width + ls * size * s.length;
  }

  function overlaps(a, b) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }

  function layoutCloud() {
    var wrap = document.getElementById("tagCloud");
    if (!wrap) return;
    var nodes = Array.prototype.slice.call(wrap.querySelectorAll(".tag-chip"));
    if (!nodes.length) return;
    var W = wrap.clientWidth;
    if (!W) return;

    // The font family has to come from the live element — the stack differs
    // between the Latin and CJK builds of the page.
    var probe = window.getComputedStyle(nodes[0]);
    var family = probe.fontFamily;
    var wgt = probe.fontWeight;
    var upper = probe.textTransform === "uppercase";
    // letter-spacing comes back in px against the probe's own font-size; the
    // cloud sets it in em, so it is normalised back to a per-em ratio here.
    var ls = (parseFloat(probe.letterSpacing) || 0) / (parseFloat(probe.fontSize) || 1);

    // The words are boxed now, so the measured glyph run is not the footprint:
    // the padding and the 1px rule on each side go into the packing box too,
    // or the boxes overlap even though the text does not.
    var PADX = 0.34, PADY = 0.16, BORDER = 2;
    var GAP = 5;
    var boxes = [];
    var minY = 0, maxY = 0;

    nodes.forEach(function (el) {
      var size = parseFloat(el.getAttribute("data-size"));
      var rot = el.getAttribute("data-rot") === "1";
      // Full footprint of the boxed word, not just its glyph run.
      function boxW(px) {
        return measure(el.textContent, px, family, wgt, upper, ls) + px * PADX * 2 + BORDER;
      }
      // On a narrow column the heaviest words are wider than the container and
      // would never find a spiral position at all. Scale them down to fit
      // rather than letting them fall out of the cloud.
      if (!rot) {
        var avail = W - GAP * 2;
        var guard = 0;
        while (boxW(size) > avail && size > 11 && guard++ < 40) size -= 1;
      }
      el.style.fontSize = size + "px";
      var tw = boxW(size);
      var th = size * (1.02 + PADY * 2) + BORDER;
      // The bounding box of a quarter-turned word is its own box transposed.
      var w = (rot ? th : tw) + GAP * 2;
      var h = (rot ? tw : th) + GAP * 2;

      var placed = null;
      // Vertical radius is squashed so the cloud grows wide before it grows
      // tall, which is the shape that fits a page column.
      for (var t = 0; t < 900; t += 0.12) {
        var r = t * 2.2;
        var x = W / 2 + r * Math.cos(t) - w / 2;
        var y = r * Math.sin(t) * 0.36 - h / 2;
        if (x < 0 || x + w > W) continue;
        var box = { x: x, y: y, w: w, h: h };
        var hit = false;
        for (var i = 0; i < boxes.length; i++) {
          if (overlaps(box, boxes[i])) { hit = true; break; }
        }
        if (!hit) { placed = box; break; }
      }
      // Nothing fit on the spiral (very narrow container): drop it below the
      // stack rather than losing it.
      if (!placed) placed = { x: Math.max(0, (W - w) / 2), y: maxY + GAP, w: w, h: h };

      boxes.push(placed);
      minY = Math.min(minY, placed.y);
      maxY = Math.max(maxY, placed.y + placed.h);
      el.style.left = (placed.x + placed.w / 2) + "px";
      el.style.top = (placed.y + placed.h / 2) + "px";
      // Sideways Latin is rotated a quarter turn, which is the convention.
      // Sideways Chinese is set with writing-mode instead: a rotated CJK word
      // is genuinely hard to read, whereas a vertical column of upright
      // characters is how Chinese has always run sideways.
      if (rot && /[一-鿿]/.test(el.textContent)) {
        el.style.writingMode = "vertical-rl";
        el.style.transform = "translate(-50%, -50%)";
      } else {
        el.style.writingMode = "";
        el.style.transform = "translate(-50%, -50%)" + (rot ? " rotate(-90deg)" : "");
      }
    });

    // Shift the whole cloud so its topmost word sits at 0 and give the
    // container the height it actually needs.
    nodes.forEach(function (el) {
      el.style.top = (parseFloat(el.style.top) - minY) + "px";
    });
    wrap.style.height = (maxY - minY) + "px";
  }

  function renderCloud(lang) {
    var wrap = document.getElementById("tagCloud");
    if (!wrap) return;
    // Placed largest-first: the spiral fills the middle with the heavy words
    // and lets the light ones settle into the gaps around them.
    wrap.innerHTML = ORDER.map(function (t, i) {
      var w = weight(t);
      // The lead tag gets a further bump on top of its weight: at equal font
      // size a long word like AUTO BATTLER out-shouts a short one like ANIME,
      // and this word is meant to be the unmistakable centre of the cloud.
      var size = Math.round((14 + w * 30) * (t.key === LEAD ? 1.5 : 1));
      // Every third word past the first few turns on its side. Deterministic,
      // so the cloud is identical on every load rather than shuffling.
      var rot = i > 3 && i % 3 === 1 ? 1 : 0;
      return '<button type="button" class="tag-chip' + (t.key === LEAD ? " is-lead" : "") + '" data-tag="' + t.key + '"' +
        ' data-size="' + size + '" data-rot="' + rot + '"' +
        ' style="font-size:' + size + 'px;--w:' + w.toFixed(3) + ';--i:' + i + '"' +
        ' aria-pressed="false">' +
        esc(TAG_BY_KEY[t.key][lang]) + "</button>";
    }).join("");
    layoutCloud();
  }

  // ------------------------------------------------------------- sections
  function chip(lang, key, self) {
    return '<button type="button" class="tg-chip' + (self ? " is-self" : "") +
      '" data-tag="' + key + '">' + esc(TAG_BY_KEY[key][lang]) + "</button>";
  }

  function card(lang, g, sectionKey) {
    var all = g.tags || [];
    // Platform first and inert — it has no section to jump to.
    var tags = all.filter(function (k) { return LABEL_ONLY[k]; }).map(function (k) {
      return '<span class="tg-chip is-platform">' + esc(TAG_BY_KEY[k][lang]) + "</span>";
    }).concat(all.filter(function (k) { return !LABEL_ONLY[k]; }).map(function (k) {
      return chip(lang, k, k === sectionKey);
    })).join("");
    return '<article class="tg-card" data-name="' +
      esc((g.en.name + " " + g.zh.name).toLowerCase()) + '">' +
      '<header class="tg-head">' +
      "<h4>" + esc(g[lang].name) + "</h4>" +
      '<p class="tg-time mono">' + esc(g[lang].time) + "</p>" +
      "</header>" +
      // A few titles are logged with hours but no completion state. The line is
      // dropped rather than rendered empty, which would leave a phantom gap.
      (g[lang].note ? '<p class="tg-note">' + esc(g[lang].note) + "</p>" : "") +
      '<div class="tg-tags">' + tags + "</div>" +
      "</article>";
  }

  function renderSections(lang) {
    var wrap = document.getElementById("tagSections");
    if (!wrap) return;
    wrap.innerHTML = ORDER.map(function (t) {
      var list = gamesFor(t.key);
      return '<section class="tag-section" id="tag-' + t.key + '" data-tag="' + t.key + '">' +
        '<h3 class="tag-title"><span>' + esc(TAG_BY_KEY[t.key][lang]) + "</span></h3>" +
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

    // The first layout runs against whatever font is available at that moment;
    // once the display webfont lands the measurements change, so it is redone.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutCloud);

    var t = null;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(layoutCloud, 150);
    });
  });
})();
