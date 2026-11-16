# Trail Junction

Trail Junction is a mobile-first web app for #BuildHybridAI 2026. Find a U.S. trail, download its map before you lose service, read signs along the way, and keep a photo journal of your hikes.

[Homepage](https://trail-junction.web.app/) · [Open trail app](https://trail-junction.web.app/app) · [Try the Rampart Ridge sign demo](https://trail-junction.web.app/junction/rampart-ridge) · [Apache 2.0 license](LICENSE)

## Explore and save trails

- **Search by trail name, national park, or both.** Try `Zion` or `Angels Landing, Zion`. Results rank by name match, with routes from official Zion and Yosemite guides used to break ties before alphabetical ordering. Coverage depends on the USGS trail dataset.
- **Open a trail card for details.** See a route preview and mapped distance. The bundled trail guides also include elevation gain, route type, difficulty, typical time, and access information. USGS results show reported surface, uses, and source agency when available. Mapped distance covers the displayed segments, so the full hike may be longer.
- **Download before you go.** Select **Download** on a trail card or **Download offline map** on its details page. Reopen the map from **Saved**, even without service. Downloads stay in the browser on the device that saved them.
- **Find your next hike.** Explore starts with Lower Yosemite Fall Trail, Pa’rus Trail, and Scout Lookout Junction. Below them, **Recommended trails** suggests up to three other trails based on your saved maps and journal entries that match a known park or trail. It skips trails you’ve already saved or logged and the trails shown in Featured. To try it, download Pa’rus Trail or log a hike with Yosemite as the park, then return to Explore.

## Read trail signs

**Try the guided demo.** Open [Rampart Ridge Junction](https://trail-junction.web.app/junction/rampart-ridge) in Mount Rainier National Park. Choose Longmire or Devil’s Dream Camp, then select **Open sample camera → Take photo → Read sign**. The simulated camera uses a real NPS sign photo. Check or edit the labels and arrows, then select **Use this reading** to highlight the matching route from the junction. You can also choose a marked branch manually. Select **Download junction for offline use** to save the map and sample photo.

**Use your own photo.** Open a downloaded map under **Saved** and select **Choose photo** or **Take sign photo** on mobile. After **Read sign**, review the text and arrows and use **On your saved map** to highlight a match. A regular trail map can highlight the named trail, and the Pa’rus map can mark Pa’rus Trailhead or Canyon Junction. To test two distinct branches, download **Scout Lookout Junction** in Zion and use the [Scout Lookout sign photo](https://images.squarespace-cdn.com/content/v1/5fb02f697f71d5494d18ccfc/a3e3feb9-b7c9-4d24-842b-d2001f27b2fd/Scout%2BLookout%2BSign%2Bat%2BAngels%2BLanding.jpg). Include the Scout Lookout heading and both arrows to compare the West Rim Trail and Angels Landing branches. If a sign names places outside the saved map, the app returns the reading and explains that it found no match. The photo alone cannot confirm your position.

**Offline AI.** Firebase AI Logic prefers Gemini Nano on compatible desktop Chrome. While connected, select **Prepare offline AI** and wait for **Offline AI ready on this device** before trying to read a sign offline. When the local model is unavailable and you’re online, the app can use cloud Gemini. The reading shows **On-device** or **Cloud** when Firebase reports the source. On phones and tablets, including iPhones, AI sign reading requires internet access. Downloaded maps and manual sign entry still work offline.

## Keep a trail journal

- Open **Journal** to log a hike, or choose **Log this hike** from a saved map to fill in the trail name and area. Add a date, notes, and photos.
- Turn the photo book pages with the arrows or by dragging a page corner. The layout shows one page on phones and a two-page spread on wider screens. Open a photo to enlarge or crop it, and add or edit its caption from the page.
- Choose **Ask Gemini about this photo** online to send the selected photo to Firebase AI Logic for a possible plant, fungus, or wildlife identification and a short nature note. The saved note stays with the photo for offline viewing.
- Journal entries and photos are saved on the device. On the hosted app, sign in with Google or a verified email and password to sync your account journal across devices. Use **Copy hikes from this device** to add existing entries to your account. Once the app is cached, you can open and edit locally saved hikes offline. Account changes sync when you reconnect and open **Journal**.

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

Sign reading uses `PREFER_ON_DEVICE` online and `ONLY_ON_DEVICE` offline. Journal nature notes use `ONLY_IN_CLOUD`. The default cloud model is `gemini-3.5-flash-lite`, configurable through `VITE_FIREBASE_CLOUD_MODEL`.

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
