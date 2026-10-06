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
  // Riders, pedalling. 8 frames per crank turn. The Dude wears the sky wind vest;
  // Walter rides in khaki with a beard and amber shooting glasses.
  const LOOKS = {
    dude:   { vest: C.sky, vest2: C.sky2, logo: C.royal, sleeve: C.navy, shorts: "#4a63e0", shortsFar: "#2c3f9e", shades: C.ink, hair: "#7a5230", beard: null, goatee: "#7a5230" },
    walter: { vest: "#b8ab6c", vest2: "#d4c98f", logo: "#6b6a3f", sleeve: "#6b6a3f", shorts: "#9aa3b5", shortsFar: "#6f7889", shades: "#e0a030", hair: null, beard: "#3b2a1e", goatee: null },
  };
  function drawRider(s, f, look = LOOKS.dude) {
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
    if (look.hair) { s.px(20, 2, look.hair); s.px(20, 3, look.hair); s.px(19, 3, look.hair); }
    if (look.goatee) s.px(23, 3, look.goatee);
    if (look.beard) { s.rect(21, 3, 3, 1, look.beard); s.px(22, 4, look.beard); }
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
  actor("px-rider", { w: 34, h: 25, scale: 4, fps: 12, draw: (s, f) => drawRider(s, f, LOOKS.dude) });
  actor("px-walter", { w: 34, h: 25, scale: 4, fps: 12, draw: (s, f) => drawRider(s, f + 3, LOOKS.walter) });
  actor("px-weed", { w: 19, h: 19, scale: 3, fps: 12, draw: drawWeed });
  actor("px-pin", { w: 13, h: 18, scale: 3, fps: 8, draw: drawBigPin });
  actor("px-russian", { w: 18, h: 20, scale: 3, fps: 6, draw: drawRussian });
  const strike = actor("px-strike", { w: 64, h: 18, scale: 3, fps: 24, draw: drawStrike, still: 60 });

  // Hero: the Dude and Walter ride together and talk. Click them for the next exchange.
  // Mostly original lines in their voices; the film's own lines are kept short.
  const EXCHANGES = [
    [["walter", "Membership starts January first. That's not a guideline, Dude. That's a date."],
     ["dude", "Yeah, I'm just gonna, like, coast till then, man."]],
    [["dude", "The Dude abides."],
     ["walter", "And the Dude renews. Before the cut-off. Am I wrong?"],
     ["dude", "You're not wrong, Walter."]],
    [["walter", "You pick your size off the chart. Not off a feeling."],
     ["dude", "Yeah, well, that's just, like, your opinion, man."]],
    [["walter", "You ride over the line, that's a foul. Mark it zero!"],
     ["dude", "It's a group ride, man."]],
    [["dude", "This kit really ties the club together, man."],
     ["walter", "Like the rug, Dude. Like the rug."]],
    [["dude", "Walter, I just wanna ride, man."],
     ["walter", "Shut the f*ck up, Donny."],
     ["dude", "Donny's not even here, man."]],
    [["walter", "Am I the only one around here who gives a sh*t about the rules?"],
     ["dude", "Yeah, man. Pretty much."]],
  ];
  const duo = document.querySelector(".pxduo");
  const bubbles = {
    dude: document.querySelector(".pxrider--dude .pxbubble"),
    walter: document.querySelector(".pxrider--walter .pxbubble"),
  };
  const STEP = 2700;
  let ex = 0, timers = [], talking = false, heroOnScreen = true;
  function show(who, text) {
    Object.values(bubbles).forEach((b) => b?.classList.remove("is-on"));
    const b = bubbles[who];
    if (!b) return;
    const r = b.parentElement.getBoundingClientRect();
    b.classList.toggle("is-flip", r.left > innerWidth - 270);
    b.innerHTML = `<b>${who === "dude" ? "The Dude" : "Walter"}</b>`;
    b.append(text);
    b.classList.add("is-on");
  }
  function converse() {
    timers.forEach(clearTimeout);
    const lines = EXCHANGES[ex++ % EXCHANGES.length];
    talking = true;
    timers = lines.map(([who, text], i) => setTimeout(() => show(who, text), i * STEP));
    timers.push(setTimeout(() => {
      Object.values(bubbles).forEach((b) => b?.classList.remove("is-on"));
      talking = false;
    }, lines.length * STEP));
  }
  if (duo) {
    duo.addEventListener("click", converse);
    if (io) new IntersectionObserver(([e]) => (heroOnScreen = e.isIntersecting)).observe(duo.parentElement);
    setInterval(() => {
      if (reduce.matches || !heroOnScreen || talking) return;
      const r = duo.getBoundingClientRect();
      if (r.left > 20 && r.right < innerWidth - 20) converse();
    }, 6000);
  }

  // ---- Intro: the logo resolves out of big pixels, a rider zips past --------
  const intro = document.getElementById("intro");
  if (intro && document.documentElement.classList.contains("has-intro")) {
    actor("intro-rider", { w: 34, h: 25, scale: 4, fps: 16, draw: (s, f) => drawRider(s, f, LOOKS.dude) });
    const cv = document.getElementById("intro-logo");
    const g = cv.getContext("2d");
    const tmp = document.createElement("canvas"), tg = tmp.getContext("2d");
    const img = new Image();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.round(Math.min(420, innerWidth * 0.72)), H = Math.round((W * 314) / 700);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem("bcnr-intro", "1"); } catch {}
      intro.classList.add("is-out");
      setTimeout(() => { intro.remove(); document.documentElement.classList.remove("has-intro"); }, 650);
    };
    const pixelate = (block) => {
      g.clearRect(0, 0, cv.width, cv.height);
      if (block <= 1) { g.imageSmoothingEnabled = true; g.drawImage(img, 0, 0, cv.width, cv.height); return; }
      tmp.width = Math.max(1, Math.round(W / block));
      tmp.height = Math.max(1, Math.round(H / block));
      tg.drawImage(img, 0, 0, tmp.width, tmp.height);
      g.imageSmoothingEnabled = false;
      g.drawImage(tmp, 0, 0, cv.width, cv.height);
    };
    const run = () => {
      [56, 32, 18, 11, 7, 4, 2, 1].forEach((b, i) => setTimeout(() => pixelate(b), 150 + i * 105));
      intro.classList.add("is-go");
      setTimeout(finish, 2400);
    };
    img.onload = run;
    img.onerror = finish;
    img.src = "assets/img/logo.png";
    intro.addEventListener("click", finish);
    addEventListener("keydown", finish, { once: true });
  }

  window.BCNPixels = {
    strike() { if (strike) { strike.frame = 0; paint(strike, reduce.matches ? strike.still : 0); } },
  };
})();
