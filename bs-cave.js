// bs-cave.js - the "Cave" table: the user's painting of a cobweb-choked cave (img/cave-bg.webp, from art/cave2.png).
//   - tiny spiders crawl over it all the time, only where there's something to walk on (rock, floor, web - never across
//     the dark void), bigger and quicker up close, smaller, slower and dimmer the deeper into the cave they go
//     (bs-cave-map.js: a walkable map and a depth map of the picture)
//   - now and then one lowers itself on a thread from the roof
//   - deep in the dark, the eyes of a giant spider queen glow; once in a long while the tips of her front legs reach
//     slowly out of the dark, feel about and draw back; when someone takes a Black Spider her eyes flare (CAVE.flare())
// Drawn on a canvas behind the table; it only runs while the Cave table is chosen, rests while the tab is hidden, and
// nothing moves for anyone who has asked their computer for reduced motion.

const CAVE = {
  canvas: null, ctx: null, cave: null, spiders: [], danglers: [], active: false, raf: 0, last: 0, W: 0, H: 0, dpr: 1,
  DARKEN: 0.6,     // how much of the picture's light is left after the darkening above (the spiders are lit to match)
  still: !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches),
  // the queen, in the picture's own pixels (1536 x 1024): where her eyes are, and how big
  QUEEN: { x: 1065, y: 395, size: 1 },

  setActive(on) {
    this.active = on;
    if (on && !this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.id = "cave-bg";
      this.canvas.setAttribute("aria-hidden", "true");
      document.body.insertBefore(this.canvas, document.body.firstChild);
      this.ctx = this.canvas.getContext("2d");
      window.addEventListener("resize", () => { if (this.active) this.build(); });
      document.addEventListener("visibilitychange", () => { if (this.active && !document.hidden) this.loop(); });
      this.unpackMap();
      this.queen = { t: 0, reach: 0, nextReach: 25 + Math.random() * 40, phase: "idle", flare: 0, blink: [], nextBlink: 3 };
    }
    if (!this.canvas) return;
    this.canvas.style.display = on ? "block" : "none";
    if (on) { this.build(); this.loop(); } else cancelAnimationFrame(this.raf);
  },

  // her eyes flare (a Black Spider has been taken)
  flare() { if (this.queen) this.queen.flare = 1; },

  unpackMap() {
    if (typeof CAVE_MAP === "undefined") return;
    const bin = atob(CAVE_MAP.data), a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    this.map = { w: CAVE_MAP.w, h: CAVE_MAP.h, a };
    if (CAVE_MAP.light) {
      const lb = atob(CAVE_MAP.light), l = new Uint8Array(lb.length);
      for (let i = 0; i < lb.length; i++) l[i] = lb.charCodeAt(i);
      this.lmap = { w: CAVE_MAP.lw, h: CAVE_MAP.lh, l };
    }
  },
  // the light at a point on the screen: its colour (0-1 each) and brightness, as the picture shows it there
  lightAt(x, y) {
    const m = this.lmap; if (!m) return [0.3, 0.3, 0.3, 0.3];
    const f = this.f, u = Math.min(0.999, Math.max(0, (x - f.ox) / (f.iw * f.k))), v = Math.min(0.999, Math.max(0, (y - f.oy) / (f.ih * f.k)));
    const i = (Math.floor(v * m.h) * m.w + Math.floor(u * m.w)) * 3, r = m.l[i] / 255, g = m.l[i + 1] / 255, b = m.l[i + 2] / 255;
    return [r, g, b, (r + g + b) / 3];
  },
  // which way the light comes from at a point: towards where it's brighter (screen coordinates, unit length)
  lightDir(x, y) {
    const d = 18 * Math.min(this.W, this.H) / 900;
    const gx = this.lightAt(x + d, y)[3] - this.lightAt(x - d, y)[3], gy = this.lightAt(x, y + d)[3] - this.lightAt(x, y - d)[3];
    const l = Math.hypot(gx, gy);
    return l > 0.004 ? [gx / l, gy / l] : [-0.3, -0.95];    // (no clear direction: from above, a little left)
  },
  // the picture's placement on the screen (it covers the window, centred)
  fit() {
    const iw = 1536, ih = 1024, k = Math.max(this.W / iw, this.H / ih);
    return { k, ox: (this.W - iw * k) / 2, oy: (this.H - ih * k) / 2, iw, ih };
  },
  cell(x, y) {
    const m = this.map; if (!m) return 255;
    const f = this.f, u = (x - f.ox) / (f.iw * f.k), v = (y - f.oy) / (f.ih * f.k);
    if (u < 0 || v < 0 || u >= 1 || v >= 1) return 0;
    return m.a[Math.floor(v * m.h) * m.w + Math.floor(u * m.w)];
  },
  walkable(x, y) { return (this.cell(x, y) & 1) === 1; },
  depth(x, y) { return (this.cell(x, y) & 0xFE) / 254; },     // 0 far .. 1 near

  // ---------------------------------------------------------------- the cave (drawn once per window size)
  build() {
    const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = W; this.H = H; this.dpr = dpr; this.f = this.fit();
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    if (!this.img) {
      this.img = new Image();
      this.img.onload = () => { if (this.active) this.build(); };
      this.img.src = "img/cave-bg.webp?v=2";
    }
    const out = document.createElement("canvas");
    out.width = this.canvas.width; out.height = this.canvas.height;
    const c = out.getContext("2d");
    c.scale(dpr, dpr);
    c.fillStyle = "#0a0806"; c.fillRect(0, 0, W, H);
    const im = this.img, f = this.f;
    if (im.complete && im.naturalWidth) c.drawImage(im, f.ox, f.oy, f.iw * f.k, f.ih * f.k);
    c.fillStyle = "rgba(0,0,0,0.4)"; c.fillRect(0, 0, W, H);
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.7)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    this.cave = out;
    // the spiders: more on a bigger window
    const count = Math.round(Math.min(70, Math.max(24, W * H / 22000)));
    this.spiders = [...Array(count)].map(() => this.newSpider());
    this.danglers = [];
    this.nextDangle = 4 + Math.random() * 8;
    this.draw(performance.now() / 1000);
  },

  // ---------------------------------------------------------------- the spiders
  newSpider() {
    let x, y, tries = 0;
    // anywhere it can stand
    do { x = Math.random() * this.W; y = Math.random() * this.H; } while (!this.walkable(x, y) && tries++ < 300);
    return { x, y, a: Math.random() * Math.PI * 2, turn: 0, base: 0.8 + Math.random() * 0.5, pace: 0.8 + Math.random() * 0.5,
      rest: 0, phase: Math.random() * 10, tone: 30 + Math.random() * 25 };
  },
  // how big a spider is here: a giant's whisker up close, a speck deep in the cave
  scaleAt(x, y) { const d = this.depth(x, y); return 0.45 + 0.75 * d; },

  loop() {
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    const step = now => {
      if (!this.active || document.hidden) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      if (!this.still) this.update(dt);
      this.draw(now / 1000);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },

  update(dt) {
    const W = this.W, H = this.H, S = Math.min(W, H) / 900;
    for (const s of this.spiders) {
      if (s.rest > 0) { s.rest -= dt; continue; }
      s.turn += (Math.random() - 0.5) * 6 * dt; s.turn *= 0.96;
      s.a += s.turn * dt * 2;
      if (!s.goal && Math.random() < dt * 0.04) s.goal = [Math.random() * W, Math.random() * H];
      if (s.goal) {
        const ga = Math.atan2(s.goal[1] - s.y, s.goal[0] - s.x), da = Math.atan2(Math.sin(ga - s.a), Math.cos(ga - s.a));
        s.a += da * Math.min(1, dt * 1.5);
        if (Math.hypot(s.goal[0] - s.x, s.goal[1] - s.y) < 30 || Math.random() < dt * 0.05) s.goal = null;
      }
      const k = this.scaleAt(s.x, s.y), sp = 26 * S * k * s.pace;       // further away: slower across the screen
      const nx = s.x + Math.cos(s.a) * sp * dt, ny = s.y + Math.sin(s.a) * sp * dt;
      // nothing to stand on there (the void, off the picture): turn back
      if (!this.walkable(nx, ny) || nx < 0 || nx > W || ny < 0 || ny > H) { s.a += Math.PI * (0.5 + Math.random()); s.turn = 0; s.goal = null; continue; }
      s.x = nx; s.y = ny;
      s.phase += dt * 9 * s.pace;
      if (Math.random() < dt * 0.12) s.rest = 0.4 + Math.random() * 2.2;
    }
    // now and then one lowers itself from the roof on a thread, hangs a while and climbs back
    this.nextDangle -= dt;
    if (this.nextDangle <= 0 && this.danglers.length < 2) {
      let x = 0, tries = 0;
      do { x = W * (0.05 + Math.random() * 0.9); } while (!this.walkable(x, 4) && tries++ < 30);
      const k = this.scaleAt(x, 4);
      this.danglers.push({ x, y: 0, max: H * (0.08 + Math.random() * 0.2), v: 30 * S * Math.max(0.4, k), k,
        state: "down", hang: 3 + Math.random() * 5, sway: Math.random() * 6 });
      this.nextDangle = 9 + Math.random() * 14;
    }
    for (const d of this.danglers) {
      d.sway += dt;
      if (d.state === "down") { d.y += d.v * dt; if (d.y >= d.max) d.state = "hang"; }
      else if (d.state === "hang") { d.hang -= dt; if (d.hang <= 0) d.state = "up"; }
      else d.y -= d.v * 0.7 * dt;
    }
    this.danglers = this.danglers.filter(d => d.y > -10);
    // the queen: breathing glow, blinks, and once in a long while her front legs
    const q = this.queen;
    q.t += dt;
    q.flare = Math.max(0, q.flare - dt * 0.6);
    q.nextBlink -= dt;
    if (q.nextBlink <= 0) { q.blink.push({ pair: Math.floor(Math.random() * 4), t: 0 }); q.nextBlink = 4 + Math.random() * 9; }
    q.blink.forEach(b => b.t += dt); q.blink = q.blink.filter(b => b.t < 0.35);
    q.nextReach -= dt;
    if (q.phase === "idle" && q.nextReach <= 0) { q.phase = "out"; q.pt = 0; }
    if (q.phase !== "idle") {
      q.pt += dt;
      // out over 4s, feel about for 5s, back over 4s
      if (q.phase === "out") { q.reach = Math.min(1, q.pt / 4); if (q.pt >= 4) { q.phase = "feel"; q.pt = 0; } }
      else if (q.phase === "feel") { q.reach = 1; if (q.pt >= 5) { q.phase = "back"; q.pt = 0; } }
      else { q.reach = Math.max(0, 1 - q.pt / 4); if (q.pt >= 4) { q.phase = "idle"; q.nextReach = 60 + Math.random() * 70; } }
    }
  },

  draw(t) {
    const c = this.ctx, dpr = this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.cave, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawQueen(c, t);
    const S = Math.min(this.W, this.H) / 900;
    for (const s of this.spiders) {
      const k = this.scaleAt(s.x, s.y);
      this.drawSpider(c, s.x, s.y, s.a + Math.PI / 2, 11 * S * k * s.base, s.rest > 0 ? 0 : s.phase, s.tone);
    }
    for (const d of this.danglers) {
      const x = d.x + Math.sin(d.sway * 0.9) * 3, sz = 11 * S * d.k;
      c.strokeStyle = "rgba(200,195,190,0.28)"; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(d.x, 0); c.lineTo(x, d.y); c.stroke();
      this.drawSpider(c, x, d.y + sz, Math.PI, sz, d.state === "hang" ? 0 : d.sway * 4, 40, true);
    }
  },

  // ---------------------------------------------------------------- the queen
  drawQueen(c, t) {
    const q = this.queen, f = this.f, Q = this.QUEEN;
    const x = f.ox + Q.x * f.k, y = f.oy + Q.y * f.k, u = 48 * f.k * Q.size;   // u: her scale on screen
    // the front legs: two huge jointed legs reaching forward out of the dark, down onto the rocks at the cave mouth
    if (q.reach > 0) {
      const e = q.reach * q.reach * (3 - 2 * q.reach);
      for (const side of [-1, 1]) {
        const feel = q.phase === "feel" ? Math.sin(q.pt * 1.3 + (side > 0 ? 1.7 : 0)) : 0;
        const tap = q.phase === "feel" ? Math.max(0, Math.sin(q.pt * 2.6 + side * 1.1)) ** 8 : 0;
        const sx = x + side * u * 0.45, sy = y + u * 0.75;                                    // from under her face
        const kx = sx + side * u * (0.9 + 1.3 * e), ky = sy - u * (0.1 + 0.7 * e) + feel * u * 0.12;   // the knee, out and a little up
        const tx = kx + side * u * (0.2 + 0.7 * e) + feel * side * u * 0.2, ty = ky + u * (0.9 + 1.9 * e) - tap * u * 0.45;   // the tip, down onto the rock
        this.limb(c, sx, sy, kx, ky, u * 0.42, u * 0.32, -side * u * 0.25, e, 0.25);
        this.limb(c, kx, ky, tx, ty, u * 0.32, u * 0.07, side * u * 0.2, e, 0.4);
      }
    }
    // her eyes: eight glossy black-red domes - two great ones, two below, four small out to the sides - with a dim
    // ember glow that breathes, flares, and now and then a pair blinks
    const glow = 0.4 + 0.12 * Math.sin(t * 0.6) + 0.05 * Math.sin(t * 1.7) + q.flare * 0.7;
    const EYES = [[-0.3, 0, 0.24], [0.3, 0, 0.24], [-0.2, 0.42, 0.13], [0.2, 0.42, 0.13],
                  [-0.68, -0.14, 0.11], [0.68, -0.14, 0.11], [-0.58, 0.3, 0.09], [0.58, 0.3, 0.09]];
    // a faint red light around her face, so the dark there isn't quite empty
    const halo = c.createRadialGradient(x, y + u * 0.1, 0, x, y + u * 0.1, u * 1.6);
    halo.addColorStop(0, `rgba(90,6,3,${0.08 * glow})`); halo.addColorStop(1, "rgba(80,0,0,0)");
    c.fillStyle = halo; c.beginPath(); c.arc(x, y + u * 0.1, u * 1.6, 0, Math.PI * 2); c.fill();
    EYES.forEach(([ex, ey, r], i) => {
      const b = q.blink.find(b => b.pair === Math.floor(i / 2));
      const open = b ? Math.abs(Math.cos(b.t / 0.35 * Math.PI)) : 1;
      const px = x + ex * u, py = y + ey * u, rr = r * u, ry = rr * Math.max(0.06, open);
      c.save();
      c.beginPath(); c.ellipse(px, py, rr, ry, 0, 0, Math.PI * 2); c.clip();
      const g = c.createRadialGradient(px - rr * 0.25, py - ry * 0.3, 0, px, py, rr);
      g.addColorStop(0, `rgba(${Math.round(55 + 50 * glow + 60 * q.flare)},${Math.round(4 + 14 * q.flare)},3,1)`);
      g.addColorStop(0.6, `rgba(${Math.round(18 + 18 * glow)},2,2,1)`); g.addColorStop(1, "rgba(4,1,1,1)");
      c.fillStyle = g; c.fillRect(px - rr, py - rr, rr * 2, rr * 2);
      // the wet highlight
      c.fillStyle = `rgba(190,200,215,${0.22 + 0.1 * q.flare})`;   // a wet glint of the cave's cold light
      c.beginPath(); c.ellipse(px - rr * 0.35, py - ry * 0.4, rr * 0.16, ry * 0.1, -0.5, 0, Math.PI * 2); c.fill();
      c.restore();
      // the glow round it
      c.save(); c.globalCompositeOperation = "lighter";
      const gl = c.createRadialGradient(px, py, rr * 0.6, px, py, rr * 2.4);
      gl.addColorStop(0, `rgba(120,12,5,${0.1 * glow * open})`); gl.addColorStop(1, "rgba(120,0,0,0)");
      c.fillStyle = gl; c.beginPath(); c.arc(px, py, rr * 2.4, 0, Math.PI * 2); c.fill();
      c.restore();
    });
  },
  // one segment of her leg: curved, tapering, near-black and bristly, a faint cold sheen along its upper edge, and
  // fading into the dark at the end nearest her body (fadeAt: how far along it's fully seen)
  limb(c, x1, y1, x2, y2, w1, w2, bow, e, fadeAt) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1);
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len, cx = mx + nx * bow, cy = my + ny * bow;
    const P = (t, o) => {     // a point along the curve, offset o across it
      const ax = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2, ay = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
      const tx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx), ty = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy), tl = Math.hypot(tx, ty) || 1;
      return [ax - ty / tl * o, ay + tx / tl * o];
    };
    const N = 16, left = [], right = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, w = w1 + (w2 - w1) * t, bulge = 1 + 0.18 * Math.sin(t * Math.PI);
      left.push(P(t, w * bulge)); right.push(P(t, -w * bulge));
    }
    c.save();
    c.globalAlpha = Math.min(1, e * 1.4);
    const g = c.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, "rgba(2,2,2,0)"); g.addColorStop(fadeAt, "rgba(3,3,3,0.97)"); g.addColorStop(1, "rgba(7,6,6,1)");
    c.fillStyle = g;
    c.beginPath(); left.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py));
    for (let i = right.length - 1; i >= 0; i--) c.lineTo(right[i][0], right[i][1]);
    c.closePath(); c.fill();
    const sh = c.createLinearGradient(x1, y1, x2, y2);
    sh.addColorStop(0, "rgba(140,150,165,0)"); sh.addColorStop(Math.min(1, fadeAt + 0.3), "rgba(120,130,150,0.05)"); sh.addColorStop(1, "rgba(120,130,150,0.12)");
    c.strokeStyle = sh; c.lineWidth = Math.max(0.7, w2 * 0.5);
    c.beginPath(); for (let i = 0; i <= N; i++) { const [px, py] = P(i / N, (w1 + (w2 - w1) * i / N) * 0.75); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
    // fine hairs, both sides, at odd angles, barely there
    c.strokeStyle = "rgba(4,3,3,0.9)"; c.lineWidth = Math.max(0.4, w2 * 0.12);
    for (let i = 0; i < 26; i++) {
      const t = fadeAt + (1 - fadeAt) * ((i * 0.618) % 1), side = i % 2 ? 1 : -1;
      const w = w1 + (w2 - w1) * t, [bx, by] = P(t, side * w * 0.95), [ex, ey] = P(Math.min(1, t + 0.035), side * w * (1.5 + (i % 3) * 0.2));
      c.beginPath(); c.moveTo(bx, by); c.lineTo(ex, ey); c.stroke();
    }
    c.restore();
  },

  // a small spider facing `a` (0 = up), lit by the cave around it: as dark or as lit as the rock it's on, tinted by
  // that light, its sheen on the side the light comes from (whichever way it's facing), a soft shadow on the rock
  // beside it, and softened a little to sit in the photograph
  drawSpider(c, x, y, a, s, phase, tone, hanging = false) {
    const [lr, lg, lb, lum] = this.lightAt(x, y), L = Math.min(1, lum * this.DARKEN * 2.2);   // how lit it is (0-1)
    const [dx, dy] = this.lightDir(x, y);
    const M = L * 0.4;                                       // a dark creature: only a little of the light lifts it
    const mix = (base, light) => Math.round(base * (1 - M) + light * M);
    // its own colour, a dark brown, lifted towards the light's colour where it's lit
    const body = `rgb(${mix(tone * 0.6, lr * 160)},${mix(tone * 0.44, lg * 150)},${mix(tone * 0.32, lb * 140)})`;
    const legs = `rgb(${mix(tone * 0.5, lr * 140)},${mix(tone * 0.36, lg * 130)},${mix(tone * 0.26, lb * 122)})`;
    c.save();
    c.translate(x, y);
    // the shadow on the rock, cast away from the light (not when it's hanging in the air)
    if (!hanging) {
      c.fillStyle = `rgba(0,0,0,${0.25 + 0.35 * L})`; c.filter = `blur(${Math.max(1, s * 0.4)}px)`;
      c.beginPath(); c.ellipse(-dx * s * 0.6, -dy * s * 0.6 + s * 0.3, s * 1.6, s * 1.2, 0, 0, Math.PI * 2); c.fill();
      c.filter = "none";
    }
    // the spider's shape: legs and body (drawn twice: first nudged towards the light in the light's own colour - the rim
    // light that catches its edges on the lit side - then itself, dark, on top)
    const shape = (col, w) => {
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round";
      for (let side = -1; side <= 1; side += 2) {
        for (let k = 0; k < 4; k++) {
          const base = (-0.55 + k * 0.38) * Math.PI;
          const step = Math.sin(phase + k * 1.6 + (side > 0 ? Math.PI : 0)) * 0.22;
          const a1 = base + step, kx = Math.cos(a1) * s * 1.2 * side, ky = Math.sin(a1) * s * 1.1;
          const fx = kx + Math.cos(a1 + 0.5 * side) * s * 1.1 * side * 0.9, fy = ky + s * (k < 2 ? -0.5 : 0.7);
          c.beginPath(); c.moveTo(0, 0); c.lineTo(kx, ky - s * 0.25); c.lineTo(fx, fy); c.stroke();
        }
      }
      c.beginPath(); c.ellipse(0, s * 0.75, s * 0.62, s * 0.8, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(0, -s * 0.25, s * 0.4, s * 0.42, 0, 0, Math.PI * 2); c.fill();
    };
    const rimK = Math.min(1, 0.6 + L * 1.6), off = Math.max(0.8, s * 0.13);
    const rim = `rgba(${Math.round(Math.min(255, 95 + lr * 420))},${Math.round(Math.min(255, 92 + lg * 420))},${Math.round(Math.min(255, 95 + lb * 430))},${0.7 * rimK})`;
    c.save(); c.translate(dx * off, dy * off); c.rotate(a); shape(rim, Math.max(0.8, s * 0.17)); c.restore();
    c.save(); c.rotate(a); c.fillStyle = body; shape(legs, Math.max(0.6, s * 0.14));
    c.fillStyle = body;
    c.beginPath(); c.ellipse(0, s * 0.75, s * 0.6, s * 0.78, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, -s * 0.25, s * 0.38, s * 0.4, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    // the sheen: on the abdomen, towards the light (in the scene's terms, so it stays put as the spider turns)
    const ax = -Math.sin(a) * s * 0.75, ay = Math.cos(a) * s * 0.75;        // the abdomen's centre, unrotated
    const hx = ax + dx * s * 0.32, hy = ay + dy * s * 0.32;
    const g = c.createRadialGradient(hx, hy, 0, hx, hy, s * 0.55);
    g.addColorStop(0, `rgba(${Math.round(110 + lr * 145)},${Math.round(100 + lg * 145)},${Math.round(95 + lb * 150)},${0.28 + 0.5 * L})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.save(); c.rotate(a); c.beginPath(); c.ellipse(0, s * 0.75, s * 0.62, s * 0.8, 0, 0, Math.PI * 2); c.restore();
    c.fill();
    c.restore();
  }
};
