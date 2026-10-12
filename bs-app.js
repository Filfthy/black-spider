// bs-app.js
// Table view + game controller for Black Spider (built on Oh Hell's).

// Corner button icons (drawn, so they look the same everywhere), as in German Whist.
const svgIcon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  full: svgIcon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  exitFull: svgIcon('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  sound: svgIcon('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  muted: svgIcon('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  sun: svgIcon('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
  quit: svgIcon('<path d="M6 6l12 12M18 6L6 18"/>'),
  rules: svgIcon('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8.5 7.5h7M8.5 11h7"/>'),
  gear: svgIcon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>')
};

// Seat positions around the table, clockwise from the human (seat 0, bottom).
const SEAT_LAYOUTS = {
  2: ["bottom", "top"],
  3: ["bottom", "left", "right"],
  4: ["bottom", "left", "top", "right"],
  5: ["bottom", "left", "topleft", "topright", "right"]
};

// Where each seat's card lands in the centre, in card widths / heights, plus a slight tilt.
const TRICK_OFFSETS = {
  bottom:   { x:  0.00, y:  0.36, rot:  0 },
  top:      { x:  0.00, y: -0.22, rot:  0 },
  left:     { x: -0.90, y:  0.00, rot: -8 },
  right:    { x:  0.90, y:  0.00, rot:  8 },
  topleft:  { x: -0.50, y: -0.32, rot: -5 },
  topright: { x:  0.50, y: -0.32, rot:  5 }
};

// Each opponent's hand is turned to face the middle of the table.
const SEAT_ANGLE = { bottom: 0, left: 90, topleft: 135, top: 180, topright: -135, right: -90 };

// Opponents are drawn at random from this pool for each game.
// (benched: "Banshee" - her portrait and moving frames are kept, so she can come back by adding her name here)
const OPPONENT_POOL = ["Lilith", "Persephone", "Lamia", "Loki", "Old Nick", "Bub",
  "Cerberus", "Brimstone", "Hellga", "Davy Jones", "Faust",
  "Morgana", "Jezebel", "Anubis", "Charon", "Hecate", "Ereshkigal", "Ammit", "Kali", "Ronnie", "Sojobo"];
// Every portrait looks to the right as drawn, except these, which face straight ahead (you, and three-headed
// Cerberus). Portraits left of the table's centre line are shown as drawn; right of it they're mirrored.
const PORTRAIT_FRONT = { player: true, cerberus: true };
// Portraits drawn in three views (img/opp-<name>-l/c/r.webp), shown as they are rather than mirrored. None now:
// Old Nick uses his looking-right view, mirrored like everyone else, so his moving portrait can be the same picture.
const PORTRAIT_VIEWS = {};
// Opponent card size relative to yours; recalculated for screen shape and
// player count (see updateOppScale).
let OPP_CARD_SCALE = 0.85;

// your hand: by colour (red, purple, green, blue, black), low to high

// Game pace: 1 = normal, 0.5 = fast. Scales pauses and card flights.
let GAME_SPEED = 1;

function applyFaces() {}   // (Oh Hell's large-index faces: Black Spider's cards always show their full faces)
const PHONE_HAND_SCALE = 1.4;   // your hand on phones (see updateScale)
const PHONE_FAN_TIGHTEN = 0.9;  // closer card spacing for that bigger hand
let IS_PHONE = false;
let HAND_SCALE = 1;   // trump coin size while it spins mid-table
// Touch screens get "tap to pick, tap again to play" so a stray tap
// doesn't play a card.
const IS_TOUCH = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
const wait = (ms) => new Promise(r => setTimeout(r, ms * GAME_SPEED));

class GameController {
  constructor() {
    this.game = new BlackSpiderGame();
    this.cardView = new CardView();

    this.difficulty = "easy";
    this.aiEngine = new BlackSpiderAI({ difficulty: this.difficulty });

    this.ANIM_EASE = t => t * t * (3 - 2 * t);

    this.playerName = "Player";
    this.numPlayers = 4;
    this.firstDealMode = "random";
    this.playersChoice = "4";        // "3".."5" or "random"
    this.length = "full";            // 'full' (the rulebook's target score) | 'short' (half)

    this.epoch = 0;          // bumps on every new game; stale async flows bail out
    this.busy = false;       // true while cards are flying
    this.overlayActive = true;
    this.dealVisible = null; // per-seat card counts while dealing
    this.hiddenTrickSeat = null; // seat whose trick card is mid-flight
    this.playFlow = 0;       // id of the play loop currently allowed to run
    this.trumpHidden = false;
    this.pickedIdx = null;     // touch screens: card picked by the first tap
    this.passPick = [];        // the cards you've picked to pass (indices into your hand)
    this.received = [];        // the cards passed to you this hand (shown lifted until you play)
    this.seatEls = [];
    this.tut = null;           // running tutorial (TUTORIAL script) or null
    this.pickOpponents();

    // WebAudio (for win/lose jingle)
    this.audioCtx = null;
    this.sfxVolume = 1;   // the Game slider in the sound panel (0 to 1)
    this.playedEndJingle = false;
    this.soundMuted = true;

    this.sfx = {
      cardShove2: new Audio("card-shove-2.ogg")
    };
    this.sfx.cardShove2.preload = "auto";
    this.sfx.cardShove2.volume = 0.4;
    try { this.sfx.cardShove2.load(); } catch (e) { /* ignore */ }

    try {
      const savedSfx = localStorage.getItem("bs_sfxVol");
      if (savedSfx != null) this.sfxVolume = +savedSfx;
      const savedMuted = localStorage.getItem("bs_soundMuted");
      if (savedMuted != null) this.soundMuted = (savedMuted === "1");

      const savedName = localStorage.getItem("bs_playerName");
      if (savedName) this.playerName = savedName;

      const savedDiff = localStorage.getItem("bs_difficulty");
      if (savedDiff) this.difficulty = savedDiff;

      const savedPlayers = localStorage.getItem("bs_players");
      if (savedPlayers === "random") this.playersChoice = "random";
      else if (+savedPlayers >= 3 && +savedPlayers <= 5) { this.playersChoice = String(+savedPlayers); this.numPlayers = +savedPlayers; }
      if (localStorage.getItem("bs_length") === "short") this.length = "short";

      const savedFirst = localStorage.getItem("bs_firstDeal");
      if (savedFirst) this.firstDealMode = savedFirst;

      if (localStorage.getItem("bs_speed") === "fast") GAME_SPEED = 0.5;
      this.livingPortraits = localStorage.getItem("bs_portraits") !== "still";
    } catch (e) { /* ignore */ }

    this.aiEngine.setDifficulty(this.difficulty);

    this.dom = {
      gameArea: document.getElementById("game-area"),
      seats: document.getElementById("seats"),
      deckSlot: document.getElementById("deck-slot"),
      passSlot: document.getElementById("pass-slot"),
      trickArea: document.getElementById("trick-area"),
      playerHand: document.getElementById("player-hand"),
      playerInfo: document.getElementById("player-seat-info"),
      roundLabel: document.getElementById("round-label"),
      scoreTable: document.getElementById("score-table"),
      bidPanel: document.getElementById("bid-panel"),
      bidTitle: document.getElementById("bid-title"),
      bidButtons: document.getElementById("bid-buttons"),
      bidNote: document.getElementById("bid-note")
    };

    this.applySoundMuted();
    this.applyFullscreenUi();
    this.bindScorecard();
    this.bindQuit();
    this.bindCornerButtons();
    this.bindStartOverlay();
    // A tap anywhere outside your hand puts a picked card back.
    document.addEventListener("click", (e) => {
      if (this.pickedIdx != null && !e.composedPath().includes(this.dom.playerHand)) this.clearPick(true);
    });

    // Draw an empty table behind the start overlay.
    this.game.startNewGame({ numPlayers: this.numPlayers, firstDealer: 0 });
    this.buildSeats();
    this.render();
  }

  // =====================================================
  // =================== Seats / names ===================
  // =====================================================

  // Infernal style: each player's portrait beside their nameplate, on the outer side, turned to look in
  // towards the middle of the table (you are the hooded one)
  setPortrait(seat, els) {
    // it lives inside the nameplate (tucked behind its end), so it's put back each time the name is written
    let p = els.portrait;
    if (!p) { p = els.portrait = document.createElement("div"); p.className = "portrait"; }
    if (p.parentNode !== els.name) els.name.appendChild(p);
    const who = seat === 0 ? "player" : this.seatName(seat).toLowerCase().replace(/\s+/g, "-");
    const pos = seat === 0 ? "bottom" : this.seatPos(seat);
    const onRight = pos === "right" || pos === "topright";   // the outer side; everyone looks in to the middle
    // a portrait drawn in three views shows the one that looks in, rather than being mirrored
    const file = PORTRAIT_VIEWS[who] ? `${who}-${onRight ? "l" : "r"}` : who;
    if (p.dataset.file !== file) { p.dataset.file = file; p.dataset.who = who; p.style.backgroundImage = `url("img/opp-${file}.webp?v=3")`; }
    p.classList.toggle("on-right", onRight);
    p.style.setProperty("--lean", onRight ? "-1" : "1");   // which way is "towards the table" for a reaction
    p.classList.toggle("flip", onRight && !PORTRAIT_VIEWS[who] && !PORTRAIT_FRONT[who]);
    // some opponents move a little - breathing, blinking, a shift of the brow or mouth (living-portraits.js);
    // not those drawn in several views
    if (typeof LivingPortraits !== "undefined") LivingPortraits.sync(p, who, this.livingPortraits !== false && file === who);
  }

  seatName(seat) {
    if (seat === 0) return (this.playerName && this.playerName.trim()) || "Player";
    return this.opponentNames[(seat - 1) % this.opponentNames.length];
  }

  // Each game: opponents drawn at random from the whole pool, seated in
  // random order.
  pickOpponents() {
    const pool = OPPONENT_POOL.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.opponentNames = pool;
    // index.html?demo (for recording videos): always the same three opponents, left to right
    if (/[?&]demo\b/.test(location.search)) this.opponentNames = ["Persephone", "Bub", "Ronnie"];
    // index.html?living (for trying the moving portraits): only opponents who have them
    if (/[?&]living\b/.test(location.search) && typeof LivingPortraits !== "undefined")
      this.opponentNames = pool.filter(n => LivingPortraits.rigs[n.toLowerCase().replace(/\s+/g, "-")]);
  }

  seatPos(seat) {
    return SEAT_LAYOUTS[this.game.numPlayers][seat];
  }

  // Bigger opponent cards when there's room: wide screens and fewer players.
  updateOppScale() {
    const n = this.game.numPlayers || 4;
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    let k = 0.85;
    if (aspect >= 1.7) k += 0.05;          // wide (16:9 and wider)
    else if (aspect < 1.45) k -= 0.08;     // squarer screens
    if (n <= 3) k += 0.06;                 // only side or top seats
    else if (n === 5) k -= 0.03;           // five seats share the space
    if (IS_PHONE) k -= 0.17;               // make room for your bigger hand
    OPP_CARD_SCALE = Math.max(IS_PHONE ? 0.6 : 0.72, Math.min(0.97, k));
    document.documentElement.style.setProperty("--opp-scale", OPP_CARD_SCALE.toFixed(3));
  }

  buildSeats() {
    this.updateOppScale();
    const n = this.game.numPlayers;
    this.dom.seats.innerHTML = "";
    this.dom.trickArea.innerHTML = "";
    this.seatEls = [];

    if (document.body.dataset.players !== String(n)) { document.body.dataset.players = String(n); updateScale(); }

    for (let seat = 0; seat < n; seat++) {
      const pos = this.seatPos(seat);
      let handEl, infoEl;

      if (seat === 0) {
        handEl = this.dom.playerHand;
        infoEl = this.dom.playerInfo;
      } else {
        const seatEl = document.createElement("div");
        seatEl.className = `seat seat-${pos}`;
        seatEl.dataset.seat = String(seat);

        handEl = document.createElement("div");
        handEl.className = "seat-hand";
        handEl.style.setProperty("--seat-rot", SEAT_ANGLE[pos] + "deg");

        infoEl = document.createElement("div");
        infoEl.className = "seat-info";
        infoEl.innerHTML =
          `<div class="name-label"></div><div class="seat-stats"></div>`;

        seatEl.appendChild(handEl);
        seatEl.appendChild(infoEl);
        this.dom.seats.appendChild(seatEl);
      }

      const slot = document.createElement("div");
      slot.className = `trick-slot trick-${pos}`;
      this.dom.trickArea.appendChild(slot);

      this.seatEls.push({
        hand: handEl,
        info: infoEl,
        name: infoEl.querySelector(".name-label"),
        stats: infoEl.querySelector(".seat-stats"),
        slot
      });
    }

    this.layoutTrickSlots();
  }

  layoutTrickSlots() {
    const W = layoutMetrics.cardWidth;
    const H = layoutMetrics.cardHeight;
    const n = this.game.numPlayers;

    this.seatEls.forEach((els, seat) => {
      const pos = this.seatPos(seat);
      const o = TRICK_OFFSETS[pos];
      // With five players the side seats sit a little lower to make room.
      const y = (n === 5 && (pos === "left" || pos === "right")) ? 0.18 : o.y;
      els.slot.style.left = (o.x * W - W / 2) + "px";
      els.slot.style.top = (y * H - H / 2) + "px";
      els.slot.style.transform = `rotate(${o.rot}deg)`;
      // your card (lowest on the table) lies on top, so every card's index - at its top - stays in view
      els.slot.style.zIndex = pos === "bottom" ? "2" : "1";
    });
  }

  // =====================================================
  // ====================== Render =======================
  // =====================================================

  render() {
    const g = this.game;
    if (!this.seatEls.length) return;

    this.layoutTrickSlots();
    this.renderPlayerHand();
    for (let seat = 1; seat < g.numPlayers; seat++) this.renderOpponentHand(seat);
    this.renderSeatInfo();
    this.renderTrick();
    this.renderDeck();
    this.renderScoreboard();
    this.updateTurnHighlight();

    document.body.setAttribute("data-phase", g.phase);
  }

  visibleHand(seat) {
    const cards = this.game.hands[seat] ? this.game.hands[seat].cards : [];
    if (this.dealVisible) return cards.slice(0, this.dealVisible[seat]);
    return cards;
  }

  renderPlayerHand() {
    const handDiv = this.dom.playerHand;
    handDiv.innerHTML = "";
    const g = this.game;
    const scale = layoutMetrics.scale;
    const cardHeight = layoutMetrics.cardHeight;
    const cardTop = 2 * 18 * scale;

    const allCards = g.hands[0] ? g.hands[0].cards : [];
    const shown = this.visibleHand(0);
    const indexed = shown.map(card => ({ card, idx: allCards.indexOf(card) }));
    indexed.sort((a, b) => (COLOUR_ORDER[a.card.suit] - COLOUR_ORDER[b.card.suit]) || (a.card.rank - b.card.rank));

    // passing: every card can be picked; playing: the legal ones
    const passing = this.passInputReady();
    let legal = passing ? allCards.map((_, i) => i) : this.playerInputReady() ? g.getLegalMovesFor(0) : [];
    const tutIdx = this.tutCardIdx(0);
    if (tutIdx != null) legal = legal.filter(i => i === tutIdx);
    const total = indexed.length;
    const pickedSlot = !passing && legal.includes(this.pickedIdx) ? indexed.findIndex(o => o.idx === this.pickedIdx) : -1;
    const pickGap = 0.22 * layoutMetrics.cardWidth * HAND_SCALE;

    indexed.forEach((obj, slot) => {
      const pos = computePlayerFanSlot(slot, total, scale * HAND_SCALE * (IS_PHONE ? PHONE_FAN_TIGHTEN : 1));
      if (pickedSlot >= 0 && slot !== pickedSlot) pos.offsetX += slot < pickedSlot ? -pickGap : pickGap;
      const div = this.cardView.createCardElement(obj.card, { clickable: true });
      div.style.top = cardTop + "px";
      div.style.setProperty("--fan-x", pos.offsetX + "px");
      div.style.setProperty("--fan-y", pos.offsetY + "px");
      div.style.setProperty("--fan-angle", pos.angle + "deg");
      div.style.zIndex = String(slot + 100);
      if (legal.includes(obj.idx)) div.classList.add("legal-move");
      if (obj.idx === this.pickedIdx && legal.includes(obj.idx) && !passing) div.classList.add("picked");
      if (passing && this.passPick.includes(obj.idx)) div.classList.add("picked", "pass-pick");
      if (!passing && this.received.includes(obj.card)) div.classList.add("received");
      div.addEventListener("click", (e) => passing ? this.togglePassPick(obj.idx) : this.handlePlayerCardClick(obj.idx, e.currentTarget));
      handDiv.appendChild(div);
    });
  }

  renderOpponentHand(seat) {
    const handDiv = this.seatEls[seat].hand;
    handDiv.innerHTML = "";

    const scale = layoutMetrics.scale;
    const cards = this.visibleHand(seat);
    const total = Math.max(cards.length, 1);

    cards.forEach((_, i) => {
      const pos = computeOppFanSlot(i, total, scale);
      const back = this.cardView.createCardElement(cards[i], { back: true });
      back.style.setProperty("--fan-x", pos.offsetX + "px");
      back.style.setProperty("--fan-y", (-pos.offsetY) + "px");
      back.style.setProperty("--fan-angle", pos.angle + "deg");
      back.style.zIndex = String(100 + i);
      handDiv.appendChild(back);
    });
  }

  renderSeatInfo() {
    const g = this.game;
    const inRound = g.phase !== "idle" && !this.dealVisible;
    for (let seat = 0; seat < g.numPlayers; seat++) {
      const els = this.seatEls[seat];
      // (only rewritten when it changes, so the portrait inside the plate isn't pulled out mid-reaction)
      const name = this.seatName(seat);
      if (els.nameText !== name) { els.name.textContent = name; els.nameText = name; }
      this.setPortrait(seat, els);
      let html = "";
      if (inRound && seat === g.dealer) html += `<span class="dealer-chip" data-tip="Dealer">D</span>`;
      if (inRound && g.phase === "pass") {
        const done = seat === 0 ? !!g.passes[0] : !!this.aiPassed && this.aiPassed[seat];
        html += `<span class="stat-muted">${done ? "passed" : "passing…"}</span>`;
      } else if (inRound) {
        // this hand so far: the points taken, and the Black Spiders among them
        const pts = g.taken[seat] || 0;
        const spiders = (g.takenCards[seat] || []).filter(c => c.isBlackSpider).length;
        const cls = pts > 0 ? "bad" : pts < 0 ? "good" : "";
        html += `<span class="taken-token ${cls}" data-tip="Points taken this hand">${pts}</span>` +
          (spiders ? `<span class="spider-count" data-tip="Black Spiders taken">${spiderIcon(spiders)}</span>` : "");
      }
      els.stats.innerHTML = html;
    }
  }

  renderTrick() {
    this.seatEls.forEach(els => { els.slot.innerHTML = ""; });

    const plays = this.game.currentTrick ? this.game.currentTrick.plays : [];
    plays.forEach(({ who, card }, i) => {
      if (who === this.hiddenTrickSeat) return;
      const el = this.cardView.createCardElement(card);
      const slot = this.seatEls[who].slot;
      slot.style.zIndex = String(10 + i);
      slot.appendChild(el);
    });
  }

  renderDeck() {
    const g = this.game;
    const deckSlot = this.dom.deckSlot;
    deckSlot.innerHTML = "";
    if (this.dom.passSlot) this.dom.passSlot.innerHTML = "";
    if (g.phase === "idle") return;
    deckSlot.classList.toggle("dealing", !!this.dealVisible);
    // the stock while dealing
    if (this.dealVisible) {
      const stock = 60 - this.dealVisible.reduce((a, b) => a + b, 0);
      const layers = stock >= 40 ? 5 : stock >= 25 ? 4 : stock >= 12 ? 3 : stock >= 4 ? 2 : stock > 0 ? 1 : 0;
      const scale = layoutMetrics.scale;
      for (let i = 0; i < layers; i++) {
        const backCard = this.cardView.createCardElement(null, { back: true });
        backCard.style.position = "absolute";
        backCard.style.left = "50%";
        backCard.style.top = "50%";
        backCard.style.transform = `translate(-50%, -50%) translate(${i * 2 * scale}px, ${-i * 1.5 * scale}px)`;
        backCard.style.zIndex = String(100 + i);
        deckSlot.appendChild(backCard);
      }
    }
    // which way the cards pass this hand
    if (this.dom.passSlot && g.passTo) {
      const w = passWords(g.passTo, g.numPlayers);
      const arrow = { left: "⟲", right: "⟳", across: "⇅" }[w];
      this.dom.passSlot.innerHTML = `<div class="pass-dir" data-tip="This hand everyone passes three cards ${w === "across" ? "across the table" : "to the " + w}"><span>${arrow}</span><b>${w}</b></div>`;
    }
  }

  // The five-sided trump coin: a suit, or blank for no trump.
  renderScoreboard() {
    const g = this.game;
    if (g.phase === "idle" || g.roundIndex < 0) this.dom.roundLabel.textContent = "";
    else this.dom.roundLabel.innerHTML = `Hand <b>${g.roundIndex + 1}</b> · game to ${g.target}`;
    const best = Math.min(...g.scores);
    let rows = "";
    for (let seat = 0; seat < g.numPlayers; seat++) {
      const score = g.scores[seat] || 0;
      const lead = (score === best && g.history.length) ? " leader" : "";
      const me = seat === 0 ? " me" : "";
      rows += `<tr class="${lead}${me}"><td>${this.escape(this.seatName(seat))}</td><td>${score}</td></tr>`;
    }
    this.dom.scoreTable.innerHTML = `<tbody>${rows}</tbody>`;
  }

  escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  updateTurnHighlight() {
    const g = this.game;
    document.body.classList.remove("player-turn");
    this.seatEls.forEach(els => els.name.classList.remove("turn-glow"));
    if (this.overlayActive || this.busy || this.dealVisible) return;
    if (g.phase === "pass") {
      if (!g.passes[0]) { this.seatEls[0].name.classList.add("turn-glow"); document.body.classList.add("player-turn"); }
      return;
    }
    if (g.phase !== "play") return;
    const els = this.seatEls[g.turn];
    if (els) els.name.classList.add("turn-glow");
    if (g.turn === 0) document.body.classList.add("player-turn");
  }

  playerInputReady() {
    return !this.overlayActive && !this.busy && !this.dealVisible &&
      this.game.phase === "play" && this.game.turn === 0;
  }
  passInputReady() {
    return !this.overlayActive && !this.busy && !this.dealVisible && this.game.phase === "pass" && !this.game.passes[0] && !this.passConfirmed;
  }

  // =====================================================
  // ===================== Animation =====================
  // =====================================================

  // Fly a card (face or back) between two viewport-centre points.
  flyCard({ card = null, from, to, dur = 500, scaleFrom = 1, scaleTo = 1, rotFrom = 0, rotTo = 0, z = 9999 }) {
    dur *= GAME_SPEED;
    const W = layoutMetrics.cardWidth;
    const H = layoutMetrics.cardHeight;

    const el = card
      ? this.cardView.createCardElement(card)
      : this.cardView.createCardElement(null, { back: true });

    el.style.position = "fixed";
    el.style.zIndex = String(z);
    el.style.pointerEvents = "none";
    el.style.transformOrigin = "center center";
    el.style.margin = "0";

    const place = (p) => {
      const x = from.x + (to.x - from.x) * p;
      const y = from.y + (to.y - from.y) * p;
      const s = scaleFrom + (scaleTo - scaleFrom) * p;
      const r = rotFrom + (rotTo - rotFrom) * p;
      el.style.left = (x - W / 2) + "px";
      el.style.top = (y - H / 2) + "px";
      el.style.transform = `rotate(${r}deg) scale(${s})`;
    };

    place(0);
    document.body.appendChild(el);

    return new Promise(resolve => {
      const start = performance.now();
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        el.remove();
        resolve();
      };
      const step = (now) => {
        if (finished) return;
        const t = Math.min(1, (now - start) / dur);
        place(this.ANIM_EASE(t));
        if (t < 1) requestAnimationFrame(step);
        else finish();
      };
      requestAnimationFrame(step);
      // rAF pauses in hidden tabs; never let the game stall on an animation.
      setTimeout(finish, dur + 150);
    });
  }

  seatAngle(seat) {
    return SEAT_ANGLE[this.seatPos(seat)] || 0;
  }

  seatHandCenter(seat) {
    return getRectCenter(this.seatEls[seat].hand);
  }

  slotCenter(seat) {
    return getRectCenter(this.seatEls[seat].slot);
  }

  async animateDeal(ep) {
    const g = this.game;
    const n = g.numPlayers;
    this.dealVisible = new Array(n).fill(0);
    this.busy = true;
    this.render();

    const deckC = getRectCenter(this.dom.deckSlot);
    const flights = [];
    const stagger = Math.max(18, Math.min(60, 1500 / (g.handSize * n)));

    let k = 0;
    for (let round = 0; round < g.handSize; round++) {
      for (let i = 1; i <= n; i++) {
        const seat = (g.dealer + i) % n; // deal starts left of the dealer
        const order = k++;
        const delay = order * stagger;
        flights.push((async () => {
          await wait(delay);
          if (ep !== this.epoch) return;
          if (order % 3 === 0) this.playSfx(this.sfx.cardShove2);
          const to = seat === 0
            ? getRectCenter(this.dom.playerHand)
            : this.seatHandCenter(seat);
          await this.flyCard({
            from: deckC, to, dur: 260,
            scaleTo: seat === 0 ? 1 : OPP_CARD_SCALE,
            rotTo: this.seatAngle(seat)
          });
          if (ep !== this.epoch || !this.dealVisible) return;
          this.dealVisible[seat]++;
          this.render();
        })());
      }
    }

    await Promise.all(flights);
    if (ep !== this.epoch) return;

    this.dealVisible = null;
    this.busy = false;
    this.render();
  }

  // The coin spins big (COIN_BIG) in the middle of the table, lands, then slides into
  // the trump slot.
  // ----- Touch "pick then play" -----
  showPlayHint() {
    // Only the first few times: after that you know, and it would cover the trick.
    this.playHintsShown = (this.playHintsShown || 0) + 1;
    if (this.playHintsShown > 3) return;
    let hint = document.getElementById("play-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "play-hint";
      hint.textContent = "Tap again to play";
      document.body.appendChild(hint);
    }
    const picked = this.dom.playerHand.querySelector(".card.picked");
    const r = (picked || this.dom.playerHand).getBoundingClientRect();
    hint.style.top = Math.max(4, r.top - 34) + "px";
    hint.style.left = (r.left + r.width / 2) + "px";
    hint.style.display = "block";
  }

  clearPick(rerender = false) {
    const had = this.pickedIdx != null;
    this.pickedIdx = null;
    const hint = document.getElementById("play-hint");
    if (hint) hint.style.display = "none";
    if (had && rerender) this.renderPlayerHand();
  }

  async animateTrickToWinner(plays, winner) {
    const target = getRectCenter(this.seatEls[winner].name);
    this.seatEls.forEach(els => { els.slot.innerHTML = ""; });

    await Promise.all(plays.map(({ who, card }) => {
      const from = this.slotCenter(who);
      const rot = TRICK_OFFSETS[this.seatPos(who)].rot;
      return this.flyCard({
        card, from, to: target, dur: 480,
        rotFrom: rot, rotTo: rot, scaleFrom: 1, scaleTo: 0.25, z: 9998
      });
    }));
  }

  // =====================================================
  // ===================== Game flow =====================
  // =====================================================

  startGame() {
    this.epoch++;
    this.clearPick();
    this.busy = false;
    this.dealVisible = null;
    this.hiddenTrickSeat = null;
    this.playedEndJingle = false;
    this.hideBidPanel();
    this.hideRoundSummary();
    this.pickOpponents();
    if (this.playersChoice === "random") this.numPlayers = 3 + Math.floor(Math.random() * 3);
    const n = this.numPlayers;
    let firstDealer;
    if (this.firstDealMode === "player") firstDealer = 0;
    else if (this.firstDealMode === "opponent") firstDealer = 1 + Math.floor(Math.random() * (n - 1));
    else firstDealer = Math.floor(Math.random() * n);
    this.game.startNewGame({ numPlayers: n, firstDealer, length: this.length });
    this.aiEngine.resetMemory();
    this.aiEngine.setDifficulty(this.difficulty);
    this.buildSeats();
    this.runRound(this.epoch);
  }

  async runRound(ep) {
    this.clearPick();
    this.game.startRound();
    this.passPick = [];
    this.passConfirmed = false;
    this.passingNow = false;
    this.received = [];
    this.aiPassed = new Array(this.game.numPlayers).fill(false);
    this.aiPassChoice = [];
    this.render();
    await wait(250);
    if (ep !== this.epoch) return;
    await this.animateDeal(ep);
    if (ep !== this.epoch) return;
    if (this.tut) {
      await this.coach("start");
      if (ep !== this.epoch) return;
    }
    await this.passing(ep);
  }

  // Passing: everyone picks three cards at once. The others choose while you do; when you've passed, every pass
  // flies to its new owner together.
  async passing(ep) {
    const g = this.game;
    this.render();
    if (this.tut) this.coach("pass");
    this.showBidPanel();
    const order = [];
    for (let s = 1; s < g.numPlayers; s++) order.push(s);
    order.sort(() => Math.random() - 0.5);
    for (const seat of order) {
      await wait(350 + Math.random() * 450);
      if (ep !== this.epoch || g.phase !== "pass") return;
      const hand = g.hands[seat].cards;
      const t = this.tutRound();
      this.aiPassChoice[seat] = t ? t.passes[seat].map(code => hand.findIndex(c => cardCode(c) === code)) : this.aiEngine.choosePass(hand);
      this.aiPassed[seat] = true;
      this.sfxFlick();
      this.flashStats(seat);
    }
    this.maybeFinishPassing(ep);
  }

  // Everyone bids at once: AIs place face-down tokens while you choose yours,
  // then all tokens flip together.
  // once you and every computer player have chosen: the passes happen, all at once
  async maybeFinishPassing(ep) {
    const g = this.game;
    if (this.passingNow || g.phase !== "pass" || this.passPick.length !== 3 || !this.passConfirmed) return;
    if (!this.aiPassed.slice(1).every(x => x)) return;
    this.passingNow = true;
    this.busy = true;
    const n = g.numPlayers;
    // where each passed card starts (your hand: where it sits; theirs: their hand)
    const handEls = [...this.dom.playerHand.querySelectorAll(".card")];
    const mine = this.passPick.map(i => g.hands[0].cards[i]);
    const fromMine = mine.map(c => { const el = handEls.find(e => e._card === c); return el ? getRectCenter(el) : getRectCenter(this.dom.playerHand); });
    for (let s = 1; s < n; s++) g.setPass(s, this.aiPassChoice[s]);
    g.setPass(0, this.passPick);        // (the last of them: the passes happen now)
    this.passPick = [];
    this.render();
    this.playSfx(this.sfx.cardShove2);
    const flights = [];
    for (let s = 0; s < n; s++) {
      const to = (s + g.passTo) % n;
      g.passes[s].forEach((card, k) => {
        flights.push((async () => {
          await wait(k * 90);
          const from = s === 0 ? fromMine[k] : this.seatHandCenter(s);
          const dest = to === 0 ? getRectCenter(this.dom.playerHand) : this.seatHandCenter(to);
          await this.flyCard({ card: s === 0 || to === 0 ? card : null, from, to: dest, dur: 650,
            scaleFrom: s === 0 ? 1 : OPP_CARD_SCALE, scaleTo: to === 0 ? 1 : OPP_CARD_SCALE,
            rotFrom: this.seatAngle(s), rotTo: this.seatAngle(to) });
        })());
      });
    }
    await Promise.all(flights);
    if (ep !== this.epoch) return;
    this.received = g.received[0].slice();
    this.passingNow = false;
    this.render();
    if (this.tut) {
      await this.coach("passed");
      if (ep !== this.epoch) return;
    }
    await wait(500);
    if (ep !== this.epoch) return;
    this.busy = false;
    await this.continuePlay(ep);
  }

  // passing: pick and unpick your three cards (the panel's button sends them)
  togglePassPick(idx) {
    if (!this.passInputReady() || this.passConfirmed) return;
    this.ensureAudioContext();
    const t = this.tutRound();
    if (t) {
      const code = cardCode(this.game.hands[0].cards[idx]);
      if (!t.passes[0].includes(code)) { const names = t.passes[0].map(c => { const k = parseCard(c); return k.isBlackSpider ? "Black Spider" : `${COLOUR_NAME[k.suit]} ${k.rank}`; });
      this.showToast(`For this tutorial hand, pass the ${names.slice(0, -1).join(", ")} and the ${names[names.length - 1]}.`); return; }
    }
    const k = this.passPick.indexOf(idx);
    if (k >= 0) this.passPick.splice(k, 1);
    else if (this.passPick.length < 3) this.passPick.push(idx);
    else { this.showToast("You pass exactly three cards: put one back first."); return; }
    this.sfxTick();
    this.renderPlayerHand();
    this.showBidPanel();
  }
  confirmPass() {
    if (!this.passInputReady() || this.passPick.length !== 3 || this.passConfirmed) return;
    this.passConfirmed = true;
    if (this.tut) this.hideCoach();
    this.hideBidPanel();
    this.sfxFlick();
    this.flashStats(0);
    this.maybeFinishPassing(this.epoch);
  }
  showToast(text) {
    const t = document.createElement("div");
    t.className = "capture-toast bs-toast";
    t.innerHTML = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // A portrait's one-off reaction (Infernal style): "lean" as they play a card, "win" (a lift, and a pleased face)
  // when things go to plan, "bust" (a shake, and a furious face) when they don't - see reactToTrick.
  // Each plays once and stops.
  react(seat, kind, holdMs) {
    const p = this.seatEls[seat] && this.seatEls[seat].portrait;
    if (!p || !document.body.classList.contains("style-infernal")) return;
    // a lean never cuts short a bigger reaction (the trick's winner leads straight away)
    if (kind === "lean" && (p.classList.contains("r-win") || p.classList.contains("r-bust"))) return;
    p.classList.remove("r-lean", "r-win", "r-bust");
    void p.offsetWidth;
    p.classList.add("r-" + kind);
    clearTimeout(p._react);
    p._react = setTimeout(() => p.classList.remove("r-" + kind), { lean: 600, win: 750, bust: 800 }[kind]);
    // a moving portrait also changes face: pleased when things go to plan, furious when they don't
    if (typeof LivingPortraits !== "undefined" && kind !== "lean")
      LivingPortraits.mood(p, kind === "win" ? "happy" : "angry", holdMs || (kind === "win" ? 2000 : 3000));
  }

  // After each trick, everyone reacts to how it went for their own plan (their bid), not to winning as such:
  //   took a trick they still needed - pleased; the one that makes their bid exactly - pleased, for longer;
  //   took a trick they didn't want (over their bid) - thwarted; can no longer make their bid - thwarted (once);
  //   and on the round's last trick: made their bid exactly - pleased, missed it - thwarted.
  // Anyone the trick changes nothing for stays as they are. At most one reaction each per trick.
  // After each trick, faces follow what it means for each player: taking points (worst of all a Black Spider) is
  // bad; taking a coloured 7 (-5) is good; and whoever dropped a Black Spider on somebody else is delighted.
  // At most one reaction each per trick.
  reactToTrick(res) {
    const g = this.game;
    const w = res.winner, pts = res.points;
    const spiders = res.plays.filter(p => p.card.isBlackSpider);
    const done = new Set();
    if (pts > 0) this.react(w, "bust", spiders.length ? 3800 : Math.min(3500, 1600 + pts * 200));
    else if (pts < 0) this.react(w, "win", 2600);
    done.add(w);
    spiders.forEach(p => { if (!done.has(p.who)) { this.react(p.who, "win", 2600); done.add(p.who); } });
    if (spiders.length) this.showToast(`${spiderIcon()} ${w === 0 ? "You take" : this.seatName(w) + " takes"} ${spiders.length === 1 ? "a Black Spider" : spiders.length + " Black Spiders"}!`);
  }

  flashStats(seat) {
    this.render();
    const el = this.seatEls[seat] && this.seatEls[seat].stats;
    if (!el) return;
    el.classList.remove("just-bid");
    void el.offsetWidth;
    el.classList.add("just-bid");
  }

  async continuePlay(ep) {
    const g = this.game;
    // Only the most recently started loop may drive the AI.
    const flow = ++this.playFlow;
    const stale = () => ep !== this.epoch || flow !== this.playFlow;

    while (g.phase === "play") {
      if (g.turn === 0) {
        this.render();
        if (this.tut) this.coach("play" + g.tricksPlayed);
        return; // resumes from handlePlayerCardClick
      }

      this.render();
      await wait(380);
      if (stale()) return;

      const result = await this.aiPlay(ep);
      if (stale() || !result) return;

      if (result.trickComplete) {
        await this.finishTrick(ep);
        if (stale()) return;
      }
    }

    if (g.phase === "roundEnd" || g.phase === "gameOver") {
      await wait(400);
      if (ep !== this.epoch) return;
      this.showRoundSummary();
    }
  }

  async aiPlay(ep) {
    const g = this.game;
    const seat = g.turn;
    const hand = g.hands[seat].cards;
    const legal = g.getLegalMovesFor(seat);

    let idx = this.aiEngine.choosePlay({ hand, legal, plays: g.currentTrick.plays, numPlayers: g.numPlayers, seat, game: g });
    const tutIdx = this.tutCardIdx(seat);
    if (tutIdx != null) idx = tutIdx;
    if (!legal.includes(idx)) idx = legal[Math.floor(Math.random() * legal.length)];

    const from = this.seatHandCenter(seat);
    const result = g.playCard(seat, idx);
    if (!result.ok) return null;

    await this.animatePlayToSlot(ep, seat, result.card, from, OPP_CARD_SCALE, this.seatAngle(seat));
    return result;
  }

  async animatePlayToSlot(ep, seat, card, from, scaleFrom, rotFrom = 0) {
    this.busy = true;
    this.hiddenTrickSeat = seat;
    this.render();
    this.sfxFlick();
    this.react(seat, "lean");

    const rot = TRICK_OFFSETS[this.seatPos(seat)].rot;
    await this.flyCard({
      card, from, to: this.slotCenter(seat), dur: 420,
      scaleFrom, scaleTo: 1, rotFrom, rotTo: rot
    });
    if (ep !== this.epoch) return;

    this.hiddenTrickSeat = null;
    this.busy = false;
    this.render();
  }

  async handlePlayerCardClick(idx, cardElement) {
    if (!this.playerInputReady()) return;
    const ep = this.epoch;

    this.ensureAudioContext();

    const legal = this.game.getLegalMovesFor(0);
    if (!legal.includes(idx)) { this.explainRefusal(idx); return; }
    const tutIdx = this.tutCardIdx(0);
    if (tutIdx != null && idx !== tutIdx) {
      this.showToast(`For this step of the tutorial, play the ${cardName(this.game.hands[0].cards[tutIdx])}.`);
      return;
    }

    // Touch screens: the first tap picks the card, a second tap plays it.
    if (IS_TOUCH && this.pickedIdx !== idx) {
      this.pickedIdx = idx;
      this.renderPlayerHand();
      this.showPlayHint();
      return;
    }
    this.clearPick();
    if (this.tut) this.hideCoach();

    const from = cardElement ? getRectCenter(cardElement) : getRectCenter(this.dom.playerHand);
    this.received = [];
    const result = this.game.playCard(0, idx);
    if (!result.ok) return;

    await this.animatePlayToSlot(ep, 0, result.card, from, 1);
    if (ep !== this.epoch) return;

    if (result.trickComplete) {
      await this.finishTrick(ep);
      if (ep !== this.epoch) return;
    }
    await this.continuePlay(ep);
  }

  // a card you may not play: say why
  explainRefusal(idx) {
    const g = this.game, c = g.hands[0].cards[idx];
    if (!c || g.phase !== "play") return;
    if (!g.currentTrick.plays.length) {
      if (g.tricksPlayed === 0 && c.suit === "K") this.showToast("Black may not be led on the first trick.");
      return;
    }
    const lead = g.currentTrick.plays[0].card;
    this.showToast(`You have ${COLOUR_NAME[lead.suit]}, so you must follow the ${cardName(lead)}: play a ${COLOUR_NAME[lead.suit]} card, or a ${lead.rank}.`);
  }

  async finishTrick(ep) {
    this.busy = true;
    this.render();
    await wait(750);
    if (ep !== this.epoch) return;

    const res = this.game.resolveCompletedTrick();
    if (res.plays.some(p => p.card.isBlackSpider)) this.sfxMoonCapture();
    else if (res.winner === 0) this.sfxTrickMine();
    else this.sfxTrickOther();
    await this.animateTrickToWinner(res.plays, res.winner);
    if (ep !== this.epoch) return;

    this.render();
    this.flashStats(res.winner);
    this.reactToTrick(res);
    if (this.tut) {
      await this.coach("trick" + (this.game.tricksPlayed - 1));
      if (ep !== this.epoch) return;
    }
    this.busy = false;
    this.render();
  }

  // =====================================================
  // ====================== Tutorial =====================
  // =====================================================

  // First-time players are offered the tutorial once.
  offerTutorialIfNew() {
    let seen = false;
    try { seen = localStorage.getItem("bs_tutorialSeen") === "1"; } catch (e) { /* ignore */ }
    const offer = document.getElementById("tut-offer");
    if (seen || !offer) return;
    offer.style.display = "flex";
    const close = () => { offer.style.display = "none"; this.markTutorialSeen(); };
    document.getElementById("btn-offer-skip").onclick = close;
    document.getElementById("btn-offer-tutorial").onclick = () => {
      close();
      document.getElementById("btn-tutorial").click();
    };
    setTimeout(() => document.getElementById("btn-offer-tutorial").focus(), 50);
  }

  markTutorialSeen() {
    try { localStorage.setItem("bs_tutorialSeen", "1"); } catch (e) { /* ignore */ }
  }

  startTutorial() {
    const T = TUTORIAL;
    this.epoch++;
    this.clearPick();
    this.busy = false;
    this.dealVisible = null;
    this.hiddenTrickSeat = null;
    this.hideBidPanel();
    this.hideRoundSummary();
    this.tut = T;
    this.opponentNames = T.opponents.slice();
    this.game.startNewGame({ numPlayers: T.opponents.length + 1, firstDealer: T.firstDealer, presetRounds: T.rounds });
    this.buildSeats();
    this.render();
    const ep = this.epoch;
    (async () => {
      await wait(300);
      if (ep !== this.epoch) return;
      await this.coachSteps(T.intro);
      if (ep !== this.epoch) return;
      this.runRound(ep);
    })();
  }

  tutRound() {
    return this.tut ? this.tut.rounds[this.game.roundIndex] : null;
  }

  // Index in `seat`'s hand of the card the script plays this trick (or null).
  tutCardIdx(seat) {
    const r = this.tutRound();
    if (!r || this.game.phase !== "play") return null;
    const trick = r.tricks[this.game.tricksPlayed];
    const code = trick && trick[seat];
    if (!code) return null;
    const idx = this.game.hands[seat].cards.findIndex(c => cardCode(c) === code);
    return idx >= 0 ? idx : null;
  }

  // Show the coach step(s) for `key` in the current hand.
  coach(key) {
    const r = this.tutRound();
    const step = r && r.coach[key];
    if (!step) return Promise.resolve();
    if (Array.isArray(step)) return this.coachSteps(step);
    this.showCoach(step.prompt || step, null);
    return Promise.resolve();
  }

  async coachSteps(steps) {
    const ep = this.epoch;
    const prevBusy = this.busy;
    this.busy = true;
    for (const m of steps) {
      await new Promise(done => this.showCoach(m, done));
      if (ep !== this.epoch) return;
    }
    this.hideCoach();
    this.busy = prevBusy;
  }

  showCoach(msg, onNext) {
    let el = document.getElementById("coach");
    if (!el) {
      el = document.createElement("div");
      el.id = "coach";
      el.innerHTML = `<div class="coach-text"></div>` +
        `<div class="coach-buttons"><button type="button" class="coach-skip">Skip tutorial</button>` +
        `<button type="button" class="coach-next">Next ▸</button></div>`;
      document.body.appendChild(el);
      el.querySelector(".coach-skip").addEventListener("click", () => this.exitTutorial());
    }
    const text = typeof msg === "string" ? msg : msg.t;
    const spot = typeof msg === "string" ? null : msg.spot;
    el.querySelector(".coach-text").innerHTML = text;

    this.placeSpot(spot);

    const next = el.querySelector(".coach-next");
    next.style.display = onNext ? "" : "none";
    next.onclick = onNext ? () => { next.onclick = null; onNext(); } : null;
    el.classList.toggle("prompt", !onNext);
    el.style.display = "flex";
    if (onNext) setTimeout(() => next.focus(), 30);
  }

  // Highlight box drawn around what's actually visible: for a hand, the union
  // of its cards (the hand container itself spans the full width).
  placeSpot(selector) {
    let box = document.getElementById("tut-spot");
    if (!selector) {
      if (box) box.style.display = "none";
      window.removeEventListener("resize", this._spotResize || (() => {}));
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.id = "tut-spot";
      document.body.appendChild(box);
    }
    const measure = () => {
      const els = [...document.querySelectorAll(selector)];
      const rects = [];
      els.forEach(el => {
        const cards = el.querySelectorAll(".card");
        (cards.length ? [...cards] : [el]).forEach(c => rects.push(c.getBoundingClientRect()));
      });
      if (!rects.length) { box.style.display = "none"; return; }
      const pad = 8;
      const l = Math.min(...rects.map(r => r.left)) - pad, t = Math.min(...rects.map(r => r.top)) - pad;
      const r = Math.max(...rects.map(r => r.right)) + pad, b = Math.max(...rects.map(r => r.bottom)) + pad;
      Object.assign(box.style, { display: "block", left: l + "px", top: t + "px", width: (r - l) + "px", height: (b - t) + "px" });
    };
    measure();
    window.removeEventListener("resize", this._spotResize || (() => {}));
    this._spotResize = measure;
    window.addEventListener("resize", measure);
  }

  hideCoach() {
    const el = document.getElementById("coach");
    if (el) el.style.display = "none";
    this.placeSpot(null);
  }

  async finishTutorial() {
    const ep = this.epoch;
    await this.coachSteps(this.tut.outro);
    if (ep !== this.epoch) return;
    this.exitTutorial();
  }

  // Rules and Settings in the corner: mid-game popups that borrow the How to play text and the Look & feel
  // tab from the start screen (they go back when the popup closes, so their settings stay wired up).
  bindCornerButtons() {
    document.getElementById("btn-quit").innerHTML = ICONS.quit;
    document.getElementById("btn-rules").innerHTML = ICONS.rules;
    document.getElementById("btn-settings").innerHTML = ICONS.gear;
    document.getElementById("btn-bright").innerHTML = ICONS.sun;
    document.getElementById("btn-bright").addEventListener("click", e => { e.currentTarget.blur(); this.openTestCard(); });
    document.getElementById("btn-rules").addEventListener("click", e => { e.currentTarget.blur(); this.showLentPopup("Rules", document.querySelector("#instructions-panel .instructions-content")); });
    document.getElementById("btn-settings").addEventListener("click", e => { e.currentTarget.blur(); this.showLentPopup("Settings", document.querySelector('.tab-pane[data-pane="look"]')); });
    const shade = document.getElementById("oh-modal");
    document.getElementById("oh-modal-close").addEventListener("click", () => this.closeLentPopup());
    shade.addEventListener("click", e => { if (e.target === shade) this.closeLentPopup(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && shade.style.display !== "none") this.closeLentPopup(); });
    this.initTips();
  }
  showLentPopup(title, node) {
    if (!node) return;
    this.closeLentPopup();
    const shade = document.getElementById("oh-modal");
    document.getElementById("oh-modal-title").textContent = title;
    this._lent = { node, parent: node.parentNode, next: node.nextSibling, wasActive: node.classList.contains("active") };
    node.classList.add("active");
    shade.querySelector(".oh-modal-slot").appendChild(node);
    shade.querySelector(".oh-modal-panel").classList.toggle("is-rules", title === "Rules");
    shade.style.display = "flex";
    shade.querySelector(".oh-modal-slot").scrollTop = 0;
  }
  closeLentPopup() {
    const shade = document.getElementById("oh-modal");
    if (!shade || shade.style.display === "none") return;
    if (this._lent) {
      const { node, parent, next, wasActive } = this._lent;
      parent.insertBefore(node, next);
      node.classList.toggle("active", wasActive);
      this._lent = null;
    }
    shade.style.display = "none";
  }
  // Tooltips for anything with a data-tip (mouse only; phones have no hover).
  initTips() {
    if (window.matchMedia && matchMedia("(pointer: coarse)").matches) return;
    const tip = document.createElement("div");
    tip.id = "oh-tip";
    document.body.appendChild(tip);
    let cur = null;
    document.addEventListener("mouseover", e => {
      const el = e.target.closest && e.target.closest("[data-tip], [title]");
      // anything still carrying a plain title gets this tooltip instead of the browser's, so they all look the same
      if (el && el.hasAttribute("title")) { if (!el.dataset.tip) el.dataset.tip = el.getAttribute("title"); el.removeAttribute("title"); }
      if (el === cur) return;
      cur = el;
      if (!el) { tip.classList.remove("on"); return; }
      const r = el.getBoundingClientRect();
      tip.textContent = el.dataset.tip;
      const w = tip.offsetWidth;
      tip.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + "px";
      tip.style.top = (r.bottom + 8 + tip.offsetHeight > window.innerHeight ? r.top - tip.offsetHeight - 8 : r.bottom + 8) + "px";
      tip.classList.add("on");
    });
    document.addEventListener("mousedown", () => { tip.classList.remove("on"); cur = null; });
  }

  // Quit button: confirm, then back to the start screen.
  bindQuit() {
    const btn = document.getElementById("btn-quit");
    const box = document.getElementById("quit-confirm");
    if (!btn || !box) return;
    const close = () => { box.style.display = "none"; };
    btn.addEventListener("click", () => {
      if (this.game.phase === "idle" || document.getElementById("start-overlay").style.display !== "none") return;
      box.style.display = "flex";
      setTimeout(() => document.getElementById("btn-quit-no").focus(), 30);
    });
    document.getElementById("btn-quit-no").addEventListener("click", close);
    document.getElementById("btn-quit-yes").addEventListener("click", () => {
      close();
      const sc = document.getElementById("scorecard");
      if (sc) sc.style.display = "none";
      this.exitTutorial(); // returns to the start screen (works for any game)
    });
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && box.style.display !== "none") close(); });
  }

  exitTutorial() {
    this.tut = null;
    this.epoch++;
    this.clearPick();
    this.busy = false;
    this.dealVisible = null;
    this.hideCoach();
    this.hideBidPanel();
    this.hideRoundSummary();

    this.pickOpponents();
    this.game.startNewGame({ numPlayers: this.numPlayers, firstDealer: 0 });
    this.buildSeats();
    this.render();

    const overlay = document.getElementById("start-overlay");
    overlay.style.display = "flex";
    this.overlayActive = true;
    document.body.classList.add("overlay-active");
  }

  // =====================================================
  // ====================== Bidding UI ===================
  // =====================================================

  showBidPanel() {
    const g = this.game;
    if (g.phase !== "pass" || g.passes[0] || this.passConfirmed) return;
    const to = (g.passTo) % g.numPlayers;
    const w = passWords(g.passTo, g.numPlayers);
    const k = this.passPick.length;
    this.dom.bidTitle.innerHTML = `Pass three cards ${w === "across" ? "across" : "to the " + w}, to <b>${this.escape(this.seatName(to))}</b>`;
    this.dom.bidButtons.innerHTML = `<button type="button" class="bid-confirm pass-btn"${k === 3 ? "" : " disabled"}>${k === 3 ? "Pass these three" : `Pick ${3 - k} more card${3 - k === 1 ? "" : "s"}`}</button>`;
    this.dom.bidButtons.querySelector("button").addEventListener("click", () => this.confirmPass());
    this.dom.bidNote.textContent = IS_TOUCH ? "Tap a card to pick it, tap again to put it back." : "Click a card to pick it, again to put it back.";
    this.dom.bidPanel.style.display = "flex";
  }

  // Touch screens: a slider along the numbers 0..cards (drag it, or tap a
  // number) and a confirm button, so a finger can't hit the wrong bid.
  // Bids you may not make (dealer's hook, tutorial) are struck out.
  hideBidPanel() {
    this.dom.bidPanel.style.display = "none";
  }

  // Round-by-round scorecard (click the scoreboard).
  bindScorecard() {
    const sb = document.getElementById("scoreboard");
    const box = document.getElementById("scorecard");
    if (!sb || !box) return;
    sb.title = "Show scorecard";
    sb.addEventListener("click", () => this.showScorecard());
    const close = () => { box.style.display = "none"; };
    document.getElementById("btn-scorecard-close").addEventListener("click", close);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  showScorecard() {
    const g = this.game;
    if (!g.history || g.phase === "idle") return;
    const n = g.numPlayers;
    let html = `<table class="scorecard-table"><thead><tr><th>Hand</th>`;
    for (let s = 0; s < n; s++) html += `<th>${this.escape(this.seatName(s))}</th>`;
    html += `</tr></thead><tbody>`;
    g.history.forEach(r => {
      html += `<tr><td>${r.round}</td>`;
      for (let s = 0; s < n; s++) {
        html += `<td class="${r.points[s] <= 0 ? "exact" : ""}"><span class="sc-bw">${r.points[s] > 0 ? "+" : ""}${r.points[s]}</span> <b>${r.totals[s]}</b></td>`;
      }
      html += `</tr>`;
    });
    if (!g.history.length) html += `<tr><td colspan="${n + 1}">No hands finished yet.</td></tr>`;
    html += `</tbody></table><div class="scorecard-key">points this hand · <b>running total</b> · lowest wins, game to ${g.target}</div>`;
    document.querySelector("#scorecard .scorecard-body").innerHTML = html;
    document.getElementById("scorecard").style.display = "flex";
  }

  // Number keys bid while the bid panel is open (0-9).
  // =====================================================
  // =================== Round summary ===================
  // =====================================================

  showRoundSummary() {
    const g = this.game;
    const r = g.history[g.history.length - 1];
    if (!r) return;
    const overlay = document.getElementById("end-overlay");
    const title = document.getElementById("round-summary-title");
    const sub = document.getElementById("round-summary-sub");
    const table = document.getElementById("round-summary-table");
    const btn = document.getElementById("btn-end-next");
    const gameOver = g.phase === "gameOver";
    title.textContent = `Hand ${r.round} complete`;
    if (r.sweeper >= 0) sub.textContent = `${r.sweeper === 0 ? "You" : this.seatName(r.sweeper)} took every black card: 0 for ${r.sweeper === 0 ? "you" : "them"}, 60 for everyone else!`;
    else if (gameOver) sub.textContent = `${this.seatName(g.scores.indexOf(Math.max(...g.scores)))} has reached ${g.target}: the game is over.`;
    else {
      const nextTo = passWords(passOffset(g.roundIndex + 1, g.numPlayers), g.numPlayers);
      sub.textContent = `Next: ${this.seatName(g.nextSeat(g.dealer))} deals, and everyone passes ${nextTo === "across" ? "across" : nextTo}.`;
    }
    let html = `<thead><tr><th>Player</th><th>Taken</th><th>Points</th><th>Total</th></tr></thead><tbody>`;
    for (let seat = 0; seat < g.numPlayers; seat++) {
      const bits = [];
      if (r.spiders[seat]) bits.push(spiderIcon(r.spiders[seat]));
      if (r.sevens[seat]) bits.push(`${r.sevens[seat]} × 7`);
      html += `<tr class="${r.points[seat] <= 0 ? "exact" : "missed"}${seat === 0 ? " me" : ""}">` +
        `<td>${this.escape(this.seatName(seat))}</td><td class="taken-cell">${bits.join(" ") || "–"}</td>` +
        `<td>${r.points[seat] > 0 ? "+" : ""}${r.points[seat]}</td><td>${r.totals[seat]}</td></tr>`;
    }
    html += "</tbody>";
    table.innerHTML = html;
    btn.textContent = gameOver ? "Final results" : "Next hand";
    btn.onclick = () => {
      this.hideRoundSummary();
      if (this.tut) { this.hideCoach(); this.finishTutorial(); return; }
      if (gameOver) this.showGameResults();
      else this.runRound(this.epoch);
    };
    if (this.tut) { btn.textContent = "Finish"; this.coach("end"); }
    overlay.style.display = "flex";
    this.overlayActive = true;
    this.updateTurnHighlight();
    if (r.points[0] <= Math.min(...r.points) && !gameOver) this.sfxExact();
    setTimeout(() => btn.focus(), 50);
  }

  hideRoundSummary() {
    const overlay = document.getElementById("end-overlay");
    if (overlay) overlay.style.display = "none";
    const start = document.getElementById("start-overlay");
    this.overlayActive = !!(start && start.style.display !== "none");
  }

  // =====================================================
  // =================== Final results ===================
  // =====================================================

  showGameResults() {
    const g = this.game;
    const overlay = document.getElementById("start-overlay");
    const startPanel = document.getElementById("start-panel");
    const resultsPanel = document.getElementById("results-panel");
    const resultsWinner = document.getElementById("results-winner");
    const resultsSubtitle = document.getElementById("results-subtitle");
    const resultsTable = document.getElementById("results-match-table");
    const closeBtn = document.getElementById("btn-close-results");
    const startBody = overlay.querySelector(".start-body");
    const startButtons = overlay.querySelector(".start-buttons");
    const standings = g.scores.map((score, seat) => ({
      seat, score, spiders: g.history.reduce((a, r) => a + r.spiders[seat], 0)
    })).sort((a, b) => a.score - b.score || a.spiders - b.spiders);
    const low = standings[0].score;
    const winners = standings.filter(s => s.score === low);
    const playerWon = winners.some(s => s.seat === 0);
    resultsWinner.textContent = winners.length === 1 ? `${this.seatName(winners[0].seat)} wins!` : "It's a tie!";
    resultsSubtitle.textContent = `${winners.map(w => this.seatName(w.seat)).join(" & ")} · ${low} points · lowest score wins`;
    let table = `<table><thead><tr><th>#</th><th>Player</th><th>Black Spiders</th><th>Score</th></tr></thead><tbody>`;
    standings.forEach((s, i) => {
      table += `<tr><td>${i + 1}</td><td>${this.escape(this.seatName(s.seat))}</td><td>${s.spiders}</td><td>${s.score}</td></tr>`;
    });
    table += `</tbody></table>`;
    resultsTable.innerHTML = table;
    resultsTable.style.display = "block";
    if (!this.playedEndJingle) { this.playedEndJingle = true; this.playEndArpeggio({ outcome: playerWon ? "win" : "lose" }); }
    overlay.style.display = "flex";
    this.overlayActive = true;
    document.body.classList.add("overlay-active");
    startPanel.classList.add("results-open");
    if (startBody) startBody.style.display = "none";
    if (startButtons) startButtons.style.display = "none";
    resultsPanel.style.display = "flex";
    closeBtn.onclick = () => this.hideGameResults();
  }

  hideGameResults() {
    const overlay = document.getElementById("start-overlay");
    const startPanel = document.getElementById("start-panel");
    const resultsPanel = document.getElementById("results-panel");
    const startBody = overlay.querySelector(".start-body");
    const startButtons = overlay.querySelector(".start-buttons");

    startPanel.classList.remove("results-open");
    startPanel.style.height = "";
    if (startBody) startBody.style.display = "";
    if (startButtons) startButtons.style.display = "";
    resultsPanel.style.display = "none";

    // Clear the old table while the start screen is up.
    this.epoch++;
    this.game.startNewGame({ numPlayers: this.numPlayers, firstDealer: 0 });
    this.buildSeats();
    this.render();
  }

  // =====================================================
  // ==================== Start overlay ==================
  // =====================================================

  bindStartOverlay() {
    const overlay = document.getElementById("start-overlay");
    const nameInput = document.getElementById("player-name-input");
    const opponentRadios = document.querySelectorAll('input[name="opponent"]');
    const playerRadios = document.querySelectorAll('input[name="players"]');
    const firstDealRadios = document.querySelectorAll('input[name="firstdeal"]');
    const lengthRadios = document.querySelectorAll('input[name="length"]');
    const playBtn = document.getElementById("btn-play");
    const instrBtn = document.getElementById("btn-instructions");
    const instrPanel = document.getElementById("instructions-panel");
    const instrDone = document.getElementById("btn-instructions-done");
    const startBody = overlay.querySelector(".start-body");
    const startButtons = overlay.querySelector(".start-buttons");

    document.body.classList.add("overlay-active");
    if (nameInput) nameInput.value = this.playerName || "Player";
    opponentRadios.forEach(r => { r.checked = (r.value === this.difficulty); });
    playerRadios.forEach(r => { r.checked = (r.value === this.playersChoice); });
    firstDealRadios.forEach(r => { r.checked = (r.value === this.firstDealMode); });
    lengthRadios.forEach(r => { r.checked = (r.value === this.length); });
    // Table surface (applied immediately, remembered). The Souls table to begin with.
    const TABLES = ["green", "red", "blue", "walnut", "mahogany", "tavern", "marble", "souls"];
    const applyTable = (t) => {
      TABLES.forEach(x => document.body.classList.remove("table-" + x));
      document.body.classList.add("table-" + t);
      try { if (typeof SOULS !== "undefined") SOULS.setActive(t === "souls"); } catch (e) { /* ignore */ }
    };
    let table = "souls";
    try { const t = localStorage.getItem("bs_table"); if (TABLES.includes(t)) table = t; } catch (e) { /* ignore */ }
    applyTable(table);
    document.querySelectorAll('input[name="table"]').forEach(r => {
      r.checked = (r.value === table);
      r.addEventListener("change", () => {
        applyTable(r.value);
        try { localStorage.setItem("bs_table", r.value); } catch (e) { /* ignore */ }
      });
    });
    // Card back (applied immediately, remembered). The Infernal back to begin with.
    const BACKS = ["bugvictim", "hellfire", "classic-blue", "classic-red", "infernal"];
    const applyBack = (k) => {
      BACKS.forEach(x => document.body.classList.remove("back-" + x));
      document.body.classList.add("back-" + k);
    };
    let back = "infernal";
    try { const k = localStorage.getItem("bs_cardback"); if (BACKS.includes(k)) back = k; } catch (e) { /* ignore */ }
    applyBack(back);
    document.querySelectorAll('input[name="cardback"]').forEach(r => {
      r.checked = (r.value === back);
      r.addEventListener("change", () => {
        applyBack(r.value);
        try { localStorage.setItem("bs_cardback", r.value); } catch (e) { /* ignore */ }
      });
    });

    // Brightness (this device only): a gamma curve over the whole screen (the filter #oh-gamma in index.html), so the
    // dark parts lift a lot, the middle a little, and black and white stay as they are - nothing washes out.
    // At 100% there's no filter at all.
    let savedBright = 100;
    try { savedBright = +(localStorage.getItem("bs_bright") || 100) || 100; } catch (e) { /* ignore */ }
    this.setBright(savedBright, false);   // set from the sun button's test card

    const speedRadios = document.querySelectorAll('input[name="speed"]');
    speedRadios.forEach(r => { r.checked = (r.value === (GAME_SPEED < 1 ? "fast" : "normal")); });
    speedRadios.forEach(r => r.addEventListener("change", () => {
      GAME_SPEED = r.value === "fast" ? 0.5 : 1;
      try { localStorage.setItem("bs_speed", r.value); } catch (e) { /* ignore */ }
    }));
    document.querySelectorAll('input[name="portraits"]').forEach(r => {
      r.checked = r.value === (this.livingPortraits !== false ? "living" : "still");
      r.addEventListener("change", () => {
        this.livingPortraits = r.value === "living";
        try { localStorage.setItem("bs_portraits", r.value); } catch (e) { /* ignore */ }
        (this.seatEls || []).forEach((els, s) => { if (els && els.portrait) this.setPortrait(s, els); });
      });
    });
    const readSettings = () => {
      opponentRadios.forEach(r => { if (r.checked) this.difficulty = r.value; });
      playerRadios.forEach(r => {
        if (!r.checked) return;
        this.playersChoice = r.value;
        if (r.value !== "random") this.numPlayers = parseInt(r.value, 10);
      });
      lengthRadios.forEach(r => { if (r.checked) this.length = r.value; });
      firstDealRadios.forEach(r => { if (r.checked) this.firstDealMode = r.value; });
      this.aiEngine.setDifficulty(this.difficulty);
    };
    readSettings();

    // ---- tabs ----
    const tabBtns = overlay.querySelectorAll(".tab-btn");
    const showTab = (name) => {
      tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === name));
      overlay.querySelectorAll(".tab-pane").forEach(p => p.classList.toggle("active", p.dataset.pane === name));
    };
    tabBtns.forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));

    // ---- the line under Play ----
    const summaryEl = document.getElementById("round-summary-line");
    const playSub = document.getElementById("btn-play-sub");
    const updateSummary = () => {
      readSettings();
      const who = this.playersChoice === "random" ? "3–5 players" : `${this.numPlayers} players`;
      const to = this.playersChoice === "random" ? "" : ` · to ${Math.round(TARGETS[this.numPlayers] * (this.length === "short" ? 0.5 : 1))} points`;
      if (summaryEl) summaryEl.textContent = this.playersChoice === "random" ? "" : `${60 / this.numPlayers} cards each${to}, lowest wins`;
      if (playSub) playSub.textContent = `${who}${to}`;
    };
    [...playerRadios, ...lengthRadios].forEach(r => r.addEventListener("change", updateSummary));
    updateSummary();

    // Preview the seat layout behind the overlay when the player count changes.
    playerRadios.forEach(r => r.addEventListener("change", () => {
      readSettings();
      this.game.startNewGame({ numPlayers: this.numPlayers, firstDealer: 0 });
      this.buildSeats();
      this.render();
    }));

    const startHandler = () => {
      const rawName = nameInput && nameInput.value ? nameInput.value.trim() : "";
      this.playerName = rawName || "Player";
      readSettings();
      try {
        localStorage.setItem("bs_playerName", this.playerName);
        localStorage.setItem("bs_difficulty", this.difficulty);
        localStorage.setItem("bs_players", this.playersChoice);
        localStorage.setItem("bs_length", this.length);
        localStorage.setItem("bs_firstDeal", this.firstDealMode);
      } catch (e) { /* ignore */ }
      overlay.style.display = "none";
      this.overlayActive = false;
      document.body.classList.remove("overlay-active");
      this.ensureAudioContext();
      this.startGame();
    };

    if (playBtn) playBtn.addEventListener("click", () => startHandler());

    // Splash: BugVictim logo, any click or key goes to the start panel.
    const splash = document.getElementById("splash");
    if (splash) {
      // The click is the user gesture browsers require for fullscreen and audio.
      const dismiss = () => {
        if (splash.classList.contains("gone")) return;
        splash.classList.add("gone");
        try {
          const root = document.documentElement;
          const fs = root.requestFullscreen || root.webkitRequestFullscreen;
          const p = fs && !this.getFullscreenElement() ? fs.call(root) : null;
          if (p && typeof p.catch === "function") p.catch(() => {});
        } catch (e) { /* ignore */ }
        this.setSoundMuted(false);
        this.ensureAudioContext();
        setTimeout(() => {
          splash.remove();
          this.offerTutorialIfNew();
        }, 600);
      };
      splash.addEventListener("click", dismiss);
      if (window.__splashEarly) dismiss();   // clicked while the game was still loading
      splash.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); dismiss(); }
      });
      setTimeout(() => splash.focus(), 50);
    }
    const tutBtn = document.getElementById("btn-tutorial");
    if (tutBtn) tutBtn.addEventListener("click", () => {
      this.markTutorialSeen();
      overlay.style.display = "none";
      this.overlayActive = false;
      document.body.classList.remove("overlay-active");
      this.ensureAudioContext();
      this.startTutorial();
    });


    const closeInstructions = () => {
      const startPanelEl = document.getElementById("start-panel");
      if (startPanelEl) {
        startPanelEl.classList.remove("instructions-open");
        startPanelEl.style.height = "";
      }
      if (startBody) startBody.style.display = "";
      if (startButtons) startButtons.style.display = "";
      instrPanel.style.display = "none";
      if (instrBtn) instrBtn.focus();
    };

    if (instrBtn && instrPanel) {
      instrBtn.addEventListener("click", () => {
        const startPanelEl = document.getElementById("start-panel");
        // The How to play page sizes itself (see oh.css), not to the start panel.
        if (startPanelEl) startPanelEl.classList.add("instructions-open");
        if (startBody) startBody.style.display = "none";
        if (startButtons) startButtons.style.display = "none";
        instrPanel.style.display = "flex";
        if (instrDone) setTimeout(() => instrDone.focus(), 50);
      });
    }

    if (instrDone && instrPanel) instrDone.addEventListener("click", closeInstructions);

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && instrPanel && instrPanel.style.display !== "none") {
        closeInstructions();
      }
    });
  }

  // =====================================================
  // ================= Sound / fullscreen ================
  // =====================================================

  applySoundMuted() {
    const muted = !!this.soundMuted;

    try {
      for (const k of Object.keys(this.sfx)) {
        const a = this.sfx[k];
        if (a && typeof a === "object") a.muted = muted;
      }
    } catch (e) { /* ignore */ }

    const btn = document.getElementById("btn-sound");
    if (btn) {
      btn.innerHTML = muted ? ICONS.muted : ICONS.sound;
      btn.setAttribute("aria-pressed", muted ? "true" : "false");
      btn.dataset.tip = muted ? "Sound: off" : "Sound: on";
      btn.classList.toggle("muted", muted);

      if (!btn.__ohBound) {
        btn.__ohBound = true;
        this.buildMixer();
        btn.addEventListener("pointerdown", e => e.stopPropagation());
        btn.addEventListener("click", e => { e.currentTarget.blur(); e.stopPropagation(); this.toggleMixer(); });
      }
    }

    try { localStorage.setItem("bs_soundMuted", muted ? "1" : "0"); } catch (e) { /* ignore */ }
    if (window.OHMusic) OHMusic.setSound(!muted);
    this.audioUi();
  }

  // The sound panel under the sound button (as in Drakeharbour): the Sound switch silences everything; the game's
  // sounds and the music each have a volume; a tune can be picked, and the line beneath says what's playing.
  buildMixer() {
    if (document.getElementById("oh-mixer")) return;
    const m = document.createElement("div");
    m.id = "oh-mixer"; m.className = "hidden";
    const row = (k, label) => `<div class="mx-row"><span>${label}</span><input type="range" class="vol" data-k="${k}" min="0" max="100" step="1" aria-label="${label} volume"><b class="vol-v" data-k="${k}"></b></div>`;
    const tunes = window.OHMusic ? OHMusic.TUNES.map(t => `<option value="${t.id}">${t.name}</option>`).join("") : "";
    m.innerHTML = `<div class="mx-row mx-sw"><span>Sound</span><button type="button" class="mx-toggle" id="mx-sound" role="switch" aria-label="Sound"><i></i></button><b id="mx-sound-v"></b></div>` +
      row("sfx", "Game") + row("music", "Music") +
      `<div class="mx-row mx-tune"><span>Tune</span><select class="music-pick" aria-label="Choose a tune"><option value="" disabled>Choose a tune</option>${tunes}</select></div>` +
      `<div class="mx-note music-now" aria-live="polite"></div>`;
    document.body.appendChild(m);
    m.querySelector("#mx-sound").addEventListener("click", () => {
      this.setSoundMuted(!this.soundMuted);
      if (!this.soundMuted) { this.ensureAudioContext(); this.sfxFlick(); }
    });
    m.querySelectorAll("input.vol").forEach(inp => inp.addEventListener("input", () => {
      const v = inp.value / 100;
      if (inp.dataset.k === "music") { if (window.OHMusic) OHMusic.setVolume(v); }
      else {
        this.sfxVolume = v;
        try { localStorage.setItem("bs_sfxVol", String(v)); } catch (e) { /* ignore */ }
        this.ensureAudioContext(); this.sfxFlick();
      }
      this.audioUi();
    }));
    m.querySelector("select.music-pick").addEventListener("change", e => { if (e.target.value && window.OHMusic) OHMusic.choose(e.target.value); });
    m.addEventListener("pointerdown", e => e.stopPropagation());
    document.addEventListener("pointerdown", () => this.toggleMixer(false));
    document.addEventListener("musicchange", () => this.audioUi());
  }

  // Brightness (this device only): a gamma curve over the whole screen (the filter #oh-gamma in index.html), so the
  // dark parts lift a lot, the middle a little, and black and white stay as they are - nothing washes out.
  // At 100% there's no filter at all. The test card's slider follows it.
  setBright(pc, save = true) {
    document.querySelectorAll("#oh-gamma feComponentTransfer > *").forEach(f => f.setAttribute("exponent", String(100 / pc)));
    document.documentElement.style.filter = pc === 100 ? "" : "url(#oh-gamma)";
    document.querySelectorAll("[data-bright-slider]").forEach(i => { if (document.activeElement !== i) i.value = pc; });
    document.querySelectorAll("[data-bright-value]").forEach(b => (b.textContent = pc + "%"));
    if (save) try { localStorage.setItem("bs_bright", String(pc)); } catch (e) { /* ignore */ }
  }

  // The brightness test card (the sun button). In a game it's the game itself, with just a slider bar over the
  // table; otherwise a sample table made on the spot from the current settings - the cards, suits, backs, style
  // and table - so it always shows what the game will look like.
  openTestCard() {
    let o = document.getElementById("oh-testcard");
    if (!o) {
      o = document.createElement("div");
      o.id = "oh-testcard";
      o.innerHTML = `<div class="tc-table"></div><div class="tc-bar"><div class="tc-row"><span>Brightness</span>` +
        `<input type="range" min="70" max="200" step="5" data-bright-slider aria-label="Brightness"><b data-bright-value></b>` +
        `<button type="button" class="tc-done">Done</button></div>` +
        `<div class="tc-hint">Raise it until you can see into the dark corners; stop before the light parts look washed out.</div></div>`;
      document.body.appendChild(o);
      const sl = o.querySelector("[data-bright-slider]");
      sl.addEventListener("input", () => this.setBright(+sl.value));
      o.querySelector(".tc-done").addEventListener("click", () => this.closeTestCard());
      document.addEventListener("keydown", e => { if (e.key === "Escape" && o.classList.contains("open")) this.closeTestCard(); });
    }
    const live = this.game && this.game.phase !== "idle";
    o.classList.toggle("live", live);
    const table = o.querySelector(".tc-table");
    table.innerHTML = "";
    if (!live) this.buildTestTable(table);
    let pc = 100; try { pc = +(localStorage.getItem("bs_bright") || 100) || 100; } catch (e) { /* ignore */ }
    this.setBright(pc, false);
    document.body.classList.add("testcard-open");
    o.classList.add("open");
  }
  closeTestCard() {
    const o = document.getElementById("oh-testcard");
    if (o) o.classList.remove("open");
    document.body.classList.remove("testcard-open");
  }
  buildTestTable(table) {
    const seat = (name, file, right, pts) => {
      const s = document.createElement("div"); s.className = "tc-seat";
      const info = document.createElement("div"); info.className = "seat-info";
      const plate = document.createElement("div"); plate.className = "name-label"; plate.textContent = name;
      const p = document.createElement("div"); p.className = "portrait" + (right ? " on-right flip" : "");
      p.style.backgroundImage = `url("img/opp-${file}.webp?v=3")`; plate.appendChild(p);
      const stats = document.createElement("div"); stats.className = "seat-stats";
      stats.innerHTML = `<span class="taken-token${pts > 0 ? " bad" : ""}">${pts}</span>`;
      info.append(plate, stats); s.appendChild(info);
      const backs = document.createElement("div"); backs.className = "tc-backs";
      for (let i = 0; i < 4; i++) backs.appendChild(this.cardView.createCardElement(null, { back: true }));
      s.prepend(backs);
      return s;
    };
    const top = document.createElement("div"); top.className = "tc-top";
    top.append(seat("Lilith", "lilith", false, 11), seat("Ronnie", "ronnie", true, 0));
    const mid = document.createElement("div"); mid.className = "tc-mid";
    const hand = document.createElement("div"); hand.className = "tc-hand";
    for (const code of ["R7", "P11", "G3", "B9", "K7", "K2"]) hand.appendChild(this.cardView.createCardElement(parseCard(code)));
    mid.append(hand);
    table.append(top, mid);
  }

  toggleMixer(show) {
    const m = document.getElementById("oh-mixer");
    if (!m) return;
    const open = show == null ? m.classList.contains("hidden") : show;
    m.classList.toggle("hidden", !open);
    if (open) this.audioUi();
  }

  audioUi() {
    const m = document.getElementById("oh-mixer");
    if (!m) return;
    const M = window.OHMusic, sound = !this.soundMuted;
    const sw = m.querySelector("#mx-sound");
    sw.classList.toggle("on", sound); sw.setAttribute("aria-checked", String(sound));
    m.querySelector("#mx-sound-v").textContent = sound ? "On" : "Off";
    m.classList.toggle("off", !sound);
    const lvl = k => (k === "music" ? (M ? M.volume : 0) : this.sfxVolume);
    m.querySelectorAll("b.vol-v").forEach(b => { const v = lvl(b.dataset.k); b.textContent = v ? Math.round(v * 100) + "%" : "off"; });
    m.querySelectorAll("input.vol").forEach(i => { if (document.activeElement !== i) i.value = Math.round(100 * lvl(i.dataset.k)); });
    if (!M) return;
    const sel = m.querySelector("select.music-pick"), now = M.queued || M.tune;
    const t = M.TUNES.find(x => x.name === now);
    sel.value = t ? t.id : "";
    m.querySelector(".music-now").textContent =
      !sound ? "Sound is off." : !M.volume ? "Music is off. Raise Music to listen." :
      M.queued ? `Next: ${M.queued}` : M.tune ? `Playing: ${M.tune}` : "Music starts in a moment.";
  }

  setSoundMuted(muted) {
    this.soundMuted = !!muted;
    this.applySoundMuted();
  }

  getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  isFullscreenEnabled() {
    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  }

  applyFullscreenUi() {
    const btn = document.getElementById("btn-fullscreen");
    if (!btn) return;

    const root = document.documentElement;
    const supported = this.isFullscreenEnabled() && !!(root.requestFullscreen || root.webkitRequestFullscreen);
    if (!supported) {
      btn.style.display = "none";
      return;
    }

    const isFs = !!this.getFullscreenElement();
    btn.innerHTML = isFs ? ICONS.exitFull : ICONS.full;
    btn.setAttribute("aria-pressed", isFs ? "true" : "false");
    btn.dataset.tip = isFs ? "Leave fullscreen" : "Fullscreen";

    if (!btn.__ohBound) {
      btn.__ohBound = true;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        try {
          if (this.getFullscreenElement()) {
            const fn = document.exitFullscreen || document.webkitExitFullscreen;
            const p = fn && fn.call(document);
            if (p && typeof p.catch === "function") p.catch(() => {});
          } else {
            const fn = root.requestFullscreen || root.webkitRequestFullscreen;
            const p = fn && fn.call(root);
            if (p && typeof p.catch === "function") p.catch(() => {});
          }
        } catch (e) { /* ignore */ }
      });
    }

    if (!this.__ohFullscreenChangeBound) {
      this.__ohFullscreenChangeBound = true;
      document.addEventListener("fullscreenchange", () => this.applyFullscreenUi());
      document.addEventListener("webkitfullscreenchange", () => this.applyFullscreenUi());
    }
  }

  playSfx(audio) {
    if (this.soundMuted || !audio) return;
    try {
      // Play a fresh copy so rapid repeats overlap instead of cutting each
      // other off (restarting one element makes quick sounds thin and quiet).
      const a = audio.cloneNode();
      a.volume = audio.volume * this.sfxVolume;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) { /* ignore */ }
  }

  // the game's own sounds all go through one gain, set by the Game slider in the sound panel
  sfxOut(ctx) {
    if (!this.sfxGain || this.sfxGain.context !== ctx) { this.sfxGain = ctx.createGain(); this.sfxGain.connect(ctx.destination); }
    this.sfxGain.gain.value = this.sfxVolume;
    return this.sfxGain;
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.audioCtx = new AC();
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      try { this.audioCtx.resume().catch(() => {}); } catch (e) { /* ignore */ }
    }
    return this.audioCtx;
  }

  // Short synthesised effects. notes: [[freqHz, startSec, durSec], ...]
  playTones(notes, { type = "triangle", gain = 0.12 } = {}) {
    if (this.soundMuted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const [f, t0, d] of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, now + t0);
      g.gain.setValueAtTime(0.0001, now + t0);
      g.gain.exponentialRampToValueAtTime(gain, now + t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + d);
      osc.connect(g).connect(this.sfxOut(ctx));
      osc.start(now + t0);
      osc.stop(now + t0 + d + 0.02);
    }
  }

  // A card landing: two quick filtered noise bursts, the double flick German Whist and Artifact use
  // (it replaced the recorded card-place sound).
  sfxFlick() {
    if (this.soundMuted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;
    const burst = (t, dur, freq, peak) => {
      const now = ctx.currentTime + t;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * (dur + 0.02)), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = freq;
      f.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(peak, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(f).connect(g).connect(this.sfxOut(ctx));
      src.start(now);
      src.stop(now + dur + 0.02);
    };
    burst(0, 0.06, 2600, 0.29);
    burst(0.07, 0.05, 3400, 0.22);
  }
  sfxTick()        { this.playTones([[1800, 0, 0.03]], { type: "square", gain: 0.035 }); }
  sfxTrickMine()   { this.playTones([[784, 0, 0.12], [1175, 0.08, 0.2]], { gain: 0.13 }); }
  sfxTrickOther()  { this.playTones([[330, 0, 0.14]], { gain: 0.08 }); }
  sfxExact()       { this.playTones([[523, 0, 0.12], [659, 0.09, 0.12], [784, 0.18, 0.12], [1047, 0.27, 0.3]], { gain: 0.14 }); }
  sfxMoonCapture() {
    this.playTones([[392, 0, 0.18], [523, 0.12, 0.18], [659, 0.24, 0.18], [784, 0.36, 0.18], [1047, 0.48, 0.45]],
      { type: "sine", gain: 0.17 });
  }

  playEndArpeggio({ outcome } = {}) {
    if (this.soundMuted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

    // Win: upbeat arpeggio. Lose: diminished-7 arpeggios stepping down.
    const seq = (outcome === "lose")
      ? [
        60, 63, 66, 69,  59, 62, 65, 68,  58, 61, 64, 67,
        57, 60, 63, 66,  56, 59, 62, 65,  55, 58, 61, 64
      ].map(midiToFreq)
      : [
        261.63, 329.63, 392.00, 523.25, 659.25,
        440.00, 523.25, 698.46, 587.33, 349.23,
        698.46, 587.33, 349.23, 698.46, 493.88,
        587.33, 783.99, 493.88, 659.25, 392.00,
        493.88, 659.25, 392.00, 523.25
      ];

    const noteGap = 0.1;
    const noteDur = 0.09;
    const totalTime = seq.length * noteGap;

    const gainNode = ctx.createGain();
    gainNode.connect(this.sfxOut(ctx));
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + totalTime + 0.12);

    seq.forEach((freq, index) => {
      const t = now + index * noteGap;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(gainNode);
      osc.start(t);
      osc.stop(t + noteDur);
    });

    setTimeout(() => {
      try { gainNode.disconnect(); } catch (_) {}
    }, (totalTime + 0.25) * 1000);
  }
}

