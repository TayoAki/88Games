// Pure game engine. Seats 0/2 and 1/3 are partners; bots never inspect other hands.
const SUITS = ["C", "D", "H", "S"];
const symbol = { C: "♣", D: "♦", H: "♥", S: "♠" };
function shuffledDeck(random = Math.random) {
  const deck = SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, i) => ({
      id: suit + (i + 2),
      suit,
      rank: i + 2,
    })),
  );
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function newRound(previous, random = Math.random) {
  const deck = shuffledDeck(random);
  const dealer = previous ? (previous.dealer + 1) % 4 : 3;
  return {
    version: 1,
    phase: "bidding",
    dealer,
    turn: (dealer + 1) % 4,
    hands: [0, 1, 2, 3].map((p) =>
      deck
        .slice(p * 13, p * 13 + 13)
        .sort(
          (a, b) =>
            SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank,
        ),
    ),
    bids: [null, null, null, null],
    tricks: [0, 0, 0, 0],
    trick: [],
    broken: false,
    completed: 0,
    scores: previous?.scores ?? [0, 0],
    bags: previous?.bags ?? [0, 0],
    round: previous ? previous.round + 1 : 1,
    history: previous?.history ?? [],
    lastWinner: null,
    winner: null,
  };
}
function legalCards(state, seat = state.turn) {
  if (state.phase !== "playing" || seat !== state.turn) return [];
  const hand = state.hands[seat];
  if (state.trick.length) {
    const matching = hand.filter((c) => c.suit === state.trick[0].card.suit);
    return matching.length ? matching : hand;
  }
  const nonSpades = hand.filter((c) => c.suit !== "S");
  return state.broken || !nonSpades.length ? hand : nonSpades;
}
function trickWinner(trick) {
  const lead = trick[0].card.suit;
  return trick.reduce((best, play) => {
    const strength = (c) =>
      (c.suit === "S" ? 200 : c.suit === lead ? 100 : 0) + c.rank;
    return strength(play.card) > strength(best.card) ? play : best;
  }).seat;
}
function bid(state, value) {
  if (
    state.phase !== "bidding" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 13
  )
    throw Error("Invalid bid");
  const bids = [...state.bids];
  bids[state.turn] = value;
  const done = bids.every((b) => b !== null);
  return {
    ...state,
    bids,
    phase: done ? "playing" : "bidding",
    turn: done ? (state.dealer + 1) % 4 : (state.turn + 1) % 4,
  };
}
function play(state, id) {
  const card = legalCards(state).find((c) => c.id === id);
  if (!card)
    throw Error("Follow suit, and wait until spades are broken to lead them.");
  const hands = state.hands.map((h, p) =>
    p === state.turn ? h.filter((c) => c.id !== id) : h,
  );
  const trick = [...state.trick, { seat: state.turn, card }];
  return {
    ...state,
    hands,
    trick,
    broken: state.broken || card.suit === "S",
    turn: (state.turn + 1) % 4,
    phase: trick.length === 4 ? "trickEnd" : "playing",
  };
}
function scoreTeam(bids, tricks, team, oldBags) {
  const seats = [team, team + 2];
  const contract = seats.reduce((n, p) => n + bids[p], 0);
  // Tricks taken by a failed nil bidder do not help their partner's contract.
  const taken = seats.reduce((n, p) => n + (bids[p] === 0 ? 0 : tricks[p]), 0);
  const over = Math.max(0, taken - contract);
  let points = taken >= contract ? contract * 10 + over : -contract * 10;
  for (const p of seats)
    if (bids[p] === 0) points += tricks[p] === 0 ? 100 : -100;
  const nilBags = seats.reduce(
    (n, p) => n + (bids[p] === 0 ? tricks[p] : 0),
    0,
  );
  const totalBags = oldBags + over + nilBags;
  points -= Math.floor(totalBags / 10) * 100;
  return { points, bags: totalBags % 10, contract, taken };
}
function collectTrick(state) {
  if (state.phase !== "trickEnd") throw Error("Trick is not complete");
  const winner = trickWinner(state.trick),
    tricks = [...state.tricks];
  tricks[winner]++;
  const completed = state.completed + 1;
  if (completed < 13)
    return {
      ...state,
      tricks,
      completed,
      trick: [],
      turn: winner,
      lastWinner: winner,
      phase: "playing",
    };
  const results = [0, 1].map((t) =>
    scoreTeam(state.bids, tricks, t, state.bags[t]),
  );
  const scores = results.map((r, t) => state.scores[t] + r.points);
  const finished = Math.max(...scores) >= 500 && scores[0] !== scores[1];
  return {
    ...state,
    tricks,
    completed,
    trick: [],
    turn: winner,
    lastWinner: winner,
    phase: finished ? "matchEnd" : "roundEnd",
    scores,
    bags: results.map((r) => r.bags),
    winner: finished ? (scores[0] > scores[1] ? 0 : 1) : null,
    history: [...state.history, { round: state.round, results, scores }],
  };
}
function botBid(hand) {
  const estimate = hand.reduce(
    (n, c) =>
      n +
      (c.suit === "S"
        ? c.rank >= 11
          ? 0.95
          : 0.4
        : c.rank === 14
          ? 0.9
          : c.rank === 13
            ? 0.4
            : 0),
    0,
  );
  return Math.max(1, Math.min(8, Math.round(estimate)));
}
function botCard(state) {
  const legal = [...legalCards(state)].sort(
    (a, b) =>
      (a.suit === "S" ? 20 : 0) + a.rank - ((b.suit === "S" ? 20 : 0) + b.rank),
  );
  const seat = state.turn;
  if (!state.trick.length) return legal[0].id;
  const winningSeat = trickWinner(state.trick);
  const nil = state.bids[seat] === 0;
  const candidates = legal.filter(
    (card) => trickWinner([...state.trick, { seat, card }]) === seat,
  );
  if (nil || winningSeat % 2 === seat % 2) return legal[0].id;
  return (candidates[0] ?? legal[0]).id;
}
function isSavedGame(s) {
  if (
    !s ||
    s.version !== 1 ||
    !["bidding", "playing", "trickEnd", "roundEnd", "matchEnd"].includes(
      s.phase,
    )
  )
    return false;
  const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  if (
    !integer(s.turn, 0, 3) ||
    !integer(s.dealer, 0, 3) ||
    !integer(s.round, 1, 100000) ||
    !integer(s.completed, 0, 13) ||
    typeof s.broken !== "boolean"
  )
    return false;
  if (
    !Array.isArray(s.hands) ||
    s.hands.length !== 4 ||
    !s.hands.every((h) => Array.isArray(h) && h.length <= 13)
  )
    return false;
  if (
    !Array.isArray(s.bids) ||
    s.bids.length !== 4 ||
    !s.bids.every((b) => b === null || integer(b, 0, 13))
  )
    return false;
  if (
    !Array.isArray(s.tricks) ||
    s.tricks.length !== 4 ||
    !s.tricks.every((t) => integer(t, 0, 13)) ||
    s.tricks.reduce((a, b) => a + b, 0) !== s.completed
  )
    return false;
  if (
    !Array.isArray(s.scores) ||
    s.scores.length !== 2 ||
    !s.scores.every(Number.isFinite)
  )
    return false;
  if (
    !Array.isArray(s.bags) ||
    s.bags.length !== 2 ||
    !s.bags.every((b) => integer(b, 0, 9))
  )
    return false;
  if (
    !Array.isArray(s.history) ||
    !s.history.every(
      (h) =>
        h &&
        integer(h.round, 1, 100000) &&
        Array.isArray(h.results) &&
        h.results.length === 2 &&
        h.results.every(
          (r) =>
            r &&
            ["contract", "taken", "points"].every((k) => Number.isFinite(r[k])),
        ) &&
        Array.isArray(h.scores) &&
        h.scores.length === 2 &&
        h.scores.every(Number.isFinite),
    )
  )
    return false;
  if (
    !Array.isArray(s.trick) ||
    s.trick.length > 4 ||
    !s.trick.every((p) => p && integer(p.seat, 0, 3)) ||
    new Set(s.trick.map((p) => p.seat)).size !== s.trick.length
  )
    return false;
  if ((s.phase === "trickEnd") !== (s.trick.length === 4)) return false;
  if (s.phase !== "bidding" && s.bids.some((b) => b === null)) return false;
  if (
    s.phase === "bidding" &&
    (s.completed !== 0 || s.trick.length !== 0 || s.bids[s.turn] !== null)
  )
    return false;
  if (["roundEnd", "matchEnd"].includes(s.phase) !== (s.completed === 13))
    return false;
  if (s.phase === "matchEnd" && !integer(s.winner, 0, 1)) return false;
  const cards = [...s.hands.flat(), ...s.trick.map((p) => p.card)];
  return (
    cards.length + s.completed * 4 === 52 &&
    cards.every(
      (c) =>
        c &&
        SUITS.includes(c.suit) &&
        integer(c.rank, 2, 14) &&
        c.id === c.suit + c.rank,
    ) &&
    new Set(cards.map((c) => c.id)).size === cards.length
  );
}

module.exports = {
  SUITS,
  symbol,
  shuffledDeck,
  newRound,
  legalCards,
  trickWinner,
  bid,
  play,
  scoreTeam,
  collectTrick,
  botBid,
  botCard,
  isSavedGame,
};
