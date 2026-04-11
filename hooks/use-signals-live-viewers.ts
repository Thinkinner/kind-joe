"use client";

import { useEffect, useState } from "react";

const TICK_MS = 3200;
const MIN = 5400;
const MAX = 7800;
const BASELINE = 6500;

/** Compact label for thousands-scale counts (e.g. 3124 → "3.1k"). */
export function formatSignalsViewerCount(n: number): string {
  if (n < 1000) return n.toLocaleString("en-US");
  return `${(n / 1000).toFixed(1)}k`;
}

let sharedCount = 3124;
/** Browser timers use numeric handles; Node's `Timeout` type does not apply here. */
let intervalId: number | null = null;
const subscribers = new Set<(n: number) => void>();

function clamp(n: number): number {
  return Math.min(MAX, Math.max(MIN, n));
}

/**
 * Deterministic viewer count based on wall-clock time.
 * Every user/tab sees the same number at the same time.
 */
function computeGlobalViewerCount(nowMs: number): number {
  const step = Math.floor(nowMs / TICK_MS);
  const phase = (step % 420) / 420;
  const waveA = Math.sin(phase * Math.PI * 2) * 280;
  const waveB = Math.cos(phase * Math.PI * 5) * 95;
  const wobble = ((step * 31 + 7) % 23) - 11;
  return clamp(Math.round(BASELINE + waveA + waveB + wobble));
}

function ensureTicker() {
  if (typeof window === "undefined" || intervalId !== null) return;

  sharedCount = computeGlobalViewerCount(Date.now());

  intervalId = window.setInterval(() => {
    sharedCount = computeGlobalViewerCount(Date.now());
    subscribers.forEach((cb) => cb(sharedCount));
  }, TICK_MS);
}

/**
 * Global “live viewers” for KindJoe Signals.
 * One shared deterministic ticker keeps navbar + Signals top bar in sync,
 * and keeps values consistent across tabs/users.
 */
export function useSignalsLiveViewers() {
  const [viewers, setViewers] = useState(BASELINE);

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
