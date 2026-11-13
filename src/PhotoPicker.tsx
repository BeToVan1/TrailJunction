import { useEffect, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { validatePhoto } from "./photo.ts";

function isMobileDevice() {
  const { userAgent, maxTouchPoints } = navigator;
  const { userAgentData } = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return userAgentData?.mobile === true || /Android|iPhone|iPad|iPod/i.test(userAgent)
    // iPadOS can use a desktop Safari user agent.
    || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
}

export function PhotoPicker({ onPhoto, cameraLabel = "Take photo", primaryCamera = true, disabled = false }: {
  onPhoto: (file: File) => void;
  cameraLabel?: string;
  primaryCamera?: boolean;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  const showCamera = isMobileDevice();

  function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      validatePhoto(file);
      setError("");
      onPhoto(file);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This photo could not be opened.");
    }
  }

  return (
    <>
      <div className="photo-controls">
        {showCamera && (
          <label className={`file-button ${primaryCamera ? "primary-action" : "secondary-action"}`}>
            <Camera aria-hidden="true" /> {cameraLabel}
            <input type="file" accept="image/*" capture="environment" disabled={disabled} onChange={select} />
          </label>
        )}
        <label className={`file-button ${!showCamera && primaryCamera ? "primary-action" : "secondary-action"}`}>
          <ImagePlus aria-hidden="true" /> Choose photo
          <input type="file" accept="image/*,.heic,.heif" disabled={disabled} onChange={select} />
        </label>
      </div>
      {error && <p className="error photo-error" role="alert">{error}</p>}
    </>
  );
}

export function PhotoPreview({ photo, alt, fallback }: {
  photo?: Blob | null;
  alt: string;
  fallback?: string;
}) {
  const [preview, setPreview] = useState<{ photo: Blob; src: string }>();
  const [failedSrc, setFailedSrc] = useState<string>();

  useEffect(() => {
    if (!photo) return;
    const src = URL.createObjectURL(photo);
    setPreview({ photo, src });
    return () => URL.revokeObjectURL(src);
  }, [photo]);

  const src = photo ? (preview?.photo === photo ? preview.src : undefined) : fallback;
  const broken = Boolean(src && failedSrc === src);
  return (
    <span className="photo-frame">
      {src && !broken
        ? <img key={src} src={src} alt={alt} onError={() => setFailedSrc(src)} />
        : <span className="photo-placeholder">{broken ? "Photo preview unavailable" : "Preparing photo…"}</span>}
    </span>
  );
}
