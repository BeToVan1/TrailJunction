# Trail Junction

Trail Junction helps hikers plan before they lose service, make sense of unfamiliar junctions, and remember what they saw along the way. The mobile-first web app was built for #BuildHybridAI 2026.

Search U.S. trails, preview routes, and download maps for offline use. Explore recommends trails based on saved maps and logged hikes. At a junction, photograph a sign, review its destinations and arrows, and highlight a matching place or branch on the saved map. The Rampart Ridge demo walks through that flow with a real National Park Service sign. The photo journal keeps hike notes, photos, and captions together and can sync across devices when you sign in.

Firebase AI Logic reads sign photos using Gemini Nano on compatible desktop Chrome once the model is downloaded. It falls back to cloud Gemini when the local model is unavailable and the device is online. On phones and tablets, AI sign reading requires internet access. Downloaded maps and manual sign entry work offline. The journal also uses cloud Gemini to suggest identifications and write short nature notes for photos of plants, fungi, and wildlife.

[Visit Trail Junction](https://trail-junction.web.app/)

## Run locally

Requires Node.js 24.12 or later. In the folder containing `package.json`, run:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The app runs without Firebase configuration. You can use trail search and the local journal, and enter sign text manually in the demo.

To test downloads and offline reopening, use the production preview:

```sh
npm run build
npm run preview
```

While online, download a trail or select **Download junction for offline use**. The download also caches the app. Disconnect, reload the preview, and reopen the map under **Saved**. You can also open the local journal offline after caching the app. Offline downloads require a production build.

### Enable Firebase AI Logic

1. Register a Firebase Web App, enable Firebase AI Logic with the Gemini Developer API, and configure [App Check with reCAPTCHA Enterprise](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider) for the hosted domain. Enable App Check enforcement for Firebase AI Logic.
2. Create `.env.local` alongside `package.json` by copying [`.env.example`](.env.example). In PowerShell, run `Copy-Item .env.example .env.local` if you don’t already have the file. Set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, and `VITE_FIREBASE_APP_CHECK_SITE_KEY` from your project. Git ignores `.env.local`, so each checkout needs its own copy. Restart Vite after changing it.
3. For cloud calls on the localhost dev server, set `VITE_FIREBASE_APP_CHECK_DEBUG=true` and register the browser’s debug token in Firebase. Follow the [Firebase debug provider guide](https://firebase.google.com/docs/app-check/web/debug-provider) and keep the token out of Git. Use the production App Check provider for Hosting.
4. To test on-device inference, follow the [Firebase Web hybrid setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) for desktop Chrome and prepare the model while connected.

The default cloud model is `gemini-3.5-flash-lite`, configurable through `VITE_FIREBASE_CLOUD_MODEL`.

### Enable journal accounts

In Firebase Authentication, enable Google and Email/Password. Create a Standard Cloud Firestore database in production mode and deploy the repository’s rules and indexes with `firebase deploy --only firestore --project YOUR_PROJECT_ID`. Set `VITE_FIREBASE_JOURNAL_ACCOUNTS=true` before starting Vite or building for Hosting. For same-domain Google redirects on Firebase Hosting, authorize the Hosting domain and its `/__/auth/handler` URL in the OAuth client. Set `VITE_FIREBASE_AUTH_DOMAIN` if you use a custom auth domain.

## Verify and deploy

- `npm test` runs the sign-reading, route matching, trail search, and recommendation tests.
- `npm run build` checks TypeScript and builds the app and service worker into `dist/`.
- For Hosting, run `npm run build:trail-index` before building to generate the public USGS trail-name and alias index. Search fetches matching trail geometry by ID and can query USGS directly if the index is unavailable. Regenerate the index when the source layer refreshes.
- Build with the target Firebase Web App configuration, then run `firebase deploy --only hosting --project YOUR_PROJECT_ID` from an authenticated Firebase CLI.

## Data and credits

- U.S. trail geometry comes from the [USGS National Digital Trails layer](https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/37). Downloads use [USGS Topo](https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer) or NPS park maps. Park filtering uses [NPS boundaries](https://irma.nps.gov/DataStore/Reference/Profile/2321443), and state and territory labels use [U.S. Census boundaries](https://www.census.gov/geographies/mapping-files/2024/geo/carto-boundary-file.html). Map services and data available from U.S. Geological Survey, National Geospatial Program.
- The bundled Yosemite downloads use the NPS maps for [Lower Yosemite Fall Trail](https://www.nps.gov/yose/planyourvisit/lowerfalltrail.htm) and [Cook’s Meadow Loop](https://www.nps.gov/yose/planyourvisit/cooksmeadowtrail.htm). The Pa’rus map overlays the [NPS Zion trail layer](https://services7.arcgis.com/2hYXmwteFLemN5bW/ArcGIS/rest/services/Zion_NPS_MAP_MC_WFL1/FeatureServer/23) on USGS Topo.
- Trail cards use NPS park photos where available or credited [Wikimedia Commons](https://commons.wikimedia.org/) photos marked **Nearby photo**. Cards show **No photo available** when there’s no suitable image.
- The Rampart Ridge demo uses a [public-domain NPS sign photo](https://npgallery.nps.gov/AssetDetail/cb80ba2c-e675-4fde-aef5-2c8989aab960) and USGS geometry, with branch connections checked against the NPS guides to [Rampart Ridge](https://www.nps.gov/mora/planyourvisit/rampart-ridge-trail.htm) and [Indian Henry’s Hunting Ground](https://www.nps.gov/mora/planyourvisit/indian-henrys-hunting-ground.htm). See also the [NPS Scout Lookout trail guide](https://www.nps.gov/thingstodo/hike-to-scout-lookout.htm).

## License

The app code is licensed under the [Apache License 2.0](LICENSE). The bundled [DM Sans font](public/licenses/dm-sans.txt) is under the SIL Open Font License. Map and photo credits are shown in the app. See the [NPS map reuse guidance](https://www.nps.gov/subjects/gisandmapping/data-sources-and-accuracy.htm).
