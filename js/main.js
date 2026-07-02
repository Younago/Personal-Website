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

    var captionEl = document.getElementById("heroPhotoCaption");
    if (captionEl) captionEl.textContent = dict.hero.photoCaption || "";

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

  function renderSkills(lang) {
    var wrap = document.getElementById("skillCards");
    if (!wrap) return;
    wrap.innerHTML = "";
    content[lang].about.skills.forEach(function (skill) {
      var chip = document.createElement("span");
      chip.className = "skill-chip";
      chip.textContent = skill;
      wrap.appendChild(chip);
    });
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

  function renderExperience(lang) {
    var wrap = document.getElementById("experienceGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    content[lang].experience.items.forEach(function (item) {
      var el = document.createElement("div");
      el.className = "experience-item";
      var bullets = (item.bullets || [])
        .map(function (b) { return "<li>" + b + "</li>"; })
        .join("");
      el.innerHTML =
        '<p class="title">' + item.title + '</p>' +
        '<p class="org">' + item.org + (item.location ? " — " + item.location : "") + '</p>' +
        '<p class="dates mono">' + item.dates + '</p>' +
        '<ul class="detail-list">' + bullets + '</ul>';
      wrap.appendChild(el);
    });

    var stats = document.getElementById("statsRow");
    if (stats && content[lang].experience.stats) {
      stats.innerHTML = "";
      content[lang].experience.stats.forEach(function (s) {
        var el = document.createElement("div");
        el.className = "stat";
        el.innerHTML = '<p class="value">' + s.value + '</p><p class="label">' + s.label + '</p>';
        stats.appendChild(el);
      });
    }

    var track = document.getElementById("marqueeTrack");
    if (track) {
      var photos = content[lang].projects.items.map(function (p) { return p.image; });
      if (content[lang].hero.workPhotos) photos = photos.concat(content[lang].hero.workPhotos);
      if (content[lang].hero.portrait) photos.unshift(content[lang].hero.portrait);
      var doubled = photos.concat(photos);
      track.innerHTML = doubled
        .map(function (src) { return '<img class="marquee-photo" src="' + src + '" alt="" />'; })
        .join("");
    }
  }

  function renderEducation(lang) {
    var wrap = document.getElementById("educationGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    content[lang].education.items.forEach(function (item) {
      var el = document.createElement("div");
      el.className = "education-item";
      el.innerHTML =
        '<h3>' + item.degree + '</h3>' +
        '<p class="school">' + item.school + (item.location ? " — " + item.location : "") + '</p>' +
        '<p class="dates mono">' + item.dates + '</p>';
      wrap.appendChild(el);
    });
  }

  function renderBlog(lang) {
    var wrap = document.getElementById("blogList");
    if (!wrap) return;
    wrap.innerHTML = "";
    // Posts with a `slug` have a real article page (writing-post.html) and
    // are rendered as links. Posts without one are still placeholders, so
    // they render as plain (non-navigating) rows — a href="#" here used to
    // just scroll the homepage back up to its own top, which read as a
    // broken "clicking an article sends me back to the homepage" bug.
    content[lang].blog.items.slice(0, 3).forEach(function (post) {
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

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });
    applyStaticText(lang);
    renderSkills(lang);
    renderProjects(lang);
    renderExperience(lang);
    renderEducation(lang);
    renderBlog(lang);
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
