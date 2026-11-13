import { useCallback, useEffect, useMemo, useState } from "react";
import { getTrailFirebaseApp } from "./firebase-app.ts";
import { createAccountJournal, deviceJournal, type AccountJournal } from "./journal.ts";
import { JournalAccountPanel, useJournalAccount } from "./JournalAccount.tsx";
import { syncJournal } from "./journal-sync.ts";
import { TrailJournal, type JournalTrail } from "./TrailJournal.tsx";

export function AccountJournalView({ online, trail }: { online: boolean; trail?: JournalTrail }) {
  const account = useJournalAccount();
  const uid = account.verified ? account.user?.uid : undefined;
  const journal = useMemo(() => uid ? createAccountJournal(getTrailFirebaseApp().options.projectId!, uid) : undefined, [uid]);

  if (!uid || !journal) {
    return <TrailJournal online={online} trail={trail} accountLoading={account.user === undefined}
      accountPanel={<JournalAccountPanel account={account} online={online} />} />;
  }

  return <SyncedJournal key={uid} uid={uid} journal={journal} account={account} online={online} trail={trail} />;
}

function SyncedJournal({ uid, journal, account, online, trail }: {
  uid: string;
  journal: AccountJournal;
  account: ReturnType<typeof useJournalAccount>;
  online: boolean;
  trail?: JournalTrail;
}) {
  const [revision, setRevision] = useState(0);
  const [request, setRequest] = useState(0);
  const [status, setStatus] = useState("Syncing your journal…");
  const [deviceHikes, setDeviceHikes] = useState(0);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState("");
  const sync = useCallback(() => {
    if (online) setStatus("Syncing your journal…");
    setRequest((previous) => previous + 1);
  }, [online]);

  useEffect(() => {
    let active = true;
    void deviceJournal.getHikes().then((hikes) => {
      if (active) setDeviceHikes(hikes.length);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!online) return;
    const controller = new AbortController();
    const refresh = async () => {
      setStatus("Syncing your journal…");
      try {
        await syncJournal(uid, journal, controller.signal);
        if (!controller.signal.aborted) setStatus("Journal synced.");
      } catch {
        if (!controller.signal.aborted) setStatus("Sync paused. Your hikes are saved on this device. Try Sync now.");
      } finally {
        if (!controller.signal.aborted) setRevision((previous) => previous + 1);
      }
    };
    const timer = window.setTimeout(() => void refresh(), 350);
    function onFocus() {
      if (document.visibilityState === "visible") sync();
    }
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [online, uid, journal, request, sync]);

  async function copy() {
    setCopying(true);
    setCopyError("");
    try {
      await journal.copyFromDevice();
      setRevision((previous) => previous + 1);
      sync();
    } catch {
      setCopyError("Some hikes couldn’t be copied. Check available storage and try again.");
    } finally {
      setCopying(false);
    }
  }

  return <TrailJournal online={online} trail={trail} store={journal} revision={revision} onChange={sync}
    accountPanel={<JournalAccountPanel account={account} online={online} deviceHikes={deviceHikes}
      syncStatus={online ? status : "Offline. Changes will sync when you reconnect."}
      sync={sync} copy={() => void copy()} copying={copying} copyError={copyError} />} />;
}
