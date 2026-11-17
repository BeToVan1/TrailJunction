import { flushSync } from "react-dom";

function loadedPhoto(cover?: HTMLElement | null) {
  const image = cover?.querySelector<HTMLImageElement>("img:not([hidden])");
  return image?.naturalWidth ? image.currentSrc : undefined;
}

function waitForPhoto(cover: HTMLElement, src: string) {
  if (loadedPhoto(cover) === src) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const observer = new MutationObserver(() => {
      if (loadedPhoto(cover) === src) finish(true);
    });
    const timer = window.setTimeout(() => finish(false), 100);
    function finish(loaded: boolean) {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(loaded);
    }
    observer.observe(cover, { subtree: true, attributes: true, childList: true });
  });
}

export function transitionTrailCover(source: HTMLElement | null | undefined, update: () => void,
  findDestination: () => HTMLElement | null | undefined) {
  const root = document.documentElement;
  if (root.classList.contains("trail-cover-moving")) return;
  const src = loadedPhoto(source);
  if (!source || !src || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }

  let destination: HTMLElement | undefined;
  source.style.viewTransitionName = "trail-cover";
  root.classList.add("trail-cover-moving");
  const transition = document.startViewTransition(async () => {
    flushSync(update);
    source.style.removeProperty("view-transition-name");
    const next = findDestination();
    if (!next || !await waitForPhoto(next, src) || !next.isConnected) {
      transition.skipTransition();
      return;
    }
    destination = next;
    destination.style.viewTransitionName = "trail-cover";
  });
  void transition.ready.catch(() => {});
  function clear() {
    source?.style.removeProperty("view-transition-name");
    destination?.style.removeProperty("view-transition-name");
    root.classList.remove("trail-cover-moving");
  }
  void transition.finished.then(clear, clear);
}
