"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { promptSettingsTable } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import {
  PROMPT_SETTINGS_DEFAULTS,
  type PromptSettingKey,
  type PromptSettings,
  mergePromptSettings,
} from "@/lib/ai/prompt-settings";

async function assertPromptSettingsStaff() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    throw new Error("Unauthorized");
  }
}

async function getSettingsRow() {
  const rows = await db.select().from(promptSettingsTable).limit(1);
  return rows[0] ?? null;
}

export async function getEffectivePromptSettings(opts?: {
  skipAuth?: boolean;
}): Promise<PromptSettings> {
  if (!opts?.skipAuth) {
    await assertPromptSettingsStaff();
  }

  try {
    const row = await getSettingsRow();
    if (!row) {
      await db.insert(promptSettingsTable).values({
        prompts: PROMPT_SETTINGS_DEFAULTS,
      });
      return { ...PROMPT_SETTINGS_DEFAULTS };
    }

    return mergePromptSettings(
      (row.prompts ?? null) as Partial<Record<string, unknown>> | null,
    );
  } catch (error) {
    console.warn(
      "prompt-settings fallback defaults used (table likely missing, run migrations)",
      error,
    );
    return { ...PROMPT_SETTINGS_DEFAULTS };
  }
}

export async function savePromptSettings(
  prompts: Partial<Record<PromptSettingKey, string>>,
  opts?: { skipAuth?: boolean },
): Promise<PromptSettings> {
  if (!opts?.skipAuth) {
    await assertPromptSettingsStaff();
  }

  const merged = mergePromptSettings(prompts);
  const row = await getSettingsRow();

  if (!row) {
    await db.insert(promptSettingsTable).values({
      prompts: merged,
    });
    return merged;
  }

  await db
    .update(promptSettingsTable)
    .set({
      prompts: merged,
      updatedAt: new Date(),
    })
    .where(eq(promptSettingsTable.id, row.id));

  return merged;
}
