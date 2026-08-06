// ---------------------------------------------------------------------------
// Shared renderer for the "dedicated page" versions of each site section
// (about.html, projects.html, experience.html, education.html, writing.html,
// contact.html). Which one runs is picked by <body data-page="...">.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var content = window.SITE_CONTENT;
  var page = document.body.getAttribute("data-page");
  var root = document.body.getAttribute("data-root") || "";

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
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = get(dict, el.getAttribute("data-i18n"));
      if (typeof value === "string") el.textContent = value;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var value = get(dict, el.getAttribute("data-i18n-placeholder"));
      if (typeof value === "string") el.setAttribute("placeholder", value);
    });
  }

  var renderers = {
    about: function (lang) {
      var d = content[lang].aboutPage;
      document.title = d.pageTitle;
      var photoEl = document.getElementById("aboutPhoto");
      if (photoEl && content[lang].hero.portrait) photoEl.src = content[lang].hero.portrait;
      var wrap = document.getElementById("aboutBody");
      wrap.innerHTML =
        secBlock(d.whoHeading, d.who) +
        secBlock(d.howHeading, d.how) +
        secBlock(d.nextHeading, d.next) +
        secBlock(d.funHeading, d.fun);

      // The career timeline sits under the About copy — same page, because
      // "how I got here" and "when" are one story. The component itself lives
      // in js/timeline.js so the markup and the rail behaviour have one owner.
      var tl = content[lang].experiencePage;
      if (window.SITE_TIMELINE && tl) {
        setText("timelineHeading", tl.timelineHeading);
        setText("timelineHint", tl.timelineHint);
        window.SITE_TIMELINE.render(tl);
        window.SITE_TIMELINE.wire();
      }
    },

    projects: function (lang) {
      var team = content[lang].teamProjects;
      var indiv = content[lang].individualProjects;
      var analysis = content[lang].gameAnalysis;
      document.title = content[lang].nav.projects + " — " + content[lang].site.name;
      renderCardGrid("teamGrid", team.list);
      var prod = content[lang].production;
      if (prod) renderCardGrid("productionGrid", prod.list);
      renderCardGrid("individualGrid", indiv.list);
      if (analysis) renderCardGrid("analysisGrid", analysis.list);
    },

    // Production plan case study (production/detective-folder-live-service.html).
    // The page is a producer deliverable rather than a game, so it gets its own
    // shape — numbers, schedule tables, an embedded deck and the source files —
    // instead of reusing the game-detail or story templates.
    production: function (lang) {
      var d = content[lang].productionPlan;
      if (!d) return;
      document.title = d.pageTitle;

      setText("prodBack", d.backLink);
      setText("prodTag", d.tagLabel);
      setText("prodHeading", d.heading);
      setText("prodLead", d.lead);
      setText("prodScopeHeading", d.scopeHeading);
      setText("prodScope", d.scope);
      setText("prodStrategyHeading", d.strategyHeading);
      setText("prodStrategy", d.strategy);
      setText("prodDeckHeading", d.deckHeading);
      setText("prodDeckNote", d.deckNote);
      setText("prodMilestoneHeading", d.milestoneHeading);
      setText("prodMilestoneNote", d.milestoneNote);
      setText("prodStaffingHeading", d.staffingHeading);
      setText("prodStaffingNote", d.staffingNote);
      setText("prodEngineHeading", d.engineHeading);
      setText("prodEngineNote", d.engineNote);
      setText("prodDecisionsHeading", d.decisionsHeading);
      setText("prodFilesHeading", d.filesHeading);
      setText("prodFilesNote", d.filesNote);
      setText("prodRelatedHeading", d.relatedHeading);
      setText("prodRelated", d.relatedLabel);

      fill("prodStats", (d.stats || []).map(function (s) {
        return '<div class="prod-stat"><strong>' + s.value + "</strong><span>" + s.label + "</span></div>";
      }).join(""));

      // The deck is a PDF rather than the original .pptx so it renders in the
      // browser; the .pptx is still offered in the file list below. Same
      // iframe-embed approach as resume.html, at a 16:9-ish height since these
      // are slides, not pages.
      var deck = (d.files || [])[0];
      if (deck) {
        fill("prodDeck",
          '<iframe src="' + deck.href + '" title="' + d.deckHeading + '" loading="lazy"></iframe>' +
          '<a class="btn-download" href="' + deck.href + '" download>' + d.deckDownload + "</a>");
      }

      setText("prodScheduleHeading", d.scheduleDocHeading);
      setText("prodScheduleNote", d.scheduleDocNote);
      setText("prodStaffSheetHeading", d.staffingSheetHeading);
      setText("prodStaffSheetNote", d.staffingSheetNote);
      setText("prodBreakdownHeading", d.breakdownSheetHeading);
      setText("prodBreakdownNote", d.breakdownSheetNote);

      // The .docx converted to PDF so it renders in the browser; the editable
      // original is still in the file list below.
      if (d.scheduleDocHref) {
        fill("prodScheduleDoc",
          '<iframe src="' + d.scheduleDocHref + '" title="' + d.scheduleDocHeading + '" loading="lazy"></iframe>');
      }

      fill("prodStaffSheet", sheetViewer("staffing", d));
      fill("prodBreakdownSheet", sheetViewer("breakdown", d));
      if (window.SITE_SHEETS) window.SITE_SHEETS.scan(document);

      fill("prodMilestones", table(d.milestoneCols, (d.milestones || []).map(function (m) {
        return ['<span class="mono prod-gate">' + m.ms + "</span>", '<span class="mono">' + m.date + "</span>", m.name];
      })));

      fill("prodStaffing", table(d.staffingCols, (d.staffing || []).map(function (r) {
        return [r.phase, '<span class="mono">' + r.timeline + "</span>", '<span class="mono">' + r.fte + "</span>"];
      })));

      fill("prodEngine",
        '<ol class="prod-engine">' +
        (d.engineStages || []).map(function (s) {
          return "<li><span class='mono'>" + s.span + "</span><strong>" + s.stage + "</strong></li>";
        }).join("") +
        "</ol>" +
        '<p class="prod-ships"><span class="mono">' + d.engineShipsLabel + "</span>" +
        (d.engineShips || []).map(function (x) { return "<em>" + x + "</em>"; }).join("") +
        "</p>");

      fill("prodDecisions", (d.decisions || []).map(function (x) {
        return '<article class="prod-decision"><p class="mono prod-kind">' + x.kind + "</p>" +
          "<h3>" + x.title + "</h3><p>" + x.body + "</p></article>";
      }).join(""));

      fill("prodFiles", (d.files || []).map(function (f) {
        return '<li><a href="' + f.href + '" download><span class="prod-file-name">' + f.name + "</span>" +
          '<span class="mono prod-file-type">' + f.type + "</span>" +
          '<span class="prod-file-desc">' + f.desc + "</span></a></li>";
      }).join(""));
    },

    experience: function (lang) {
      var wrap = document.getElementById("experienceFull");
      wrap.innerHTML = "";
      content[lang].experience.items.forEach(function (item) {
        var bullets = (item.bullets || []).map(function (b) { return "<li>" + b + "</li>"; }).join("");
        var row = document.createElement("div");
        row.className = "resume-entry";
        row.innerHTML =
          '<div class="dates mono">' + item.dates + "</div>" +
          '<div><p class="title">' + item.title + " — " + item.org + "</p>" +
          '<p class="org">' + (item.location || "") + "</p>" +
          '<ul class="detail-list">' + bullets + "</ul></div>";
        wrap.appendChild(row);
      });
    },

    education: function (lang) {
      var wrap = document.getElementById("educationFull");
      wrap.innerHTML = "";
      content[lang].education.items.forEach(function (item) {
        var row = document.createElement("div");
        row.className = "resume-entry";
        row.innerHTML =
          '<div class="dates mono">' + item.dates + "</div>" +
          '<div><p class="title">' + item.degree + "</p>" +
          '<p class="org">' + item.school + (item.location ? " — " + item.location : "") + "</p></div>";
        wrap.appendChild(row);
      });
    },

    writing: function (lang) {
      renderBlog(lang);
    },

    "beyond-work": function (lang) {
      var d = content[lang].beyondWorkPage;
      document.title = d.pageTitle;
      // The four themed sections (photography / architecture / travel /
      // cooking) each open their own story page; the gallery below them
      // stays as a mixed overview.
      if (d.sections) renderCardGrid("beyondWorkSections", d.sections);
      var wrap = document.getElementById("beyondWorkGallery");
      if (!wrap) return;
      wrap.innerHTML = "";
      (d.photos || []).forEach(function (p) {
        var fig = document.createElement("figure");
        fig.className = "photo-wall-item";
        fig.innerHTML =
          '<img src="' + p.src + '" alt="' + (p.caption || "") + '" />' +
          "<figcaption>" + (p.caption || "") + "</figcaption>";
        wrap.appendChild(fig);
      });
    },

    // The live Playtest tool. It used to sit on ai-feedback.html itself;
    // that page is now a hub (data-page="ai-hub") and the tool moved to
    // ai-tools/playtest-feedback.html, which still runs this renderer.
    "ai-tool": function (lang) {
      var d = content[lang].aiToolPage;
      document.title = d.pageTitle;
      if (window.SITE_AI_TOOL) window.SITE_AI_TOOL.setLang(lang, d);
    },

    // RefFix lives in its own repo and is deployed on GitHub Pages; this page
    // wraps it in the site's chrome, explains the design decisions behind it,
    // and embeds the live build rather than vendoring a copy that would
    // immediately start drifting from the original.
    reffix: function (lang) {
      var d = content[lang].reffixPage;
      document.title = d.pageTitle;
      setText("reffixBack", d.backLink);
      var open = document.getElementById("reffixOpen");
      if (open) open.href = d.embedUrl;
      var repo = document.getElementById("reffixRepo");
      if (repo) repo.href = d.repoUrl;
      var frame = document.getElementById("reffixFrame");
      // Assigned once: re-assigning on a language toggle would reload the
      // iframe and throw away whatever the visitor had already pasted in.
      if (frame && !frame.src) frame.src = d.embedUrl;
      var body = document.getElementById("reffixBody");
      if (body) {
        body.innerHTML =
          secBlock(d.whyHeading, d.why) +
          secBlock(d.howHeading, d.how) +
          secBlock(d.principleHeading, d.principle) +
          secBlock(d.privacyHeading, d.privacy);
      }
    },

    "ai-hub": function (lang) {
      var d = content[lang].aiHubPage;
      document.title = d.pageTitle;
      renderCardGrid("aiProjectsGrid", d.projects);
      renderCardGrid("aiToolsGrid", d.tools);
    },

    // Generic image + text story page, shared by the four Beyond Work
    // sections, the game-analysis write-ups and the AI side projects.
    // <body data-page="story" data-story="stories.photography"> picks which
    // entry of the content dictionary to render, so all of those pages are
    // the same 20 lines of markup with one attribute changed.
    story: function (lang) {
      var key = document.body.getAttribute("data-story");
      var d = get(content[lang], key);
      if (!d) return;
      document.title = d.pageTitle;
      setText("storyTag", d.tagLabel);
      setText("storyHeading", d.heading);
      setText("storyLead", d.lead);
      var back = document.getElementById("storyBack");
      if (back) back.textContent = d.backLink;
      var wrap = document.getElementById("storyBlocks");
      if (!wrap) return;
      var stacked = d.layout === "stacked";
      wrap.innerHTML = "";
      (d.blocks || []).forEach(function (b) {
        // <article>, not <section>: the site's global `section { padding: ... }`
        // rule (the page-level gutter) would otherwise squeeze every story
        // block to ~75% width and add 144px of dead space above each one.
        var row = document.createElement("article");
        // The alternating left/right rhythm is done in CSS with
        // :nth-child(even) rather than by emitting two different markup
        // orders, so the DOM order always matches the reading order.
        //
        // `image` is optional. The photo essays (Beyond Work) give every block
        // a picture; the project retrospectives are mostly argument, and a
        // decorative screenshot next to "we had no branching strategy" would
        // be filler. A block without an image spans the full column instead.
        // Two layouts. The photo essays alternate image and text in two
        // columns; a retrospective section is several paragraphs plus a
        // callout, which that column is far too narrow to hold — those pages
        // set `layout: "stacked"` and get one column with the image, when
        // there is one, as a band above the text.
        row.className =
          "story-block" + (stacked || !b.image ? " is-wide" : "") + (stacked ? " is-stacked" : "");
        var figure = b.image
          ? '<figure class="story-figure"><img src="' + root + b.image + '" alt="' + (b.caption || "") + '" />' +
            (b.caption ? "<figcaption>" + b.caption + "</figcaption>" : "") +
            "</figure>"
          : "";
        // `text` is a string on the photo essays and an array of paragraphs on
        // the retrospectives — normalised here so both shapes render.
        var paras = Array.isArray(b.text) ? b.text : b.text ? [b.text] : [];
        // Optional labelled sub-points: a retrospective section usually has to
        // separate two or three distinct causes, which a single paragraph
        // flattens into one undifferentiated wall.
        var points = (b.points || [])
          .map(function (pt) {
            return (
              "<li>" +
              (pt.label ? '<span class="story-point-label mono">' + pt.label + "</span>" : "") +
              pt.text +
              "</li>"
            );
          })
          .join("");
        row.innerHTML =
          figure +
          '<div class="story-body">' +
          (b.heading ? "<h3>" + b.heading + "</h3>" : "") +
          paras
            .map(function (t) {
              return "<p>" + t + "</p>";
            })
            .join("") +
          (points ? '<ul class="story-points">' + points + "</ul>" : "") +
          // Optional callout for the "what I would change" half of a
          // retrospective section. It is visually separated because it is the
          // part a reader skimming for conclusions is looking for.
          (b.fix
            ? '<div class="story-fix">' +
              (b.fix.label ? '<span class="story-fix-label mono">' + b.fix.label + "</span>" : "") +
              "<p>" + b.fix.text + "</p></div>"
            : "") +
          "</div>";
        wrap.appendChild(row);
      });

      // Optional reverse link back to the project a retrospective is about.
      // Same markup as the project pages' companion-document callout, so the
      // pair reads as one link in both directions.
      var rel = document.getElementById("storyRelated");
      if (rel) {
        rel.innerHTML = d.related
          ? '<section class="resume-section"><h2>' + d.relatedHeading + "</h2>" +
            '<a class="linked-doc" href="' + root + d.related.href + '">' +
            '<span class="linked-doc-tag mono">' + d.related.tag + "</span>" +
            "<h3>" + d.related.name + "</h3>" +
            "<p>" + d.related.blurb + "</p>" +
            '<span class="linked-doc-cta mono">' + d.related.cta + "</span>" +
            "</a></section>"
          : "";
      }
    },

    // Self-contained browser demos that live in this repo (ai-projects/demos/*).
    // Same shape as the reffix page — intro, a few prose blocks, then the
    // thing itself embedded — but keyed by <body data-demo="..."> so every
    // demo page is the same markup with one attribute changed.
    demo: function (lang) {
      var d = get(content[lang], "demos." + document.body.getAttribute("data-demo"));
      if (!d) return;
      document.title = d.pageTitle;
      setText("demoTag", d.tagLabel);
      setText("demoHeading", d.heading);
      setText("demoLead", d.lead);
      setText("demoBack", d.backLink);
      setText("demoNote", d.embedNote);
      setText("demoOpen", d.openLabel);
      var open = document.getElementById("demoOpen");
      if (open) open.href = root + d.embedUrl;
      var frame = document.getElementById("demoFrame");
      // Assigned once. Re-assigning on a language toggle would reload the
      // iframe, which for these demos means losing the camera permission
      // prompt or whatever state the visitor had built up.
      if (frame && !frame.src) frame.src = root + d.embedUrl;
      var body = document.getElementById("demoBody");
      if (body) {
        body.innerHTML = (d.blocks || [])
          .map(function (b) { return secBlock(b.heading, b.body); })
          .join("");
      }
    },

    contact: function (lang) {
      var d = content[lang].contact;
      document.getElementById("contactLocation").textContent = d.location;
      var emailEl = document.getElementById("contactEmailFull");
      emailEl.textContent = d.email;
      emailEl.href = "mailto:" + d.email;
      document.getElementById("contactWebsite").textContent = d.website;
    },
  };

  function secBlock(heading, body) {
    return (
      '<section class="resume-section">' +
      "<h2>" + heading + "</h2><p class=\"resume-summary\">" + body + "</p></section>"
    );
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && typeof value === "string") el.textContent = value;
  }

  function fill(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  // Markup for one in-page spreadsheet viewer. js/sheet-viewer.js takes over
  // from here: it loads production/data/<key>.js on demand and replaces the
  // status line with tabs and a scrollable table.
  function sheetViewer(key, d) {
    return (
      '<div class="sheet-viewer" data-sheets="' + key + '" data-root="' + root + '"' +
      ' data-error="' + (d.sheetError || "") + '">' +
      '<p class="sheet-status">' + (d.sheetLoading || "") + "</p>" +
      '<div class="sheet-body"></div></div>'
    );
  }

  // Small helper for the two schedule tables on the production plan page.
  // Cells are already-escaped strings built by the caller.
  function table(cols, rows) {
    return (
      "<thead><tr>" +
      (cols || []).map(function (c) { return "<th>" + c + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
      (rows || []).map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
      }).join("") +
      "</tbody>"
    );
  }

  // One card renderer for every list on the site's subpages: team projects,
  // individual projects, game analysis, the Beyond Work sections and both
  // AI hub lists. Items only need { name, tag, blurb, image, href }.
  function renderCardGrid(id, items) {
    var wrap = document.getElementById(id);
    if (!wrap || !items) return;
    wrap.innerHTML = "";
    items.forEach(function (p) {
      // Entries without an href render as a plain <div>: an <a href="#">
      // would look clickable and then just jump to the top of the page.
      // An item with an `external` link (e.g. a store page) needs a second,
      // separate link inside the card. A nested <a> is invalid, so the card is
      // wrapped and the external link sits alongside it, pinned over the
      // thumbnail rather than inside the card's own click target.
      var host = wrap;
      if (p.external && p.href) {
        host = document.createElement("div");
        host.className = "project-card-wrap";
        wrap.appendChild(host);
      }
      var card = document.createElement(p.href ? "a" : "div");
      card.className = "project-card" + (p.placeholder ? " is-placeholder" : "");
      if (p.href) card.href = root + p.href;
      card.innerHTML =
        '<div class="project-thumb"><img src="' + root + p.image + '" alt="' + p.name + '" /></div>' +
        '<div class="project-meta"><span class="index mono">' + p.tag + "</span></div>" +
        "<h3>" + p.name + "</h3>" +
        (p.role ? '<p class="project-role">' + p.role + "</p>" : "") +
        '<p class="project-summary">' + p.blurb + "</p>" +
        renderTags(p);
      host.appendChild(card);
      if (host !== wrap) {
        var ext = document.createElement("a");
        ext.className = "card-external mono";
        ext.href = p.external.href;
        ext.target = "_blank";
        ext.rel = "noopener";
        ext.textContent = p.external.label;
        ext.setAttribute("aria-label", p.name + " — " + p.external.label);
        host.appendChild(ext);
      }
    });
    // Hand the fresh cards to the entrance animation. This runs on every
    // render — including a language switch, which replaces the cards entirely.
    if (window.SITE_MOTION) window.SITE_MOTION.scan(wrap);
  }

  // The chip row under a card: engine, platform, team size, discipline — the
  // facts someone scanning the page wants before deciding to click. Chips come
  // from the item's own `tags` array; a placeholder with nothing to show yet
  // gets a single dashed "TBD" chip, which reads as "write-up pending" rather
  // than the greyed-out card it used to be.
  function renderTags(p) {
    var tags = p.tags || [];
    if (!tags.length && !p.placeholder) return "";
    var chips = tags
      .map(function (t) {
        return "<li>" + t + "</li>";
      })
      .join("");
    if (p.placeholder) chips += '<li class="is-todo">TBD</li>';
    return '<ul class="project-tags">' + chips + "</ul>";
  }

  function renderBlog(lang) {
    var b = content[lang].blog;
    var items = b.items || [];

    var wrap = document.getElementById("writingFull");
    if (!wrap) return;
    wrap.innerHTML = "";
    items.forEach(function (post) {
      // Posts with a `slug` have a real article page (writing-post.html) and
      // are rendered as links. Posts without one are still placeholders, so
      // they render as plain (non-navigating) rows — a href="#" here used to
      // just scroll back to the top of the page, which looked like a broken
      // "jump to homepage" bug.
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

  function renderContactCta(lang) {
    var el = document.getElementById("pageContactCta");
    if (!el) return;
    var c = content[lang].contact;
    el.innerHTML =
      '<p class="lead">' + c.lead + "</p>" +
      '<div class="details">' +
      c.locationLabel + ": " + c.location + "<br>" +
      c.emailLabel + ': <a href="mailto:' + c.email + '">' + c.email + "</a><br>" +
      c.websiteLabel + ": " + c.website +
      "</div>";
  }

  function setLang(lang) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });
    applyStaticText(lang);
    if (renderers[page]) renderers[page](lang);
    renderContactCta(lang);
    window.SITE_CHROME.renderNav(lang, content, page);
    // Last, so it sees the finished page: headings only have their text after
    // applyStaticText() has run, and a language switch replaces that text (and
    // the cards) wholesale, so the entrance animation is re-armed here too.
    if (window.SITE_MOTION) window.SITE_MOTION.scan();
  }

  function initLangToggle() {
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang")); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SITE_CHROME.buildAll(root);
    initLangToggle();
    setLang(currentLang);
  });
})();
