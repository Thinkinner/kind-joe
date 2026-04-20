import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const RequestSchema = z.object({
  displayName: z.string().max(120).optional().default(""),
  used: z.array(z.string().max(120)).max(100).optional().default([]),
  seed: z.string().max(240).optional().default(""),
});

function normalizeToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return "";
  if (/^[A-Za-z]\.$/.test(trimmed)) {
    return `${trimmed[0].toUpperCase()}.`;
  }
  return trimmed
    .split("-")
    .map((segment) =>
      segment
        .split("'")
        .map((part) =>
          part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part,
        )
        .join("'"),
    )
    .join("-");
}

function normalizeAlias(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z\s.'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const tokens = cleaned.split(" ").map(normalizeToken).filter(Boolean);
  if (tokens.length < 2) return "";
  if (tokens.length > 3) return `${tokens[0]} ${tokens[tokens.length - 1]}`;
  return tokens.join(" ");
}

export async function POST(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { displayName, used, seed } = parsed.data;
  const blocked = new Set(
    used
      .concat(displayName)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_ALIAS_MODEL ?? "gemini-3-flash-preview";
    const prompt = [
      "Generate exactly one realistic, human-sounding journalist pen name.",
      "Output strict JSON only: {\"alias\":\"First Last\"}.",
      "Use 2 words (first and last). Optional middle initial is allowed but rare.",
      "Do not use celebrity names, fictional names, or obvious placeholders.",
      "Avoid all names listed as blocked.",
      `Display name context: ${displayName || "none"}`,
      `Seed for uniqueness: ${seed || Date.now().toString()}`,
      `Blocked names: ${Array.from(blocked).join(", ") || "none"}`,
    ].join("\n");

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.85,
      },
    });

    const raw = response.text?.trim() || "{}";
    const json = JSON.parse(raw) as { alias?: unknown };
    const candidate = normalizeAlias(String(json.alias ?? ""));

    if (!candidate || blocked.has(candidate.toLowerCase())) {
      return NextResponse.json(
        { error: "Could not generate a unique alias." },
        { status: 422 },
      );
    }

    return NextResponse.json({ alias: candidate });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Alias suggestion failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
