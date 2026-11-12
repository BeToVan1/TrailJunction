import { useEffect, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { validatePhoto } from "./photo.ts";

export function PhotoPicker({ onPhoto, cameraLabel = "Take photo", primaryCamera = true, disabled = false }: {
  onPhoto: (file: File) => void;
  cameraLabel?: string;
  primaryCamera?: boolean;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");

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
        <label className={`file-button ${primaryCamera ? "primary-action" : "secondary-action"}`}>
          <Camera aria-hidden="true" /> {cameraLabel}
          <input type="file" accept="image/*" capture="environment" disabled={disabled} onChange={select} />
        </label>
        <label className="file-button secondary-action">
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
  const [url, setUrl] = useState("");
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (!photo) {
      setUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(photo);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [photo, fallback]);

  const src = photo ? url : fallback;
  return (
    <div className="photo-frame">
      {src && !broken
        ? <img src={src} alt={alt} onError={() => setBroken(true)} />
        : <p className="photo-placeholder">{broken ? "Photo preview unavailable" : "Preparing photo…"}</p>}
    </div>
  );
}
