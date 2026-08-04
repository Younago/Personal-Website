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

  // Clips play only while they are on screen. Six autoplaying videos decoding
  // at once is a real cost on a laptop battery for something the visitor is
  // not looking at yet — and `autoplay` gives no way to stop once started.
  function playClipsWhenVisible(grid) {
    var clips = grid.querySelectorAll("video");
    if (!clips.length) return;
    if (!window.IntersectionObserver) {
      // No observer: fall back to plain autoplay rather than silent stills.
      Array.prototype.forEach.call(clips, function (v) { v.autoplay = true; v.play().catch(function () {}); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            // play() rejects if the browser blocks it; a paused poster is a
            // perfectly acceptable outcome, so the rejection is swallowed.
            v.play().catch(function () {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    Array.prototype.forEach.call(clips, function (v) { io.observe(v); });
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
    // An award is a fact about the project worth showing next to team size and
    // length, not buried in prose — but only Heart Arsonist has one, so the row
    // is optional like the platform row above it.
    if (d.awardLabel) rows.push([d.awardLabel, d.award]);
    metaWrap.innerHTML = rows
      .map(function (r) {
        return '<div><p class="label mono">' + r[0] + '</p><p class="value">' + r[1] + "</p></div>";
      })
      .join("");

    // Optional external links (store page, playable build, press kit). Absent on
    // every other project, so the container stays empty rather than rendering an
    // empty row.
    var linksWrap = document.getElementById("projectLinks");
    if (linksWrap) {
      linksWrap.innerHTML = (d.links || [])
        .map(function (l) {
          return '<a class="btn-download" href="' + l.href + '" target="_blank" rel="noopener">' + l.label + "</a>";
        })
        .join("");
    }

    document.getElementById("synopsisHeading").textContent = d.synopsisHeading;
    document.getElementById("synopsisBody").textContent = d.synopsis;

    var trailerSection = document.getElementById("trailerSection");
    if (d.trailerHeading) {
      trailerSection.style.display = "";
      document.getElementById("trailerHeading").textContent = d.trailerHeading;
      document.getElementById("trailerBody").textContent = d.trailerNote;
      var trailerEmbed = document.getElementById("trailerEmbed");
      if (trailerEmbed) {
        // A project can show either a YouTube trailer or a local looping clip.
        // The clip is an .mp4/.webm pair with a poster — same encoding as the
        // gameplay clips in the shots grid, and the same reason: a GIF of this
        // footage is several times the size for worse colour and no seek bar.
        // It is muted, looping and inline, so it reads exactly like a GIF.
        if (d.clip) {
          trailerEmbed.style.display = "";
          trailerEmbed.classList.add("is-clip");
          trailerEmbed.innerHTML =
            '<video poster="' + d.clip + '.jpg" muted loop playsinline preload="metadata"' +
            ' aria-label="' + (d.gameName || d.projectName) + ' gameplay clip">' +
            '<source src="' + d.clip + '.mp4" type="video/mp4" />' +
            '<source src="' + d.clip + '.webm" type="video/webm" />' +
            "</video>";
          playClipsWhenVisible(trailerEmbed);
        } else if (d.trailerVideoId) {
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
        if (!d.clip) trailerEmbed.classList.remove("is-clip");
      }
    } else {
      trailerSection.style.display = "none";
    }

    // Optional "Design" block: a project with a real design document has more
    // to say than the fixed synopsis field holds, but the other project pages
    // have nothing to put here — so both the container and the data are
    // optional and the section simply doesn't exist without them.
    var designWrap = document.getElementById("designSections");
    if (designWrap) {
      if (d.design && d.design.length) {
        designWrap.innerHTML =
          '<section class="resume-section"><h2>' + (d.designHeading || "") + "</h2>" +
          d.design
            .map(function (block) {
              return (
                '<div class="design-block">' +
                "<h3>" + (block.heading || "") + "</h3>" +
                (block.body ? '<p class="resume-summary">' + block.body + "</p>" : "") +
                (block.items && block.items.length
                  ? '<ul class="detail-list">' +
                    block.items.map(function (i) { return "<li>" + i + "</li>"; }).join("") +
                    "</ul>"
                  : "") +
                "</div>"
              );
            })
            .join("") +
          "</section>";
      } else {
        designWrap.innerHTML = "";
      }
    }

    // Caption under the hero image, for the same crediting reason.
    var imgCap = document.getElementById("detailImageCaption");
    if (imgCap) {
      imgCap.textContent = d.imageCaption || "";
      imgCap.style.display = d.imageCaption ? "" : "none";
    }

    document.getElementById("respHeading").textContent = d.responsibilitiesHeading;
    document.getElementById("respList").innerHTML = d.responsibilities.map(function (r) { return "<li>" + r + "</li>"; }).join("");

    document.getElementById("shotsHeading").textContent = d.screenshotsHeading;
    document.getElementById("shotsBody").textContent = d.screenshotsNote;
    var shotsGrid = document.getElementById("shotsGrid");
    if (shotsGrid) {
      if (d.screenshots && d.screenshots.length) {
        shotsGrid.style.display = "";
        // Entries may be a bare path or { src, caption }. Captions matter here
        // because the Box Shot images are teammates' concept art and models —
        // crediting each one next to the image is the point, not decoration.
        shotsGrid.innerHTML = d.screenshots
          .map(function (shot, i) {
            var src = typeof shot === "string" ? shot : shot.src;
            var caption = typeof shot === "string" ? "" : shot.caption || "";
            var alt = caption || (d.gameName || d.projectName) + " screenshot " + (i + 1);
            // A .mp4 entry renders as a looping, muted, inline video — these
            // are gameplay clips converted from the original GIFs, which were
            // 19 MB together and are 0.8 MB as video. muted + playsinline are
            // what make autoplay legal on mobile browsers; the poster keeps
            // the grid from collapsing before the clip loads.
            if (/\.mp4$/i.test(src)) {
              var base = src.replace(/\.mp4$/i, "");
              // Two encodes of the same clip. MP4/H.264 is listed first because
              // it is the one Safari and shipping Chrome pick fastest; WebM/VP9
              // is there for Chromium builds compiled without the proprietary
              // H.264 decoder, which would otherwise show a frozen poster.
              return '<figure class="shot"><video poster="' + base + '.jpg"' +
                ' muted loop playsinline preload="metadata" aria-label="' + alt + '">' +
                '<source src="' + base + '.mp4" type="video/mp4" />' +
                '<source src="' + base + '.webm" type="video/webm" />' +
                "</video>" +
                (caption ? "<figcaption>" + caption + "</figcaption>" : "") + "</figure>";
            }
            // `full: true` marks an image that is worth opening at its own
            // size — the Heart Arsonist design boards are A3 sheets of small
            // text, unreadable at column width no matter how the grid is laid
            // out. Everything else stays a plain <img>: wrapping every still
            // in a link would promise a bigger version that doesn't exist.
            var img = '<img src="' + src + '" alt="' + alt + '" loading="lazy" />';
            if (typeof shot === "object" && shot.full) {
              img = '<a class="shot-full" href="' + src + '" target="_blank" rel="noopener">' + img + "</a>";
            }
            return '<figure class="shot">' + img +
              (caption ? "<figcaption>" + caption + "</figcaption>" : "") + "</figure>";
          })
          .join("");
        playClipsWhenVisible(shotsGrid);
      } else {
        shotsGrid.style.display = "none";
      }
    }

    // Optional companion document (e.g. the production plan built on top of
    // this game). Kept generic and optional rather than hard-coded to one
    // project, and deliberately worded by the content so the page can say what
    // the document is and isn't — a coursework plan is not a shipped roadmap.
    var linked = document.getElementById("linkedDoc");
    if (linked) {
      if (d.linkedDoc) {
        linked.innerHTML =
          '<section class="resume-section"><h2>' + d.linkedDoc.heading + "</h2>" +
          '<a class="linked-doc" href="' + root + d.linkedDoc.href + '">' +
          '<span class="linked-doc-tag mono">' + d.linkedDoc.tag + "</span>" +
          "<h3>" + d.linkedDoc.name + "</h3>" +
          "<p>" + d.linkedDoc.blurb + "</p>" +
          '<span class="linked-doc-cta mono">' + d.linkedDoc.cta + "</span>" +
          "</a></section>";
      } else {
        linked.innerHTML = "";
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
