# 88 Games

An original offline React Native game collection. First up: **Spades**, with you and Maya against Jules and Leo. Built with Expo SDK 55 for iOS and Android, plus a web development target.

- Complete 52-card partnership game: bidding, nil, legal moves, trump, thirteen tricks, team scoring, bags, rotating dealer, and a 500-point match.
- Three local bots, with no hidden-hand inspection.
- Automatic on-device save/resume, corrupt-save recovery, rules, and confirmed reset.
- Original bundled artwork, animated card arrival, reduced-motion support, quick bot turns, dark felt table.
- No account, ads, analytics, backend, or network requirement in game logic.

## Run

Node 22.13+ (validated on Node 24.19), npm 11, and Expo Go compatible with SDK 55 or a matching development build. Native builds require the usual Android Studio / Xcode setup. If your installed Expo Go supports a different SDK, use a matching development build rather than changing dependencies piecemeal.

```sh
cd /workspace/88Games
npm ci
EXPO_NO_TELEMETRY=1 npm start
```

Open on a device with Expo Go, or use `npm run android` / `npm run ios` with an available emulator/simulator. For browser development: `EXPO_NO_TELEMETRY=1 npm run web`. The telemetry flag is useful in restricted cloud homes and does not affect app features. A development server needs a network connection to load code; a standalone release binary is the target for airplane-mode cold starts.

## Verify

```sh
npm test
npm run typecheck
EXPO_NO_TELEMETRY=1 npm run export:web
# In a separate terminal:
python3 -m http.server 8081 --directory dist
# With Chromium installed (override CHROMIUM_PATH if necessary):
npm run smoke
# Bundle all three platforms without native signing/build tools:
EXPO_NO_TELEMETRY=1 npx expo export --platform all --output-dir /tmp/88games-export
```

The engine tests exercise 100 full rounds, follow-suit and spade-leading restrictions, trump winners, nil, bags, contracts, dealer rotation, match thresholds, tie continuation, and malformed saves. The browser smoke test plays thirteen human tricks through the real UI, checks scoring, next round, persisted hand, reset cancellation, rules, corrupt-save recovery and a 320px layout. It uses a local server only; no public deployment is needed. Review screenshots are in `artifacts/`.

Validated on 2026-10-22: all 10 engine tests passed (including 100 simulated rounds), TypeScript passed, web/iOS/Android bundles exported, and the browser smoke suite passed. Verification results and platform limits are recorded in `PLAN.md`. Browser verification and platform bundle generation do **not** establish native device correctness. Native device checks still needed: airplane-mode standalone cold start, background/kill-and-resume, screen reader, touch sizing, and performance. This repository is an MVP, not a signed or store-published release.

## Rules and implementation

See [research and explicit house rules](docs/RESEARCH.md). Spades variants differ; this version has no blind nil, jokers, or extra first-trick restrictions. Failed nil tricks add bags but not contract progress or overtrick points. Bots are deliberately simple, not expert opponents.

`src/game/spades.js` is the pure transition engine; `App.tsx` contains the library, table, rules, animation and persistence. One versioned AsyncStorage key holds the latest match. Deleting application data removes it. The image and dependencies are local; no keys or secrets are needed.

Future games can be added after their own rules, UI and acceptance checks exist. No placeholder game is represented as playable.
