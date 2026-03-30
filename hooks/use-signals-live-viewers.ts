"use client";

import { useEffect, useState } from "react";

const TICK_MS = 3200;
const MIN = 2140;
const MAX = 9180;
const STORAGE_KEY = "kj-signals-viewers";

/** Compact label for thousands-scale counts (e.g. 3124 → "3.1k"). */
export function formatSignalsViewerCount(n: number): string {
  if (n < 1000) return n.toLocaleString();
  return `${(n / 1000).toFixed(1)}k`;
}

let sharedCount = 3124;
/** Browser timers use numeric handles; Node's `Timeout` type does not apply here. */
let intervalId: number | null = null;
const subscribers = new Set<(n: number) => void>();

function readStoredCount(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function persistCount(n: number) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, String(n));
}

function ensureTicker() {
  if (typeof window === "undefined" || intervalId !== null) return;

  const stored = readStoredCount();
  if (stored !== null) {
    sharedCount = Math.min(MAX, Math.max(MIN, stored));
  } else {
    sharedCount = MIN + Math.floor(Math.random() * (MAX - MIN));
    persistCount(sharedCount);
  }

  intervalId = window.setInterval(() => {
    sharedCount = Math.min(
      MAX,
      Math.max(MIN, sharedCount + Math.floor(Math.random() * 49) - 24),
    );
    persistCount(sharedCount);
    subscribers.forEach((cb) => cb(sharedCount));
  }, TICK_MS);
}

/**
 * Dummy “live viewers” for KindJoe Signals — drifts slowly in the low thousands.
 * One shared ticker + sessionStorage so the navbar and Signals top bar stay in sync.
 */
export function useSignalsLiveViewers() {
  const [viewers, setViewers] = useState(3124);

  useEffect(() => {
    ensureTicker();
    let mounted = true;
    const cb = (n: number) => {
      if (mounted) setViewers(n);
    };
    subscribers.add(cb);
    setViewers(sharedCount);
    return () => {
      mounted = false;
      subscribers.delete(cb);
    };
  }, []);

  return viewers;
}
