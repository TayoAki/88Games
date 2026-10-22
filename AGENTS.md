# Project conventions

Use the existing checkout; cloud tasks are already isolated. Do not create a Git worktree unless asked.

88 Games is an Expo SDK 55 React Native application. Keep SDK-compatible dependency versions and the npm lockfile. The game must remain usable offline with no backend or secret requirements.

Keep game rules in the pure `src/game/spades.js` engine, not duplicated in UI handlers. Bots must not inspect other players’ hands. Document house-rule changes in docs/RESEARCH.md and cover scoring/legality edge cases with engine tests.

Run `npm test`, `npm run typecheck`, and `EXPO_NO_TELEMETRY=1 npm run export:web` for changes. For flow/persistence changes also serve dist and run `npm run smoke` with Chromium. Native device verification is separate from browser checks. Keep PLAN.md accurate about observed evidence and remaining limits.

Never commit node_modules, dist, .expo, environment secrets or generated native build caches. Original source assets and selected review screenshots belong in Git.
