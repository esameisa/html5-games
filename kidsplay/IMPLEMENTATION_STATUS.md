# Implementation status

_Last updated: 2026-11-05_

## Summary

All six phases are implemented. The six games are fully playable offline with real mechanics, and the app has profiles, rewards, a parent dashboard, Arabic/English, local two-player modes, the content-pack system, and configured Android/iOS projects. **No APK or iOS build was produced in this environment** (see Limitations).

## Test results (actually executed in this session)

| Check | Command | Result |
| --- | --- | --- |
| Type check (app, node, tests) | `npx tsc -b` | ✅ no errors |
| Production build | `npm run build` | ✅ (Phaser is split into its own lazy chunk, ~319 KB gzip) |
| Unit and component tests | `npx vitest run` | ✅ **110 passed**, 13 files |
| Browser E2E (Chromium, Pixel 7 + iPad landscape profiles) | `npx playwright test` | ✅ **28 passed** (14 scenarios × 2 devices) |
| Capacitor | `npx cap add android`, `npx cap add ios`, `npx cap sync` | ✅ |
| Android Gradle build / APK | `./gradlew assembleDebug` | ⛔ not run: no Android SDK (download host blocked) |
| iOS build | Xcode | ⛔ not possible on Linux |

**Unit coverage:** game registry (including lazy-loading each game module); GameManager lifecycle (ordering, single active instance, cancelled launches, pause-excluded duration, stale results ignored, errors); memory matching and versus scoring; puzzle snapping and completion; flood fill, undo/redo and artwork save/reload/isolation; maze solvability of all 20 levels plus the solver itself; math answers (exactly one correct over thousands of generated questions, arithmetic correctness, versus pairs, adaptation, pack validation); recipe order validation, shelves and unlocks; rewards, levels, achievements and cosmetics; profile validation, isolation and cascading delete; progress never lowered; IndexedDB persistence across reopen; v1→v2 migration; content-pack schema, path and SVG screening; installer download, verify, activate, rollback on tampering, manifest hash mismatch, network failure, offline reload, and progress kept on uninstall; en/ar key parity for every namespace; RTL switching; navigation (onboarding, world, area, lobby, back, settings, party arena); parental gate.

**E2E coverage:** onboarding → memory game → stars saved and kept after reload; two-player memory; pause/resume/restart/exit; Arabic RTL; separate profile progress; parental gate, reminder setting and delete-all; puzzle drag & snap to completion; color fill/draw/save/gallery reopen; maze completed with the D-pad; math race completed; Mini Chef level completed; no third-party network requests; **offline play after the first visit** (service worker); parent downloads content packs, which then show up in the games.

## Implemented features

### Phase 1: Foundation
- React 19 + TypeScript + Vite 8 + Phaser 3.90 + Zustand + Dexie 4 + i18next; Capacitor 8 configuration
- Design system (`src/app/styles.css`): tokens, big touch targets, safe areas, animations, reduced-motion support
- i18n en/ar with RTL, type-checked parity, and per-game namespaces
- Versioned IndexedDB schema with migration, validation, quota errors, recovery screen, delete-all
- Profiles: up to 8, nickname only, avatar, age band, language
- Interactive world map: 5 animated floating islands, bridges, clouds, an avatar that hops between islands, portrait and landscape layouts, mirrored in RTL, star badges per island, a HUD with level/XP/stars/coins, shortcuts, settings and parents
- Game Registry plus lazy-loaded plugins

