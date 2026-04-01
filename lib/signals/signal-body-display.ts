import type { Signal } from "@/lib/aggregator/types";

/** True when headline and summary are the same (native X post — show one block, not title + excerpt). */
export function signalUsesSingleBodyBlock(
  signal: Pick<Signal, "headline" | "summary">,
): boolean {
  return signal.headline === signal.summary;
}
