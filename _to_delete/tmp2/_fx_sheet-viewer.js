// ---------------------------------------------------------------------------
// In-page spreadsheet viewer
// ---------------------------------------------------------------------------
// Renders a workbook that was exported to production/data/<key>.js as tabbed,
// scrollable HTML tables, so a recruiter can read the actual sheets without
// downloading anything. The originals stay downloadable underneath.
//
// Why the data is a <script> file assigning to window.SITE_SHEET_DATA rather
// than JSON fetched with fetch(): the site is also opened straight from disk
// (file://) while working on it, and browsers block fetch() on file URLs while
// still allowing <script src>. Same reason it is loaded on demand rather than
// up front — the breakdown workbook is ~160KB of cells that most visitors will
// never open, so it is only pulled in when someone actually expands a viewer.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var loading = {};

  function loadData(root, key, cb) {
    if (window.SITE_SHEET_DATA && window.SITE_SHEET_DATA[key]) return cb(window.SITE_SHEET_DATA[key]);
    if (loading[key]) return loading[key].push(cb);
    loading[key] = [cb];
    var s = document.createElement("script");
    s.src = root + "production/data/" + key + ".js";
    s.onload = function () {
      var d = (window.SITE_SHEET_DATA || {})[key];
      loading[key].forEach(function (fn) { fn(d); });
      loading[key] = null;
    };
    s.onerror = function () {
      loading[key].forEach(function (fn) { fn(null); });
      loading[key] = null;
    };
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // A row whose only content is in the first cell is a section label in these
  // workbooks (e.g. "LEADERSHIP / CORE"), not data — it gets its own class so
  // it can span the table instead of leaving a row of empty cells.
  function isLabelRow(row) {
    if (!row.length || !row[0]) return false;
    for (var i = 1; i < row.length; i++) if (row[i]) return false;
    return true;
  }

  function renderTable(sheet) {
    var rows = sheet.rows || [];
    if (!rows.length) return "<p class='sheet-empty'>—</p>";
    var freeze = sheet.freeze || 0;
    // Columns holding prose (a ticket's Summary and Description) wrap and get a
    // usable minimum width; everything else — dates, headcounts, priorities —
    // stays on one line so the grid still reads as a grid.
    var wrap = {};
    (sheet.wrap || []).forEach(function (i) { wrap[i] = 1; });
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);

    var head = rows[0];
    var out = ["<table class='sheet-table'><thead><tr>"];
    for (var c = 0; c < width; c++) {
      var hcls = [];
      if (c < freeze) hcls.push("is-frozen");
      if (wrap[c]) hcls.push("is-wrap");
      out.push("<th" + (hcls.length ? " class='" + hcls.join(" ") + "'" : "") +
        (c < freeze ? " style='left:var(--frz-" + c + ")'" : "") + ">" + esc(head[c] || "") + "</th>");
    }
    out.push("</tr></thead><tbody>");

    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (isLabelRow(row)) {
        // The text is wrapped in its own sticky span: the cell spans the whole
        // table, so position:sticky on the cell itself has no room to move.
        out.push("<tr class='is-label'><td colspan='" + width + "'><span>" + esc(row[0]) + "</span></td></tr>");
        continue;
      }
      out.push("<tr>");
      for (var i = 0; i < width; i++) {
        var v = row[i] || "";
        var cls = [];
        if (i < freeze) cls.push("is-frozen");
        if (wrap[i]) cls.push("is-wrap");
        if (v === "") cls.push("is-blank");
        out.push(
          "<td" + (cls.length ? " class='" + cls.join(" ") + "'" : "") +
          (i < freeze ? " style='left:var(--frz-" + i + ")'" : "") + ">" + esc(v) + "</td>"
        );
      }
      out.push("</tr>");
    }
    out.push("</tbody></table>");
    return out.join("");
  }

  function mount(el) {
    var key = el.getAttribute("data-sheets");
    var root = el.getAttribute("data-root") || "";
    var body = el.querySelector(".sheet-body");
    var status = el.querySelector(".sheet-status");
    if (!key || !body) return;

    loadData(root, key, function (data) {
      if (!data || !data.sheets || !data.sheets.length) {
        // The file list under this viewer still offers the original workbook,
        // so a failed load is a degraded view rather than a dead end.
        if (status) status.textContent = el.getAttribute("data-error") || "Could not load the sheets — the original file is downloadable below.";
        return;
      }
      if (status) status.remove();

      var sheets = data.sheets;
      var tabsHtml = sheets.length > 1
        ? "<div class='sheet-tabs' role='tablist'>" +
          sheets.map(function (s, i) {
            return "<button type='button' role='tab' aria-selected='" + (i === 0) + "' data-i='" + i + "'>" + esc(s.name) + "</button>";
          }).join("") + "</div>"
        : "";

      body.innerHTML = tabsHtml + "<div class='sheet-scroll'></div>";
      var scroll = body.querySelector(".sheet-scroll");

      function show(i) {
        scroll.innerHTML = renderTable(sheets[i]);
        scroll.scrollLeft = 0;
        // Frozen columns need real pixel offsets, which are only knowable once
        // the browser has laid the table out.
        var freeze = sheets[i].freeze || 0;
        if (freeze) {
          var firstRow = scroll.querySelectorAll("thead th");
          var left = 0;
          for (var c = 0; c < freeze && c < firstRow.length; c++) {
            scroll.style.setProperty("--frz-" + c, left + "px");
            left += firstRow[c].getBoundingClientRect().width;
          }
        }
      }

      show(0);

      var tabs = body.querySelectorAll(".sheet-tabs button");
      Array.prototype.forEach.call(tabs, function (btn) {
        btn.addEventListener("click", function () {
          Array.prototype.forEach.call(tabs, function (b) { b.setAttribute("aria-selected", "false"); });
          btn.setAttribute("aria-selected", "true");
          show(parseInt(btn.getAttribute("data-i"), 10));
        });
      });
    });
  }

  window.SITE_SHEETS = {
    // Called by the page renderer after it has written the viewer markup.
    scan: function (scope) {
      (scope || document).querySelectorAll("[data-sheets]").forEach(function (el) {
        if (el.getAttribute("data-mounted") === "on") return;
        el.setAttribute("data-mounted", "on");
        mount(el);
      });
    },
  };
})();
