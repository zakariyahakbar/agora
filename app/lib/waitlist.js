"use client";

import { useCallback, useEffect, useState } from "react";

/* Waitlist posts to a Google Form via a hidden iframe sink.
   No backend, no env vars, no new service. */
export const WAITLIST_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLSc4OnXZ-nWS5nRsDakmMJZlYohbAmxKIi-IMVWuB-aj2Mvpfw/formResponse";
export const WAITLIST_EMAIL_FIELD = "entry.1066540444";

const KEY = "agora_waitlist_v1";

/* Remembers that this browser has joined, so the gate isn't shown twice.
   This is a conversion gate, not authentication — it is client-side only. */
export function useWaitlistUnlock() {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setUnlocked(window.localStorage.getItem(KEY) === "1");
    } catch {
      /* storage blocked (private mode, embedded) — stay locked, gate still works */
    }
    setReady(true);
  }, []);

  const unlock = useCallback(() => {
    setUnlocked(true);
    try { window.localStorage.setItem(KEY, "1"); } catch { /* non-fatal */ }
  }, []);

  return { unlocked, unlock, ready };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
