// ---------------------------------------------------------------------------
// Shared renderer for the "dedicated page" versions of each site section
// (about.html, projects.html, experience.html, education.html, writing.html,
// contact.html). Which one runs is picked by <body data-page="...">.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var content = window.SITE_CONTENT;
  var page = document.body.getAttribute("data-page");
  var root = document.body.getAttribute("data-root") || "";

  var currentLang = (function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) {}
    return "en";
  })();

  function get(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc && acc[key] !== undefined ? acc[key] : undefined;
    }, obj);
  }

  function applyStaticText(lang) {
    var dict = content[lang];
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = get(dict, el.getAttribute("data-i18n"));
      if (typeof value === "string") el.textContent = value;
    });
  }

  var renderers = {
    about: function (lang) {
      var d = content[lang].aboutPage;
      document.title = d.pageTitle;
      var photoEl = document.getElementById("aboutPhoto");
      if (photoEl && content[lang].hero.portrait) photoEl.src = content[lang].hero.portrait;
      var wrap = document.getElementById("aboutBody");
      wrap.innerHTML =
        secBlock(d.whoHeading, d.who) +
        secBlock(d.howHeading, d.how) +
        secBlock(d.nextHeading, d.next) +
        secBlock(d.funHeading, d.fun);
    },

    projects: function (lang) {
      var team = content[lang].teamProjects;
      var indiv = content[lang].individualProjects;
      document.title = content[lang].nav.projects + " — " + content[lang].site.name;
      renderCardGrid("teamGrid", team.list);
      renderCardGrid("individualGrid", indiv.list);
    },

    experience: function (lang) {
      var wrap = document.getElementById("experienceFull");
      wrap.innerHTML = "";
      content[lang].experience.items.forEach(function (item) {
        var bullets = (item.bullets || []).map(function (b) { return "<li>" + b + "</li>"; }).join("");
        var row = document.createElement("div");
        row.className = "resume-entry";
        row.innerHTML =
          '<div class="dates mono">' + item.dates + "</div>" +
          '<div><p class="title">' + item.title + " — " + item.org + "</p>" +
          '<p class="org">' + (item.location || "") + "</p>" +
          '<ul class="detail-list">' + bullets + "</ul></div>";
        wrap.appendChild(row);
      });
    },

    education: function (lang) {
      var wrap = document.getElementById("educationFull");
      wrap.innerHTML = "";
      content[lang].education.items.forEach(function (item) {
        var row = document.createElement("div");
        row.className = "resume-entry";
        row.innerHTML =
          '<div class="dates mono">' + item.dates + "</div>" +
          '<div><p class="title">' + item.degree + "</p>" +
          '<p class="org">' + item.school + (item.location ? " — " + item.location : "") + "</p></div>";
        wrap.appendChild(row);
      });
    },

    writing: function (lang) {
      renderBlog(lang);
    },

    contact: function (lang) {
      var d = content[lang].contact;
      document.getElementById("contactLocation").textContent = d.location;
      var emailEl = document.getElementById("contactEmailFull");
      emailEl.textContent = d.email;
      emailEl.href = "mailto:" + d.email;
      document.getElementById("contactWebsite").textContent = d.website;
    },
  };

  function secBlock(heading, body) {
    return (
      '<div class="resume-entry" style="grid-template-columns:1fr;">' +
      "<h3>" + heading + "</h3><p class=\"detail\">" + body + "</p></div>"
    );
  }

  function renderCardGrid(id, items) {
    var wrap = document.getElementById(id);
    if (!wrap) return;
    wrap.innerHTML = "";
    items.forEach(function (p) {
      var card = document.createElement("a");
      card.className = "project-card" + (p.placeholder ? " is-placeholder" : "");
      card.href = p.href;
      card.innerHTML =
        '<div class="project-thumb"><img src="' + p.image + '" alt="' + p.name + ' placeholder image" /></div>' +
        '<div class="project-meta"><span class="index mono">' + p.tag + "</span></div>" +
        "<h3>" + p.name + "</h3>" +
        '<p class="project-summary">' + p.blurb + "</p>";
      wrap.appendChild(card);
    });
  }

  function renderBlog(lang) {
    var b = content[lang].blog;
    var items = b.items || [];

    var wrap = document.getElementById("writingFull");
    if (!wrap) return;
    wrap.innerHTML = "";
    items.forEach(function (post) {
      // Posts with a `slug` have a real article page (writing-post.html) and
      // are rendered as links. Posts without one are still placeholders, so
      // they render as plain (non-navigating) rows — a href="#" here used to
      // just scroll back to the top of the page, which looked like a broken
      // "jump to homepage" bug.
      var row = document.createElement(post.slug ? "a" : "div");
      row.className = "blog-row";
      if (post.slug) row.href = "writing-post.html?slug=" + encodeURIComponent(post.slug);
      row.innerHTML =
        '<span class="row-marker"></span>' +
        "<h4>" + post.title + "</h4>" +
        '<span class="date mono">' + post.date + "</span>" +
        '<span class="category">' + post.category + "</span>";
      wrap.appendChild(row);
    });
  }

  function renderContactCta(lang) {
    var el = document.getElementById("pageContactCta");
    if (!el) return;
    var c = content[lang].contact;
    el.innerHTML =
      '<p class="lead">' + c.lead + "</p>" +
      '<div class="details">' +
      c.locationLabel + ": " + c.location + "<br>" +
      c.emailLabel + ': <a href="mailto:' + c.email + '">' + c.email + "</a><br>" +
      c.websiteLabel + ": " + c.website +
      "</div>";
  }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });
    applyStaticText(lang);
    if (renderers[page]) renderers[page](lang);
    renderContactCta(lang);
    window.SITE_CHROME.renderNav(lang, content, page);
  }

  function initLangToggle() {
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SITE_CHROME.buildAll(root);
    initLangToggle();
    setLang(currentLang);
  });
})();
