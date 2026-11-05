# Content packs

KidsPlay can download **new levels and media for the existing game engines** from any static HTTPS host. Packs are declarative: JSON data plus images or audio. They never contain executable code. New game *mechanics* must ship in a reviewed app update (see "Store policy" below).

## Supported types

| `type` | Consumed by | Level object |
| --- | --- | --- |
| `memory_cards` | Memory Cards | `{ id, title, icon, color, cards: [{ id, emoji? , image? , label? }] }` (≥3 cards; 15+ for Expert) |
| `puzzle_images` | Puzzle World | `{ id, title, theme, image }` (svg/png/jpg/webp) |
| `coloring_templates` | Color Splash | `{ id, title, theme, image }` (line art, transparent background) |
| `maze_layouts` | Maze Escape | `{ id, difficulty, title?, requireAllStars?, grid? \| generator? }`; grids must pass the solver |
| `math_questions` | Math Battle | `{ id, title, ageGroups, questions: [{ q: {en,ar}, answer, choices? }] }`; exactly one correct choice |
| `recipes` | Mini Chef | `{ id, emoji, name, unlockLevel, steps: [{ id, emoji, name }] }` |

A theme or cosmetic pack is a pack of one of these types with new art. The validator registry (`registerContentType`) makes it easy to add types for new games.

## Manifest (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "id": "ocean-puzzles",
  "version": "1.1.0",
  "type": "puzzle_images",
  "minAppVersion": "1.0.0",
  "maxAppVersion": "1.9.9",
  "title": { "en": "Ocean Puzzles", "ar": "ألغاز المحيط" },
  "description": { "en": "…", "ar": "…" },
  "languages": ["en", "ar"],
  "assets": [{ "path": "images/whale.svg", "sha256": "<hex>", "size": 1234, "mime": "image/svg+xml" }],
  "levels": [{ "id": "ocean-whale", "theme": "ocean", "title": { "en": "Happy Whale", "ar": "الحوت السعيد" }, "image": "images/whale.svg" }],
  "sizeBytes": 1234
}
```

The site index (`index.json`) lists every pack with `manifestUrl`, `manifestSha256`, `sizeBytes`, `minAppVersion` and `title`.

## Pipeline

1. Author the pack in `content-packs/src/<id>/pack.json` and put its assets next to it.
2. Run `npm run content:build`. The script computes every asset's size and SHA-256, writes the final manifests and `index.json` to `public/content/`, and rejects unsupported file types and unsafe SVGs.
3. Upload `public/content/` to an HTTPS static host such as S3 + CloudFront, GitHub Pages or Netlify.
4. Point the app at it, either at build time with `VITE_CONTENT_BASE_URL=https://cdn.example.com/kidsplay` or from the Parents area (Content tab).

## What the app does (`src/core/content-packs/installer.ts`)

1. **Check:** fetch `index.json` (only `https:`, or `http://localhost` in development) and validate it.
2. **Compare:** each pack is marked `not_installed`, `installed`, `update_available` or `incompatible` (`minAppVersion` is newer than the app).
3. **Download:** fetch the manifest and verify its SHA-256 against the index.
4. **Validate:** check schema version, id, semver, app compatibility, localized title, safe relative asset paths, allowed MIME types, that every referenced asset is declared, and the type-specific level validator (for example, maze solvability and exactly-one-correct math answers).
5. **Verify assets:** check each file's size and SHA-256. SVGs are screened for `<script>`, `on*=` handlers, `javascript:` and external references.
6. **Stage:** write the asset Blobs for the new version. The previous version stays active.
7. **Activate:** atomically swap the pack row to the new version, then delete the old version's assets.
8. **Roll back:** on any failure, the staged assets are deleted and the previous version keeps working.
9. **Offline:** installed packs load from IndexedDB at startup and their assets are served as `blob:` URLs.

Removing or updating a pack never touches saved progress, which lives in separate tables. Bundled content can't be removed, and a downloaded pack can't override it.

## Store policy

- Packs change **content only** (levels, images, questions, recipes) for engines already reviewed in the shipped binary. This matches Apple App Store Review Guideline 2.5.2 and Google Play's policy on downloading executable code. Both allow downloading data and media.
- No JavaScript, HTML or WASM is ever downloaded or evaluated. The installer rejects such files and the CSP (`script-src 'self'`) blocks them anyway.
- Ship a new **game** (new mechanics) by adding it to `src/games/` and releasing a reviewed app update.
- Parents reach downloads behind the parental gate. Internet access is used only for this.
