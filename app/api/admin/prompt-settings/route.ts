import { NextResponse } from "next/server";
import {
  PROMPT_SETTINGS_DEFAULTS,
  PROMPT_SETTINGS_GROUPS,
  type PromptSettingKey,
} from "@/lib/ai/prompt-settings";
import {
  getEffectivePromptSettings,
  savePromptSettings,
} from "@/lib/ai/prompt-settings-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

export async function GET() {
  try {
    const prompts = await getEffectivePromptSettings();
    return NextResponse.json({
      prompts,
      defaults: PROMPT_SETTINGS_DEFAULTS,
      groups: PROMPT_SETTINGS_GROUPS,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return unauthorized();
    }
    console.error("prompt-settings:get", err);
    return NextResponse.json(
      { error: "Could not load prompt settings." },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as {
      prompts?: Partial<Record<PromptSettingKey, string>>;
    };
    const next = body?.prompts ?? {};
    const prompts = await savePromptSettings(next);
    return NextResponse.json({ ok: true, prompts });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return unauthorized();
    }
    console.error("prompt-settings:put", err);
    return NextResponse.json(
      { error: "Could not save prompt settings." },
      { status: 500 },
    );
  }
}