// ---- scaling glue ----
function updateScale() {
  const cardsInHand = 13;   // (fuller hands draw their cards closer: bs-core's fan)
  const maxFanWidth = window.innerWidth * 0.9;
  const overlapFactor = 0.35;
  const scaleFromFan = maxFanWidth / (cardsInHand * BASE_CARD_WIDTH * overlapFactor);

  // Side seats + centre trick need roughly 7.5 card widths across.
  const scaleFromWidth = (window.innerWidth * 0.95) / (BASE_CARD_WIDTH * 7.5);

  // Top seat, trick area, player hand + labels stacked vertically.
  // (desktop windows have room to spare, so the rows are packed a little tighter and every card is bigger)
  const desktop = !(window.innerHeight <= 500 && window.innerWidth > window.innerHeight);
  // five players: the two top seats sit beside the trick, so their cards grow a little less
  const five = document.body && document.body.dataset.players === "5";
  const layoutRows = desktop ? (five ? 4.6 : 4.5) : 4.9;
  const scaleFromHeight = (window.innerHeight * 0.92) / (BASE_CARD_HEIGHT * layoutRows);

  let scale = Math.min(scaleFromFan, scaleFromWidth, scaleFromHeight);
  if (!isFinite(scale) || scale <= 0) scale = 1;
  scale = Math.max(0.4, scale);

  const root = document.documentElement;
  root.style.setProperty("--card-scale", scale.toString());
  root.style.setProperty("--index-size", Math.max(MIN_INDEX_PX, BASE_INDEX_PX * scale) + "px");
  root.style.setProperty("--pip-size", Math.max(MIN_PIP_PX, BASE_PIP_PX * scale) + "px");

  // Phones in landscape: your own hand is drawn bigger (it grows up from the
  // bottom edge) and the opponents' fans a little smaller.
  IS_PHONE = window.innerHeight <= 500 && window.innerWidth > window.innerHeight;
  HAND_SCALE = IS_PHONE ? PHONE_HAND_SCALE : 1;
  root.style.setProperty("--hand-scale", String(HAND_SCALE));

  layoutMetrics.scale = scale;
  layoutMetrics.cardWidth = BASE_CARD_WIDTH * scale;
  layoutMetrics.cardHeight = BASE_CARD_HEIGHT * scale;
  if (document.body) applyFaces();
}

