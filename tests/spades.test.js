const { test } = require("node:test");
const assert = require("node:assert/strict");
const g = require("../src/game/spades");
test("deal contains 52 unique cards, thirteen per player", () => {
  const s = g.newRound();
  assert.equal(new Set(s.hands.flat().map((c) => c.id)).size, 52);
  s.hands.forEach((h) => assert.equal(h.length, 13));
});
test("must follow suit; cannot lead unbroken spades except when holding only spades", () => {
  let s = g.newRound();
  s.phase = "playing";
  s.turn = 0;
  s.hands[0] = [
    { id: "S14", suit: "S", rank: 14 },
    { id: "H2", suit: "H", rank: 2 },
  ];
  assert.deepEqual(
    g.legalCards(s).map((c) => c.id),
    ["H2"],
  );
  s.trick = [{ seat: 3, card: { id: "H3", suit: "H", rank: 3 } }];
  assert.throws(() => g.play(s, "S14"));
  s.hands[0].pop();
  s.trick = [];
  assert.equal(g.legalCards(s)[0].id, "S14");
});
test("trump wins over ace; otherwise highest in led suit wins", () => {
  const t = [
    { seat: 0, card: { suit: "H", rank: 14 } },
    { seat: 1, card: { suit: "S", rank: 2 } },
    { seat: 2, card: { suit: "D", rank: 14 } },
    { seat: 3, card: { suit: "H", rank: 13 } },
  ];
  assert.equal(g.trickWinner(t), 1);
  t[1].card.suit = "H";
  assert.equal(g.trickWinner(t), 0);
});
test("contracts, nil and bag penalties", () => {
  assert.equal(g.scoreTeam([3, 3, 2, 2], [4, 3, 2, 4], 0, 0).points, 51);
  assert.equal(g.scoreTeam([3, 3, 2, 2], [2, 3, 2, 6], 0, 0).points, -50);
  assert.deepEqual(g.scoreTeam([3, 3, 2, 2], [4, 3, 2, 4], 0, 9).bags, 0);
  assert.equal(g.scoreTeam([3, 3, 2, 2], [4, 3, 2, 4], 0, 9).points, -49);
  assert.equal(g.scoreTeam([0, 3, 4, 2], [0, 3, 5, 5], 0, 0).points, 141);
  assert.equal(g.scoreTeam([0, 3, 4, 2], [1, 3, 3, 6], 0, 0).points, -140);
});
test("100 complete bot rounds preserve turn order and score thirteen tricks", () => {
  for (let i = 0; i < 100; i++) {
    let s = g.newRound();
    while (s.phase === "bidding") s = g.bid(s, g.botBid(s.hands[s.turn]));
    let count = 0;
    while (!["roundEnd", "matchEnd"].includes(s.phase)) {
      s = s.phase === "trickEnd" ? g.collectTrick(s) : g.play(s, g.botCard(s));
      assert.ok(++count <= 65);
    }
    assert.equal(
      s.tricks.reduce((a, b) => a + b),
      13,
    );
    assert.equal(s.hands.flat().length, 0);
    assert.ok(g.isSavedGame(s));
  }
});
test("reject bad saves and illegal bids", () => {
  assert.equal(g.isSavedGame({ version: 1 }), false);
  assert.throws(() => g.bid(g.newRound(), 14));
  const s = g.newRound();
  assert.ok(g.isSavedGame(JSON.parse(JSON.stringify(s))));
});
test("failed nil tricks add bags and can trigger a penalty even when contract fails", () => {
  const r = g.scoreTeam([0, 3, 4, 2], [1, 3, 3, 6], 0, 9);
  assert.equal(r.points, -240);
  assert.equal(r.bags, 0);
});
test("save validator rejects missing cards and invalid scoring data", () => {
  let s = g.newRound();
  s.hands[0].pop();
  assert.equal(g.isSavedGame(s), false);
  s = g.newRound();
  s.bags[0] = 99;
  assert.equal(g.isSavedGame(s), false);
  s = g.newRound();
  s.scores = [null, 0];
  assert.equal(g.isSavedGame(s), false);
});
test("dealer rotates and scores and bags survive the next deal", () => {
  let s = g.newRound();
  s.scores = [125, -20];
  s.bags = [2, 3];
  const next = g.newRound(s);
  assert.equal(next.dealer, 0);
  assert.equal(next.turn, 1);
  assert.deepEqual(next.scores, [125, -20]);
  assert.deepEqual(next.bags, [2, 3]);
});
test("crossing 500 ends a match, but a tie continues", () => {
  function finish(scores) {
    let s = g.newRound();
    s.phase = "trickEnd";
    s.completed = 12;
    s.bids = [3, 3, 3, 3];
    s.tricks = [3, 3, 3, 3];
    s.hands = [[], [], [], []];
    s.scores = scores;
    s.trick = [
      { seat: 0, card: { suit: "H", rank: 14 } },
      { seat: 1, card: { suit: "H", rank: 2 } },
      { seat: 2, card: { suit: "H", rank: 3 } },
      { seat: 3, card: { suit: "H", rank: 4 } },
    ];
    return g.collectTrick(s);
  }
  assert.equal(finish([450, 450]).winner, 0);
  assert.equal(finish([449, 450]).phase, "roundEnd");
});