### Phase 2: Games (`src/games/*`)
1. **Memory Cards:** 6/12/20/30 cards, 6 themes in JSON, 3D flips, moves, optional timer, 3 hints, stars, progress for each theme × difficulty, 2-player turns
2. **Puzzle World:** 12 original images across 6 themes, 4–36 pieces depending on difficulty and age, drag & snap, peek, ghost preview, hints (auto-place for ages 4–6), sequential unlocks, pluggable `PieceShape` for future jigsaw tabs
3. **Color Splash:** 17 original templates across 7+ themes, tap-to-fill with edge bleed, brush in 4 sizes, eraser, 16-color palette, 16 stickers, undo/redo, clear, save to IndexedDB, gallery with reopen and delete, DPR-aware canvas resolution, pointer events for touch
4. **Maze Escape (Phaser):** 20 levels (1 handcrafted plus 19 deterministic generated ones, all checked by the solver in tests), keys and colored doors, stars, "collect all stars" exits on hard, grid-based collision, tween movement, squash idle animation, particles, D-pad with hold-to-repeat, swipe, keyboard, camera follow for big mazes, pause (sleeps the Phaser loop), clean `game.destroy(true)`
5. **Math Battle:** generated questions per age band (counting, number words, comparison, +/−, missing addend, ×, ÷, order of operations, brackets, fraction of a number, fraction addition), always 4 unique choices with exactly 1 correct, in-race adaptation, 50/50 hints with explanations, optional timer (7+), Arabic-Indic digits, 2-player turn-based race with same-kind questions and a clear 8-round rule, question packs
6. **Mini Chef:** 6 JSON recipes (pizza, burger, sandwich, fruit salad, pancakes, ice cream), 12 levels, recipes that unlock with announcements, drag-and-drop **or** tap, gentle rejection plus hints (easy/medium), a strict serve check and a recipe card that hides after 4 seconds (hard), optional timed challenge (never for ages 4–6 or on easy), animated customers

### Phase 3: Shared systems
- Rewards: stars (best per level, counted once), coins, XP and player levels; no purchases, ads or loot boxes
- 13 achievements and an achievements screen
- Avatar customization: 8 characters, 10 colors, 7 hats, 6 accessories, unlocked with earned coins and levels
- Parent dashboard behind a parental gate: profiles (edit, delete), progress per game, activity log with play time, playtime reminder, audio, language, content packs, privacy notes, storage estimate, delete all
- Local multiplayer: Party Arena (Memory, Math)

### Phase 4: Content system
- Manifest schema v1, remote index, semver compatibility, SHA-256 integrity, MIME/path/SVG screening, a validator for each type, staged install with atomic activation and rollback, offline cache in IndexedDB, update detection, uninstall
- `scripts/build-content-packs.mjs` plus 7 sample packs (including one deliberately incompatible) in `public/content/`

### Phase 5: Polish
- Synthesized offline audio (11 SFX plus a looping melody) with separate music/SFX toggles and volumes, unlocked by the first gesture, suspended in the background
- Confetti, star pops, island float, customer animations, card flips
- Accessibility: labelled buttons, ARIA switches and radio groups, focus outlines, reduced-motion support, tap alternatives to dragging
- Performance: code splitting per game, Phaser loaded only for the maze, sized canvases

### Phase 6: Release
- Capacitor Android and iOS (SPM) projects with ids, versions, generated icons and splash screens, signing via `keystore.properties`, backup disabled, AD_ID removed, en/ar localizations, encryption declaration
- Android back button and app background/foreground handling
- Web offline support through a generated service worker
- Docs: README, ARCHITECTURE, RELEASE (store checklists), PRIVACY_AND_SAFETY, CONTENT_PACKS, ADDING_A_GAME

## Known limitations and next steps

- **APK/AAB and IPA not built here.** The Android SDK download host is blocked by the environment's network policy, and iOS needs macOS and Xcode. Both projects are configured; run `./gradlew assembleDebug` and archive in Xcode on a suitable machine.
- No real-device testing yet (only emulated Chromium phone and tablet viewports). Recommended: Safari/WebKit testing, low-end Android performance checks, and checking emoji rendering on older Android.
- Card faces and ingredients use system emoji, so their exact look varies by OS. All other artwork is original SVG.
- The web content source defaults to the bundled sample `./content`. On iOS (`capacitor://` origin) a real HTTPS host must be configured via `VITE_CONTENT_BASE_URL`.
- Puzzle pieces are rectangular. Jigsaw tab shapes can be added through `PieceShape`.
- Background music is a synthesized loop. Recorded music could be added as bundled audio files.
