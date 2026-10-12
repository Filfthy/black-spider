// bs-core.js - Black Spider: the rules (Black Spy), the card model, and the card faces.
// (No DOM element lookups and no AI here. Layout helpers are shared with Oh Hell.)
//
// 60 cards: red, blue, purple and green, each numbered 1-11, and black 1-11 plus five more black 7s - six Black
// Spiders. Everyone passes 3 cards, then tricks: follow the colour led if you can (a card of the same number may be played instead); the
// highest card of the colour led wins (the first of equal cards). Taking points is bad: black 1-6 are 1, the Black
// Spiders 10, black 8-11 2-5; the coloured 7s are -5 (good to take). Taking every black card ("the sweep") scores 0
// and everyone else 60. Lowest total when someone reaches the target wins.

// the Infernal creases: fronts per game, backs per deal (a crease on a back never gives a card away)
let CREASE_SEED = (Math.random() * 4294967296) >>> 0;
let BACK_CREASE_SEED = (Math.random() * 4294967296) >>> 0;
let INFERNAL = true;   // (Oh Hell's switch; Black Spider is always in the Infernal style)

// ===== Colours (the "suits") =====
const COLOURS = ["R", "B", "P", "G", "K"];
const COLOUR_NAME = { R: "red", B: "blue", P: "purple", G: "green", K: "black" };
const COLOUR_ORDER = { R: 0, P: 1, G: 2, B: 3, K: 4 };   // your hand, left to right
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// what each number shows (the placeholder pictures; the real art follows the same list)
const SPIDER_POSE = ["", "Dangling", "Climbing", "Spinning", "Juggling", "Tightrope", "Trapeze",
  "Wrapping a fly", "Abseiling", "The tower", "Knitting", "Enthroned"];
const BLACK_SPIDER_RANK = 7;
const FIRST_LEAD = "R1";            // its holder leads the first trick (and black may not be led then)
const SWEEP_PENALTY = 60;
// the score that ends the game, by players: the rulebook's, or about half for a short game
const TARGETS = { 3: 200, 4: 150, 5: 120, 6: 100 };

// Base sizes for scaling (Oh Hell's: a real card's 5:7)
const BASE_CARD_WIDTH = 64;
const BASE_CARD_HEIGHT = 90;
const BASE_INDEX_PX = 16, BASE_PIP_PX = 10, MIN_INDEX_PX = 11, MIN_PIP_PX = 5;
const layoutMetrics = { scale: 1, cardWidth: BASE_CARD_WIDTH, cardHeight: BASE_CARD_HEIGHT };

// ===== Model =====
class Card {
  constructor(suit, rank, copy = 0) {
    this.suit = suit;        // colour: R B P G K
    this.rank = rank;        // 1-11
    this.value = rank;
    this.copy = copy;        // the extra black 7s: 1-5
    this.isSpecial = false;
  }
  get points() { return cardPoints(this); }
  get isBlackSpider() { return this.suit === "K" && this.rank === BLACK_SPIDER_RANK; }
}
function cardPoints(c) {
  if (c.suit === "K") return c.rank === 7 ? 10 : c.rank <= 6 ? 1 : c.rank - 6;   // 8-11: 2-5
  return c.rank === 7 ? -5 : 0;
}
function cardCode(c) { return c.suit + c.rank + (c.copy ? String.fromCharCode(96 + c.copy) : ""); }   // R1, K7, K7a..K7e
// a small spider drawing (counts of Black Spiders taken)
const spiderIcon = (n = 1) => '<svg class="sp-icon" viewBox="-30 -32 60 60" aria-hidden="true"><use href="#sp-icon"/></svg>'.repeat(n);
function cardName(c) {
  if (c.isBlackSpider) return "a Black Spider";
  return `${COLOUR_NAME[c.suit]} ${c.rank}`;
}

class Hand {
  constructor(cards = []) { this.cards = cards; }
  add(c) { this.cards.push(c); }
  removeAt(i) { return this.cards.splice(i, 1)[0]; }
}

