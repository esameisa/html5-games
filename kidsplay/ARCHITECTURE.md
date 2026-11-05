# KidsPlay architecture

## Layout

```
kidsplay/
├── android/ ios/              Capacitor native projects (generated, customized: icons, splash, signing, privacy)
├── content-packs/src/         Source for downloadable packs (data + media only)
├── public/
│   ├── assets/puzzles|coloring  Original bundled SVG artwork
│   └── content/               Built static pack site (index.json + packs/*), sample "remote" host
├── scripts/                   Content build, art generators, native icon/splash generator
├── src/
│   ├── app/                   App shell: store (zustand), routing, lifecycle, service bundle
│   ├── core/
│   │   ├── game-engine/       GamePlugin contract, GameManager, React adapter, adaptive difficulty
│   │   ├── game-registry/     GameRegistry
│   │   ├── storage/           Dexie DB (versioned), repositories
│   │   ├── audio/             Web Audio synth (SFX + music), mute/volume, lifecycle aware
│   │   ├── rewards/           Stars/coins/XP/levels, achievements, cosmetics, result service
│   │   ├── content-packs/     Schema validation, library (bundled + installed), installer
│   │   └── localization/      i18next (en/ar), RTL handling, per-game namespaces
│   ├── features/              onboarding, profiles, world, play (lobby + game shell), achievements, settings, parents
│   ├── games/<id>/            One folder per game (manifest, plugin, engine, UI, strings, content validator, bundled pack)
│   └── shared/                UI components (Avatar, ParentalGate, Modal…), utils (seeded RNG, text)
└── tests/unit, tests/e2e
```

## The game plugin contract

`src/core/game-engine/types.ts`

```ts
interface GamePlugin { id; name; minAge; maxAge; preload(); mount(el); start(); pause(); resume(); destroy(); restart?() }
type GameFactory = (ctx: GameContext) => GamePlugin;
```

`GameContext` is everything a game is allowed to use:

- **configuration**: `profileId`, `ageGroup`, `locale`, `difficulty`, `mode` (`solo` | `versus`), `players`, `options` (toggles from the lobby)
- **services**: `audio`, `t` (translator bound to the game's i18n namespace), `progress` (live per-profile level progress plus game-owned `data`), `content` (active content items + asset URL resolution), `storage` (per-profile record collections such as artwork)
- **callbacks**: `reportResult(GameResultInput)` and `requestExit()`

Games never import each other. Each one depends only on `src/core` and `src/shared`.

`GameManifest` holds the static metadata: area, icon, age range, difficulties, versus support, the content types it consumes, lobby options, and `load: () => import('./plugin')`. Game code is therefore lazy-loaded, so Phaser (about 1.2 MB) is only downloaded or parsed when Maze Escape opens.

`createReactGame(meta, Component)` adapts a React component to the contract. Five games use it. Maze Escape uses it too and creates a Phaser game inside its component, sleeping the Phaser loop on pause and calling `game.destroy(true)` on unmount.

## Game registry

`src/games/index.ts` registers each game's manifest, i18n strings, content-type validator and bundled content pack. The world map asks the registry for games by area (`byArea`, where `party` means "supports versus") and by age suitability. To add a game, see `docs/ADDING_A_GAME.md`.

## Game manager

`src/core/game-engine/GameManager.ts` owns one game instance at a time:

- `launch()` destroys any previous instance, then runs load → preload → mount → start. A launch token cancels stale async launches, so a slow load that finishes after the child has left never starts.
- `pause()` and `resume()` are idempotent and track paused time.
- `restart()` uses the plugin's `restart()` when it has one, otherwise remounts.
- `destroy()` is idempotent and clears the container.
- It standardizes `GameResult` (`gameId`, `profileId`, `levelId`, `score`, `stars` clamped 0–3, `completed`, `durationSeconds` excluding pauses, `playedAt`, plus `mode`, `difficulty`, `winner`, `stats`).
- Results from a destroyed or superseded instance are ignored.

The game shell (`features/play/GamePage.tsx`) passes results to `rewards/service.applyResult`. That function stores the history, merges level progress (never lowering earlier stars or completion), grants rewards, evaluates achievements and updates the live progress handle so the game's level select refreshes. The shell also auto-pauses on app background and handles the Android back button.

## Storage (IndexedDB via Dexie)

`src/core/storage/db.ts` uses a versioned schema. v1 is the initial schema. v2 adds a compound index and a migration that backfills profile fields; a test covers it.

| Table | Content |
| --- | --- |
| `profiles` | nickname, avatar, age group, locale, stars/coins/xp, unlocked cosmetics |
| `progress` | `${profileId}:${gameId}` → per-level stars/score/completion/plays + game data |
| `results` | game history (per profile) |
| `achievements` | unlocked achievements per profile |
| `records` | per-profile, per-game collections (artwork) |
| `packs`, `packAssets` | installed content packs (manifest + blobs per version) |
| `settings` | app settings (audio, reminder, content source, active profile) |

Repositories validate input (nickname sanitizing, enum checks) and map quota errors to `StorageError('quota')`. Deleting a profile cascades to all of its rows in one transaction. If the database fails to open, the app shows a reset screen instead of crashing. Parents can delete all data, and the app asks for persistent storage on a best-effort basis. `localStorage` holds only the language preference for the splash screen.

## Content system

See `docs/CONTENT_PACKS.md`. The main ideas:

- **Bundled packs.** Each game ships its content as a pack, so the same validation and code path serve bundled and downloaded content. Bundled packs cannot be shadowed or removed.
- **Installed packs.** These are validated JSON with SHA-256-verified assets, stored as Blobs in IndexedDB and served through `blob:` URLs. They work offline.
- **Types.** A game registers a validator for each content type it consumes, so each game owns its data format.
- **No code.** Assets are limited to images, audio and JSON. SVGs are screened for scripts and event handlers.

## Localization

i18next has the shared strings in `core/localization/{en,ar}.ts`, which are type-checked so Arabic can't miss a key. Each game registers its own namespace (for example `memory-cards:chooseTheme`). `setLocale()` sets `<html lang dir>`, and the layout uses logical CSS properties. The world map mirrors in RTL, and Math Battle shows Arabic-Indic digits in Arabic.

## Audio

Every sound and the background music are synthesized with the Web Audio API, so the bundle has no audio files and nothing needs downloading. The AudioContext is created or resumed on the first user gesture (mobile autoplay policies) and suspended when the app goes to the background. Music and SFX each have separate toggles and volume controls.

## Offline

- **Native:** every file ships in the app bundle.
- **Web:** a build plugin in `vite.config.ts` generates `sw.js` with a precache list of all built and public files. After the first visit the app reloads and plays offline (covered by an E2E test). The sample remote content under `public/content/` is never precached.
