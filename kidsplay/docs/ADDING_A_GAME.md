# Adding a new game

1. **Create a folder** `src/games/<game-id>/` (the id is kebab-case) with:
   - `manifest.ts`: a `GameManifest` with area, icon, color, age range, difficulties, `supportsVersus`, `contentTypes`, `options`, and `load: () => import('./plugin')`
   - `plugin.ts`: `export default createReactGame({ id, name, minAge, maxAge }, Component)`, or a hand-written `GameFactory` (for example a pure Phaser game)
   - `i18n.ts`: `{ en: {...}, ar: {...} }`, used as `t('<game-id>:key')`. Include `rules` (and `rulesVs` for two-player) for the lobby.
   - your engine/logic in plain TypeScript modules, kept separate from the UI so it is unit-testable
   - optionally `content.ts` (a `LevelValidator`) and a bundled pack JSON
2. **Implement the lifecycle.** Respect `paused` (stop timers and loops), clean up in `destroy` (remove listeners, destroy Phaser games, revoke URLs), and call `ctx.reportResult({ levelId, score, stars, completed, winner?, stats? })` when a level ends.
3. **Use services only:** `ctx.services.audio | t | progress | content | storage`. Never import another game.
4. **Register** in `src/games/index.ts`:

   ```ts
   registry.register(myManifest);
   registerGameStrings('my-game', myStrings);
   registerContentType('my_levels', validateMyLevel);
   contentLibrary.registerBundled(myPack);
   ```

   The world map lists it automatically in its area. If `supportsVersus` is true it also appears in the Party Arena.
5. **Add the name and description** under `games.<id>` in `core/localization/en.ts` and `ar.ts`. The type system makes sure Arabic has the key.
6. **Test:** unit tests for the engine and validator under `tests/unit/`, plus a Playwright flow under `tests/e2e/`.
7. **Ship** in an app update. New mechanics are executable code, so they go through store review. New *levels* for the game can then be shipped as content packs.
