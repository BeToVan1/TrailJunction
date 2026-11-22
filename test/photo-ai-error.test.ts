import assert from "node:assert/strict";
import test from "node:test";
import { isVerificationRejection, photoAIError } from "../src/photo-ai-error.ts";

test("only a rejected App Check token warrants a fresh-token retry", () => {
  const rejected = Object.assign(new Error("Firebase App Check token is invalid."), { customErrorData: { status: 401 } });
  assert.equal(isVerificationRejection(rejected), true);
  assert.equal(isVerificationRejection(Object.assign(new Error("Permission denied"), { customErrorData: { status: 403 } })), false);
  assert.match(photoAIError(rejected, "sign", true), /verify this browser/);
});

test("a journal photo keeps a distinct explanation for verification, quota, timeout and offline errors", () => {
  const denied = Object.assign(new Error(), { code: "appCheck/fetch-status-error" });
  const quota = Object.assign(new Error(), { customErrorData: { status: 429 } });
  assert.match(photoAIError(denied, "journal", true), /verify this browser/);
  assert.match(photoAIError(quota, "journal", true), /request limit/);
  assert.match(photoAIError(new DOMException("", "TimeoutError"), "journal", true), /timed out/);
  assert.match(photoAIError(denied, "journal", false), /Reconnect/);
});
