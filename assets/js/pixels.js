/* BCN Riders · pixel-art animations.
   Each sprite is a tiny canvas drawn pixel by pixel, then scaled up with
   image-rendering: pixelated. Sprites only redraw while on screen, and everything
   holds still for prefers-reduced-motion. */
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
  // Riders, pedalling. 8 frames per crank turn. The lead rider wears the sky wind vest.
  const LOOKS = {
    // Peloton kits
    red:    { vest: "#d6453d", vest2: "#e8736b", logo: C.white, sleeve: "#a8322b", shorts: C.ink, shortsFar: "#000", shades: C.ink },
    yellow: { vest: "#f2c84b", vest2: "#f7dc85", logo: C.ink, sleeve: "#c9a22e", shorts: C.ink, shortsFar: "#000", shades: C.ink },
    white:  { vest: C.white, vest2: C.sky3, logo: C.royal, sleeve: C.sky2, shorts: C.royal, shortsFar: "#22328a", shades: C.ink },
    green:  { vest: "#4f9a5a", vest2: "#7cbf86", logo: C.white, sleeve: "#3a7744", shorts: C.ink, shortsFar: "#000", shades: C.ink },
    royal:  { vest: C.royal, vest2: "#5a6fd0", logo: C.sky, sleeve: "#22328a", shorts: C.ink, shortsFar: "#000", shades: C.ink },
    orange: { vest: "#e8833a", vest2: "#f2a76c", logo: C.white, sleeve: "#b8642a", shorts: C.ink, shortsFar: "#000", shades: C.ink },
    club:   { vest: C.sky, vest2: C.sky2, logo: C.royal, sleeve: C.navy, shorts: "#4a63e0", shortsFar: "#2c3f9e", shades: C.ink },
  };
  function drawRider(s, f, look = LOOKS.club) {
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
    leg(P2, look.shortsFar, C.skinDark);
    for (const [a, b] of [[R, B], [B, S], [S, R], [S, H], [H, B], [H, F]]) s.line(a[0], a[1], b[0], b[1], C.white);
    s.line(11, 9, 14, 9, C.ink);                       // saddle
    s.line(23, 10, 25, 8, C.ink); s.line(26, 8, 26, 10, C.ink); // stem + drops
    s.line(B[0], B[1], P1[0], P1[1], C.ink);           // crank
    leg(P1, look.shorts, C.skin);
    s.line(hip[0], hip[1], 20, 4, look.vest);           // torso
    s.line(hip[0], hip[1] - 1, 20, 3, look.vest);
    s.line(hip[0] + 1, hip[1] - 2, 19, 3, look.vest2);
    s.px(16, 5, look.logo);                             // logo
    s.line(20, 4, 22, 6, look.sleeve);                  // sleeve
    s.line(22, 6, 25, 8, C.skin);                       // forearm
    s.rect(20, 0, 4, 2, C.white);                       // helmet
    s.px(24, 1, C.sky);
    s.rect(22, 2, 2, 2, C.skin);                        // face
    s.px(23, 2, look.shades);                           // shades
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

  // ---- Mount ---------------------------------------------------------------
  actor("px-rider", { w: 34, h: 25, scale: 4, fps: 12, draw: (s, f) => drawRider(s, f, LOOKS.club) });
  actor("px-weed", { w: 19, h: 19, scale: 3, fps: 12, draw: drawWeed });

  // ---- Intro ---------------------------------------------------------------
  // 1. Full-screen: the logo resolves out of big pixels while a large rider rides
  //    along the bottom and the peloton chases in.
  // 2. Transition: the navy screen fades away, the logo glides into the nav bar,
  //    and the riders shrink smoothly onto the page.
  // 3. The small lead rider and the chasing bunch ride on across the site, then leave.
  const intro = document.getElementById("intro");
  const raceCv = document.getElementById("race");
  if (intro && raceCv && document.documentElement.classList.contains("has-intro")) {
    const root = document.documentElement;
    root.classList.add("race-on");
    const small = innerWidth < 560;
    const S_BIG = small ? 4 : 6, S_SMALL = small ? 2 : 3;
    const T_TRANS = 1.7, T_DUR = 1.0;           // seconds
    let tTrans = T_TRANS, transitioning = false, finished = false;
    let t0 = performance.now();
    const clock = () => (performance.now() - t0) / 1000;
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    const scaleAt = (t) => S_BIG + (S_SMALL - S_BIG) * ease(clamp01((t - tTrans) / T_DUR));

    // Race canvas: one full-width strip along the bottom of the viewport
    const rg = raceCv.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const RACE_H = small ? 150 : 210, BASE = RACE_H - 26;
    let W = innerWidth;
    const fit = () => {
      W = innerWidth;
      raceCv.width = W * dpr; raceCv.height = RACE_H * dpr;
      raceCv.style.width = `${W}px`; raceCv.style.height = `${RACE_H}px`;
    };
    fit();
    addEventListener("resize", fit);
    const sprite = document.createElement("canvas");
    const sp = surface(sprite, 34, 25, 1);

    // Lead rider moves at a steady pace; the bunch starts far back and closes in
    const speed = () => W / 4.2;
    const leadX = (t) => -34 * S_BIG * 0.4 + speed() * t;
    const gapAt = (t) => W * (0.30 - 0.22 * clamp01(t / 5.5));
    // [kit, position in the bunch (0 = rearmost), lift (further back in the road)]
    const BUNCH = [
      ["yellow", 0.62, 16], ["green", 1.75, 18], ["white", 2.85, 14],
      ["red", 0, 2], ["royal", 1.1, 0], ["orange", 2.2, 4], ["white", 3.25, 0],
    ];
    function put(x, base, s, look, f) {
      if (x > W || x + 34 * s < 0) return;
      sp.clear();
      drawRider(sp, f, look);
      rg.drawImage(sprite, Math.round(x * dpr), Math.round((base - 25 * s) * dpr), Math.round(34 * s * dpr), Math.round(25 * s * dpr));
    }
    function finishIntro() {
      root.classList.remove("has-intro"); // reveals the real nav logo under the flown one
      intro.remove();
    }
    function endRace() {
      finished = true;
      raceCv.remove();
      root.classList.remove("race-on");
      // If the race ends without the transition having run (e.g. the tab was in the
      // background the whole time), clear the intro too.
      if (!transitioning) { transitioning = true; finishIntro(); }
    }
    function tick() {
      if (finished) return;
      const t = clock();
      if (!transitioning && t >= tTrans) startTransition();
      const s = scaleAt(t);
      rg.clearRect(0, 0, raceCv.width, raceCv.height);
      rg.imageSmoothingEnabled = false;
      const lx = leadX(t), front = lx - gapAt(t), unit = 34 * s * 0.62;
      let rear = Infinity;
      BUNCH.forEach(([kit, pos, lift], i) => {
        const x = front - (3.25 - pos) * unit;
        rear = Math.min(rear, x);
        put(x, BASE - lift * (s / 3), s, LOOKS[kit], Math.floor(t * 14) + i * 3);
      });
      put(lx, BASE, s, LOOKS.club, Math.floor(t * 16));
      if (rear > W + 10) return endRace();
      requestAnimationFrame(tick);
    }

    // Logo: resolve from big pixels, then glide into the nav bar
    const cv = document.getElementById("intro-logo");
    const navLogo = document.querySelector(".nav__brand img");
    const g = cv.getContext("2d");
    const tmp = document.createElement("canvas"), tg = tmp.getContext("2d");
    const img = new Image();
    const LW = Math.round(Math.min(420, innerWidth * 0.72)), LH = Math.round((LW * 314) / 700);
    cv.width = LW * dpr; cv.height = LH * dpr;
    cv.style.width = `${LW}px`; cv.style.height = `${LH}px`;
    const pixelate = (block) => {
      if (!img.complete || !img.naturalWidth) return;
      g.clearRect(0, 0, cv.width, cv.height);
      if (block <= 1) { g.imageSmoothingEnabled = true; g.drawImage(img, 0, 0, cv.width, cv.height); return; }
      tmp.width = Math.max(1, Math.round(LW / block));
      tmp.height = Math.max(1, Math.round(LH / block));
      tg.drawImage(img, 0, 0, tmp.width, tmp.height);
      g.imageSmoothingEnabled = false;
      g.drawImage(tmp, 0, 0, cv.width, cv.height);
    };
    let steps = [];
    img.onload = () => {
      steps = [56, 32, 18, 11, 7, 4, 2, 1].map((b, i) => setTimeout(() => pixelate(b), 120 + i * 105));
      intro.classList.add("is-go");
    };
    img.src = "assets/img/logo.png";

    function startTransition() {
      if (transitioning) return;
      transitioning = true;
      tTrans = Math.min(tTrans, clock());
      steps.forEach(clearTimeout);
      pixelate(1);
      try { sessionStorage.setItem("bcnr-intro", "1"); } catch {}
      if (navLogo) {
        const a = cv.getBoundingClientRect(), b = navLogo.getBoundingClientRect();
        cv.style.transformOrigin = "0 0";
        cv.style.transition = `transform ${T_DUR}s cubic-bezier(.65, 0, .35, 1)`;
        cv.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width})`;
      }
      intro.classList.add("is-out");
      setTimeout(finishIntro, T_DUR * 1000 + 60);
    }
    const skip = () => startTransition();
    intro.addEventListener("click", skip);
    addEventListener("keydown", skip, { once: true });
    // Start the clock only once the tab is actually visible (background tabs and
    // prerendered pages don't run animation frames).
    const begin = () => {
      t0 = performance.now();
      setTimeout(() => { if (!finished) endRace(); }, 12000); // safety net
      requestAnimationFrame(tick);
    };
    if (!document.hidden) begin();
    else document.addEventListener("visibilitychange", function onShow() {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", onShow);
      begin();
    });
  }

})();