function createDeck() {
  const d = [];
  for (const s of COLOURS) for (const r of RANKS) d.push(new Card(s, r));
  for (let k = 1; k <= 5; k++) d.push(new Card("K", BLACK_SPIDER_RANK, k));
  return d;   // 60
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Following: if you have the colour led you must play that colour - or, instead, a card of the same number.
// With none of the colour led, you may play anything (a matching number included).
const follows = (c, lead) => c.suit === lead.suit || c.rank === lead.rank;
function followIndices(cards, lead) {
  const all = cards.map((_, i) => i);
  if (!cards.some(c => c.suit === lead.suit)) return all;
  return all.filter(i => follows(cards[i], lead));
}
// which play wins: the highest of the colour led; of equal cards (the Black Spiders), the first played
function trickWinnerIndex(cards) {
  const lead = cards[0];
  let best = 0;
  for (let i = 1; i < cards.length; i++) if (cards[i].suit === lead.suit && cards[i].rank > cards[best].rank) best = i;
  return best;
}

class Trick {
  constructor(leader, numPlayers) { this.leader = leader; this.numPlayers = numPlayers; this.plays = []; }
  addPlay(who, card) { this.plays.push({ who, card }); }
  isComplete() { return this.plays.length >= this.numPlayers; }
  winner() { return this.plays[trickWinnerIndex(this.plays.map(p => p.card))].who; }
  get points() { return this.plays.reduce((a, p) => a + p.card.points, 0); }
}

// passing: who you pass to, as seats to your left (clockwise). 4 players: left, right, across; otherwise left, right.
function passOffset(roundIndex, n) {
  if (n === 4) return [1, 3, 2][roundIndex % 3];
  return roundIndex % 2 === 0 ? 1 : n - 1;
}
function passWords(offset, n) { return offset === 1 ? "left" : offset === n - 1 ? "right" : "across"; }

// Seat 0 is always the human. Seats go clockwise: 0 -> 1 -> 2 ...
class BlackSpiderGame {
  constructor() {
    this.numPlayers = 4;
    this.phase = "idle";     // 'idle' | 'pass' | 'play' | 'roundEnd' | 'gameOver'
    this.roundIndex = -1;
    this.scores = [];
    this.history = [];
    this.hands = [];
    this.taken = [];         // this round: points taken, per seat
    this.takenCards = [];    // this round: the scoring cards taken, per seat
    this.trickHistory = [];
    this.playedCards = [];
  }

  startNewGame({ numPlayers = 4, firstDealer = 0, length = "full", presetRounds = null } = {}) {
    this.numPlayers = numPlayers;
    this.target = Math.round(TARGETS[numPlayers] * (length === "short" ? 0.5 : 1));
    this.scores = new Array(numPlayers).fill(0);
    this.history = [];
    this.roundIndex = -1;
    this.dealer = firstDealer;
    this.presetRounds = presetRounds;
    this.phase = "idle";
    this.hands = [];
    this.handSize = 60 / numPlayers;
    this.currentTrick = null;
  }

  nextSeat(s) { return (s + 1) % this.numPlayers; }
  get totalRounds() { return 0; }   // (played to a score, not a number of rounds)

  startRound() {
    if (this.roundIndex >= 0) this.dealer = this.nextSeat(this.dealer);
    this.roundIndex++;
    const n = this.numPlayers;
    this.handSize = 60 / n;
    const preset = this.presetRounds && this.presetRounds[this.roundIndex];
    if (preset) {
      this.hands = preset.hands.map(codes => new Hand(codes.map(parseCard)));
    } else {
      const deck = shuffle(createDeck());
      this.hands = [...Array(n)].map(() => new Hand([]));
      // one at a time from the dealer's left
      deck.forEach((c, i) => this.hands[(this.dealer + 1 + i) % n].add(c));
    }
    BACK_CREASE_SEED = (Math.random() * 4294967296) >>> 0;
    this.taken = new Array(n).fill(0);
    this.takenCards = [...Array(n)].map(() => []);
    this.tricksWon = new Array(n).fill(0);
    this.trickHistory = [];
    this.playedCards = [];
    this.tricksPlayed = 0;
    this.passTo = passOffset(this.roundIndex, n);
    this.passes = new Array(n).fill(null);   // the cards each seat passes
    this.received = [...Array(n)].map(() => []);
    this.phase = "pass";
    this.turn = null;
    this.currentTrick = null;
  }

  // a seat chooses its three cards to pass (indices into its hand)
  setPass(seat, indices) {
    if (this.phase !== "pass" || this.passes[seat] || indices.length !== 3 || new Set(indices).size !== 3) return { ok: false };
    this.passes[seat] = indices.map(i => this.hands[seat].cards[i]);
    if (this.passes.every(p => p)) this.applyPasses();
    return { ok: true };
  }
  applyPasses() {
    const n = this.numPlayers;
    for (let s = 0; s < n; s++) {
      const to = (s + this.passTo) % n;
      for (const c of this.passes[s]) {
        const h = this.hands[s].cards; h.splice(h.indexOf(c), 1);
      }
      this.received[to] = this.passes[s].slice();
    }
    for (let s = 0; s < n; s++) this.received[s].forEach(c => this.hands[s].add(c));
    this.phase = "play";
    // the holder of red 1 leads
    const lead = this.hands.findIndex(h => h.cards.some(c => cardCode(c) === FIRST_LEAD));
    this.turn = lead >= 0 ? lead : this.nextSeat(this.dealer);
    this.currentTrick = new Trick(this.turn, n);
  }

  getLegalMovesFor(seat) {
    if (this.phase !== "play" || seat !== this.turn) return [];
    const cards = this.hands[seat].cards, all = cards.map((_, i) => i);
    const t = this.currentTrick;
    if (!t.plays.length) {
      // leading: anything - except that black may not lead the first trick
      if (this.tricksPlayed === 0) { const ok = all.filter(i => cards[i].suit !== "K"); return ok.length ? ok : all; }
      return all;
    }
    const lead = t.plays[0].card;
    return followIndices(cards, lead);
  }

  playCard(seat, index) {
    if (!this.getLegalMovesFor(seat).includes(index)) return { ok: false };
    const card = this.hands[seat].removeAt(index);
    this.currentTrick.addPlay(seat, card);
    this.playedCards.push(card);
    if (this.currentTrick.isComplete()) return { ok: true, card, trickComplete: true };
    this.turn = this.nextSeat(seat);
    return { ok: true, card, trickComplete: false };
  }

  resolveCompletedTrick() {
    const t = this.currentTrick;
    const winner = t.winner();
    const pts = t.points;
    this.taken[winner] += pts;
    this.tricksWon[winner]++;
    t.plays.forEach(p => { if (p.card.points) this.takenCards[winner].push(p.card); });
    this.trickHistory.push({ leader: t.leader, plays: t.plays.slice(), winner, points: pts });
    this.tricksPlayed++;
    const plays = t.plays.slice();
    if (this.hands[0].cards.length === 0) {
      this.finishRound();
      return { winner, plays, points: pts, roundOver: true };
    }
    this.turn = winner;
    this.currentTrick = new Trick(winner, this.numPlayers);
    return { winner, plays, points: pts, roundOver: false };
  }

  finishRound() {
    const n = this.numPlayers;
    const blackCount = this.takenCards.map(cs => cs.filter(c => c.suit === "K").length);
    const sweeper = blackCount.findIndex(k => k === 16);
    const points = sweeper >= 0 ? [...Array(n)].map((_, s) => s === sweeper ? 0 : SWEEP_PENALTY) : this.taken.slice();
    for (let s = 0; s < n; s++) this.scores[s] += points[s];
    this.history.push({ round: this.roundIndex + 1, points, taken: this.taken.slice(), totals: this.scores.slice(),
      sweeper, spiders: this.takenCards.map(cs => cs.filter(c => c.isBlackSpider).length),
      sevens: this.takenCards.map(cs => cs.filter(c => c.suit !== "K" && c.rank === 7).length) });
    this.currentTrick = null;
    this.turn = null;
    this.phase = this.scores.some(v => v >= this.target) ? "gameOver" : "roundEnd";
  }

  // the winners (lowest total) once the game is over
  get leaders() { const lo = Math.min(...this.scores); return this.scores.map((v, s) => v === lo ? s : -1).filter(s => s >= 0); }
}

function parseCard(code) {
  const m = /^([RBPGK])(\d+)([a-e]?)$/.exec(code);
  return new Card(m[1], +m[2], m[3] ? m[3].charCodeAt(0) - 96 : 0);
}

// ===== Layout helpers (Oh Hell's) =====
function computePlayerFanSlot(slotIndex, totalSlots, scale) {
  const spreadDeg = 30;
  const t = totalSlots > 1 ? slotIndex / (totalSlots - 1) : 0.5;
  const angle = -spreadDeg / 2 + t * spreadDeg;
  // a full hand of up to 20: the cards draw closer together so the fan still fits
  const step = totalSlots > 13 ? 14 * 13 / totalSlots : 14;
  return { angle, offsetX: (slotIndex - (totalSlots - 1) / 2) * step * scale, offsetY: Math.abs(angle) * 0.25 * scale };
}
function computeOppFanSlot(slotIndex, totalSlots, scale) {
  const spreadDeg = 24;
  const t = totalSlots > 1 ? slotIndex / (totalSlots - 1) : 0.5;
  const angle = -spreadDeg / 2 + t * spreadDeg;
  const step = totalSlots > 13 ? 6 * 13 / totalSlots : 6;
  return { angle, offsetX: (slotIndex - (totalSlots - 1) / 2) * step * scale, offsetY: -Math.abs(angle) * 0.2 * scale };
}
function getRectCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}

