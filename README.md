# CareCycle

**Track privately. Share safely. Get support.**

CareCycle is an offline-first menstrual cycle and wellbeing tracker for Android, with an iOS-compatible Capacitor project. It has no account system, no CareCycle cloud, no AI, no advertising, and no analytics. Health data stays on the user's device unless they deliberately export or share it.

## What it does

- Tracks periods, flow, symptoms, mood, energy, pain, and notes.
- Calculates personal cycle estimates from recorded period starts; estimates are always labeled as estimates.
- Shows a private calendar and deterministic, non-diagnostic insights.
- Stores up to five manually entered trusted people and prepares editable support messages for external apps.
- Exports local data as JSON or CSV and can permanently clear CareCycle's local data.

## Privacy architecture

CareCycle makes no network requests for application data. The local repository is implemented with Capacitor Preferences: Android SharedPreferences and iOS UserDefaults in native builds, with Capacitor's browser implementation for development. No secrets are collected or stored. See [PRIVACY.md](PRIVACY.md) and [docs/architecture.md](docs/architecture.md).

## Development

```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

## Android and iOS

```sh
npm run cap:sync
npm run cap:android   # opens Android Studio; use Build > Build APK(s)
npm run cap:ios       # opens Xcode on macOS
```

For release builds, configure signing locally in Android Studio or your secure CI secrets. Never commit a keystore or signing password.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). This project deliberately keeps dependencies and permissions minimal.

## License

MIT. See [LICENSE](LICENSE).
