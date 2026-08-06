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

  }





  // There are two resume PDFs — an English one and a Chinese one — and the
  // language toggle picks between them. The iframe is only rebuilt when the
  // file actually changes: re-assigning the same src would reload the PDF
  // viewer and throw away the reader's scroll position on every toggle.
  function renderEmbed(lang) {
    var wrap = document.getElementById("resumeEmbedWrap");
    if (!wrap) return;
    var href = content[lang].resumePage.pdfHref || "ZhongyinGou_resume.pdf";
    if (wrap.getAttribute("data-src") === href) return;
    wrap.setAttribute("data-src", href);
    wrap.innerHTML =
      '<iframe src="' + href + '" title="Resume PDF" ' +
      'style="width:100%;height:130vh;min-height:900px;border:1px solid var(--color-line);background:var(--color-surface);"></iframe>';
  }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });
    applyStaticText(lang);
    renderEmbed(lang);
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
