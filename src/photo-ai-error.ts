import { PhotoError } from "./photo.ts";

export class NatureResponseError extends Error {}

type ServiceError = Error & { code?: string; customErrorData?: { status?: number } };

export function isVerificationRejection(reason: unknown) {
  if (!(reason instanceof Error)) return false;
  const { customErrorData, message } = reason as ServiceError;
  return (customErrorData?.status === 401 || customErrorData?.status === 403)
    && /app[ -]?check|attestation/i.test(message);
}

export function photoAIError(reason: unknown, task: "sign" | "journal", online: boolean) {
  if (reason instanceof PhotoError) return reason.message;
  if (!online) return task === "sign"
    ? "Offline sign reading is unavailable on this device. Keep the photo open and try again when you reconnect."
    : "Reconnect to ask Gemini about this photo.";
  const error = reason instanceof Error ? reason as ServiceError : undefined;
  if (error?.name === "TimeoutError" || error?.name === "AbortError")
    return "The photo request timed out. Check your connection and try again.";
  if (error?.code?.startsWith("appCheck/") || isVerificationRejection(reason))
    return "Firebase couldn’t verify this browser. Reload Trail Junction and try again. If you use a content blocker, allow reCAPTCHA for this site.";
  const status = error?.customErrorData?.status;
  if (status === 429) return "Gemini has reached a request limit. Try again later.";
  if (status && status >= 500) return "Gemini is temporarily unavailable. Try again in a moment.";
  if (reason instanceof NatureResponseError || error?.code === "response-error")
    return "Gemini didn’t return a usable reading. Try a clearer photo or a closer crop.";
  return task === "sign" ? "Sign reading couldn’t finish. Try again or enter the sign text manually."
    : "The photo request couldn’t finish. Check your connection and try again.";
}
