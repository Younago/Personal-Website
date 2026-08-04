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

    // contact.website is deliberately per-language: English visitors get a
    // LinkedIn URL, Chinese visitors get a WeChat ID. So the value can be
    // either a link or a plain handle, and the markup has to cope with both.
    // A URL is linked (and displayed without the "https://www." prefix and
    // trailing slash, which would otherwise wrap awkwardly inside its
    // contact-grid column); anything else has its href stripped so a WeChat
    // ID never turns into a dead link, and .is-plain drops the link styling.
    var siteEl = document.getElementById("contactWebsite");
    if (siteEl && dict.contact.website) {
      var value = dict.contact.website;
      var isUrl = /^https?:\/\//i.test(value) || /^(www\.|[\w-]+(\.[\w-]+)+\/)/i.test(value);
      if (isUrl) {
        siteEl.href = /^https?:\/\//i.test(value) ? value : "https://" + value;
        siteEl.textContent = value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");
        siteEl.classList.remove("is-plain");
      } else {
        siteEl.removeAttribute("href");
        siteEl.textContent = value;
        siteEl.classList.add("is-plain");
      }
    }

    var readMore = document.getElementById("aboutReadMore");
    if (readMore) {
      readMore.textContent = dict.about.readMore;
      readMore.href = dict.about.readMoreHref;
    }

    var blogReadMore = document.getElementById("blogReadMore");
    if (blogReadMore) blogReadMore.textContent = dict.blog.viewAll;

    // The banner has its own file. hero.portrait is the 4:3 original and is
    // still what the About page and the marquee use; heroBanner is that same
    // photo pre-cropped to ~2:1, so the widescreen strip starts from a frame
    // that is already the right shape instead of asking object-fit to throw
    // away a third of the picture at display time.
    var portraitEl = document.getElementById("heroPortrait");
    var bannerSrc = dict.hero.heroBanner || dict.hero.portrait;
    if (portraitEl && bannerSrc) portraitEl.src = bannerSrc;

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
      // An item with an `external` link (store page, playable build) needs a
      // second link inside the card. A nested <a> is invalid, so the card is
      // wrapped and the external link sits alongside it, pinned over the
      // thumbnail — same pattern as the Projects page grid in js/pages.js.
      var host = wrap;
      if (p.external) {
        host = document.createElement("div");
        host.className = "project-card-wrap";
        wrap.appendChild(host);
      }
      var card = document.createElement("a");
      card.className = "project-card" + (p.placeholder ? " is-placeholder" : "");
      card.href = p.href;
      card.innerHTML =
        '<div class="project-thumb"><img src="' + p.image + '" alt="' + p.title + ' placeholder image" /></div>' +
        // Card number only — the "/ 04" total that used to follow it was
        // dropped, since the grid already shows how many cards there are.
        '<div class="project-meta"><span class="index mono">' + String(i + 1).padStart(2, "0") + '</span>' +
        '<span class="project-tag mono">' + p.tag + '</span></div>' +
        '<h3>' + p.title + '</h3>' +
        '<p class="project-role">' + p.role + '</p>' +
        '<p class="project-summary">' + p.summary + '</p>';
      host.appendChild(card);
      if (host !== wrap) {
        var ext = document.createElement("a");
        ext.className = "card-external mono";
        ext.href = p.external.href;
        ext.target = "_blank";
        ext.rel = "noopener";
        ext.textContent = p.external.label;
        ext.setAttribute("aria-label", p.title + " — " + p.external.label);
        host.appendChild(ext);
      }
    });
  }

  // The decorative scrolling photo strip lives on its own now — it used to
  // be built as a tail effect of renderExperience(), but the homepage
  // Experience block (job history, duplicate of the résumé) was removed
  // while the strip itself stays as a visual element between Projects and
  // Education.
  // The strip is photographs of the work happening — presentations, playtests,
  // studio visits — and deliberately not project artwork. It used to lead with
  // the images from projects.items, which meant key art and cover images
  // scrolling past a few hundred pixels below the Projects grid that had just
  // shown the same pictures at a useful size, plus a placeholder SVG for every
  // project that doesn't have art yet.
  function renderMarquee(lang) {
    var track = document.getElementById("marqueeTrack");
    if (!track) return;
    var photos = (content[lang].hero.workPhotos || []).slice();
    if (content[lang].hero.portrait) photos.unshift(content[lang].hero.portrait);
    if (!photos.length) return;
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
