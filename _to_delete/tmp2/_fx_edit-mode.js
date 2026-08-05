// ---------------------------------------------------------------------------
// Hidden "edit mode" helper.
//
// There is deliberately NO visible entry point: the tool only wakes up when
// somebody types the literal sequence `editmode` on the page (outside of any
// input/textarea/contenteditable, with less than 0.8s between keystrokes).
//
// Nothing here can touch the server. This site is a pile of static files with
// no backend and no database, so every change made in edit mode lives only in
// the editing browser's memory + localStorage. The single path from "I edited
// some text" to "the live site changed" is: export the JSON, hand it to Claude
// (or edit by hand), commit, push. A random visitor who discovers the sequence
// can only rearrange their own copy of the page until they reload.
//
// Loaded dynamically by chrome.js on every page, so no HTML file has to carry
// a <script> tag for it.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var TRIGGER = "editmode";
  var KEY_TIMEOUT = 800; // ms between keystrokes before the buffer resets
  var STORAGE_KEY = "site-edit-draft";

  var active = false;
  var buffer = "";
  var lastKeyAt = 0;
  var toolbar = null;
  var countEl = null;
  var draft = null;

  // Which page we are on — used to namespace <title> and custom-text edits,
  // since those are per-file rather than per-i18n-key.
  function pageId() {
    var path = window.location.pathname.replace(/\/+$/, "");
    var name = path.split("/").pop();
    if (!name) name = "index.html";
    // Keep one level of folder for the project subpages so that e.g.
    // team-projects/tgp1.html doesn't collide with individual-projects/tgp1.html.
    var parts = path.split("/").filter(Boolean);
    if (parts.length > 1) return parts.slice(-2).join("/");
    return name;
  }

  // -------------------------------------------------------------------------
  // Draft storage
  // -------------------------------------------------------------------------
  function emptyDraft() {
    return { i18n: {}, titles: {}, custom: {} };
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyDraft();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return emptyDraft();
      return {
        i18n: parsed.i18n && typeof parsed.i18n === "object" ? parsed.i18n : {},
        titles: parsed.titles && typeof parsed.titles === "object" ? parsed.titles : {},
        custom: parsed.custom && typeof parsed.custom === "object" ? parsed.custom : {},
      };
    } catch (e) {
      return emptyDraft();
    }
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {}
    updateCount();
  }

  function countEdits() {
    var n = Object.keys(draft.i18n).length + Object.keys(draft.titles).length;
    Object.keys(draft.custom).forEach(function (page) {
      n += Object.keys(draft.custom[page] || {}).length;
    });
    return n;
  }

  function updateCount() {
    if (countEl) countEl.textContent = "已记录 " + countEdits() + " 处修改";
  }

  // -------------------------------------------------------------------------
  // Styles (scoped with an edm- prefix so nothing collides with site CSS)
  // -------------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById("edmStyles")) return;
    var style = document.createElement("style");
    style.id = "edmStyles";
    style.textContent = [
      ".edm-on [contenteditable='true'].edm-editable{outline:1px dashed #4a90d9;outline-offset:2px;border-radius:2px;cursor:text;}",
      ".edm-on [contenteditable='true'].edm-editable:focus{outline:2px solid #4a90d9;background:rgba(74,144,217,0.08);}",
      ".edm-on .edm-changed{background:rgba(74,144,217,0.14);}",
      // Links are inert while editing (see swallowNavigation) — don't let them
      // keep advertising themselves as clickable.
      ".edm-on a{cursor:default;}",
      ".edm-on a [contenteditable='true'].edm-editable,.edm-on a[contenteditable='true'].edm-editable{cursor:text;}",
      ".edm-badge{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-left:4px;vertical-align:middle;border:none;border-radius:50%;background:#e08a2e;color:#fff;font-size:11px;line-height:1;cursor:pointer;padding:0;}",
      ".edm-bar{position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 14px;background:#1b1d21;color:#f2f3f5;font:13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;box-shadow:0 -4px 18px rgba(0,0,0,0.35);}",
      ".edm-bar strong{font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8fb8e0;}",
      ".edm-bar label{display:flex;align-items:center;gap:6px;flex:1 1 260px;min-width:180px;}",
      ".edm-bar input{flex:1;min-width:120px;padding:5px 8px;border:1px solid #3a3d44;border-radius:4px;background:#26282d;color:#f2f3f5;font:inherit;}",
      ".edm-bar button{padding:5px 11px;border:1px solid #3a3d44;border-radius:4px;background:#2f3238;color:#f2f3f5;font:inherit;cursor:pointer;}",
      ".edm-bar button:hover{background:#3b3f47;}",
      ".edm-bar .edm-primary{background:#4a90d9;border-color:#4a90d9;}",
      ".edm-bar .edm-primary:hover{background:#5b9fe4;}",
      ".edm-bar .edm-count{color:#b9bec7;}",
      ".edm-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:100000;padding:8px 14px;border-radius:4px;background:#1b1d21;color:#f2f3f5;font:13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,0.3);}",
      "@media (max-width:600px){.edm-bar{font-size:12px;padding:8px 10px;gap:8px;}.edm-bar label{flex:1 1 100%;}}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function toast(msg) {
    var el = document.createElement("div");
    el.className = "edm-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2200);
  }

  // -------------------------------------------------------------------------
  // A stable-enough selector for text that has no i18n key. Only used for the
  // handful of hardcoded strings (mainly the "← Back to site" links), so a
  // simple structural path is plenty.
  // -------------------------------------------------------------------------
  function selectorFor(el) {
    if (el.id) return "#" + el.id;
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      var part = node.tagName.toLowerCase();
      if (node.className && typeof node.className === "string") {
        var cls = node.className
          .split(/\s+/)
          .filter(function (c) {
            return c && c.indexOf("edm-") !== 0;
          })
          .slice(0, 2);
        if (cls.length) part += "." + cls.join(".");
      }
      var parent = node.parentNode;
      if (parent && parent.nodeType === 1) {
        var same = [];
        for (var i = 0; i < parent.children.length; i++) {
          if (parent.children[i].tagName === node.tagName) same.push(parent.children[i]);
        }
        if (same.length > 1) part += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(" > ");
  }

  // Elements holding user-visible text that is NOT driven by an i18n key.
  // Restricted to <main>, .profile-bar and a top-level <header> so we never
  // touch nav/footer markup, which chrome.js re-renders (and would therefore
  // silently overwrite any edit on the next language switch).
  function customTextElements() {
    var roots = [];
    var main = document.querySelector("main");
    if (main) roots.push(main);
    Array.prototype.push.apply(roots, Array.prototype.slice.call(document.querySelectorAll(".profile-bar")));
    var header = document.querySelector("body > header");
    if (header) roots.push(header);

    var out = [];
    roots.forEach(function (root) {
      var all = root.querySelectorAll("a, p, span, h1, h2, h3, h4, li, button, figcaption, strong, em, td, th");
      Array.prototype.forEach.call(all, function (el) {
        if (el.hasAttribute("data-i18n")) return;
        if (el.closest("[data-i18n]")) return;
        if (el.querySelector("[data-i18n]")) return;
        // Text-only elements: no element children of their own.
        if (el.children.length) return;
        var text = (el.textContent || "").trim();
        if (!text) return;
        if (text.length > 300) return;
        out.push(el);
      });
    });
    return out;
  }

  // -------------------------------------------------------------------------
  // Activation
  // -------------------------------------------------------------------------
  function makeEditable(el, kind, key) {
    el.setAttribute("contenteditable", "true");
    el.classList.add("edm-editable");
    el.dataset.edmKind = kind;
    el.dataset.edmKey = key;
    el.dataset.edmOriginal = (el.textContent || "").trim();
    el.addEventListener("blur", onBlur);
  }

  // While edit mode is on, clicking anything that would navigate (or submit a
  // form) has to be swallowed — otherwise the project cards, whose whole body
  // is wrapped in an <a>, jump to the detail page the moment you click their
  // title to edit it. Registered in the capture phase on document so it also
  // covers the common case where the editable element is a *descendant* of the
  // link rather than the link itself. preventDefault only kills the navigation;
  // caret placement happens on mousedown and is unaffected, so text editing
  // still behaves normally.
  function swallowNavigation(e) {
    if (!active) return;
    if (!e.target.closest) return;
    if (e.target.closest(".edm-bar")) return; // toolbar stays live
    // The export button works by synthesizing a temporary <a download> and
    // clicking it. That anchor lives directly on <body>, outside the toolbar,
    // so without this escape hatch the guard below would cancel the very
    // download it is meant to protect.
    if (e.target.closest("[data-edm-skip]")) return;
    var link = e.target.closest("a, button[type='submit'], [role='link']");
    if (link) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function swallowSubmit(e) {
    if (active) e.preventDefault();
  }

  function onBlur(e) {
    var el = e.currentTarget;
    var text = (el.textContent || "").trim();
    var kind = el.dataset.edmKind;
    var key = el.dataset.edmKey;
    if (text === el.dataset.edmOriginal) {
      // Reverted back to the original — drop any previously recorded change.
      if (kind === "i18n") delete draft.i18n[key];
      else if (draft.custom[pageId()]) delete draft.custom[pageId()][key];
      el.classList.remove("edm-changed");
    } else {
      if (kind === "i18n") {
        draft.i18n[key] = text;
      } else {
        var page = pageId();
        if (!draft.custom[page]) draft.custom[page] = {};
        draft.custom[page][key] = { selector: key, text: text, original: el.dataset.edmOriginal };
      }
      el.classList.add("edm-changed");
    }
    saveDraft();
  }

  function attachPlaceholderBadges() {
    var fields = document.querySelectorAll("[data-i18n-placeholder]");
    Array.prototype.forEach.call(fields, function (field) {
      if (field.dataset.edmBadge) return;
      field.dataset.edmBadge = "1";
      var badge = document.createElement("button");
      badge.type = "button";
      badge.className = "edm-badge";
      badge.title = "编辑提示文字 (placeholder)";
      badge.textContent = "✎";
      badge.addEventListener("click", function () {
        var k = field.getAttribute("data-i18n-placeholder");
        var current = field.getAttribute("placeholder") || "";
        var next = window.prompt("修改提示文字 (placeholder):", current);
        if (next === null) return;
        field.setAttribute("placeholder", next);
        if (next.trim() === current.trim()) delete draft.i18n[k];
        else draft.i18n[k] = next;
        saveDraft();
      });
      if (field.parentNode) field.parentNode.insertBefore(badge, field.nextSibling);
    });
  }

  function buildToolbar() {
    toolbar = document.createElement("div");
    toolbar.className = "edm-bar";
    toolbar.innerHTML =
      "<strong>编辑模式</strong>" +
      '<label>页面标题 <input type="text" id="edmTitle" /></label>' +
      '<span class="edm-count" id="edmCount"></span>' +
      '<button type="button" class="edm-primary" id="edmExport">导出修改文件</button>' +
      '<button type="button" id="edmClear">清空记录</button>' +
      '<button type="button" id="edmExit">退出 (Esc)</button>';
    document.body.appendChild(toolbar);
    countEl = document.getElementById("edmCount");

    var page = pageId();
    var titleInput = document.getElementById("edmTitle");
    titleInput.value = document.title;
    titleInput.dataset.edmOriginal = document.title;
    titleInput.addEventListener("input", function () {
      document.title = titleInput.value;
      if (titleInput.value === titleInput.dataset.edmOriginal) delete draft.titles[page];
      else draft.titles[page] = { title: titleInput.value, original: titleInput.dataset.edmOriginal };
      saveDraft();
    });

    document.getElementById("edmExport").addEventListener("click", exportDraft);
    document.getElementById("edmClear").addEventListener("click", function () {
      if (!window.confirm("清空所有已记录的修改？（页面上已经改过的文字不会自动还原，刷新一下就回到原样）")) return;
      draft = emptyDraft();
      saveDraft();
      toast("已清空记录");
    });
    document.getElementById("edmExit").addEventListener("click", deactivate);
    updateCount();
  }

  function exportDraft() {
    if (!countEdits()) {
      toast("还没有任何修改");
      return;
    }
    var payload = {
      _说明:
        "把这个文件发给 Claude，说“帮我把这些修改落地”，它会自动改到 content.js 和相关 HTML 文件里，" +
        "确认无误后写回你电脑上的项目文件夹，你再用 GitHub Desktop 提交推送即可。",
      _exportedAt: new Date().toISOString(),
      i18n: draft.i18n,
      titles: draft.titles,
      custom: draft.custom,
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "site-edits.json";
    a.setAttribute("data-edm-skip", "1");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
    toast("已导出 site-edits.json");
  }

  function activate() {
    if (active) return;
    active = true;
    injectStyles();
    draft = loadDraft();
    document.body.classList.add("edm-on");

    var i18nEls = document.querySelectorAll("[data-i18n]");
    Array.prototype.forEach.call(i18nEls, function (el) {
      if (el.children.length) return; // container elements: leave their children editable instead
      makeEditable(el, "i18n", el.getAttribute("data-i18n"));
    });

    customTextElements().forEach(function (el) {
      makeEditable(el, "custom", selectorFor(el));
    });

    document.addEventListener("click", swallowNavigation, true);
    document.addEventListener("submit", swallowSubmit, true);

    attachPlaceholderBadges();
    buildToolbar();
    toast("编辑模式已开启 — 点击文字直接修改（链接已临时禁用），Esc 退出");
  }

  function deactivate() {
    if (!active) return;
    active = false;
    document.removeEventListener("click", swallowNavigation, true);
    document.removeEventListener("submit", swallowSubmit, true);
    document.body.classList.remove("edm-on");
    var els = document.querySelectorAll(".edm-editable");
    Array.prototype.forEach.call(els, function (el) {
      el.removeAttribute("contenteditable");
      el.classList.remove("edm-editable", "edm-changed");
      el.removeEventListener("blur", onBlur);
    });
    var badges = document.querySelectorAll(".edm-badge");
    Array.prototype.forEach.call(badges, function (b) {
      if (b.parentNode) b.parentNode.removeChild(b);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-edm-badge]"), function (f) {
      delete f.dataset.edmBadge;
    });
    if (toolbar && toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
    toolbar = null;
    countEl = null;
  }

  // -------------------------------------------------------------------------
  // The hidden trigger
  // -------------------------------------------------------------------------
  function isTypingTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && active) {
      deactivate();
      return;
    }
    if (active) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (!e.key || e.key.length !== 1) return;

    var now = Date.now();
    if (now - lastKeyAt > KEY_TIMEOUT) buffer = "";
    lastKeyAt = now;
    buffer = (buffer + e.key.toLowerCase()).slice(-TRIGGER.length);
    if (buffer === TRIGGER) {
      buffer = "";
      activate();
    }
  });

  window.SITE_EDIT_MODE = { activate: activate, deactivate: deactivate };
})();
