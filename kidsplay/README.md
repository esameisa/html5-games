# KidsPlay

An offline-first gaming world for children aged 4–12. It's a React + TypeScript + Vite app with Phaser 3, packaged for Android and iOS with Capacitor.

Children make a cartoon character, explore a floating-island world map and play six bundled games. They earn stars, coins, XP and achievements, and spend coins (never real money) on cosmetics. Two games also have a two-player mode on one device. Everything is stored on the device in IndexedDB. There are no accounts, ads or tracking, and there is no backend.

| Area | Game | Highlights |
| --- | --- | --- |
| 🎨 Creative Island | **Color Splash** | 17 line-art templates, tap-to-fill (scanline flood fill), brush, eraser, stickers, undo/redo, gallery saved per profile, HiDPI canvas |
| 🧠 Brain Academy | **Memory Cards** | 6/12/20/30 cards, 6 themes, flip animations, hints, optional timer, 2-player turns |
| 🧠 Brain Academy | **Puzzle World** | 4–36 pieces, drag & snap, peek and ghost preview, hints, 6 themes, pluggable piece shapes |
| 🧠 Brain Academy | **Math Battle** | Questions generated for each age group (counting → fractions), exactly one correct answer, adaptive difficulty, hints, optional timer, 2-player race |
| 🌿 Adventure Jungle | **Maze Escape** (Phaser) | 20 checked-solvable levels, keys/doors, stars, D-pad + swipe + keyboard, camera follow |
| 🍳 Cooking Village | **Mini Chef** | 6 JSON recipes, ordered assembly, drag-and-drop or tap, 12 levels, unlockable recipes, optional timed mode (never for ages 4–6) |
| 🎈 Party Arena | Two-player modes | Memory Cards and Math Battle on one device |

## Quick start

```bash
cd kidsplay
npm install
npm run dev            # http://localhost:5173
npm test               # unit/component tests (Vitest + RTL)
npm run build          # type-check + production build into dist/
npm run test:e2e       # Playwright (builds must exist: run `npm run build` first)
```

### Mobile

```bash
npm run build
npx cap sync           # copy dist/ + plugins into android/ and ios/
npx cap open android   # Android Studio
npx cap open ios       # Xcode (macOS only)
```

See [RELEASE.md](RELEASE.md) for signing, store submission and the limits of this environment.

### Content packs

```bash
npm run content:build  # content-packs/src/* → public/content/ (index.json + hashed manifests)
```

Packs contain data and media only. Upload `public/content/` to any HTTPS static host and set `VITE_CONTENT_BASE_URL` (or enter the URL in the Parents area). See [docs/CONTENT_PACKS.md](docs/CONTENT_PACKS.md).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b` + Vite production build (adds an offline service worker for the web build) |
| `npm run preview` | Serve `dist/` |
| `npm test` | Vitest unit and component tests |
| `npm run test:e2e` | Playwright browser tests (phone and tablet profiles) |
| `npm run content:build` | Build the static content-pack site |
| `npm run cap:sync` | Build, then `npx cap sync` |
| `node scripts/generate-native-assets.mjs` | Regenerate the Android/iOS icons and splash screens from `public/icon.svg` |
| `python3 scripts/gen-puzzle-art.py`, `scripts/gen-coloring-art.py` | Regenerate the original bundled artwork |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): plugin contract, registry, game manager, storage, content system
- [docs/CONTENT_PACKS.md](docs/CONTENT_PACKS.md): pack format, validation and hosting
- [docs/ADDING_A_GAME.md](docs/ADDING_A_GAME.md): how to add a seventh game
- [RELEASE.md](RELEASE.md): Android/iOS build, signing and store checklists
- [PRIVACY_AND_SAFETY.md](PRIVACY_AND_SAFETY.md): child safety and privacy design
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md): what is done, test results and known limitations
