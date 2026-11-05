# Release guide

## Identifiers

| | Value |
| --- | --- |
| App name | KidsPlay |
| Android `applicationId` / namespace | `com.kidsplay.app` |
| iOS bundle identifier | `com.kidsplay.app` |
| Version | 1.0.0 (Android `versionCode 1`, iOS `MARKETING_VERSION 1.0.0`) |
| Android minSdk / iOS deployment target | 24 / 15.0 |

Change these before the first submission if you own a different domain. Update them in `capacitor.config.ts`, `android/app/build.gradle` and the Xcode target.

## Build pipeline

```bash
cd kidsplay
npm ci
npm test && npm run build && npm run test:e2e
npx cap sync               # copies dist/ and native plugin code into android/ and ios/
```

Icons and splash screens come from `public/icon.svg`. Regenerate them with `node scripts/generate-native-assets.mjs`.

### Android (Android Studio or CLI)

Requirements: JDK 21 and the Android SDK (platform matching `compileSdkVersion` in `android/variables.gradle`).

```bash
cd android
./gradlew assembleDebug                 # app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease                 # app/build/outputs/bundle/release/app-release.aab (Play Store)
```

**Signing.** Create an upload key, then add `android/keystore.properties`. It is git-ignored; never commit it.

```bash
keytool -genkeypair -v -keystore kidsplay-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

```properties
storeFile=/absolute/path/kidsplay-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

`app/build.gradle` picks this file up automatically for `release` builds. Enroll in **Play App Signing** so Google holds the app signing key and you keep only the upload key.

What is already configured:

- `android:allowBackup="false"` and data-extraction rules, so children's data never leaves the device.
- Only the `INTERNET` permission, used solely for optional content packs. The AD_ID permission is explicitly removed.
- `supportsRtl="true"` for Arabic.
- Splash/launch theme and adaptive icon with a `#7EC8FF` background.
- Both orientations supported. Every screen has portrait and landscape layouts.

### iOS (macOS + Xcode)

```bash
npx cap open ios
```

1. In Xcode select the **App** target, then **Signing & Capabilities**, and choose your Team. Automatic signing works for development.
2. Product → Archive → Distribute App → App Store Connect.
3. Dependencies use Swift Package Manager (`ios/App/CapApp-SPM`), so no CocoaPods are needed.

What is already configured in `Info.plist`: `ITSAppUsesNonExemptEncryption = false` (the app uses only standard HTTPS), the en/ar localizations, and all orientations. The status bar overlays the web view, and safe areas are handled in CSS with `env(safe-area-inset-*)`.

## Store compliance checklist

Store approval is **not guaranteed**. Review the current policies before every submission.

### Google Play: Families

- [ ] Target audience in Play Console set to ages 5 and under, 6–8, and 9–12. This opts into the [Families policy](https://support.google.com/googleplay/android-developer/answer/9893335).
- [ ] Data safety form: **no data collected, no data shared**. Everything is stored on the device. Optional HTTPS content downloads send no identifiers.
- [ ] No ads SDK, no analytics SDK, no advertising ID (already removed from the manifest).
- [ ] Content rating questionnaire (IARC) completed.
- [ ] Privacy policy URL. Adapt `PRIVACY_AND_SAFETY.md` into a public page.
- [ ] Teacher Approved program (optional).

### Apple App Store: Kids Category

- [ ] Primary category Kids, with age band 5 and under, 6–8, or 9–11.
- [ ] Guideline 1.3 / 5.1.4: no third-party analytics or ads (none included); parental gate before external links and purchases. KidsPlay has no purchases. The parents area, external links and downloads are gated.
- [ ] App Privacy "nutrition label": **Data Not Collected**.
- [ ] Guideline 2.5.2: downloaded packs are data and media only, with no executable code (see `docs/CONTENT_PACKS.md`).
- [ ] Privacy policy URL.

### Both

- [ ] Test on a small phone, a large phone and a tablet, in both orientations and both languages.
- [ ] Test airplane mode. All six games work without a network.
- [ ] Test background/foreground: games pause and audio stops.
- [ ] Android back button: on a game it pauses (press again to exit), elsewhere it navigates back, and on the world map it minimizes.

## This environment's limitations

The project was built and tested in a Linux container with Node 22, Java 21 and Gradle, but **no Android SDK**. The SDK download host (`dl.google.com`) is blocked by the network policy, and there is no macOS/Xcode.

- `npx cap add android` / `npx cap add ios` / `npx cap sync` ran successfully, and both native projects are committed.
- **No APK/AAB was produced here.** Run `./gradlew assembleDebug` on a machine with the Android SDK.
- **No iOS build was produced here.** iOS builds and signing need macOS, Xcode and an Apple Developer account.
