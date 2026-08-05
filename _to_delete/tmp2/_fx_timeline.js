// ---------------------------------------------------------------------------
// The career timeline: a horizontal rail of milestones, rendered from
// content[lang].experiencePage. Its own module because it lives on the About
// page while the play log lives on its own page — one component, one owner,
// no copy of the rail logic in two renderers.
//
// Usage: SITE_TIMELINE.render(dict) then SITE_TIMELINE.wire().
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderTimeline(d) {
    var rail = document.getElementById("timelineRail");
    if (!rail) return;
    var items = (d.items || []).slice().sort(function (a, b) { return a.sort - b.sort; });

    rail.innerHTML = items
      .map(function (it, n) {
        var kind = d.kinds && d.kinds[it.kind] ? d.kinds[it.kind] : "";
        // A year label is only drawn when the year actually changes, so the
        // rail reads as a run of years rather than repeating 2025 three times.
        var newYear = n === 0 || items[n - 1].year !== it.year;
        return (
          '<li class="tl-item is-' + esc(it.kind) + (newYear ? " is-year-start" : "") + '" tabindex="0">' +
          (newYear ? '<span class="tl-year mono">' + esc(it.year) + "</span>" : "") +
          '<span class="tl-dot" aria-hidden="true"></span>' +
          '<div class="tl-card">' +
          '<p class="tl-dates mono">' + esc(it.dates) + (kind ? ' <span class="tl-kind">' + esc(kind) + "</span>" : "") + "</p>" +
          "<h3>" + esc(it.title) + "</h3>" +
          (it.org ? '<p class="tl-org">' + esc(it.org) + "</p>" : "") +
          (it.note ? '<p class="tl-note">' + esc(it.note) + "</p>" : "") +
          "</div></li>"
        );
      })
      .join("");
  }


  // Horizontal rails are easy to make and easy to make unusable. This wires up
  // the three ways people actually try to move one — dragging, the wheel, and
  // the arrow keys — and leaves native touch scrolling alone.
  function wireRail() {
    var rail = document.getElementById("timelineRail");
    if (!rail || rail.dataset.wired) return;
    rail.dataset.wired = "1";

    var down = false, startX = 0, startScroll = 0, moved = 0;

    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;   // let the browser do touch itself
      down = true; moved = 0;
      startX = e.clientX; startScroll = rail.scrollLeft;
      rail.classList.add("is-dragging");
    });
    rail.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      rail.scrollLeft = startScroll - dx;
      // Only capture the pointer once it's clearly a drag, so a plain click
      // still lands on the card underneath.
      if (moved > 4 && rail.setPointerCapture) {
        try { rail.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    function release() { down = false; rail.classList.remove("is-dragging"); }
    rail.addEventListener("pointerup", release);
    rail.addEventListener("pointercancel", release);
    rail.addEventListener("mouseleave", release);

    // A vertical wheel over the rail scrolls it sideways — but only while the
    // rail still has somewhere to go. At either end the event is left alone so
    // the page keeps scrolling and the rail never traps the reader.
    rail.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var max = rail.scrollWidth - rail.clientWidth;
      if (max <= 0) return;
      var next = rail.scrollLeft + e.deltaY;
      if (next < 0 || next > max) return;
      e.preventDefault();
      rail.scrollLeft = next;
    }, { passive: false });

    rail.addEventListener("keydown", function (e) {
      var step = rail.clientWidth * 0.7;
      if (e.key === "ArrowRight") { rail.scrollLeft += step; e.preventDefault(); }
      else if (e.key === "ArrowLeft") { rail.scrollLeft -= step; e.preventDefault(); }
      else if (e.key === "Home") { rail.scrollLeft = 0; e.preventDefault(); }
      else if (e.key === "End") { rail.scrollLeft = rail.scrollWidth; e.preventDefault(); }
    });

    // End-of-rail state, so the edge fade can show there is more to the right.
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth;
      rail.classList.toggle("at-start", rail.scrollLeft <= 2);
      rail.classList.toggle("at-end", max <= 0 || rail.scrollLeft >= max - 2);
    }
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  }


  window.SITE_TIMELINE = { render: renderTimeline, wire: wireRail };
})();
