// ---------------------------------------------------------------------------
// Scroll-entrance motion (projects.html)
// ---------------------------------------------------------------------------
// Two effects, both driven by one IntersectionObserver:
//
//   1. Staggered reveal — headings are split into per-word units that slide up
//      out of an overflow:hidden mask, each one delayed a little more than the
//      last. Body copy and card chrome use a lighter fade-up variant.
//   2. Card cascade — when a project card enters the viewport its parts
//      (thumb / meta / title / role / summary / tags) come in one after
//      another instead of all at once.
//
// Why this file is a plain <script> in projects.html rather than injected from
// chrome.js the way backdrop.js and edit-mode.js are: everything on this page
// is rendered by pages.js at parse time, so an async-injected script would land
// *after* the cards are already painted — the first screen would flash visible,
// then hide itself, then animate. Loading before pages.js lets pages.js call
// SITE_MOTION.scan() in the same task it renders in, so nothing ever flashes.
//
// Nothing here is required for the page to be readable: the "hidden" start
// state lives behind html.motion-ready, a class only this script adds, and only
// when the visitor has not asked for reduced motion. If the file fails to load,
// or prefers-reduced-motion is on, every element simply stays where it is.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var supported = "IntersectionObserver" in window;

  if (prefersReduced || !supported) {
    window.SITE_MOTION = { scan: function () {} };
    return;
  }

  document.documentElement.classList.add("motion-ready");

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target); // one-way: never animate back out
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
  );

  // Split a heading into word units. Each word is <span class="mo-line"><i>…</i></span>:
  // the span is the mask (overflow:hidden), the <i> is what actually moves.
  // Splitting by word rather than by character keeps CJK headings readable and
  // leaves the DOM's text content intact for copy/paste and screen readers.
  // The guard checks for existing mask spans rather than a "done" flag on
  // purpose: switching language calls applyStaticText(), which overwrites
  // textContent and wipes the spans out. Looking for the spans means the
  // heading gets re-split after a language switch instead of silently
  // staying plain text.
  function splitWords(el) {
    if (el.querySelector(".mo-line")) return;
    var text = (el.textContent || "").trim();
    if (!text) return;

    var words = text.split(/\s+/);
    // A CJK heading is usually one long "word"; split it per character so the
    // stagger is still visible. Per-character units must NOT be rejoined with
    // spaces afterwards — "项目" would render as "项 目".
    var spaced = true;
    if (words.length === 1 && /[一-龥]/.test(text)) {
      words = text.split("");
      spaced = false;
    }

    var frag = document.createDocumentFragment();
    words.forEach(function (word, i) {
      var mask = document.createElement("span");
      mask.className = "mo-line";
      mask.style.setProperty("--i", i);
      var inner = document.createElement("i");
      inner.textContent = word;
      mask.appendChild(inner);
      frag.appendChild(mask);
      if (spaced && i < words.length - 1) frag.appendChild(document.createTextNode(" "));
    });

    el.textContent = "";
    el.appendChild(frag);
  }

  function watch(el) {
    if (!el || el.getAttribute("data-mo") === "on") return;
    el.setAttribute("data-mo", "on");
    io.observe(el);
  }

  // Headings get the word-by-word treatment; everything else fades up.
  var HEADINGS = ".resume-header h1, .resume-section > h2";
  var FADES = ".resume-section > .resume-summary, .page-contact-cta";

  function scan(scope) {
    var box = scope || document;

    box.querySelectorAll(HEADINGS).forEach(function (el) {
      splitWords(el);
      el.classList.add("mo-head");
      watch(el);
    });

    box.querySelectorAll(FADES).forEach(function (el) {
      el.classList.add("mo-fade");
      watch(el);
    });

    // Cards: the card is the trigger, its children carry the cascade index.
    box.querySelectorAll(".project-card").forEach(function (card) {
      if (card.getAttribute("data-mo") !== "on") {
        var parts = card.querySelectorAll(
          ".project-thumb, .project-meta, h3, .project-role, .project-summary, .project-tags"
        );
        parts.forEach(function (part, i) {
          part.classList.add("mo-part");
          part.style.setProperty("--i", i);
        });
      }
      watch(card);
    });
  }

  // pages.js calls this right after it rebuilds a grid (including on language
  // switch, which throws the old cards away and renders new ones).
  window.SITE_MOTION = { scan: scan };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      scan();
    });
  } else {
    scan();
  }
})();
