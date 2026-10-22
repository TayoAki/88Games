# 88 Games: product and rules research

Research date: 2026-10-22. This is an original implementation, not a copy of another app’s branding, artwork, source code, or screen designs.

## Scope and evidence

The request references “Offline Games.” We interpret this as a collection of short classic games that work without a connection. The JindoBlu store listing was a candidate reference, not a confirmed identification from the user. Direct requests to its Google Play listing, offlinegames.app, Pagat and Wikipedia were denied by the cloud network policy (HTTP CONNECT 403). Therefore **no competitor screenshots, reviews, download numbers, price claims, or live listing contents were verified**. These domains were saved as proposed environment network additions; that alone does not enable current access.

Available public documentation read successfully:

- [Toranpu README](https://github.com/johnmorrisdotca/toranpu): a collection of eleven classic card games; computer players, saved games, pure rules functions, and player-limited bot information. These support separating the rules engine from the presentation and making resume a core feature. Its code was not imported or copied.
- [Game Hub Spades README](https://github.com/whtdrgn101/game-spades) and [rules digest, section 1](https://github.com/whtdrgn101/game-spades/blob/main/ROADMAP.md): four players, opposite partners, 52 cards, fixed trump, follow suit, public bids, nil, bag carry-over, and a 500-point target. This is a third-party rules profile, not a universal authority; Spades has house-rule variants.
- [miaoda-game-spades-rules npm documentation](https://www.npmjs.com/package/miaoda-game-spades-rules): immutable transitions, legal moves, nil, bags, repeated hands, validated restore, and target 500. Read through `npm view … readme`; not installed or copied.
- [Expo SDK 55 version matrix](https://github.com/expo/expo/blob/sdk-55/packages/expo/bundledNativeModules.json): checked React 19.2, React Native 0.83.10, AsyncStorage 2.2, web 0.21, and safe-area-context 5.6 compatibility before installation. SDK 55 is deliberately pinned instead of following the newest registry release.

## Product decisions

An instant game library opens directly into a complete Spades game. No account, backend, ads, analytics, downloads during play, or network calls from app logic. The three opponents/partner are local bots. One match autosaves after every transition. Future games can use the library shell but are not advertised as playable today.

Use a restrained midnight navy, copper, ivory, and green felt identity, readable suit colors, clearly disabled illegal cards, public bids and team totals, a rules sheet and a confirmed reset. All thirteen cards remain accessible through scrolling on smaller phones. Card arrivals animate with React Native Animated and respect the OS reduced-motion preference. Quick bot turns are available.

## Explicit house rules implemented

- Four seats; 0 and 2 partner, 1 and 3 partner. Standard deck, ace high, no jokers.
- 13 cards each; dealer rotates; player to dealer’s left bids first and leads first.
- Bid 0–13. Zero is nil, ±100 individually; no blind nil or card exchange.
- Must follow suit. Spades always trump and cannot be led before broken, except when only spades remain. No extra first-trick restriction.
- Team contract is combined bids. Only non-nil players’ tricks count toward making that contract. Make it: 10×contract plus one per contract overtrick; miss: −10×contract.
- Failed-nil tricks add bags, but do not help the partner’s contract and do not earn overtrick points. Every ten accumulated bags deducts 100; carry the remainder.
- Score the complete round. At least 500 and a higher score wins; equal scores require another deal.

## Limits and next research

Bots use simple hand-strength bids and legal low-card/lowest-winning-card heuristics. They do not inspect hidden hands, but are not expert Spades opponents. Human multiplayer, more games, sound, adjustable difficulty, custom house rules and store release are out of V1 scope. Native iOS/Android runtime, offline cold start in a standalone binary, screen-reader navigation and real-device performance need device checks before release. Further competitor work should verify current store information once access is enabled; no unverified commercial claim should enter marketing copy.
