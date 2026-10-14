// bs-cave.js - the "Cave" table: the user's painting of a cobweb-choked cave (img/cave-bg.webp, from art/cave.png),
// with tiny spiders crawling over it all the time and now and then one lowering itself on a thread from the roof. Drawn on a canvas behind the table; it only runs while the Cave table is chosen,
// rests while the tab is hidden, and the spiders stay put for anyone who has asked their computer for reduced motion.

const CAVE = {
  canvas: null, ctx: null, cave: null, spiders: [], danglers: [], active: false, raf: 0, last: 0, W: 0, H: 0, dpr: 1,
  still: !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches),

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
    }
    if (!this.canvas) return;
    this.canvas.style.display = on ? "block" : "none";
    if (on) { this.build(); this.loop(); } else cancelAnimationFrame(this.raf);
  },

  // ---------------------------------------------------------------- the cave (drawn once per window size)
  // the user's painting (img/cave-bg.webp), filling the window, a little darker so the cards stand out
  build() {
    const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    if (!this.img) {
      this.img = new Image();
      this.img.onload = () => { if (this.active) this.build(); };
      this.img.src = "img/cave-bg.webp?v=1";
    }
    const out = document.createElement("canvas");
    out.width = this.canvas.width; out.height = this.canvas.height;
    const c = out.getContext("2d");
    c.scale(dpr, dpr);
    c.fillStyle = "#0a0806"; c.fillRect(0, 0, W, H);
    const im = this.img;
    if (im.complete && im.naturalWidth) {
      const k = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
      c.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    }
    c.fillStyle = "rgba(0,0,0,0.28)"; c.fillRect(0, 0, W, H);
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    this.cave = out;
    this.holes = null;
    // the spiders: tiny and dark, crawling about the cave; more on a bigger window
    const count = Math.round(Math.min(40, Math.max(14, W * H / 45000)));
    if (this.spiders.length !== count) this.spiders = [...Array(count)].map(() => this.newSpider());
    if (!this.danglers) this.danglers = [];
    if (this.nextDangle == null) this.nextDangle = 4 + Math.random() * 8;
    this.draw();
  },

  // ---------------------------------------------------------------- the spiders
  // on the rock: anywhere except across the dark opening in the middle
  onRock(x, y) {
    const h = this.holes && this.holes[0];
    if (!h) return true;
    return ((x - h.cx) / (h.rx * 0.92)) ** 2 + ((y - h.cy) / (h.ry * 0.92)) ** 2 > 1;
  },
  newSpider() {
    const S = Math.min(this.W, this.H) / 900;
    let x, y, tries = 0;
    do { x = Math.random() * this.W; y = Math.random() * this.H; } while (!this.onRock(x, y) && tries++ < 50);
    return { x, y, a: Math.random() * Math.PI * 2, turn: 0, size: (3.5 + Math.random() * 4) * S * 1.6, speed: (12 + Math.random() * 22) * S,
      rest: 0, phase: Math.random() * 10, tone: 6 + Math.random() * 10 };
  },

  loop() {
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    const step = now => {
      if (!this.active || document.hidden) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      if (!this.still) this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },

  update(dt) {
    const W = this.W, H = this.H, pad = 20;
    for (const s of this.spiders) {
      if (s.rest > 0) { s.rest -= dt; continue; }
      s.turn += (Math.random() - 0.5) * 6 * dt; s.turn *= 0.96;
      s.a += s.turn * dt * 2;
      const nx = s.x + Math.cos(s.a) * s.speed * dt, ny = s.y + Math.sin(s.a) * s.speed * dt;
      // the edge of the rock (the dark opening) or the screen: turn back
      if (!this.onRock(nx, ny) || nx < -pad || nx > W + pad || ny < -pad || ny > H + pad) { s.a += Math.PI * (0.6 + Math.random() * 0.8); continue; }
      s.x = nx; s.y = ny;
      s.phase += dt * s.speed * 0.6;
      if (Math.random() < dt * 0.15) s.rest = 0.5 + Math.random() * 2.5;
    }
    this.nextDangle -= dt;
    if (this.nextDangle <= 0 && this.danglers.length < 2) {
      const S = Math.min(W, H) / 900;
      this.danglers.push({ x: W * (0.1 + Math.random() * 0.8), y: 0, max: H * (0.1 + Math.random() * 0.25), v: (25 + Math.random() * 20) * S,
        state: "down", hang: 3 + Math.random() * 5, size: (5 + Math.random() * 3) * S * 1.4, sway: Math.random() * 6 });
      this.nextDangle = 10 + Math.random() * 15;
    }
    for (const d of this.danglers) {
      d.sway += dt;
      if (d.state === "down") { d.y += d.v * dt; if (d.y >= d.max) d.state = "hang"; }
      else if (d.state === "hang") { d.hang -= dt; if (d.hang <= 0) d.state = "up"; }
      else d.y -= d.v * 0.7 * dt;
    }
    this.danglers = this.danglers.filter(d => d.y > -10);
  },

  draw() {
    const c = this.ctx, dpr = this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.cave, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of this.spiders) this.drawSpider(c, s.x, s.y, s.a + Math.PI / 2, s.size, s.rest > 0 ? 0 : s.phase, s.tone);
    for (const d of this.danglers) {
      const x = d.x + Math.sin(d.sway * 0.9) * 3;
      c.strokeStyle = "rgba(200,190,175,0.3)"; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(d.x, 0); c.lineTo(x, d.y); c.stroke();
      this.drawSpider(c, x, d.y + d.size, Math.PI, d.size, d.state === "hang" ? 0 : d.sway * 4, 8);
    }
  },

  // a tiny spider facing `a` (0 = up): dark legs stepping as it goes, a dark body with a dull sheen on its back
  drawSpider(c, x, y, a, s, phase, tone) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.strokeStyle = `rgb(${tone + 22},${tone + 14},${tone + 8})`; c.lineWidth = Math.max(0.8, s * 0.17); c.lineCap = "round";
    for (let side = -1; side <= 1; side += 2) {
      for (let k = 0; k < 4; k++) {
        const base = (-0.55 + k * 0.38) * Math.PI;
        const step = Math.sin(phase + k * 1.6 + (side > 0 ? Math.PI : 0)) * 0.22;
        const a1 = base + step, kx = Math.cos(a1) * s * 1.2 * side, ky = Math.sin(a1) * s * 1.1;
        const fx = kx + Math.cos(a1 + 0.5 * side) * s * 1.1 * side * 0.9, fy = ky + s * (k < 2 ? -0.5 : 0.7);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(kx, ky - s * 0.25); c.lineTo(fx, fy); c.stroke();
      }
    }
    c.fillStyle = `rgb(${tone + 3},${tone},${tone - 2})`;
    c.beginPath(); c.ellipse(0, s * 0.75, s * 0.62, s * 0.8, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, -s * 0.25, s * 0.4, s * 0.42, 0, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-s * 0.2, s * 0.45, 0, -s * 0.2, s * 0.45, s * 0.5);
    g.addColorStop(0, "rgba(150,110,75,0.6)"); g.addColorStop(1, "rgba(150,110,75,0)");
    c.fillStyle = g; c.beginPath(); c.ellipse(0, s * 0.75, s * 0.62, s * 0.8, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
};