// start the Infernal fonts loading now (they are otherwise only fetched when a nameplate first needs them)
if (document.fonts && document.fonts.load) { document.fonts.load('21px "Manufacturing Consent"').catch(() => {}); document.fonts.load('16px "Cinzel"').catch(() => {}); }
updateScale();
const controller = new GameController();

window.addEventListener("resize", () => {
  updateScale();
  controller.updateOppScale();
  controller.render();
});

// Card art loads in the background as soon as the page opens, so a card never turns up blank while its picture is
// still on its way (online, each picture would otherwise only be fetched the first time a card shows it). The URLs
// must match exactly what the cards and oh.css ask for (including any ?v=). The current style's art comes first.
const CARD_ART_KEEP = [];
function preloadCardArt() {
  const list = ["red", "blue", "purple", "green", "black"].map(c => `img/spider-${c}.webp`);
  for (let i = 0; i < 8; i++) list.push(`img/parchment-card-${i}.webp`);
  list.push("img/parchment-card.webp?v=3");
  for (let i = 0; i < 8; i++) list.push(`img/crease-${i}.webp?v=2`);
  for (let i = 0; i < 6; i++) list.push(`img/wear-${i}.webp`);
  // a few at a time, so the first ones needed aren't queued behind everything else
  let next = 0;
  const one = () => {
    if (next >= list.length) return;
    const img = new Image();
    img.decoding = "async";
    const done = () => one();
    img.onload = () => { (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(done); };
    img.onerror = done;
    img.src = list[next++];
    CARD_ART_KEEP.push(img);       // kept, so the decoded pictures stay ready
  };
  for (let k = 0; k < 6; k++) one();
}
if (document.readyState === "complete") setTimeout(preloadCardArt, 0);
else window.addEventListener("load", () => setTimeout(preloadCardArt, 0));
