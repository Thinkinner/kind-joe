import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import {
  createOutgoingWebhookAdmin,
  getIncomingEventsAdmin,
  getWebhookDeliverySummaryAdmin,
  listOutgoingWebhooksAdmin,
} from "@/lib/domains/webhooks";

const createWebhookSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2048),
  authorizationToken: z.string().max(4096).optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    if (staff.reason === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [webhooks, recentEvents, deliveries] = await Promise.all([
    listOutgoingWebhooksAdmin(),
    getIncomingEventsAdmin(200),
    getWebhookDeliverySummaryAdmin(),
  ]);
  return NextResponse.json({ webhooks, recentEvents, deliveries });
}

export async function POST(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    if (staff.reason === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = createWebhookSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const created = await createOutgoingWebhookAdmin({
      name: parsed.data.name,
      url: parsed.data.url,
      authorizationToken: parsed.data.authorizationToken?.trim() || null,
      enabled: parsed.data.enabled,
    });

    return NextResponse.json({ webhook: created }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create webhook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
