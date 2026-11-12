import { get, set, update } from "idb-keyval";
import type { RoutePack } from "./route.ts";

interface SavedRoute {
  pack: RoutePack;
  confirmedJunctionId: string | null;
}

const savedRouteKey = "trail-junction/saved-route";

export async function getSavedRoute(pack: RoutePack): Promise<SavedRoute | undefined> {
  const saved = await get<SavedRoute>(savedRouteKey);
  if (saved?.pack?.id === pack.id && saved.pack.version === pack.version) {
    return saved;
  }
  return undefined;
}

export async function saveRoute(pack: RoutePack, confirmedJunctionId: string | null) {
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
  const saved: SavedRoute = { pack, confirmedJunctionId };
  await set(savedRouteKey, saved);
}

export async function saveCheckpoint(pack: RoutePack, confirmedJunctionId: string) {
  await update<SavedRoute | undefined>(savedRouteKey, (saved) => {
    if (saved?.pack?.id === pack.id && saved.pack.version === pack.version) {
      return { ...saved, confirmedJunctionId };
    }
    return saved;
  });
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
