/* BCN Riders · pixel-art animations.
   Each sprite is a tiny canvas drawn pixel by pixel, then scaled up with
   image-rendering: pixelated. Sprites only redraw while on screen, and everything
   holds still for prefers-reduced-motion. Quotes: The Big Lebowski (1998). */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const C = {
    navy: "#1b2a44", navyDark: "#121d31", ink: "#0f1a2e", sky: "#a9cbe8", sky2: "#c9dff2", sky3: "#e6f0fa",
    royal: "#2f43a6", royalDark: "#2c3f9e", shorts: "#4a63e0", white: "#ffffff", grey: "#7d8aa3", skin: "#e8b48a", skinDark: "#c48e66",
    sand: "#c9a46c", dune: "#8a6638", cream: "#f3e6cf", kahlua: "#5a3620", swirl: "#a8774f", red: "#d6453d",
  };

  // ---- Tiny pixel canvas ---------------------------------------------------
  function surface(canvas, w, h, scale) {
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w * scale}px`;
    canvas.style.height = `${h * scale}px`;
    const g = canvas.getContext("2d");
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const rect = (x, y, rw, rh, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), rw, rh); };
    function line(x0, y0, x1, y1, c) { // Bresenham
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let n = 0; n < 200; n++) {
        px(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    function ring(cx, cy, r, c) { // midpoint circle
      let x = r, y = 0, err = 1 - r;
      while (x >= y) {
        for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) px(cx + a, cy + b, c);
        y++;
        if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
      }
    }
    function disc(cx, cy, r, c) {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, c);
    }
    return { px, rect, line, ring, disc, clear: () => g.clearRect(0, 0, w, h) };
  }

  // ---- Animation loop ------------------------------------------------------
  const actors = [];
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
        const a = actors.find((x) => x.canvas === e.target);
        if (a) a.visible = e.isIntersecting;
      }))
    : null;

  function actor(id, { w, h, scale, fps = 10, draw, still = 0 }) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const a = { canvas, s: surface(canvas, w, h, scale), fps, draw, still, frame: 0, last: 0, visible: !io };
    actors.push(a);
    io?.observe(canvas);
    paint(a, reduce.matches ? still : 0);
    return a;
  }
  function paint(a, f) { a.s.clear(); a.draw(a.s, f); }
  function loop(now) {
    if (!reduce.matches) {
      for (const a of actors) {
        if (a.visible && now - a.last >= 1000 / a.fps) { a.last = now; paint(a, ++a.frame); }
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  reduce.addEventListener?.("change", () => actors.forEach((a) => paint(a, reduce.matches ? a.still : a.frame)));

  // ---- Sprites -------------------------------------------------------------
  // Rider in the club kit, pedalling. 8 frames per crank turn.
  function drawRider(s, f) {
    const t = ((f % 8) / 8) * Math.PI * 2;
    const R = [7, 18], F = [26, 18], B = [15, 18], S = [13, 10], H = [23, 10], hip = [13, 8], L = 6;
    const wheel = ([cx, cy]) => {
      for (let k = 0; k < 2; k++) {
        const a = t / 2 + (k * Math.PI) / 2;
        s.line(cx - Math.cos(a) * 4, cy - Math.sin(a) * 4, cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, C.grey);
      }
      s.ring(cx, cy, 6, C.sky2);
      s.ring(cx, cy, 5, C.ink);
      s.px(cx, cy, C.sky2);
    };
    const leg = (P, thigh, shin) => { // two-bone IK, knee forward
      const dx = P[0] - hip[0], dy = P[1] - hip[1], d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(d, 2 * L - 0.01), ux = dx / d, uy = dy / d;
      const m = reach / 2, k = Math.sqrt(L * L - m * m);
      const K = [hip[0] + ux * m + uy * k, hip[1] + uy * m - ux * k];
      const foot = [hip[0] + ux * reach, hip[1] + uy * reach];
      s.line(hip[0], hip[1], K[0], K[1], thigh);
      s.line(K[0], K[1], foot[0], foot[1], shin);
      s.rect(foot[0], foot[1], 2, 1, C.ink);
    };
    const P1 = [B[0] + Math.cos(t) * 3, B[1] + Math.sin(t) * 3];
    const P2 = [B[0] - Math.cos(t) * 3, B[1] - Math.sin(t) * 3];

    wheel(R); wheel(F);
    leg(P2, C.royalDark, C.skinDark);
    for (const [a, b] of [[R, B], [B, S], [S, R], [S, H], [H, B], [H, F]]) s.line(a[0], a[1], b[0], b[1], C.white);
    s.line(11, 9, 14, 9, C.ink);                       // saddle
    s.line(23, 10, 25, 8, C.ink); s.line(26, 8, 26, 10, C.ink); // stem + drops
    s.line(B[0], B[1], P1[0], P1[1], C.ink);           // crank
    leg(P1, C.shorts, C.skin);
    s.line(hip[0], hip[1], 20, 4, C.sky);               // torso in the sky wind vest
    s.line(hip[0], hip[1] - 1, 20, 3, C.sky);
    s.line(hip[0] + 1, hip[1] - 2, 19, 3, C.sky2);
    s.px(16, 5, C.royal);                               // logo
    s.line(20, 4, 22, 6, C.navy);                       // sleeve
    s.line(22, 6, 25, 8, C.skin);                       // forearm
    s.rect(20, 0, 4, 2, C.white);                       // helmet
    s.px(24, 1, C.sky);
    s.rect(22, 2, 2, 2, C.skin);                        // face
    s.px(23, 2, C.ink);                                 // shades
  }

  // Tumbleweed: a seeded scribble, spun a notch per frame.
  const WEED = (() => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: 28 }, () => [rnd() * Math.PI * 2, 2 + rnd() * 6.5]);
  })();
  function drawWeed(s, f) {
    const rot = f * 0.45;
    let prev = null;
    WEED.forEach(([a, r], i) => {
      const p = [9 + Math.cos(a + rot) * r, 9 + Math.sin(a + rot) * r];
      if (prev) s.line(prev[0], prev[1], p[0], p[1], i % 3 ? C.sand : C.dune);
      prev = p;
    });
  }

  // Small bowling pin for the strike, drawn along a tilt angle (0 = upright).
  const PIN = [2, 2, 2, 2, 1, 1, 2, 2, 1]; // half-widths, base to top
  function drawPin(s, x, y, a) {
    const ux = Math.sin(a), uy = -Math.cos(a), vx = Math.cos(a), vy = Math.sin(a);
    PIN.forEach((hw, i) => {
      for (let k = -(hw - 1); k <= hw - 1; k++) {
        s.px(x + ux * i + vx * k, y + uy * i + vy * k, i === 5 ? C.red : C.white);
      }
    });
  }
  const PINS = [ // x, launch vx, vy, spin
    [47, 0.7, -1.7, 0.35], [51, 1.0, -2.3, -0.4], [55, 1.3, -1.4, 0.5], [59, 1.6, -2.0, -0.3],
  ];
  function drawStrike(s, f) {
    f = Math.min(f, 60);
    for (let x = 0; x < 64; x += 4) s.rect(x, 17, 2, 1, C.navy); // lane
    const hit = 22;
    const bx = f <= hit ? 4 + f * 1.9 : 46 + (f - hit) * 1.4;
    if (bx < 70) {
      s.disc(bx, 13, 3, C.royal);
      const a = f * 0.7;
      s.px(bx + Math.cos(a) * 1.5, 13 + Math.sin(a) * 1.5, C.ink);
      s.px(bx + Math.cos(a + 0.9) * 1.5, 13 + Math.sin(a + 0.9) * 1.5, C.ink);
    }
    PINS.forEach(([x0, vx, vy, spin]) => {
      if (f <= hit) return drawPin(s, x0, 17, 0);
      const t = f - hit;
      const y = Math.min(17, 17 + vy * t + 0.125 * t * t);
      const landed = y >= 17 && t > 2;
      drawPin(s, x0 + vx * t, y, landed ? Math.PI / 2 * Math.sign(spin || 1) : spin * t);
    });
  }

  // Big wobbling pin for the size guide. Rows are half-widths, top to base.
  const BIGPIN = [1, 2, 2, 2, 1, 1, 1, 2, 3, 3, 4, 4, 4, 3, 3, 2];
  function drawBigPin(s, f) {
    const tilt = Math.sin(f * 0.55) * 2;
    const n = BIGPIN.length;
    BIGPIN.forEach((hw, i) => {
      const cx = 6 + Math.round(tilt * (n - 1 - i) / (n - 1));
      const y = i + 1;
      s.rect(cx - hw - 1, y, 2 * hw + 3, 1, C.navy);
      if (i === 0) s.rect(cx - hw, y - 1, 2 * hw + 1, 1, C.navy);
      if (i === n - 1) s.rect(cx - hw, y + 1, 2 * hw + 1, 1, C.navy);
    });
    BIGPIN.forEach((hw, i) => {
      const cx = 6 + Math.round(tilt * (n - 1 - i) / (n - 1));
      s.rect(cx - hw, i + 1, 2 * hw + 1, 1, i === 5 || i === 6 ? C.red : C.white);
    });
  }

  // White Russian on the rocks: Kahlúa swirling up into the cream, ice bobbing.
  function drawRussian(s, f) {
    for (let y = 8; y <= 17; y++) {
      const xl = 3 + Math.floor((y - 5) / 7), xr = 14 - Math.floor((y - 5) / 7);
      for (let x = xl; x <= xr; x++) {
        const edge = 13.5 + Math.sin(x * 0.8 + f * 0.6) * 1.6 + Math.sin(x * 0.3 - f * 0.35);
        const c = y < edge - 0.8 ? C.cream : y > edge + 0.8 ? C.kahlua : C.swirl;
        s.px(x, y, c);
      }
    }
    const bob = f % 4 < 2 ? 0 : 1;
    s.rect(5, 6 + bob, 3, 3, C.sky3); s.px(5, 6 + bob, C.white);
    s.rect(9, 7 - bob, 3, 3, C.sky3); s.px(9, 7 - bob, C.white);
    s.line(2, 5, 3, 19, C.sky2);   // glass
    s.line(15, 5, 14, 19, C.sky2);
    s.line(3, 19, 14, 19, C.sky2);
    s.line(4, 18, 13, 18, C.sky2);
    if (f % 6 < 3) s.px(13, 6, C.white); // glint
  }

  // ---- Mount ---------------------------------------------------------------
  actor("px-rider", { w: 34, h: 25, scale: 4, fps: 12, draw: drawRider });
  actor("px-weed", { w: 19, h: 19, scale: 3, fps: 12, draw: drawWeed });
  actor("px-pin", { w: 13, h: 18, scale: 3, fps: 8, draw: drawBigPin });
  actor("px-russian", { w: 18, h: 20, scale: 3, fps: 6, draw: drawRussian });
  const strike = actor("px-strike", { w: 64, h: 18, scale: 3, fps: 24, draw: drawStrike, still: 60 });

  // Hero rider says things when clicked, and now and then on its own.
  const QUOTES = [
    "The Dude abides.",
    "Yeah, well, that's just, like, your opinion, man.",
    "That rug really tied the room together.",
    "Mark it zero!",
  ];
  const rider = document.querySelector(".pxrider");
  const bubble = document.querySelector(".pxbubble");
  let q = 0, hideT, heroOnScreen = true;
  function say() {
    if (!rider || !bubble) return;
    const r = rider.getBoundingClientRect();
    bubble.classList.toggle("is-flip", r.left > innerWidth - 260);
    bubble.textContent = `“${QUOTES[q++ % QUOTES.length]}”`;
    bubble.classList.add("is-on");
    clearTimeout(hideT);
    hideT = setTimeout(() => bubble.classList.remove("is-on"), 3800);
  }
  if (rider) {
    rider.addEventListener("click", say);
    if (io) new IntersectionObserver(([e]) => (heroOnScreen = e.isIntersecting)).observe(rider.parentElement);
    setInterval(() => {
      if (reduce.matches || !heroOnScreen) return;
      const r = rider.getBoundingClientRect();
      if (r.left > 20 && r.right < innerWidth - 20) say();
    }, 9000);
  }

  window.BCNPixels = {
    strike() { if (strike) { strike.frame = 0; paint(strike, reduce.matches ? strike.still : 0); } },
  };
})();
