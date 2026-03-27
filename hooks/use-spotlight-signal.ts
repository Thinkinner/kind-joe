"use client";

import type { Signal } from "@/lib/aggregator/types";
import { resolveSpotlightSignal } from "@/lib/signals/spotlight-signal";
import { useEffect, useMemo, useState } from "react";

/** Pass the full in-memory signal list (not a filtered view) so HOT reflects global max impact. */
export function useSpotlightSignal(
  signals: Signal[],
  sidebarAccessUnlocked: boolean,
) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  return useMemo(
    () => resolveSpotlightSignal(signals, now, sidebarAccessUnlocked),
    [signals, now, sidebarAccessUnlocked],
  );
}
