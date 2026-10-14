// bs-cave.js - the "Cave" table: a shadowy cave strewn with cobwebs, tiny spiders crawling about it all the time and
// now and then one lowering itself on a thread from the roof. The rock and the webs are drawn once per window size;
// the spiders move over them. Drawn on a canvas behind the table; it only runs while the Cave table is chosen, rests
// while the tab is hidden, and the spiders stay put for anyone who has asked their computer for reduced motion.

const CAVE = {
  canvas: null, ctx: null, rock: null, spiders: [], danglers: [], active: false, raf: 0, last: 0, W: 0, H: 0, dpr: 1,
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

  // ---------------------------------------------------------------- the rock and the webs (drawn once)
  build() {
    const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    const rock = document.createElement("canvas");
    rock.width = this.canvas.width; rock.height = this.canvas.height;
    const c = rock.getContext("2d");
    c.scale(dpr, dpr);
    let seed = 1234567;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const S = Math.min(W, H) / 900;   // scale: things are sized for a 900px-tall window

    // the rock: a craggy height field (a few layers of smooth noise, ridged), lit from above, drawn small and
    // stretched smooth - then fine grit over it
    {
      const q = 3, gw = Math.ceil(W / q), gh = Math.ceil(H / q);
      const lattice = (cell) => {   // smooth value noise on a grid of `cell` px
        const cw = Math.ceil((gw + gh) * 2.2 / cell) + 4, ch = cw, v = new Float32Array(cw * ch);
        for (let k = 0; k < v.length; k++) v[k] = rnd();
        const ang = rnd() * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang), ox = rnd() * cell * 5, oy = rnd() * cell * 5;
        return (x0_, y0_) => {
          const x = Math.abs(x0_ * ca - y0_ * sa + ox + gw), y = Math.abs(x0_ * sa + y0_ * ca + oy + gw);
          const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
          const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), at = (a, b) => v[b * cw + a];
          return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
        };
      };
      const oct = [[lattice(110 * S), 1], [lattice(48 * S), 0.55], [lattice(21 * S), 0.28], [lattice(9 * S), 0.13], [lattice(4 * S), 0.06]];
      const warp = lattice(60 * S), warp2 = lattice(60 * S);
      const hgt = new Float32Array(gw * gh);
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        let h = 0;
        const wx = x + (warp(x, y) - 0.5) * 40 * S, wy = y + (warp2(x, y) - 0.5) * 40 * S;
        for (const [f, a] of oct) { const n = f(wx, wy); h += a * (1 - Math.abs(n * 2 - 1)); }   // ridged: sharp crests, deep cracks
        hgt[y * gw + x] = h;
      }
      const img = c.createImageData(gw, gh), d = img.data;
      for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
        const k = y * gw + x, h = hgt[k];
        const dx = hgt[k + 1] - hgt[k - 1], dy = hgt[k + gw] - hgt[k - gw];
        let lit = 0.45 - dy * 3.2 - dx * 1.1;                // light from above (a little from the left)
        lit = Math.max(0, Math.min(1, lit)) ** 1.4 * (0.2 + h * 0.5);
        const v = 6 + lit * 62;
        d[k * 4] = v * 1.12 + 4; d[k * 4 + 1] = v * 0.86 + 2; d[k * 4 + 2] = v * 0.68; d[k * 4 + 3] = 255;
      }
      const t = document.createElement("canvas"); t.width = gw; t.height = gh; t.getContext("2d").putImageData(img, 0, 0);
      c.imageSmoothingQuality = "high";
      c.drawImage(t, 1, 1, gw - 2, gh - 2, 0, 0, W, H);
    }
    for (let i = 0; i < W * H / 500; i++) {
      c.fillStyle = rnd() < 0.6 ? `rgba(0,0,0,${0.15 + rnd() * 0.3})` : `rgba(160,130,100,${0.04 + rnd() * 0.08})`;
      c.fillRect(rnd() * W, rnd() * H, 1 + rnd(), 1 + rnd());
    }
    // stalactites along the roof
    for (let x = -20; x < W + 20; x += (40 + rnd() * 90) * S) {
      const len = (20 + rnd() * 80) * S, w = (16 + rnd() * 30) * S;
      const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, "rgba(46,34,25,0.85)"); g.addColorStop(0.45, "rgba(30,22,16,0.9)"); g.addColorStop(1, "rgba(8,5,4,0.9)");
      c.fillStyle = g;
      c.beginPath(); c.moveTo(x - w / 2, 0); c.quadraticCurveTo(x - w * 0.15, len * 0.6, x + (rnd() - 0.5) * 4, len);
      c.quadraticCurveTo(x + w * 0.15, len * 0.6, x + w / 2, 0); c.closePath(); c.fill();
    }
    const rg = c.createLinearGradient(0, 0, 0, H * 0.25);
    rg.addColorStop(0, "rgba(0,0,0,0.6)"); rg.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = rg; c.fillRect(0, 0, W, H * 0.25);
    // a faint warm light in the middle, where the table is, and deep shadow round the edges
    const lg = c.createRadialGradient(W / 2, H * 0.52, 0, W / 2, H * 0.52, Math.max(W, H) * 0.6);
    lg.addColorStop(0, "rgba(170,100,40,0.2)"); lg.addColorStop(0.5, "rgba(80,45,20,0.06)"); lg.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = lg; c.fillRect(0, 0, W, H);
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.88)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);

    // cobwebs: a big one in each top corner, smaller ones about the walls, and loose strands
    this.strands = [];
    const web = (cx, cy, R, a0, a1, spokes, rings, alpha) => {
      const ends = [];
      for (let k = 0; k <= spokes; k++) {
        const a = a0 + (a1 - a0) * k / spokes + (rnd() - 0.5) * 0.08;
        const r = R * (0.85 + rnd() * 0.3);
        ends.push([a, r]);
        c.strokeStyle = `rgba(215,205,190,${alpha})`; c.lineWidth = 0.9 * S;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.stroke();
        this.strands.push([cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      for (let i = 1; i <= rings; i++) {
        const f = (i / rings) ** 1.15;
        c.strokeStyle = `rgba(215,205,190,${alpha * (0.6 + 0.4 * rnd())})`; c.lineWidth = 0.7 * S;
        c.beginPath();
        for (let k = 0; k < ends.length; k++) {
          const [a, r] = ends[k], x = cx + Math.cos(a) * r * f, y = cy + Math.sin(a) * r * f;
          if (!k) { c.moveTo(x, y); continue; }
          // each thread sags a little towards the centre between the spokes
          const [pa, pr] = ends[k - 1], ma = (a + pa) / 2, mr = (r + pr) / 2 * f * 0.9;
          c.quadraticCurveTo(cx + Math.cos(ma) * mr, cy + Math.sin(ma) * mr, x, y);
        }
        c.stroke();
      }
      // a torn bit hanging loose
      if (rnd() < 0.7) {
        const [a, r] = ends[Math.floor(rnd() * ends.length)], x = cx + Math.cos(a) * r * 0.7, y = cy + Math.sin(a) * r * 0.7;
        c.strokeStyle = `rgba(215,205,190,${alpha * 0.8})`; c.beginPath(); c.moveTo(x, y);
        c.quadraticCurveTo(x + 10 * S, y + 30 * S, x + (rnd() - 0.5) * 20 * S, y + (40 + rnd() * 40) * S); c.stroke();
      }
    };
    web(0, 0, 330 * S, 0, Math.PI / 2, 9, 11, 0.32);
    web(W, 0, 300 * S, Math.PI / 2, Math.PI, 8, 10, 0.3);
    web(0, H, 220 * S, -Math.PI / 2, 0, 7, 8, 0.24);
    web(W, H, 240 * S, Math.PI, Math.PI * 1.5, 7, 8, 0.24);
    for (let i = 0; i < 7; i++) {
      const edge = rnd() < 0.5;
      const x = edge ? (rnd() < 0.5 ? rnd() * W * 0.18 : W - rnd() * W * 0.18) : rnd() * W;
      const y = edge ? rnd() * H : (rnd() < 0.6 ? rnd() * H * 0.2 : H - rnd() * H * 0.15);
      const a0 = rnd() * Math.PI * 2;
      web(x, y, (70 + rnd() * 90) * S, a0, a0 + Math.PI * (1.2 + rnd() * 0.8), 7, 6, 0.16 + rnd() * 0.1);
    }
    // loose strands sagging between points of rock
    for (let i = 0; i < 16; i++) {
      const x1 = rnd() * W, y1 = rnd() * H * 0.4, x2 = x1 + (rnd() - 0.5) * 400 * S, y2 = y1 + (rnd() - 0.2) * 200 * S;
      c.strokeStyle = `rgba(215,205,190,${0.08 + rnd() * 0.12})`; c.lineWidth = 0.7 * S;
      c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + (20 + rnd() * 60) * S, x2, y2); c.stroke();
    }
    this.rock = rock;

    // the spiders: tiny, dark, crawling about; more on a bigger window
    const count = Math.round(Math.min(40, Math.max(14, W * H / 45000)));
    this.spiders = [...Array(count)].map(() => this.newSpider(rnd() * W, rnd() * H));
    this.danglers = [];
    this.nextDangle = 4 + Math.random() * 8;
    this.draw(0);
  },

  newSpider(x, y) {
    const S = Math.min(this.W, this.H) / 900;
    return { x, y, a: Math.random() * Math.PI * 2, turn: 0, size: (3 + Math.random() * 3.5) * S * 1.4, speed: (12 + Math.random() * 22) * S,
      rest: 0, phase: Math.random() * 10, tone: 8 + Math.random() * 14 };
  },

  // ---------------------------------------------------------------- moving
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
    const W = this.W, H = this.H, pad = 30;
    for (const s of this.spiders) {
      if (s.rest > 0) { s.rest -= dt; continue; }
      // wander: the heading drifts, sometimes it stops for a moment
      s.turn += (Math.random() - 0.5) * 6 * dt; s.turn *= 0.96;
      s.a += s.turn * dt * 2;
      s.x += Math.cos(s.a) * s.speed * dt; s.y += Math.sin(s.a) * s.speed * dt;
      s.phase += dt * s.speed * 0.6;
      if (Math.random() < dt * 0.15) s.rest = 0.5 + Math.random() * 2.5;
      // off the edge: come back in (or, now and then, a new one appears somewhere else)
      if (s.x < -pad || s.x > W + pad || s.y < -pad || s.y > H + pad) {
        if (Math.random() < 0.5) Object.assign(s, this.newSpider(Math.random() < 0.5 ? -pad / 2 : W + pad / 2, Math.random() * H), { a: s.x < 0 ? Math.PI : 0 });
        s.a = Math.atan2(H / 2 - s.y, W / 2 - s.x) + (Math.random() - 0.5) * 1.5;
        s.x = Math.max(-pad, Math.min(W + pad, s.x)); s.y = Math.max(-pad, Math.min(H + pad, s.y));
      }
    }
    // now and then a spider lowers itself from the roof on a thread, hangs a while and climbs back
    this.nextDangle -= dt;
    if (this.nextDangle <= 0 && this.danglers.length < 2) {
      const S = Math.min(W, H) / 900;
      this.danglers.push({ x: W * (0.08 + Math.random() * 0.84), y: 0, max: H * (0.12 + Math.random() * 0.3), v: (25 + Math.random() * 20) * S,
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

  draw(t) {
    const c = this.ctx, dpr = this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.rock, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of this.spiders) this.drawSpider(c, s.x, s.y, s.a + Math.PI / 2, s.size, s.rest > 0 ? 0 : s.phase, s.tone);
    for (const d of this.danglers) {
      const x = d.x + Math.sin(d.sway * 0.9) * 3;
      c.strokeStyle = "rgba(220,210,195,0.35)"; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(d.x, 0); c.lineTo(x, d.y); c.stroke();
      this.drawSpider(c, x, d.y + d.size, Math.PI, d.size, d.state === "hang" ? 0 : d.sway * 4, 10);
    }
  },

  // a tiny spider facing `a` (0 = up): an abdomen, a head, eight legs stepping as it goes
  drawSpider(c, x, y, a, s, phase, tone) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.strokeStyle = `rgb(${tone + 30},${tone + 20},${tone + 12})`; c.lineWidth = Math.max(0.7, s * 0.16); c.lineCap = "round";
    for (let side = -1; side <= 1; side += 2) {
      for (let k = 0; k < 4; k++) {
        const base = (-0.55 + k * 0.38) * Math.PI;               // legs fan from the front to the back
        const step = Math.sin(phase + k * 1.6 + (side > 0 ? Math.PI : 0)) * 0.22;
        const a1 = base + step, kx = Math.cos(a1) * s * 1.2 * side, ky = Math.sin(a1) * s * 1.1;
        const fx = kx + Math.cos(a1 + 0.5 * side) * s * 1.1 * side * 0.9, fy = ky + s * (k < 2 ? -0.5 : 0.7);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(kx, ky - s * 0.25); c.lineTo(fx, fy); c.stroke();
      }
    }
    c.fillStyle = `rgb(${tone + 4},${tone},${tone - 3})`;
    c.strokeStyle = "rgba(210,175,140,0.28)"; c.lineWidth = Math.max(0.6, s * 0.12);   // a faint rim of light, so they show in the dark
    c.beginPath(); c.ellipse(0, s * 0.75, s * 0.62, s * 0.8, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, -s * 0.25, s * 0.4, s * 0.42, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    // a glint on its back
    c.fillStyle = "rgba(255,220,180,0.18)"; c.beginPath(); c.arc(-s * 0.18, s * 0.5, s * 0.18, 0, Math.PI * 2); c.fill();
    c.restore();
  }
};
