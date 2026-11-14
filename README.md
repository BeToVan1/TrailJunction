# Trail Junction

Trail Junction is a mobile-first web app for #BuildHybridAI 2026. From the homepage, select **Open trail app**, search for a U.S. trail such as **Angels Landing**, download a map, and reopen it from **Saved** when you lose service.

Trail search uses the [USGS National Digital Trails layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/37). Search by trail name, by national park (for example, **Zion**), or by both (**Bear Lake, Rocky Mountain**). Park searches query a smaller area and filter trails using generalized [National Park Service boundaries](https://irma.nps.gov/DataStore/Reference/Profile/2321443). Each park photo links to its source. Trails without a matching photo use a text card. The app groups nearby connected segments with the same name and saves the selected geometry and a USGS Topo image on the device. For trails outside matched national parks, locations use state or territory labels derived from the [2024 Census cartographic boundaries](https://www.census.gov/geographies/mapping-files/2024/geo/carto-boundary-file.html). Distances refer to mapped segments and may omit approaches that have a different name.

On any saved trail, choose **Choose photo**, or use **Take sign photo** on a phone or tablet, then select **Read sign**. The result shows readable labels and their visible arrows. The saved map provides context, but it does not identify your junction or plot a route from the photo. Captured sign photos are held for the current reading; downloaded maps remain in **Saved**.

Open **Journal → Log a hike**, or choose **Log this hike** from a saved map to fill in the trail name and area. Record the date, add notes, and use the photo book to take or choose photos and write captions. Turn one page on mobile or a two-page spread on desktop. Hikes and photos work offline after the app is cached. Sign in with Google or a verified email address to sync them across devices. **Copy hikes from this device** adds existing device entries to the account journal. **Ask Gemini about this photo** sends the selected image to Firebase AI Logic when you’re online and saves the suggested nature note with that photo for offline viewing.

**Try sign demo** opens a walkthrough at Fern Fork on the fictional Fern Creek Loop. Take a simulated photo of the sign, then enter **Rocky Point** or **Sloan Lake**. The app combines the sign's arrows with the downloaded demo map to show a route via **Trailhead** or **Cedar Spur**. **Open full demo map** shows both branches in the context of the loop and supports photo uploads, junction matching, and route recovery.

The initial catalog includes [Lower Yosemite Fall Trail](https://www.nps.gov/yose/planyourvisit/lowerfalltrail.htm), [Cook’s Meadow Loop](https://www.nps.gov/yose/planyourvisit/cooksmeadowtrail.htm), and [Pa’rus Trail](https://www.nps.gov/thingstodo/hike-pa-rus-trail.htm). The Yosemite downloads use the NPS maps from the park’s trail pages. The Pa’rus map overlays the nine features named Pa’rus Trail from the [Zion trail layer](https://services7.arcgis.com/2hYXmwteFLemN5bW/ArcGIS/rest/services/Zion_NPS_MAP_MC_WFL1/FeatureServer/23) on a [USGS Topo basemap](https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer). Map services and data available from U.S. Geological Survey, National Geospatial Program. The real trail maps are for offline reference. Sign guidance is available on the fictional demo where the sign and branch connections are mapped.

## Run the app

Requires Node.js 24.12 or later.

```sh
npm ci
npm run dev
```

Without Firebase configuration, the demo uses a saved reading labeled **Sample result** and runs the route matching logic. Fern Fork also uses the saved reading if AI fails, times out, or returns arrows that do not match the staged sign.

To verify offline reopening, run `npm run build` and `npm run preview`. Search for a park, download a trail, and wait for **Saved offline**. Disconnect, reload the app, and open the map under **Saved**. The full demo map has its own **Save for offline use** action, which also keeps the last confirmed demo checkpoint.

## Connect Firebase AI Logic

1. Register a web app in a Firebase project. Enable Firebase AI Logic with the Gemini Developer API and enforce App Check.
2. Configure the [reCAPTCHA Enterprise provider](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider) for the app's hosted domain.
3. Copy `.env.example` to `.env.local` and fill in the Web App's `apiKey`, `projectId`, `appId`, and public App Check site key. The default cloud model is Gemini 3.5 Flash-Lite.
4. For localhost in the Vite dev server, set `VITE_FIREBASE_APP_CHECK_DEBUG=true` and register the browser's debug token in your Firebase console. Follow the [Firebase debug provider guide](https://firebase.google.com/docs/app-check/web/debug-provider). Keep the debug token out of the repository.
5. On compatible desktop Chrome, follow the [Web hybrid setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started), select **Prepare offline AI**, and let Gemini Nano finish downloading. For the hosted build, keep App Check enabled and use the production provider.

The Firebase AI Logic Web SDK uses `PREFER_ON_DEVICE` to read sign text and arrows from a photo. The SDK can use cloud Gemini when the local model is unavailable and the device is online. The result shows the inference source reported by Firebase. In the full demo map, the app checks the returned labels against known junctions and asks for confirmation before moving the map pin. Routes come from the saved trail connections.

Use a compatible desktop Chrome setup to test offline AI. An iPhone can supply the demo photos and can open the responsive web app. The standard iPhone 15 does not run this Web SDK's on-device model.

## Verify and deploy

- `npm test` runs the matching, navigation, and model-response tests.
- `npm run build` type-checks the app and builds the offline web app into `dist/`.
- Run `npm run build:trail-index` before building for Hosting to generate the public USGS name index. It indexes the current national layer by trail name and aliases, and the app requests matching trail geometry by ID. Regenerate the index when the source layer refreshes. The app can query USGS directly when the index is unavailable.
- To publish with Firebase Hosting, build with the registered Web App configuration and run `firebase deploy --only hosting --project YOUR_PROJECT_ID` from an authenticated Firebase CLI.

To enable journal accounts, enable Google and Email/Password in Firebase Authentication and create a Standard Cloud Firestore database in production mode. Deploy the rules and index settings with `firebase deploy --only firestore --project YOUR_PROJECT_ID`. Set `VITE_FIREBASE_JOURNAL_ACCOUNTS=true` in the Hosting build. For same-domain Google redirects on Firebase Hosting, authorize the Hosting domain and its `/__/auth/handler` URL in the OAuth client. Set `VITE_FIREBASE_AUTH_DOMAIN` if you use a custom Hosting domain.

## License

[Apache License 2.0](LICENSE) covers the app code. The bundled [DM Sans font](public/licenses/dm-sans.txt) is under the SIL Open Font License. The trail maps and route lines are attributed to the National Park Service. See [NPS map sources and reuse](https://www.nps.gov/subjects/gisandmapping/data-sources-and-accuracy.htm).
