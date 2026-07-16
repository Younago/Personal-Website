// ---------------------------------------------------------------------------
// Shared site chrome: topbar (menu + language toggle), full-screen nav
// overlay, and footer. Every page includes three empty containers —
// #chromeTop, #chromeNav, #chromeFooter — and this script fills them in,
// so the nav markup only has to be maintained in one place.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  // Desktop (>900px) shows a persistent horizontal tab strip in the topbar
  // instead of the hamburger; mobile/tablet (<=900px) keeps the hamburger +
  // full-screen overlay. Both are built here and toggled purely with CSS
  // media queries (see .topbar-tabs / .menu-btn rules in style.css) so there
  // is only one JS-side nav-order source of truth (renderNav below).
  function buildTopbar() {
    var el = document.getElementById("chromeTop");
    if (!el) return;
    el.className = "topbar";
    el.innerHTML =
      '<button class="menu-btn" id="menuBtn" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '<ul class="topbar-tabs" id="topbarTabs"></ul>' +
      '<div class="lang-toggle" role="group" aria-label="Language">' +
      '<button data-lang="en" aria-pressed="true">EN</button>' +
      '<button data-lang="zh" aria-pressed="false">中</button>' +
      "</div>";
  }

  function buildNavOverlay() {
    var el = document.getElementById("chromeNav");
    if (!el) return;
    // The <nav id="chromeNav"> placeholder starts as a plain, unstyled
    // element. The instant we hand it the "nav-overlay" class, its computed
    // transform jumps from "none" (fully visible — inset:0 with no offset)
    // to the class's own closed state (translateY(-100%)). Because the
    // class also carries `transition: transform 0.5s`, the browser animates
    // that jump — so on *every single page load* the overlay would flash
    // open, then visibly slide shut, even though nobody clicked the menu.
    // Suppress the transition for this first, synthetic state change only:
    // apply the class with transitions hard-disabled, force a layout flush
    // so the disabled state actually takes effect, then hand transitions
    // back on the next frame so the real open/close click animation still
    // works normally afterward.
    el.style.transition = "none";
    el.className = "nav-overlay";
    el.innerHTML =
      '<ul id="navList"></ul>' +
      '<div class="nav-overlay-panel">' +
      '<div class="panel-photo"><img id="navPanelPhoto" src="" alt="" /></div>' +
      '<p class="panel-quote" id="navPanelQuote"></p>' +
      "</div>";
    void el.offsetHeight; // force a synchronous layout flush
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transition = "";
      });
    });
  }

  function buildFooter() {
    var el = document.getElementById("chromeFooter");
    if (!el) return;
    el.innerHTML =
      '<span data-i18n="footer.note"></span>' +
      '<span class="mono">© <span id="year"></span> <span data-i18n="site.name"></span></span>';
  }

  function initMenu() {
    var btn = document.getElementById("menuBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var isOpen = document.body.classList.toggle("menu-open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.body.classList.remove("menu-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
    // Chrome's back/forward cache can restore a page with "menu-open" still
    // set on <body> (e.g. the user opened the menu, followed a nav link, then
    // hit Back). Without this, every bfcache restore replays the slide-down
    // open animation even though nothing was clicked. Force-close on every
    // page (re)entry, including bfcache restores, so the menu only ever
    // opens in direct response to a click.
    window.addEventListener("pageshow", function () {
      document.body.classList.remove("menu-open");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  function buildThemeToggle() {
    if (document.getElementById("themeToggle")) return;
    var btn = document.createElement("button");
    btn.id = "themeToggle";
    btn.className = "theme-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Toggle dark mode");
    btn.innerHTML =
      '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>' +
      '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>';
    btn.addEventListener("click", function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      var next = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("site-theme", next); } catch (e) {}
    });
    document.body.appendChild(btn);
  }

  function initYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  // Floating "back to top" pill — appears once the page has scrolled past
  // roughly one viewport height, stacked directly above the theme toggle.
  function buildBackToTop() {
    if (document.getElementById("backToTop")) return;
    var btn = document.createElement("button");
    btn.id = "backToTop";
    btn.className = "back-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"></path><path d="M5 12l7-7 7 7"></path></svg>';
    document.body.appendChild(btn);

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    var ticking = false;
    function updateVisibility() {
      ticking = false;
      var threshold = window.innerHeight * 0.6;
      btn.classList.toggle("is-visible", window.scrollY > threshold);
    }
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(updateVisibility);
      },
      { passive: true }
    );
    updateVisibility();
  }

  // Nav link targets are pages (not anchors) — every top-level section has
  // its own page now, per the site's "jump to a dedicated page" model.
  // `home` is prefixed with `root` (empty string on the homepage itself,
  // or the relative path back to the site root from subfolders).
  window.SITE_CHROME = {
    buildAll: function (root) {
      root = root || "";
      buildTopbar();
      buildNavOverlay();
      buildFooter();
      buildThemeToggle();
      buildBackToTop();
      initMenu();
      initYear();
      window.SITE_CHROME._root = root;
    },
    renderNav: function (lang, content, activeKey) {
      var list = document.getElementById("navList");
      if (!list) return;
      var dict = content[lang].nav;
      var root = window.SITE_CHROME._root || "";
      // Experience, Education, and Contact no longer have standalone pages
      // (folded into Resume / kept only as homepage sections), so they were
      // dropped from this order array entirely — removing them here removes
      // them from both the mobile overlay and the desktop tab strip at once.
      var order = [
        ["home", root + "index.html"],
        ["about", root + "about.html"],
        ["projects", root + "projects.html"],
        ["writing", root + "writing.html"],
        ["beyondWork", root + "beyond-work.html"],
        ["aiTool", root + "ai-feedback.html"],
        ["resume", root + "resume.html"],
      ];
      list.innerHTML = "";
      order.forEach(function (pair, i) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = pair[1];
        a.innerHTML = '<span class="num mono">' + String(i + 1).padStart(2, "0") + "</span>" + dict[pair[0]];
        if (pair[0] === activeKey) a.classList.add("active");
        a.addEventListener("click", function () {
          document.body.classList.remove("menu-open");
        });
        li.appendChild(a);
        list.appendChild(li);
      });

      // Desktop persistent tab strip — same order/labels, plain text links.
      var tabs = document.getElementById("topbarTabs");
      if (tabs) {
        tabs.innerHTML = "";
        order.forEach(function (pair) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = pair[1];
          a.textContent = dict[pair[0]];
          if (pair[0] === activeKey) a.classList.add("active");
          li.appendChild(a);
          tabs.appendChild(li);
        });
      }

      var photoEl = document.getElementById("navPanelPhoto");
      var hero = content[lang].hero;
      // Use the dedicated vertical nav photo rather than hero.portrait — that
      // field now holds the wide presentation banner image, which would crop
      // very awkwardly into this panel's tall 4:5 frame.
      if (photoEl && hero && (hero.navPhoto || hero.portrait)) {
        photoEl.src = root + (hero.navPhoto || hero.portrait);
        photoEl.alt = hero.name || "";
      }
      var quoteEl = document.getElementById("navPanelQuote");
      if (quoteEl && hero) quoteEl.textContent = hero.eyebrow || "";
    },
  };
})();
