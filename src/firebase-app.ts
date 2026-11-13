import { initializeApp } from "firebase/app";

const projectId: string | undefined = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const hosted = projectId && [`${projectId}.web.app`, `${projectId}.firebaseapp.com`].includes(location.hostname);
const options = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (hosted ? location.hostname : projectId && `${projectId}.firebaseapp.com`),
};

export const firebaseConfigured = Boolean(options.apiKey && options.projectId && options.appId);
export const journalAccountsEnabled = firebaseConfigured && import.meta.env.VITE_FIREBASE_JOURNAL_ACCOUNTS === "true";

export function getTrailFirebaseApp() {
  return initializeApp(options);
}
