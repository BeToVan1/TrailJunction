import { useEffect, useState, type FormEvent } from "react";
import { Cloud, LogOut } from "lucide-react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword, getRedirectResult, GoogleAuthProvider, onIdTokenChanged,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup,
  signInWithRedirect, signOut, type User,
} from "firebase/auth";
import { getJournalAuth as auth } from "./journal-firebase.ts";

function message(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : "";
  switch (code) {
    case "auth/email-already-in-use": return "This email already has an account. Try signing in.";
    case "auth/weak-password": return "Choose a stronger password with at least 8 characters.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password": return "Check your email and password, or reset your password.";
    case "auth/too-many-requests": return "Too many attempts. Try again later.";
    case "auth/network-request-failed": return "Couldn’t reach Firebase. Check your connection and try again.";
    case "auth/popup-blocked": return "Allow pop-ups for this site and try Google sign-in again.";
    default: return "That account action didn’t go through. Please try again.";
  }
}

export function useJournalAccount() {
  const [user, setUser] = useState<User | null>();
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth(), (next) => {
      setUser(next);
      setVerified(Boolean(next?.emailVerified));
    });
    if (navigator.onLine && location.hostname === auth().app.options.authDomain) {
      void getRedirectResult(auth()).catch((reason) => setError(message(reason)));
    }
    return unsubscribe;
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (reason) {
      if (!(reason instanceof FirebaseError && reason.code === "auth/popup-closed-by-user")) {
        setError(message(reason));
      }
    } finally {
      setBusy(false);
    }
  }

  return {
    user, verified, busy, error, notice,
    google: () => run(async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      if (location.hostname === auth().app.options.authDomain) {
        await signInWithRedirect(auth(), provider);
      } else {
        await signInWithPopup(auth(), provider);
      }
    }),
    email: (mode: "signin" | "signup" | "reset", email: string, password: string) => run(async () => {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth(), email);
        setNotice("If an account exists for this email, check your inbox for a password reset link.");
      } else if (mode === "signup") {
        const { user: created } = await createUserWithEmailAndPassword(auth(), email, password);
        await sendEmailVerification(created);
        setNotice("Check your inbox for the verification link.");
      } else {
        const { user: signedIn } = await signInWithEmailAndPassword(auth(), email, password);
        setVerified(signedIn.emailVerified);
      }
    }),
    checkEmail: () => run(async () => {
      if (!user) return;
      await user.reload();
      if (user.emailVerified) await user.getIdToken(true);
      setVerified(user.emailVerified);
      if (!user.emailVerified) setNotice("The address is still unverified. Open the link in your email, then try again.");
    }),
    resend: () => run(async () => {
      if (!user) return;
      await sendEmailVerification(user);
      setNotice("Check your inbox for the verification link.");
    }),
    logout: () => run(() => signOut(auth())),
  };
}

export function JournalAccountPanel({ account, online, syncStatus, sync, copy, deviceHikes = 0, copying, copyError }: {
  account: ReturnType<typeof useJournalAccount>;
  online: boolean;
  syncStatus?: string;
  sync?: () => void;
  copy?: () => void;
  deviceHikes?: number;
  copying?: boolean;
  copyError?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const title = mode === "signup" ? "Create an account" : mode === "reset" ? "Reset your password" : "Sign in";
  const disabled = account.busy || !online;
  const user = account.user;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void account.email(mode, String(fields.get("email")).trim(), String(fields.get("password") ?? ""));
  }

  return (
    <section className="trail-sheet journal-account" aria-labelledby="journal-account-title">
      <div className="journal-account-heading">
        <Cloud aria-hidden="true" />
        <div>
          <h2 id="journal-account-title">{user ? "Journal account" : "Save your hikes across devices"}</h2>
          <p className="muted">{user?.email || "Sign in to sync your hikes, notes, and photo books."}</p>
        </div>
      </div>
      {user === undefined ? <p className="muted" role="status">Checking your account…</p> : user ? (
        <>
          {account.verified ? (
            <>
              <p className="muted" role="status">{syncStatus}</p>
              <div className="journal-account-actions">
                <button className="secondary-action" type="button" disabled={!online} onClick={sync}>Sync now</button>
                {deviceHikes > 0 && <button className="secondary-action" type="button" disabled={copying} onClick={copy}
                  title="Adds your device hikes to this account and keeps the device copies.">
                  {copying ? "Copying hikes…" : "Copy hikes from this device"}
                </button>}
              </div>
              {copyError && <p role="alert" className="error">{copyError}</p>}
            </>
          ) : (
            <>
              <p className="muted">Verify your email to sync. Hikes you log here are saved on this device in the meantime.</p>
              <div className="journal-account-actions">
                <button className="secondary-action" type="button" disabled={disabled} onClick={() => void account.checkEmail()}>I verified my email</button>
                <button className="text-action" type="button" disabled={disabled} onClick={() => void account.resend()}>Resend verification email</button>
              </div>
            </>
          )}
          <button className="text-action journal-signout" type="button" disabled={account.busy} onClick={() => void account.logout()}>
            <LogOut aria-hidden="true" /> Sign out
          </button>
        </>
      ) : (
        <details className="journal-signin">
          <summary>Sign in or create an account</summary>
          <button className="secondary-action" type="button" disabled={disabled} onClick={() => void account.google()}>
            Continue with Google
          </button>
          {!online && <p className="muted">Reconnect to sign in. You can still log hikes on this device.</p>}
          <form key={mode} className="journal-account-form" onSubmit={submit} aria-label={title}>
            <label>Email <input name="email" type="email" autoComplete="email" required /></label>
            {mode !== "reset" && <label>Password <input name="password" type="password" required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined} /></label>}
            <button className="primary-action" disabled={disabled} type="submit">
              {mode === "reset" ? "Send reset link" : title}
            </button>
          </form>
          <div className="journal-account-actions">
            {mode === "signin" ? (
              <>
                <button type="button" className="text-action" onClick={() => setMode("signup")}>Create an account</button>
                <button type="button" className="text-action" onClick={() => setMode("reset")}>Forgot password?</button>
              </>
            ) : <button type="button" className="text-action" onClick={() => setMode("signin")}>Back to sign in</button>}
          </div>
        </details>
      )}
      {account.error && <p role="alert" className="error">{account.error}</p>}
      {account.notice && <p role="status" className="muted">{account.notice}</p>}
    </section>
  );
}