// ===== Card faces =====
// Parchment card (Oh Hell's Infernal paper, wear and creases), the number at top left in the card's colour with its
// points underneath, and the spider picture for its number in a panel. The picture's highlight takes the colour.
class CardView {
  cardColorClass(card) { return "c-" + COLOUR_NAME[card.suit]; }

  crease(div, h) {
    const r = n => (h = (Math.imul(h, 1103515245) + 12345) >>> 0) % n;
    const roll = r(100);
    if (roll >= 17) return;
    div.dataset.crease = String(roll < 6 ? 5 + r(2) : [0, 1, 2, 3, 4, 7][r(6)]);
    div.style.setProperty("--crease-x", r(2) ? "-1" : "1"); div.style.setProperty("--crease-y", r(2) ? "-1" : "1");
  }

  createCardElement(card, options = {}) {
    const div = document.createElement("div");
    div.className = "card small";
    div._card = card || null;
    if (options.clickable) div.classList.add("clickable");
    if (options.back) {
      div.classList.add("back");
      if (card) { let h = 11; for (const ch of cardCode(card)) h = (h * 37 + ch.charCodeAt(0)) >>> 0; this.crease(div, (h ^ BACK_CREASE_SEED) >>> 0); }
      return div;
    }
    if (!card) return div;
    let h = 7; for (const ch of cardCode(card)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    div.dataset.paper = String(h % 8);
    div.dataset.wear = String((h >>> 4) % 6); div.style.setProperty("--wear-x", (h >>> 9) & 1 ? "-1" : "1"); div.style.setProperty("--wear-y", (h >>> 10) & 1 ? "-1" : "1");
    this.crease(div, (h ^ CREASE_SEED) >>> 0);
    div.classList.add("bs-card", this.cardColorClass(card), "inf-court-card");
    if (card.isBlackSpider) div.classList.add("black-spider");
    const p = card.points;
    div.dataset.tip = `${card.isBlackSpider ? "Black Spider" : COLOUR_NAME[card.suit][0].toUpperCase() + COLOUR_NAME[card.suit].slice(1) + " " + card.rank}` +
      (p ? ` · ${p > 0 ? p + " point" + (p === 1 ? "" : "s") + " (bad)" : p + " points (good)"}` : "");
    const corner = document.createElement("div");
    corner.className = "corner bs-corner";
    corner.innerHTML = `<span class="rank">${card.rank}</span>` + (p ? `<span class="pts ${p > 0 ? "bad" : "good"}">${p > 0 ? p : "−" + -p}</span>` : "");
    div.appendChild(corner);
    // the picture: for now one spider design for every number (img/spider-<colour>.webp, tools/make-spider-faces.py)
    const frame = document.createElement("div");
    frame.className = "inf-court bs-art";
    frame.innerHTML = `<img src="img/spider-${COLOUR_NAME[card.suit]}.webp" alt="" draggable="false">`;
    div.appendChild(frame);
    return div;
  }
}
