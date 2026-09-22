# Architecture and safety notes

## Layers

`src/App.tsx` is the mobile UI. `src/domain` contains entities and the timezone-safe `CycleCalculationService`. `src/application` contains export and sharing adapters. `src/storage/repository.ts` is the only persistence boundary.

## Local data and migrations

Data is stored as a versioned `CareData` document under one Capacitor Preferences key. Android uses SharedPreferences and iOS uses UserDefaults. Version `1` is the initial schema. Future versions must migrate the parsed document before it reaches UI code; ordinary updates must not wipe health data.

## Sharing

The sharing adapter prepares external composers only. WhatsApp uses its supported URL entry point when available; SMS and email invoke device composers; Messenger uses the system share sheet fallback. The service returns `opened`/`failed`, never `delivered`.

## Threat model and limitations

CareCycle avoids developer-operated health-data infrastructure. It cannot protect data from a person using an unlocked device, OS-level backups, malware, screenshots, exported files, or an external provider after sharing. Optional app lock settings are represented in the UI; a production native biometric plugin can be wired in without introducing a custom password system.

## Network and permissions audit

The source contains no `fetch`, axios, XMLHttpRequest, analytics SDK, telemetry, ad SDK, API key, backend, or authentication implementation. The Android project requests no contacts, location, camera, microphone, SMS-read, call-log, or storage permissions. External sharing is initiated only by the user.

## Release process

1. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
2. Run `npm run cap:sync`, build and test a debug Android APK, then test the signed release APK privately.
3. Review generated output and dependency advisories; never publish test health data, signing keys, or exported user data.
4. Tag `vX.Y.Z`, attach the APK, source archive, release notes, and checksums to a GitHub Release.
