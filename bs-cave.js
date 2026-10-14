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
    c.fillStyle = "rgba(0,0,0,0.22)"; c.fillRect(0, 0, W, H);
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    this.cave = out;
    // the spiders: more on a bigger window
    const count = Math.round(Math.min(44, Math.max(16, W * H / 40000)));
    this.spiders = [...Array(count)].map(() => this.newSpider());
    this.danglers = [];
    this.nextDangle = 4 + Math.random() * 8;
    this.draw(performance.now() / 1000);
  },

  // ---------------------------------------------------------------- the spiders
  newSpider() {
    let x, y, tries = 0;
    // somewhere it can stand, more often nearer (where there's more to see)
    do { x = Math.random() * this.W; y = Math.random() * this.H; }
    while ((!this.walkable(x, y) || Math.random() > 0.35 + this.depth(x, y)) && tries++ < 200);
    return { x, y, a: Math.random() * Math.PI * 2, turn: 0, base: 0.8 + Math.random() * 0.5, pace: 0.8 + Math.random() * 0.5,
      rest: 0, phase: Math.random() * 10, tone: 30 + Math.random() * 25 };
  },
  // how big a spider is here: a giant's whisker up close, a speck deep in the cave
  scaleAt(x, y) { const d = this.depth(x, y); return 0.18 + 1.1 * d ** 1.3; },

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
      const k = this.scaleAt(s.x, s.y), sp = 26 * S * k * s.pace;       // further away: slower across the screen
      const nx = s.x + Math.cos(s.a) * sp * dt, ny = s.y + Math.sin(s.a) * sp * dt;
      // nothing to stand on there (the void, off the picture): turn back
      if (!this.walkable(nx, ny) || nx < 0 || nx > W || ny < 0 || ny > H) { s.a += Math.PI * (0.5 + Math.random()); s.turn = 0; continue; }
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
      const k = this.scaleAt(s.x, s.y), d = this.depth(s.x, s.y);
      c.globalAlpha = 0.45 + 0.55 * Math.min(1, d * 1.4);          // deeper in: lost in the gloom
      this.drawSpider(c, s.x, s.y, s.a + Math.PI / 2, 14 * S * k * s.base, s.rest > 0 ? 0 : s.phase, s.tone);
    }
    c.globalAlpha = 1;
    for (const d of this.danglers) {
      const x = d.x + Math.sin(d.sway * 0.9) * 3, sz = 14 * S * d.k;
      c.strokeStyle = "rgba(200,195,190,0.28)"; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(d.x, 0); c.lineTo(x, d.y); c.stroke();
      this.drawSpider(c, x, d.y + sz, Math.PI, sz, d.state === "hang" ? 0 : d.sway * 4, 40);
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
    const glow = 0.55 + 0.2 * Math.sin(t * 0.6) + 0.08 * Math.sin(t * 1.7) + q.flare;
    const EYES = [[-0.3, 0, 0.24], [0.3, 0, 0.24], [-0.2, 0.42, 0.13], [0.2, 0.42, 0.13],
                  [-0.68, -0.14, 0.11], [0.68, -0.14, 0.11], [-0.58, 0.3, 0.09], [0.58, 0.3, 0.09]];
    // a faint red light around her face, so the dark there isn't quite empty
    const halo = c.createRadialGradient(x, y + u * 0.1, 0, x, y + u * 0.1, u * 1.6);
    halo.addColorStop(0, `rgba(120,10,5,${0.22 * glow})`); halo.addColorStop(1, "rgba(80,0,0,0)");
    c.fillStyle = halo; c.beginPath(); c.arc(x, y + u * 0.1, u * 1.6, 0, Math.PI * 2); c.fill();
    EYES.forEach(([ex, ey, r], i) => {
      const b = q.blink.find(b => b.pair === Math.floor(i / 2));
      const open = b ? Math.abs(Math.cos(b.t / 0.35 * Math.PI)) : 1;
      const px = x + ex * u, py = y + ey * u, rr = r * u, ry = rr * Math.max(0.06, open);
      c.save();
      c.beginPath(); c.ellipse(px, py, rr, ry, 0, 0, Math.PI * 2); c.clip();
      const g = c.createRadialGradient(px - rr * 0.25, py - ry * 0.3, 0, px, py, rr);
      g.addColorStop(0, `rgba(${170 + 60 * q.flare},${25 + 40 * q.flare},10,1)`);
      g.addColorStop(0.55, `rgba(${70 + 30 * glow},5,4,1)`); g.addColorStop(1, "rgba(12,2,2,1)");
      c.fillStyle = g; c.fillRect(px - rr, py - rr, rr * 2, rr * 2);
      // the wet highlight
      c.fillStyle = `rgba(255,220,200,${0.35 + 0.2 * q.flare})`;
      c.beginPath(); c.ellipse(px - rr * 0.35, py - ry * 0.4, rr * 0.22, ry * 0.14, -0.5, 0, Math.PI * 2); c.fill();
      c.restore();
      // the glow round it
      c.save(); c.globalCompositeOperation = "lighter";
      const gl = c.createRadialGradient(px, py, rr * 0.6, px, py, rr * 2.4);
      gl.addColorStop(0, `rgba(170,25,10,${0.3 * glow * open})`); gl.addColorStop(1, "rgba(120,0,0,0)");
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

  // a small spider facing `a` (0 = up): dark legs stepping as it goes, a dark body with a dull sheen on its back
  drawSpider(c, x, y, a, s, phase, tone) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.strokeStyle = `rgb(${tone * 0.7},${tone * 0.48},${tone * 0.32})`; c.lineWidth = Math.max(0.6, s * 0.15); c.lineCap = "round";
    for (let side = -1; side <= 1; side += 2) {
      for (let k = 0; k < 4; k++) {
        const base = (-0.55 + k * 0.38) * Math.PI;
        const step = Math.sin(phase + k * 1.6 + (side > 0 ? Math.PI : 0)) * 0.22;
        const a1 = base + step, kx = Math.cos(a1) * s * 1.2 * side, ky = Math.sin(a1) * s * 1.1;
        const fx = kx + Math.cos(a1 + 0.5 * side) * s * 1.1 * side * 0.9, fy = ky + s * (k < 2 ? -0.5 : 0.7);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(kx, ky - s * 0.25); c.lineTo(fx, fy); c.stroke();
      }
    }
    c.fillStyle = `rgb(${tone},${tone * 0.62},${tone * 0.4})`;
    c.beginPath(); c.ellipse(0, s * 0.75, s * 0.62, s * 0.8, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, -s * 0.25, s * 0.4, s * 0.42, 0, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-s * 0.2, s * 0.45, 0, -s * 0.2, s * 0.45, s * 0.5);
    g.addColorStop(0, "rgba(230,190,150,0.55)"); g.addColorStop(1, "rgba(150,110,75,0)");
    c.fillStyle = g; c.beginPath(); c.ellipse(0, s * 0.75, s * 0.62, s * 0.8, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
};
