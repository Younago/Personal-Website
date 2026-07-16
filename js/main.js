(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var content = window.SITE_CONTENT;
  var currentLang = (function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) {
      /* localStorage unavailable — fall back to default */
    }
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
    var emailEl = document.getElementById("contactEmail");
    if (emailEl) emailEl.href = "mailto:" + dict.contact.email;

    var readMore = document.getElementById("aboutReadMore");
    if (readMore) {
      readMore.textContent = dict.about.readMore;
      readMore.href = dict.about.readMoreHref;
    }

    var blogReadMore = document.getElementById("blogReadMore");
    if (blogReadMore) blogReadMore.textContent = dict.blog.viewAll;

    var portraitEl = document.getElementById("heroPortrait");
    if (portraitEl && dict.hero.portrait) portraitEl.src = dict.hero.portrait;

    var nameEl = document.getElementById("heroName");
    if (nameEl) {
      nameEl.innerHTML = "";
      dict.hero.nameLines.forEach(function (line) {
        var span = document.createElement("span");
        span.className = "name-line";
        span.textContent = line;
        nameEl.appendChild(span);
      });
    }
  }

  function renderProjects(lang) {
    var wrap = document.getElementById("projectsGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    var items = content[lang].projects.items;
    items.forEach(function (p, i) {
      var card = document.createElement("a");
      card.className = "project-card" + (p.placeholder ? " is-placeholder" : "");
      card.href = p.href;
      card.innerHTML =
        '<div class="project-thumb"><img src="' + p.image + '" alt="' + p.title + ' placeholder image" /></div>' +
        '<div class="project-meta"><span class="index mono">' + String(i + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0") + '</span>' +
        '<span class="project-tag mono">' + p.tag + '</span></div>' +
        '<h3>' + p.title + '</h3>' +
        '<p class="project-role">' + p.role + '</p>' +
        '<p class="project-summary">' + p.summary + '</p>';
      wrap.appendChild(card);
    });
  }

  // The decorative scrolling photo strip lives on its own now — it used to
  // be built as a tail effect of renderExperience(), but the homepage
  // Experience block (job history, duplicate of the résumé) was removed
  // while the strip itself stays as a visual element between Projects and
  // Education.
  function renderMarquee(lang) {
    var track = document.getElementById("marqueeTrack");
    if (!track) return;
    var photos = content[lang].projects.items.map(function (p) { return p.image; });
    if (content[lang].hero.workPhotos) photos = photos.concat(content[lang].hero.workPhotos);
    if (content[lang].hero.portrait) photos.unshift(content[lang].hero.portrait);
    var doubled = photos.concat(photos);
    track.innerHTML = doubled
      .map(function (src) { return '<img class="marquee-photo" src="' + src + '" alt="" />'; })
      .join("");
  }

  // Education and Writing are no longer shown as homepage sections (per
  // feedback — kept only as standalone pages / part of the résumé), so
  // their renderers were removed along with the corresponding <section>
  // blocks in index.html. writing.html has its own renderer in pages.js.

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });
    applyStaticText(lang);
    renderProjects(lang);
    renderMarquee(lang);
    window.SITE_CHROME.renderNav(lang, content, "home");
  }

  function initLangToggle() {
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-lang"));
      });
    });
  }

  function initScrollReveal() {
    var targets = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (t) { t.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach(function (t) { observer.observe(t); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SITE_CHROME.buildAll("");
    initLangToggle();
    setLang(currentLang);
    initScrollReveal();
    // Trigger the hero entrance animation on the next frame so the
    // transition is visible rather than instant.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.add("loaded");
      });
    });
  });
})();
