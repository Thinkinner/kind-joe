import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import {
  clampIngestLimit,
  decodeIncomingCursor,
  decodeSignalsCursor,
  type IncomingEventAdminRow,
  listIncomingEventsAdmin,
  listSignalsAdmin,
  type SignalAdminRow,
} from "@/lib/webhooks/admin-ingest-view";

export async function GET(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    if (staff.reason === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const includeIncoming = url.searchParams.get("includeIncoming") !== "0";
  const includeSignals = url.searchParams.get("includeSignals") !== "0";
  const incomingLimit = clampIngestLimit(url.searchParams.get("incomingLimit"));
  const signalsLimit = clampIngestLimit(url.searchParams.get("signalsLimit"));
  const incomingCursor = decodeIncomingCursor(
    url.searchParams.get("incomingCursor"),
  );
  const signalsCursor = decodeSignalsCursor(
    url.searchParams.get("signalsCursor"),
  );

  const emptyIncoming: {
    rows: IncomingEventAdminRow[];
    nextCursor: string | null;
  } = { rows: [], nextCursor: null };
  const emptySignals: {
    rows: SignalAdminRow[];
    nextCursor: string | null;
  } = { rows: [], nextCursor: null };

  const [incoming, sigs] = await Promise.all([
    includeIncoming
      ? listIncomingEventsAdmin({ limit: incomingLimit, cursor: incomingCursor })
      : Promise.resolve(emptyIncoming),
    includeSignals
      ? listSignalsAdmin({ limit: signalsLimit, cursor: signalsCursor })
      : Promise.resolve(emptySignals),
  ]);

  const nextCursors: { incoming?: string | null; signals?: string | null } = {};
  if (includeIncoming) nextCursors.incoming = incoming.nextCursor;
  if (includeSignals) nextCursors.signals = sigs.nextCursor;

  return NextResponse.json({
    incomingEvents: includeIncoming ? incoming.rows : [],
    signals: includeSignals ? sigs.rows : [],
    nextCursors,
  });
}
