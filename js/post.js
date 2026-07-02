// ---------------------------------------------------------------------------
// Renderer for writing-post.html — a single generic article template.
// Which post to show comes from ?slug=... in the URL; the post's own content
// (title/date/category/body/pullQuote) lives in content[lang].blog.items.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var content = window.SITE_CONTENT;
  var root = document.body.getAttribute("data-root") || "";

  var slug = (function () {
    var params = new URLSearchParams(window.location.search);
    return params.get("slug") || "";
  })();

  var currentLang = (function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) {}
    return "en";
  })();

  function findPost(lang) {
    var items = (content[lang].blog && content[lang].blog.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].slug === slug) return items[i];
    }
    return null;
  }

  function render(lang) {
    var b = content[lang].blog;
    var post = findPost(lang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var path = el.getAttribute("data-i18n");
      var value = path.split(".").reduce(function (acc, k) {
        return acc && acc[k] !== undefined ? acc[k] : undefined;
      }, content[lang]);
      if (typeof value === "string") el.textContent = value;
    });

    var main = document.getElementById("postMain");
    if (!post) {
      document.title = b.heading + " — " + content[lang].site.name;
      main.innerHTML =
        '<p class="resume-summary">' +
        (lang === "zh" ? "没有找到这篇文章。" : "This post could not be found.") +
        '</p><p><a class="link-more mono" href="' + root + 'writing.html">' +
        (lang === "zh" ? "← 返回文章列表" : "← Back to Writing") +
        "</a></p>";
      return;
    }

    document.title = post.title + " — " + content[lang].site.name;

    document.getElementById("postCategory").textContent = post.category;
    document.getElementById("postDate").textContent = post.date;
    document.getElementById("postTitle").textContent = post.title;

    var excerptEl = document.getElementById("postExcerpt");
    if (post.excerpt) {
      excerptEl.style.display = "";
      excerptEl.textContent = post.excerpt;
    } else {
      excerptEl.style.display = "none";
    }

    var bodyWrap = document.getElementById("postBody");
    bodyWrap.innerHTML = "";
    (post.body || []).forEach(function (para, i) {
      var p = document.createElement("p");
      p.className = "resume-summary";
      p.style.maxWidth = "none";
      p.textContent = para;
      bodyWrap.appendChild(p);

      // Drop the pull-quote in roughly the middle of the article, matching
      // the reference template's layout.
      if (post.pullQuote && i === Math.floor((post.body.length - 1) / 2)) {
        var q = document.createElement("blockquote");
        q.className = "post-pullquote";
        q.textContent = post.pullQuote;
        bodyWrap.appendChild(q);
      }
    });

    renderRecent(lang, post, b);

    var c = content[lang].contact;
    document.getElementById("pageContactCta").innerHTML =
      '<p class="lead">' + c.lead + "</p>" +
      '<div class="details">' +
      c.locationLabel + ": " + c.location + "<br>" +
      c.emailLabel + ': <a href="mailto:' + c.email + '">' + c.email + "</a><br>" +
      c.websiteLabel + ": " + c.website +
      "</div>";
  }

  function renderRecent(lang, current, b) {
    var wrap = document.getElementById("recentPosts");
    var heading = document.getElementById("recentHeading");
    var viewAll = document.getElementById("recentViewAll");
    if (heading) heading.textContent = b.recentLabel || "Recent Posts";
    if (viewAll) {
      viewAll.textContent = b.viewAllPosts || b.viewAll || "View all posts →";
      viewAll.href = root + "writing.html";
    }
    if (!wrap) return;
    var others = (b.items || []).filter(function (p) { return p !== current; }).slice(0, 2);
    wrap.innerHTML = "";
    others.forEach(function (post) {
      var row = document.createElement(post.slug ? "a" : "div");
      row.className = "blog-row";
      if (post.slug) row.href = root + "writing-post.html?slug=" + encodeURIComponent(post.slug);
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
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    render(lang);
    window.SITE_CHROME.renderNav(lang, content, "writing");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SITE_CHROME.buildAll(root);
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });
    setLang(currentLang);
  });
})();
