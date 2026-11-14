import { get, set, update } from "idb-keyval";
import { rampartBasemap, rampartPhoto } from "./rampart-junction.ts";
import type { TrailMapData } from "./trail-catalog.ts";

const savedMapsKey = "trail-junction/saved-maps";
const savedRampartKey = "trail-junction/rampart-junction-v1";

export async function isRampartSaved() {
  return (await get<boolean>(savedRampartKey)) === true;
}

export async function saveRampart() {
  await prepareOfflineApp();
  const files = await Promise.all([rampartBasemap, rampartPhoto].map((asset) => caches.match(asset, { ignoreSearch: true })));
  if (files.some((file) => !file?.ok)) throw new Error("The junction files aren’t cached yet.");
  await set(savedRampartKey, true);
}

export async function getSavedMaps() {
  return (await get<Record<string, TrailMapData>>(savedMapsKey)) ?? {};
}

export async function saveTrailMap(map: TrailMapData) {
  await prepareOfflineApp();
  await update<Record<string, TrailMapData>>(savedMapsKey, (saved) => ({
    ...saved,
    [map.id]: map,
  }));
}

export async function prepareOfflineApp() {
  if (!import.meta.env.PROD) {
    throw new Error("Use the production preview to test offline downloads.");
  }
  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser cannot save the app for offline use.");
  }

  const registration = await navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}sw.js`,
  );
  await waitForActiveWorker(registration);
}

function waitForActiveWorker(registration: ServiceWorkerRegistration) {
  if (registration.active?.state === "activated") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const worker = registration.installing ?? registration.waiting ?? registration.active;
    if (!worker) {
      reject(new Error("The offline download could not start. Try again online."));
      return;
    }

    const timer = window.setTimeout(() => finish("The offline download timed out. Try again online."), 15000);
    function finish(error?: string) {
      window.clearTimeout(timer);
      worker?.removeEventListener("statechange", onStateChange);
      if (error) {
        reject(new Error(error));
      } else {
        resolve();
      }
    }
    function onStateChange() {
      if (worker?.state === "activated") finish();
      if (worker?.state === "redundant") finish("The offline download failed. Try again online.");
    }

    worker.addEventListener("statechange", onStateChange);
    onStateChange();
  });
}
