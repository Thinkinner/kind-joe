import { appendFile } from "fs/promises";
import path from "path";

const INGEST =
  "http://127.0.0.1:7621/ingest/51e4d62e-50e0-499c-a49a-b3b03abab334";

/** Dual-write debug line: HTTP ingest + workspace NDJSON (session e68134). */
export function agentDebugIngest(payload: {
  runId?: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}): void {
  const body = {
    sessionId: "e68134",
    timestamp: Date.now(),
    ...payload,
  };
  void fetch(INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "e68134",
    },
    body: JSON.stringify(body),
  }).catch(() => {});
  const line = `${JSON.stringify(body)}\n`;
  void appendFile(
    path.join(process.cwd(), ".cursor", "debug-e68134.log"),
    line,
  ).catch(() => {});
}
