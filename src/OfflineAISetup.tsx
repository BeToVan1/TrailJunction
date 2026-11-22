import { useEffect, useState } from "react";
import { aiConfigured, localPhotoModelAvailability, prepareLocalModel } from "./firebase-ai.ts";
import { isMobileDevice } from "./mobile-device.ts";

export function OfflineAISetup({ online }: { online: boolean }) {
  const [model, setModel] = useState<"idle" | "preparing" | "ready" | "unavailable">("idle");
  const [progress, setProgress] = useState(0);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (!aiConfigured || isMobileDevice()) return;
    let current = true;
    void localPhotoModelAvailability().then((availability) => {
      if (!current) return;
      if (availability === "available") setModel("ready");
      setSupported(["available", "downloadable", "downloading"].includes(availability ?? ""));
    }).catch(() => {});
    return () => { current = false; };
  }, []);

  function prepare() {
    setModel("preparing");
    setProgress(0);
    void prepareLocalModel((fraction) => setProgress(Math.round(fraction * 100)))
      .then(() => setModel("ready"))
      .catch(() => setModel("unavailable"));
  }

  if (!supported) return null;
  return (
    <div className="device-setup">
      {model === "ready" ? <p role="status">Offline AI ready on this device</p> :
        <button type="button" className="text-action" disabled={!online || model === "preparing"} onClick={prepare}>
          {model === "preparing" ? `Preparing offline AI · ${progress}%` : "Prepare offline AI"}
        </button>}
      {model === "unavailable" && <p role="status">Local AI is unavailable. Photo checks can use the cloud when online.</p>}
    </div>
  );
}
