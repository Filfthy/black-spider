// bs-tutorial.js - the scripted first hand: passing, then three coached tricks, then the rest on your own.
// Seats: 0 you, 1 Persephone (left), 2 Bub (across), 3 Lilith (right). The hand passes left.
// rounds[0].tricks[i][seat]: the card each seat plays in trick i (only for the coached tricks; after those, everyone
// plays freely). coach: the coach's words at each point ("pass" and "playN" are prompts; the rest wait for Next).

const TUTORIAL = {
  opponents: ["Persephone", "Bub", "Lilith"],
  firstDealer: 3,
  intro: [
    "Welcome to <b>Black Spider</b>. It's a trick-taking game where you want to take as <b>few points</b> as you can.",
    "The deck has 60 cards: red, blue, purple and green, each numbered 1 to 11, and black. Black has six 7s: the <b>Black Spiders</b>.",
    "The small number under a card's number is what it scores if you take it in a trick. Black cards score points (bad). Each Black Spider is 10!",
    "The coloured 7s score <b>−5</b>: those are worth taking. Lowest total at the end wins."
  ],
  rounds: [{
    hands: [
      ["R1", "R3", "R6", "P11", "P1", "G2", "G5", "G10", "K7a", "K1", "K2", "K3", "K7b", "K11", "B11"],
      ["R5", "B2", "P7", "B5", "K4", "K6", "K7d", "R11", "B9", "B1", "P8", "K7c", "R2", "G6", "B6"],
      ["G1", "B8", "P5", "P6", "K5", "G9", "K10", "P4", "K8", "G8", "B3", "P10", "K9", "G4", "B10"],
      ["R9", "B4", "P3", "G11", "R10", "P9", "R8", "G3", "K7", "R7", "R4", "K7e", "P2", "B7", "G7"]
    ],
    passes: [["K7b", "K11", "B11"], ["K7d", "K7c", "K6"], ["K10", "K9", "K8"], ["G11", "R10", "P9"]],
    tricks: [
      ["R1", "R5", "G1", "R9"],
      ["K7a", "B2", "B8", "B4"],
      ["P11", "P7", "P5", "P3"]
    ],
    coach: {
      start: [
        { t: "Here's your hand: 15 cards each with four players. Before every hand, everyone passes three cards. This hand they go to the <b>left</b>, to Persephone.", spot: "#player-hand" },
        "Pass the cards you least want. You have two Black Spiders: pass one, with your <b>black 11</b> (5 points)…",
        "…and your only blue card, the <b>blue 11</b>. With no blue left, whenever blue is led you can't follow, and can throw away anything you like."
      ],
      pass: { t: "Click the <b>Black Spider</b> (black 7), the <b>black 11</b> and the <b>blue 11</b>, then press <b>Pass these three</b>." },
      passed: [
        { t: "Lilith passed you three cards: the ones lifted in your hand. She gave you some high cards, which are more likely to win tricks you don't want.", spot: "#player-hand" }
      ],
      play0: { t: "Whoever has the <b>red 1</b> leads it to the first trick. That's you: play the red 1." },
      trick0: [
        "If you have the colour that was led, you must follow it, though you may play a card of the <b>same number</b> instead. Persephone followed with red; Bub played a <b>green 1</b> instead, matching the number.",
        "The highest card <b>of the colour led</b> wins. Bub's green 1 could never win, as green wasn't led. Lilith's red 9 won, and she leads next.",
        "One more thing about the first trick: <b>no black cards</b> may be played on it, unless you have nothing else."
      ],
      play1: { t: "Blue 4 is led. You have no blue, so you may play anything. Drop your <b>Black Spider</b> on it!" },
      trick1: [
        "Bub's blue 8 was the highest blue, so Bub takes the trick, and your Black Spider with it: 10 points to Bub. Look at his face.",
        "Black can't be led until it's <b>broken</b>, by someone playing a black card on a trick where another colour was led. Your Black Spider just broke it: from now on black may be led."
      ],
      play2: { t: "Purple 5 is led, and you have purple. Persephone will play her <b>purple 7</b>, worth −5. Win the trick with your <b>purple 11</b> and take it." },
      trick2: [
        "You took the purple 7: <b>−5</b> for you. Your points this hand show by your name.",
        "Now play the rest of the hand yourself. Remember: follow the colour (or match the number), duck under the winning card when you can, and dump your worst cards when you can't follow."
      ],
      end: { t: "That's a hand. Points add up over the hands, and the game ends when someone reaches the target (150 with four players). Lowest score wins." }
    }
  }],
  outro: [
    "That's Black Spider! Take a <b>sweep</b> (all 16 black cards) and you score 0 while everyone else scores 60, but it's a risky business.",
    "Choose how many players and how good your opponents are, then press <b>Play</b>. The rules are always under the book button."
  ]
};
