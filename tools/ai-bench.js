// Run from the BlackSpider folder: node tools/ai-bench.js bs-ai.js hard bs-ai.js medium 4 60   (TUNE={...} env overrides the candidate's TUNE)
// Duplicate bench: the same deals played with a candidate AI in each seat in turn (everyone else the baseline).
// usage: node bench.js <candFile> <candLevel> <baseFile> <baseLevel> [players=4] [deals=200] [seed=1]
// prints the candidate's mean points per hand vs the baseline players', sweeps, and time.
const fs = require('fs'), vm = require('vm'), path = require('path');
const [candFile, candLevel, baseFile, baseLevel] = process.argv.slice(2, 6);
const N = +(process.argv[6] || 4), DEALS = +(process.argv[7] || 200), SEED = +(process.argv[8] || 1);
const CORE = fs.readFileSync('D:/CodeGen/BlackSpider/bs-core.js', 'utf8');
let rngState = 1;
const rng = () => { rngState = (rngState * 1103515245 + 12345) & 0x7fffffff; return rngState / 0x80000000; };
const SeededMath = Object.create(Math); SeededMath.random = rng;
function mk(file, over) {
  const c = { TUNE_OVERRIDE: over, console, Math: SeededMath, Set, Map, Array, Object, String, Number, JSON, performance: { now: () => Date.now() } };
  vm.createContext(c);
  vm.runInContext(CORE, c);
  vm.runInContext(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'), c);
  return c;
}
const OVER = process.env.TUNE ? JSON.parse(process.env.TUNE) : undefined;
const A = mk(baseFile), B = mk(candFile, OVER);
vm.runInContext('globalThis.BlackSpiderGame = BlackSpiderGame; globalThis.BlackSpiderAI = BlackSpiderAI;', A);
vm.runInContext('globalThis.BlackSpiderAI = BlackSpiderAI;', B);

function playHand(seatAI) {
  const g = new A.BlackSpiderGame();
  g.startNewGame({ numPlayers: N, firstDealer: 0 });
  g.startRound();
  for (let s = 0; s < N; s++) g.setPass(s, seatAI[s].choosePass(g.hands[s].cards.slice(), { game: g, seat: s }));
  let guard = 0;
  while (g.phase === 'play' && guard++ < 200) {
    const s = g.turn, legal = g.getLegalMovesFor(s);
    let i = seatAI[s].choosePlay({ hand: g.hands[s].cards, legal, plays: g.currentTrick.plays, numPlayers: N, seat: s, game: g });
    if (!legal.includes(i)) throw new Error('illegal from seat ' + s);
    const r = g.playCard(s, i);
    if (r.trickComplete) g.resolveCompletedTrick();
  }
  const h = g.history[0];
  return { points: h.points, sweep: h.sweeper >= 0 };
}
let cand = 0, base = 0, nc = 0, nb = 0, sweeps = 0, candSweeps = 0, hands = 0;
const t0 = Date.now();
for (let d = 0; d < DEALS; d++) {
  for (let k = 0; k < N; k++) {
    rngState = SEED * 7919 + d * 104729;          // the same deal (and the same luck) for every seat rotation
    const ais = [...Array(N)].map((_, s) => s === k ? new B.BlackSpiderAI({ difficulty: candLevel }) : new A.BlackSpiderAI({ difficulty: baseLevel }));
    const r = playHand(ais);
    hands++;
    if (r.sweep) { sweeps++; if (r.points[k] === 0) candSweeps++; }
    r.points.forEach((p, s) => { if (s === k) { cand += p; nc++; } else { base += p; nb++; } });
  }
}
const cm = cand / nc, bm = base / nb;
console.log(`${process.env.TUNE || ''} ${candFile}:${candLevel} vs ${baseFile}:${baseLevel} | ${N}p ${DEALS} deals | cand ${cm.toFixed(2)} base ${bm.toFixed(2)} | edge ${(bm - cm).toFixed(2)}/hand | sweeps ${(sweeps / hands * 100).toFixed(1)}% (cand ${candSweeps}) | ${((Date.now() - t0) / 1000).toFixed(0)}s`);
