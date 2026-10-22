# 88 Games V1

Outcome: an original offline React Native collection for iOS and Android, with complete solo partnership Spades as the first game. Web export supports development checks.

Journey: Library → new/resumed table → bid → thirteen tricks → round score → next deal → 500-point result → play again. Rules are available from both screens. Reset requires confirmation. Missing storage shows a message; malformed saves recover to a fresh-game option.

Data: one versioned local match containing deck hands, seat turn, bids, trick, broken flag, trick counts, scores, bags, history and phase. AsyncStorage is the only persistence boundary. No backend or user identity. Bot timers pause outside the table and behind dialogs. Queued saves preserve transition order.

| ID | Acceptance | Status / evidence |
|---|---|---|
| F1 | Original library, clear single available game, responsive layout | Implemented; Chromium screens reviewed at 390px |
| F2 | Legal partnership Spades, public bidding and score rules | Verified: 10 engine tests including 100 complete bot rounds |
| F3 | Human can bid/play through a complete round against three bots | Verified: browser smoke passed full round, scoring and next deal |
| F4 | Save/resume latest match; invalid save recovery; reset confirmation | Verified: browser smoke passed resume, cancel reset and corrupt-save recovery |
| F5 | Local artwork and arrival animation | Generated Spades illustration bundled; animation uses reduced-motion preference |
| F6 | Reproducible install, typecheck, browser export | Verified: npm lockfile install, TypeScript check, Expo web/iOS/Android bundle export |
| F7 | iOS and Android device acceptance | Unverified: no simulator/device attached |

V1 exclusions: online multiplayer, login, ads, analytics, paid services, other playable games, audio, store submission. Asset generation is a development activity; the app has no AI service dependency.

Next: device acceptance with airplane mode, accessibility, background/termination resume, and small-screen touch review, then test distribution/signing if requested.
