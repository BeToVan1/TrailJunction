# Trail Junction

Trail Junction is a mobile-first web app for #BuildHybridAI 2026. Search for a trail or park, download a map from the results, and reopen it from **Saved** when you lose service.

**Sign demo** opens Fern Fork on the fictional Fern Creek Loop. Choose Trailhead or Cedar Spur and select **Read sample sign**. The app reads the staged photo, matches the selected destination to the known junction, and highlights its branch. The full demo map includes five checkpoints and sample photos for junction matching and route recovery.

The initial catalog includes [Lower Yosemite Fall Trail](https://www.nps.gov/yose/planyourvisit/lowerfalltrail.htm), [Cook’s Meadow Loop](https://www.nps.gov/yose/planyourvisit/cooksmeadowtrail.htm), and [Pa’rus Trail](https://www.nps.gov/thingstodo/hike-pa-rus-trail.htm). The Yosemite downloads use the complete NPS maps from the park’s trail pages. The Pa’rus route outline uses the nine features named Pa’rus Trail from the [Zion trail layer](https://services7.arcgis.com/2hYXmwteFLemN5bW/ArcGIS/rest/services/Zion_NPS_MAP_MC_WFL1/FeatureServer/23). The real trail maps are for offline reference. Sign guidance is available on the fictional demo where the sign and branch connections are mapped.

## Run the app

Requires Node.js 24.12 or later.

```sh
npm ci
npm run dev
```

Without Firebase configuration, the demo uses a supplied transcription labeled **Sample result** and runs the real matching logic. The Fern Fork demo also uses that transcription if the AI request fails, takes too long, or misses either destination.

To verify offline reopening, run `npm run build` and `npm run preview`. Search for a park, download a trail, and wait for **Saved offline**. Disconnect, reload the app, and open the map under **Saved**. The full demo map has its own **Save for offline use** action, which also keeps the last confirmed demo checkpoint.

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

[Apache License 2.0](LICENSE) covers the app code. The bundled [DM Sans font](public/licenses/dm-sans.txt) is under the SIL Open Font License. The trail maps and route lines are attributed to the National Park Service. See [NPS map sources and reuse](https://www.nps.gov/subjects/gisandmapping/data-sources-and-accuracy.htm).
