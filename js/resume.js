(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var content = window.SITE_CONTENT;
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
    document.title = dict.resumePage.pageTitle;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = get(dict, el.getAttribute("data-i18n"));
      if (typeof value === "string") el.textContent = value;
    });

    document.getElementById("resumeLocation").textContent = dict.contact.location;
    var emailEl = document.getElementById("resumeEmail");
    emailEl.textContent = dict.contact.email;
    emailEl.href = "mailto:" + dict.contact.email;
    document.getElementById("resumeWebsite").textContent = dict.contact.website;
  }

  function renderSkills(lang) {
    var wrap = document.getElementById("resumeSkills");
    wrap.innerHTML = "";
    content[lang].skills.items.forEach(function (s) {
      var chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = s;
      wrap.appendChild(chip);
    });
    content[lang].skills.languages.forEach(function (s) {
      var chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = s;
      wrap.appendChild(chip);
    });
  }

  function renderExperience(lang) {
    var wrap = document.getElementById("resumeExperience");
    wrap.innerHTML = "";
    content[lang].experience.items.forEach(function (item) {
      var bullets = (item.bullets || []).map(function (b) { return "<li>" + b + "</li>"; }).join("");
      var row = document.createElement("div");
      row.className = "resume-entry";
      row.innerHTML =
        '<div class="dates">' + item.dates + "</div>" +
        '<div><p class="title">' + item.title + " — " + item.org + '</p>' +
        '<p class="org">' + (item.location || "") + '</p>' +
        '<ul class="detail-list">' + bullets + "</ul></div>";
      wrap.appendChild(row);
    });
  }

  function renderEducation(lang) {
    var wrap = document.getElementById("resumeEducation");
    wrap.innerHTML = "";
    content[lang].education.items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "resume-entry";
      row.innerHTML =
        '<div class="dates">' + item.dates + "</div>" +
        '<div><p class="title">' + item.degree + "</p>" +
        '<p class="org">' + item.school + (item.location ? " — " + item.location : "") + "</p></div>";
      wrap.appendChild(row);
    });
  }

  function renderProjects(lang) {
    var wrap = document.getElementById("resumeProjects");
    wrap.innerHTML = "";
    content[lang].projects.items.forEach(function (p) {
      var item = document.createElement("div");
      item.className = "item";
      item.innerHTML =
        "<h3>" + p.title + " <span style=\"font-weight:400;color:var(--color-text-muted);\">(" + p.tag + ")</span></h3>" +
        '<p class="role">' + p.role + "</p>" +
        '<p class="summary">' + p.summary + "</p>";
      wrap.appendChild(item);
    });
  }

  function renderEmbed() {
    var wrap = document.getElementById("resumeEmbedWrap");
    if (!wrap || wrap.childElementCount) return; // only needs building once
    wrap.innerHTML =
      '<iframe src="ZhongyinGou_resume.pdf" title="Resume PDF" ' +
      'style="width:100%;height:130vh;min-height:900px;border:1px solid var(--color-line);background:var(--color-surface);"></iframe>';
  }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });
    applyStaticText(lang);
    renderSkills(lang);
    renderExperience(lang);
    renderEducation(lang);
    renderProjects(lang);
    renderEmbed();
    window.SITE_CHROME.renderNav(lang, content, "resume");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SITE_CHROME.buildAll("");
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });
    setLang(currentLang);
  });
})();
