// ---------------------------------------------------------------------------
// Renderer for long-form articles — pieces with real chapters, data tables and
// figures, as opposed to the short image-and-text "story" pages in pages.js.
//
//   <body data-page="article" data-article="articles.tft">
//
// picks which entry of the content dictionary to render. Everything on the
// page (including the table of contents) is generated from that entry, so a
// second article is a new content object plus a 25-line HTML file.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var content = window.SITE_CONTENT;
  var root = document.body.getAttribute("data-root") || "";
  var key = document.body.getAttribute("data-article");

  var currentLang = (function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) {}
    return "en";
  })();

  function get(obj, path) {
    return path.split(".").reduce(function (acc, k) {
      return acc && acc[k] !== undefined ? acc[k] : undefined;
    }, obj);
  }

  // Content is authored as plain text, so anything that reaches innerHTML is
  // escaped first. The article carries champion and trait names lifted
  // straight from the game — "8-bit", "K/DA", "Mech-Pilot" — and one stray
  // angle bracket in a future edit should not be able to break the page.
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Section ids come from the content file and are used both as anchor targets
  // and as the hash the TOC links to.
  function blockHtml(b) {
    switch (b.type) {
      case "h3":
        return "<h3>" + esc(b.text) + "</h3>";
      case "p":
        return "<p>" + esc(b.text) + "</p>";
      case "lead":
        return '<p class="article-lead">' + esc(b.text) + "</p>";
      case "ul":
        return (
          '<ul class="article-list">' +
          (b.items || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") +
          "</ul>"
        );
      case "ol":
        return (
          '<ol class="article-list">' +
          (b.items || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") +
          "</ol>"
        );
      // A formula gets its own block rather than sitting inline: these are the
      // two definitions the whole relationship section rests on, and burying
      // them mid-paragraph makes them impossible to find again.
      case "formula":
        return (
          '<div class="article-formula"><code>' + esc(b.text) + "</code>" +
          (b.note ? "<span>" + esc(b.note) + "</span>" : "") +
          "</div>"
        );
      case "note":
        return '<aside class="article-note">' + esc(b.text) + "</aside>";
      case "figure":
        // Charts and matrices are legible at column width but reward zooming,
        // so every figure links to its own full-size file.
        return (
          '<figure class="article-figure">' +
          '<a href="' + root + esc(b.src) + '" target="_blank" rel="noopener">' +
          '<img src="' + root + esc(b.src) + '" alt="' + esc(b.caption || "") + '" loading="lazy" />' +
          "</a>" +
          (b.caption ? "<figcaption>" + esc(b.caption) + "</figcaption>" : "") +
          "</figure>"
        );
      case "gallery":
        return (
          '<div class="article-gallery">' +
          (b.items || [])
            .map(function (it) {
              return (
                '<figure><a href="' + root + esc(it.src) + '" target="_blank" rel="noopener">' +
                '<img src="' + root + esc(it.src) + '" alt="' + esc(it.caption || "") + '" loading="lazy" /></a>' +
                (it.caption ? "<figcaption>" + esc(it.caption) + "</figcaption>" : "") +
                "</figure>"
              );
            })
            .join("") +
          "</div>"
        );
      // Tables are wrapped in their own scroll container. The season
      // classification tables are genuinely wide, and letting them push the
      // page's horizontal scrollbar would drag the whole layout sideways.
      case "table":
        return (
          '<div class="article-table-wrap">' +
          (b.caption ? '<p class="article-table-caption">' + esc(b.caption) + "</p>" : "") +
          '<table class="article-table">' +
          (b.head
            ? "<thead><tr>" + b.head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead>"
            : "") +
          "<tbody>" +
          (b.rows || [])
            .map(function (r) {
              return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
            })
            .join("") +
          "</tbody></table></div>"
        );
      default:
        return "";
    }
  }

  function render(lang) {
    var d = get(content[lang], key);
    if (!d) return;

    document.title = d.pageTitle;
    setText("articleTag", d.tagLabel);
    setText("articleHeading", d.heading);
    setText("articleSub", d.subheading);
    setText("articleBack", d.backLink);
    setText("tocHeading", d.tocHeading);

    var meta = document.getElementById("articleMeta");
    if (meta) {
      meta.innerHTML = (d.meta || [])
        .map(function (m) {
          return '<div><p class="label mono">' + esc(m.label) + '</p><p class="value">' + esc(m.value) + "</p></div>";
        })
        .join("");
    }

    var toc = document.getElementById("articleToc");
    var body = document.getElementById("articleBody");
    if (!body) return;

    body.innerHTML = (d.sections || [])
      .map(function (s) {
        return (
          '<section class="article-section" id="' + esc(s.id) + '">' +
          '<h2><span class="article-section-num mono">' + esc(s.num || "") + "</span>" + esc(s.title) + "</h2>" +
          (s.blocks || []).map(blockHtml).join("") +
          "</section>"
        );
      })
      .join("");

    if (toc) {
      toc.innerHTML = (d.sections || [])
        .map(function (s) {
          return '<li><a href="#' + esc(s.id) + '"><span class="mono">' + esc(s.num || "") + "</span>" + esc(s.title) + "</a></li>";
        })
        .join("");
      wireToc(toc);
    }
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && typeof value === "string") el.textContent = value;
  }

  var observer = null;

  // Highlight the section currently being read. rootMargin pulls the
  // observation band up to the top third of the viewport so the active item
  // changes when a heading reaches reading position, not when it first peeks
  // in at the bottom of the screen.
  function wireToc(toc) {
    if (observer) observer.disconnect();
    if (!window.IntersectionObserver) return;
    var links = {};
    toc.querySelectorAll("a").forEach(function (a) {
      links[a.getAttribute("href").slice(1)] = a;
    });
    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var a = links[entry.target.id];
          if (!a) return;
          if (entry.isIntersecting) {
            toc.querySelectorAll("a").forEach(function (x) { x.classList.remove("is-active"); });
            a.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    document.querySelectorAll(".article-section").forEach(function (s) { observer.observe(s); });
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
        c.websiteLabel + ": " + c.website +
        "</div>";
    }
    window.SITE_CHROME.renderNav(lang, content, "projects");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SITE_CHROME.buildAll(root);
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });
    setLang(currentLang);
  });
})();
