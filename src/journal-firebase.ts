import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore/lite";
import { getTrailFirebaseApp } from "./firebase-app.ts";

const emulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_JOURNAL_EMULATORS === "true";
let auth: ReturnType<typeof getAuth> | undefined;
let firestore: ReturnType<typeof getFirestore> | undefined;

export function getJournalAuth() {
  if (auth) return auth;
  auth = getAuth(getTrailFirebaseApp());
  if (emulators) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  return auth;
}

export function getJournalFirestore() {
  if (firestore) return firestore;
  firestore = getFirestore(getTrailFirebaseApp());
  if (emulators) connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
  return firestore;
}
