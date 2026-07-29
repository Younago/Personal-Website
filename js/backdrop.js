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

  // How hard the cursor deforms the field. 0 disables the interaction
  // entirely; 1 is roughly the point where it stops reading as "the page
  // noticed you" and starts reading as a toy.
  var POINTER_PUSH = 1;

  var FPS = 30; // half of display refresh — this is wallpaper, not animation
  var canvas, ctx, w, h, dpr;
  var running = false;
  var lastFrame = 0;
  var startedAt = 0;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var palette;

  // Cursor state. `x/y` chase `tx/ty` a frame at a time rather than snapping,
  // so the field lags slightly behind the pointer — that lag is most of what
  // makes the deformation feel like a soft material being pushed rather than
  // a value being assigned. `weight` fades the whole effect in on the first
  // move and back out when the pointer leaves the window, so nothing ever
  // pops into or out of existence.
  var ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, weight: 0, target: 0 };
  var pushRadius = 0;
  var pushStrength = 0;

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
    // Both scale with the viewport so the cursor's "reach" feels the same on
    // a laptop and on a large monitor.
    pushRadius = Math.min(w, h) * 0.34;
    pushStrength = Math.min(w, h) * 0.05 * POINTER_PUSH;
  }

  // Displace a point away from the cursor with a Gaussian falloff — the same
  // shape used for both the contour vertices and the halftone dots, so the
  // two layers deform as one material instead of two unrelated effects.
  // Returns how far the point moved, which drawDots reuses to thin the dots
  // it pushes (things stretched thin get lighter).
  function push(pt) {
    if (ptr.weight <= 0.001) return 0;
    var dx = pt.x - ptr.x * w;
    var dy = pt.y - ptr.y * h;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > pushRadius * 2.2 || dist < 0.0001) return 0;
    var f = Math.exp(-(dist * dist) / (pushRadius * pushRadius));
    var amount = f * pushStrength * ptr.weight;
    pt.x += (dx / dist) * amount;
    pt.y += (dy / dist) * amount;
    return f * ptr.weight;
  }

  // -------------------------------------------------------------------------
  // The three layers
  // -------------------------------------------------------------------------

  // Soft colour fields. Two of them, drifting on different periods so they
  // separate and overlap again without ever repeating a visible cycle.
  function drawBlobs(t) {
    var min = Math.min(w, h);
    var blobs = [
      { hex: palette.accent, r: min * 0.62, x: 0.28 + Math.sin(t * 0.07) * 0.12, y: 0.32 + Math.cos(t * 0.05) * 0.14, a: 1, lean: 0.05 },
      { hex: palette.warm, r: min * 0.52, x: 0.74 + Math.cos(t * 0.045) * 0.13, y: 0.66 + Math.sin(t * 0.062) * 0.12, a: 0.85, lean: -0.035 },
    ];
    blobs.forEach(function (b) {
      // The two fields lean by different amounts, and in opposite directions,
      // so moving the cursor parallaxes them against each other instead of
      // sliding the whole background around as one sheet.
      var lean = b.lean * ptr.weight * POINTER_PUSH;
      var cx = (b.x + (ptr.x - 0.5) * lean * 2) * w;
      var cy = (b.y + (ptr.y - 0.5) * lean * 2) * h;
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
        // Displacing each vertex individually — rather than scaling or
        // offsetting the ring as a whole — is what makes the family bunch up
        // on the far side of the cursor and spread on the near side. That
        // uneven bunching is the squeeze; a whole-ring transform would just
        // look like the drawing moved.
        var pt = {
          x: cx + Math.cos(a) * r * 1.18, // slightly wider than tall, as in the clip
          y: cy + Math.sin(a) * r,
        };
        push(pt);
        if (s === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
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
    var base = palette.dark ? "#ffffff" : palette.accent;
    for (var x = gap * 0.5; x < w; x += gap) {
      for (var y = gap * 0.5; y < h; y += gap) {
        var d = Math.hypot(x - fx, y - fy) / reach;
        if (d > 1) continue;
        var r = (1 - d) * 1.7;
        if (r < 0.15) continue;
        var pt = { x: x, y: y };
        var shove = push(pt);
        // Dots the cursor has shoved hardest also fade, so the grid reads as
        // stretched rather than merely displaced.
        ctx.fillStyle = rgba(base, palette.dotAlpha * (1 - shove * 0.55));
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r * (1 - shove * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Ease the cursor state one frame forward. Two different rates: the
  // position chases quickly enough to feel connected, the weight fades slowly
  // enough that entering and leaving the window is never abrupt.
  function stepPointer() {
    ptr.x += (ptr.tx - ptr.x) * 0.09;
    ptr.y += (ptr.ty - ptr.y) * 0.09;
    ptr.weight += (ptr.target - ptr.weight) * 0.05;
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
    stepPointer();
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

    // Pointer interaction. Deliberately skipped under reduced-motion (a
    // "still" background that squirms when you move the mouse is not still)
    // and on touch devices, where there is no hovering cursor to follow and
    // the handler would only fire mid-tap.
    if (!reduceMotion && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      window.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        ptr.tx = e.clientX / w;
        ptr.ty = e.clientY / h;
        if (ptr.target === 0) {
          // First movement: start the deformation from where the cursor
          // actually is, otherwise it sweeps in from the centre of the page.
          ptr.x = ptr.tx;
          ptr.y = ptr.ty;
        }
        ptr.target = 1;
      }, { passive: true });

      // Pointer left the window (or the tab lost focus mid-move): relax the
      // field back to its undisturbed shape rather than freezing it mid-dent.
      document.addEventListener("pointerleave", function () { ptr.target = 0; });
      window.addEventListener("blur", function () { ptr.target = 0; });
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
