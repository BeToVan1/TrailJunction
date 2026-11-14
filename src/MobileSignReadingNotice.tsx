import { isMobileDevice } from "./mobile-device.ts";

export function MobileSignReadingNotice({ className = "muted" }: { className?: string }) {
  if (!isMobileDevice()) return null;
  return (
    <p className={className}>
      <strong>Offline AI requires desktop Chrome.</strong> On phones and tablets, AI sign reading needs an internet connection. Downloaded maps still work offline.
    </p>
  );
}
