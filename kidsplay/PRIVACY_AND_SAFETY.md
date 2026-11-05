# Child safety and privacy

KidsPlay is designed for children aged 4–12. Under this design no personal data is collected, nothing leaves the device by default, and there is nothing to buy.

## What is stored, and where

| Data | Where | Notes |
| --- | --- | --- |
| Child profile: nickname, avatar choices, age band (4–6 / 7–9 / 10–12), language | IndexedDB on the device | No real names, birthdays, photos, email or location. Nicknames are sanitized and limited to 16 characters. |
| Game progress, history, stars/coins/XP, achievements | IndexedDB | Kept separately for each profile. |
| Drawings | IndexedDB (PNG data) | Only stored for the profile that made them. |
| Downloaded content packs | IndexedDB (Blobs) | Data and media only. |
| Settings: audio, playtime reminder, content source | IndexedDB | |
| Language preference for the splash screen | localStorage | Not sensitive. |

There are no accounts, logins, servers, cloud databases, analytics, crash reporters, advertising SDKs or advertising identifiers. On Android, `allowBackup="false"` and the data-extraction rules keep children's data out of cloud backups and device transfer.

## Network use

- The app makes **no network requests** during normal play. An E2E test checks that no third-party requests are made.
- The only network feature is **optional content packs**. A parent starts the download from the Parents area, behind the parental gate. Requests go to the configured HTTPS static host, send no credentials or identifiers (`credentials: 'omit'`), and contain only data and media, which are validated and hash-checked before use.
- Content Security Policy: `script-src 'self'`. Downloaded files cannot run code.

## Parental gate

The Parents area (profiles, activity, reminders, audio, language, downloads, data deletion) sits behind a gate that asks for a two-digit × one-digit multiplication answer on an on-screen keypad. The same gate must be used before any external link, should one ever be added.

## Healthy play

- No ads, loot boxes, real-money purchases, streak pressure, energy timers or push notifications.
- Coins are earned only by playing and spent only on cosmetics.
- Stars count once per level, so replaying gives a few coins but nothing to grind.
- Parents can set an optional **playtime reminder** (15–60 min) that shows a friendly "time for a break" screen.
- Mistakes are met with gentle feedback and hints. The youngest players never get timers, and timed challenges are opt-in for older children.
- "Two-player" means two children on **one device**. There is no online multiplayer, chat or public content.

## Parental controls and data deletion

- View each child's progress and recent activity, including play time.
- Rename a profile or change its age band and language. Delete a profile, which removes all of its progress, drawings, history and achievements.
- Turn music and sound effects on or off and adjust volume.
- Manage downloaded packs (install, update, remove).
- **Delete all local data** wipes the whole database and resets the app to first launch.

## Permissions

- Android: `INTERNET` only, used for optional content packs. AD_ID is explicitly removed.
- iOS: no permission prompts at all. The app never touches the camera, microphone, photos, contacts, location or tracking.

## Before release

Review the current COPPA (US), GDPR-K / UK Age Appropriate Design Code, Google Play Families and Apple Kids Category requirements. Then publish a privacy policy based on this document. See `RELEASE.md` for the checklists.
