"use server";

import { WebhookPayload } from "./types";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const sendToWebhook = async (
  url: string,
  data: WebhookPayload,
): Promise<boolean> => {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) throw new Error("Unauthorized");

  if (!url) throw new Error("Webhook URL is not configured.");

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with status: ${response.status}`);
  }

  return true;
};
