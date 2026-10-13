// bs-ai.js - Black Spider's computer players.
//   easy:   careless - plays at random half the time
//   medium: the house rules of thumb (below)
//   hard:   tries each card it may play, plays the rest of the hand out many times with guessed hands for the others
//           (medium playing for everyone), and keeps the card that cost it least on average

// how much a card in hand is a worry: it may end up winning a trick full of points, or be points itself
function danger(c, hand) {
  let d = c.rank;
  if (c.suit === "K") d = c.isBlackSpider ? 60 : 20 + c.points * 6 + c.rank;
  else if (c.rank === 7) d = -10;                 // a coloured 7 is worth having: -5 if you take it
  // a long colour can be ducked; a short one can't
  const same = hand.filter(x => x.suit === c.suit).length;
  if (c.suit !== "K" && same <= 2) d += 4;
  return d;
}

class BlackSpiderAI {
  constructor({ difficulty = "medium" } = {}) { this.setDifficulty(difficulty); }
  setDifficulty(d) { this.difficulty = d; }
  resetMemory() {}

  // three cards to pass: the most worrying
  choosePass(hand) {
    const idx = hand.map((c, i) => i);
    if (this.difficulty === "easy" && Math.random() < 0.5) return shuffle(idx.slice()).slice(0, 3);
    return idx.sort((a, b) => danger(hand[b], hand) - danger(hand[a], hand)).slice(0, 3);
  }

  // ctx: { hand, legal, plays, numPlayers, tricksPlayed, playedCards, seat, game }
  choosePlay(ctx) {
    if (ctx.legal.length === 1) return ctx.legal[0];
    if (this.difficulty === "easy" && Math.random() < 0.5) return ctx.legal[Math.floor(Math.random() * ctx.legal.length)];
    if (this.difficulty === "hard" && ctx.game) return this.lookAhead(ctx);
    return mediumPlay(ctx.hand, ctx.legal, ctx.plays, ctx.numPlayers);
  }

  lookAhead(ctx) {
    const g = ctx.game, me = ctx.seat, n = g.numPlayers;
    // the cards nobody has seen, to be shared among the others as their hands
    const seen = new Set([...g.playedCards, ...g.hands[me].cards, ...g.currentTrick.plays.map(p => p.card)].map(cardCode));
    (g.received[me] || []).forEach(c => seen.add(cardCode(c)));
    // what I passed: I know who has them (unless played)
    const passed = (g.passes[me] || []).filter(c => !g.playedCards.includes(c) && !g.currentTrick.plays.some(p => p.card === c));
    const to = (me + g.passTo) % n;
    const unseen = createDeck().filter(c => !seen.has(cardCode(c)) && !passed.some(p => cardCode(p) === cardCode(c)));
    const counts = g.hands.map(h => h.cards.length);
    const SAMPLES = 40;
    const cost = new Map(ctx.legal.map(i => [i, 0]));
    for (let k = 0; k < SAMPLES; k++) {
      const pool = shuffle(unseen.slice());
      const hands = g.hands.map((h, s) => {
        if (s === me) return h.cards.slice();
        const mine = s === to ? passed.slice() : [];
        while (mine.length < counts[s]) mine.push(pool.pop());
        return mine;
      });
      for (const i of ctx.legal) cost.set(i, cost.get(i) + playOut(g, hands, me, i));
    }
    let best = ctx.legal[0];
    for (const i of ctx.legal) if (cost.get(i) < cost.get(best)) best = i;
    return best;
  }
}

// the medium player's choice of card (indices into hand)
function mediumPlay(hand, legal, plays, n) {
  const cards = legal.map(i => hand[i]);
  if (!plays.length) {
    // lead: something low that's unlikely to collect points - not a 7 (any 7 can follow it, a Black Spider included),
    // and black only when it's cheap
    const score = c => c.rank + (c.rank === 7 ? 25 : 0) + (c.suit === "K" ? 30 + c.points * 5 : 0)
      - hand.filter(x => x.suit === c.suit).length * 0.5;
    return legal.reduce((a, b) => score(hand[b]) < score(hand[a]) ? b : a);
  }
  const lead = plays[0].card;
  const bestRank = Math.max(...plays.filter(p => p.card.suit === lead.suit).map(p => p.card.rank));
  const trickPts = plays.reduce((a, p) => a + p.card.points, 0);
  const last = plays.length === n - 1;
  const wins = c => c.suit === lead.suit && c.rank > bestRank;
  const safe = legal.filter(i => !wins(hand[i])), winning = legal.filter(i => wins(hand[i]));
  // a trick worth having (a coloured 7 in it and nothing bad): take it if last, with the card that costs least
  if (winning.length && trickPts < 0 && last) {
    return winning.reduce((a, b) => (hand[b].points < hand[a].points || (hand[b].points === hand[a].points && hand[b].rank > hand[a].rank)) ? b : a);
  }
  if (safe.length) {
    // can't win with these: dump the most worrying of them (a Black Spider, high black, a high card)
    return safe.reduce((a, b) => danger(hand[b], hand) > danger(hand[a], hand) ? b : a);
  }
  // every card wins: last to play - win with the highest, cheapest card (shed it now); otherwise the lowest
  if (last) return winning.reduce((a, b) => (hand[b].points < hand[a].points || (hand[b].points === hand[a].points && hand[b].rank > hand[a].rank)) ? b : a);
  return winning.reduce((a, b) => (hand[b].points < hand[a].points || (hand[b].points === hand[a].points && hand[b].rank < hand[a].rank)) ? b : a);
}

// play the rest of the hand out from now, `me` playing hand index `first` next, everyone else as medium; my points
function playOut(g, handsIn, me, first) {
  const n = g.numPlayers;
  const hands = handsIn.map(h => h.slice());
  let plays = g.currentTrick.plays.map(p => ({ who: p.who, card: p.card }));
  let turn = me, tricksPlayed = g.tricksPlayed, myPts = 0, firstMove = true;
  const legalFor = (h) => {
    const all = h.map((_, i) => i);
    if (!plays.length) {
      if (tricksPlayed === 0) { const r1 = all.filter(i => cardCode(h[i]) === FIRST_LEAD); return r1.length ? r1 : all; }
      return all;
    }
    return followIndices(h, plays[0].card);
  };
  let guard = 0;
  while (hands[me].length + plays.length > 0 && guard++ < 400) {
    const h = hands[turn];
    if (!h.length) break;
    const legal = legalFor(h);
    let i;
    if (firstMove) { i = first; firstMove = false; }
    else i = mediumPlay(h, legal, plays, n);
    plays.push({ who: turn, card: h.splice(i, 1)[0] });
    if (plays.length === n) {
      const w = plays[trickWinnerIndex(plays.map(p => p.card))].who;
      if (w === me) myPts += plays.reduce((a, p) => a + p.card.points, 0);
      plays = []; tricksPlayed++; turn = w;
      if (!hands[me].length) break;
    } else turn = (turn + 1) % n;
  }
  return myPts;
}
