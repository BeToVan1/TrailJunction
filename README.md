# Trail Junction

Trail Junction is a mobile-first web app for #BuildHybridAI 2026. A hiker can use a photo of a marked junction to find their place on a downloaded route. Once they confirm the junction, the app can highlight a marked path back to the planned loop.

The included Fern Creek Loop is a fictional route with five checkpoints and three staged signs. It lets you try an on-route match, a wrong-turn recovery, and an ambiguous sign.

## Run the app

Requires Node.js 24.12 or later.

```sh
npm ci
npm run dev
```

Without Firebase configuration, choose a demo photo and select **Show sample result**. The app labels the supplied transcription as **Sample result** and runs the real matcher and recovery logic.

To verify offline reopening, run `npm run build` and `npm run preview`. Open the preview URL in desktop Chrome, select **Save for offline use**, and wait for **Saved for offline use**. Confirm a junction, disconnect, then reopen the same URL. The saved route, last confirmed checkpoint, and demo photos are available offline.

## Connect Firebase AI Logic

1. Register a web app in a Firebase project. Enable Firebase AI Logic with the Gemini Developer API and enforce App Check.
2. Configure the [reCAPTCHA Enterprise provider](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider) for the app's hosted domain.
3. Copy `.env.example` to `.env.local` and fill in the Web App's `apiKey`, `projectId`, `appId`, and public App Check site key. The default cloud model is Gemini 3.5 Flash-Lite.
4. For localhost in the Vite dev server, set `VITE_FIREBASE_APP_CHECK_DEBUG=true` and register the browser's debug token in your Firebase console. Follow the [Firebase debug provider guide](https://firebase.google.com/docs/app-check/web/debug-provider). Keep the debug token out of the repository.
5. On compatible desktop Chrome, follow the [Web hybrid setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started), select **Prepare offline AI**, and let Gemini Nano finish downloading. For the hosted build, keep App Check enabled and use the production provider.

The Firebase AI Logic Web SDK uses `PREFER_ON_DEVICE` to read sign text from a photo. The SDK can use cloud Gemini when the local model is unavailable and the device is online. The result card shows the inference source reported by Firebase. The app checks the returned labels against known junctions and asks for confirmation before moving the map pin. Route directions come from the saved trail connections.

Use a compatible desktop Chrome setup to test offline AI. An iPhone can supply the demo photos and can open the responsive web app. The standard iPhone 15 does not run this Web SDK's on-device model.

## Verify and deploy

- `npm test` runs the matching, navigation, and model-response tests.
- `npm run build` type-checks the app and builds the offline web app into `dist/`.
- To publish with Firebase Hosting, build with the registered Web App configuration and run `firebase deploy --only hosting --project YOUR_PROJECT_ID` from an authenticated Firebase CLI.

## License

[Apache License 2.0](LICENSE). The bundled [DM Sans font](public/licenses/dm-sans.txt) is under the SIL Open Font License.
