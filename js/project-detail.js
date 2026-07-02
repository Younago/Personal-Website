// ---------------------------------------------------------------------------
// Shared renderer for team-project / individual-project detail pages.
// <body data-project="tgp2"> picks which content[lang].<key> object to render.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var content = window.SITE_CONTENT;
  var key = document.body.getAttribute("data-project");
  var root = document.body.getAttribute("data-root") || "../";

  var currentLang = (function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) {}
    return "en";
  })();

  function get(obj, path) {
    return path.split(".").reduce(function (acc, k) {
      return acc && acc[k] !== undefined ? acc[k] : undefined;
    }, obj);
  }

  function render(lang) {
    var d = content[lang][key];
    document.title = d.gameName || d.projectName;

    // Fill any generic data-i18n elements (e.g. the shared footer built by chrome.js).
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = get(content[lang], el.getAttribute("data-i18n"));
      if (typeof value === "string") el.textContent = value;
    });

    document.getElementById("backLink").textContent = d.backLink;
    document.getElementById("tagLabel").textContent = d.tagLabel;
    document.getElementById("projectName").textContent = d.gameName || d.projectName;
    var imgEl = document.getElementById("detailImage");
    if (imgEl && d.image) imgEl.src = d.image;

    var metaWrap = document.getElementById("projectMeta");
    var rows = [
      [d.roleLabel, d.role],
      [d.teamSizeLabel, d.teamSize],
      [d.lengthLabel, d.length],
    ];
    if (d.platformLabel) rows.push([d.platformLabel, d.platform]);
    metaWrap.innerHTML = rows
      .map(function (r) {
        return '<div><p class="label mono">' + r[0] + '</p><p class="value">' + r[1] + "</p></div>";
      })
      .join("");

    document.getElementById("synopsisHeading").textContent = d.synopsisHeading;
    document.getElementById("synopsisBody").textContent = d.synopsis;

    var trailerSection = document.getElementById("trailerSection");
    if (d.trailerHeading) {
      trailerSection.style.display = "";
      document.getElementById("trailerHeading").textContent = d.trailerHeading;
      document.getElementById("trailerBody").textContent = d.trailerNote;
      var trailerEmbed = document.getElementById("trailerEmbed");
      if (trailerEmbed) {
        if (d.trailerVideoId) {
          trailerEmbed.style.display = "";
          trailerEmbed.innerHTML =
            '<iframe src="https://www.youtube.com/embed/' +
            d.trailerVideoId +
            '" title="' +
            (d.gameName || d.projectName) +
            ' trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
        } else {
          trailerEmbed.style.display = "none";
          trailerEmbed.innerHTML = "";
        }
      }
    } else {
      trailerSection.style.display = "none";
    }

    document.getElementById("respHeading").textContent = d.responsibilitiesHeading;
    document.getElementById("respList").innerHTML = d.responsibilities.map(function (r) { return "<li>" + r + "</li>"; }).join("");

    document.getElementById("shotsHeading").textContent = d.screenshotsHeading;
    document.getElementById("shotsBody").textContent = d.screenshotsNote;
    var shotsGrid = document.getElementById("shotsGrid");
    if (shotsGrid) {
      if (d.screenshots && d.screenshots.length) {
        shotsGrid.style.display = "";
        shotsGrid.innerHTML = d.screenshots
          .map(function (src, i) {
            return '<img src="' + src + '" alt="' + (d.gameName || d.projectName) + " screenshot " + (i + 1) + '" loading="lazy" />';
          })
          .join("");
      } else {
        shotsGrid.style.display = "none";
      }
    }

    document.getElementById("postHeading").textContent = d.postmortemHeading;
    document.getElementById("postBody").textContent = d.postmortem;

    renderRelated(lang);

    var c = content[lang].contact;
    document.getElementById("pageContactCta").innerHTML =
      '<p class="lead">' + c.lead + "</p>" +
      '<div class="details">' +
      c.locationLabel + ": " + c.location + "<br>" +
      c.emailLabel + ': <a href="mailto:' + c.email + '">' + c.email + "</a><br>" +
      c.websiteLabel + ": " + c.website +
      "</div>";
  }

  function renderRelated(lang) {
    var wrap = document.getElementById("relatedProjects");
    if (!wrap) return;
    var all = content[lang].teamProjects.list.concat(content[lang].individualProjects.list);
    var others = all.filter(function (p) { return p.id !== key; }).slice(0, 3);
    var heading = document.getElementById("relatedHeading");
    if (heading) heading.textContent = content[lang].projects.relatedHeading || "Related Projects";
    wrap.innerHTML = others
      .map(function (p) {
        return (
          '<a class="related-card" href="' + root + p.href + '">' +
          '<span class="related-tag mono">' + p.tag + "</span>" +
          "<h4>" + p.name + "</h4></a>"
        );
      })
      .join("");
  }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    render(lang);
    window.SITE_CHROME.renderNav(lang, content, "projects");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SITE_CHROME.buildAll(root);
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });
    setLang(currentLang);
  });
})();
