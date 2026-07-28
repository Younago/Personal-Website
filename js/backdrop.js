// ---------------------------------------------------------------------------
// Animated background.
//
// Borrows the visual language of the reference clip — a slowly morphing blob,
// a family of flowing contour lines, and a halftone dot field — but rebuilt in
// this site's own palette and at a fraction of the contrast. The original is a
// full-saturation poster (electric blue behind hot orange); reproduced at that
// strength behind body copy it would wreck both the reading experience and the
// restrained look of the rest of the site. What carries over is the *motion*:
// everything drifts on slow, unsynchronised sine cycles so the page is never
// quite still, and never visibly loops.
//
// Everything is drawn on one fixed full-viewport canvas that sits behind the
// page content (see the .site-backdrop rules in style.css). It is inert:
// pointer-events are off and nothing here reads or writes page state.
//
// Loaded dynamically by chrome.js, which already runs on every page.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  // Single dial for the whole effect: 0 = invisible, 1 = as strong as the
  // reference clip. Everything below is expressed as a fraction of this, so
  // turning the backdrop up or down is a one-number change.
  var INTENSITY = 1;

  var FPS = 30; // half of display refresh — this is wallpaper, not animation
  var canvas, ctx, w, h, dpr;
  var running = false;
  var lastFrame = 0;
  var startedAt = 0;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var palette;

  // -------------------------------------------------------------------------
  // Palette is read from the live CSS custom properties rather than hardcoded,
  // so the backdrop follows the light/dark theme (and any future palette
  // change) without a second source of truth.
  // -------------------------------------------------------------------------
  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
      accent: cs.getPropertyValue("--color-accent").trim() || "#2f4fe0",
      // The warm counterweight is the one colour not already in the site's
      // palette — it is what makes the reference read as "that clip" rather
      // than as a generic blue gradient. Kept deliberately faint.
      warm: dark ? "#e08a2e" : "#f0932b",
      dark: dark,
      // Dark mode needs a touch more alpha to register against a near-black
      // background, but not enough to turn the page into a lava lamp.
      blobAlpha: (dark ? 0.16 : 0.19) * INTENSITY,
      lineAlpha: (dark ? 0.1 : 0.095) * INTENSITY,
      dotAlpha: (dark ? 0.07 : 0.07) * INTENSITY,
    };
  }

  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgba(hex, alpha) {
    var c = hexToRgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
  }

  function resize() {
    // Cap the pixel ratio at 2: beyond that the extra fill cost buys nothing
    // visible on a blurred gradient, and it is the single biggest lever on
    // how much work this thing does per frame on a phone.
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // -------------------------------------------------------------------------
  // The three layers
  // -------------------------------------------------------------------------

  // Soft colour fields. Two of them, drifting on different periods so they
  // separate and overlap again without ever repeating a visible cycle.
  function drawBlobs(t) {
    var min = Math.min(w, h);
    var blobs = [
      { hex: palette.accent, r: min * 0.62, x: 0.28 + Math.sin(t * 0.07) * 0.12, y: 0.32 + Math.cos(t * 0.05) * 0.14, a: 1 },
      { hex: palette.warm, r: min * 0.52, x: 0.74 + Math.cos(t * 0.045) * 0.13, y: 0.66 + Math.sin(t * 0.062) * 0.12, a: 0.85 },
    ];
    blobs.forEach(function (b) {
      var cx = b.x * w;
      var cy = b.y * h;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
      g.addColorStop(0, rgba(b.hex, palette.blobAlpha * b.a));
      g.addColorStop(0.55, rgba(b.hex, palette.blobAlpha * b.a * 0.42));
      g.addColorStop(1, rgba(b.hex, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // The contour family — the most recognisable element of the reference.
  // Each ring is a circle whose radius is modulated by two sine terms, and
  // each successive ring is offset slightly in phase, which is what produces
  // the "flowing topography" bunching rather than plain concentric circles.
  function drawContours(t) {
    var min = Math.min(w, h);
    var cx = w * (0.34 + Math.sin(t * 0.043) * 0.06);
    var cy = h * (0.52 + Math.cos(t * 0.037) * 0.08);
    var rings = 26;
    var steps = 90;
    ctx.lineWidth = 1;
    for (var i = 0; i < rings; i++) {
      var f = i / rings;
      var base = min * (0.1 + f * 0.72);
      var phase = t * 0.18 + i * 0.22;
      // Rings fade out at both ends of the family so the group has soft
      // edges instead of a hard first/last line.
      var edge = Math.sin(f * Math.PI);
      ctx.strokeStyle = rgba(palette.accent, palette.lineAlpha * (0.35 + edge * 0.65));
      ctx.beginPath();
      for (var s = 0; s <= steps; s++) {
        var a = (s / steps) * Math.PI * 2;
        var r = base * (1 + Math.sin(a * 3 + phase) * 0.075 + Math.sin(a * 2 - phase * 0.6) * 0.05);
        var x = cx + Math.cos(a) * r * 1.18; // slightly wider than tall, as in the clip
        var y = cy + Math.sin(a) * r;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Halftone field: a plain grid whose dot radius falls off with distance from
  // a slowly moving focus, so the patch appears to breathe across the canvas.
  function drawDots(t) {
    var gap = 22;
    var fx = w * (0.2 + Math.sin(t * 0.05) * 0.16);
    var fy = h * (0.42 + Math.cos(t * 0.041) * 0.2);
    var reach = Math.min(w, h) * 0.72;
    ctx.fillStyle = rgba(palette.dark ? "#ffffff" : palette.accent, palette.dotAlpha);
    for (var x = gap * 0.5; x < w; x += gap) {
      for (var y = gap * 0.5; y < h; y += gap) {
        var d = Math.hypot(x - fx, y - fy) / reach;
        if (d > 1) continue;
        var r = (1 - d) * 1.7;
        if (r < 0.15) continue;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    drawBlobs(t);
    drawDots(t);
    drawContours(t);
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (now - lastFrame < 1000 / FPS) return;
    lastFrame = now;
    draw((now - startedAt) / 1000);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    lastFrame = 0;
    requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
  }

  function init() {
    canvas = document.createElement("canvas");
    canvas.className = "site-backdrop";
    canvas.setAttribute("aria-hidden", "true");
    ctx = canvas.getContext("2d");
    document.body.insertBefore(canvas, document.body.firstChild);

    palette = readPalette();
    resize();

    if (reduceMotion) {
      // Respect the OS setting: still give the page a composition, just a
      // frozen one. A fixed offset rather than t=0 avoids the perfectly
      // symmetrical arrangement that t=0 happens to produce.
      draw(12);
    } else {
      startedAt = performance.now();
      start();
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        if (reduceMotion) draw(12);
      }, 150);
    });

    // Don't burn cycles animating a wallpaper nobody is looking at.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (!reduceMotion) { lastFrame = 0; start(); }
    });

    // The theme toggle flips data-theme on <html>; re-read the palette so the
    // backdrop switches with it instead of keeping the old theme's colours.
    if (window.MutationObserver) {
      new MutationObserver(function () {
        palette = readPalette();
        if (reduceMotion) draw(12);
      }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
