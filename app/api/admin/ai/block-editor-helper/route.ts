import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const maxDuration = 45;

const layoutSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description:
          "One of: h1, h2, h3, paragraph, blockquote, list-item, spacer",
      },
    },
    required: ["type"],
  },
};

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

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const rawLines = text
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    if (rawLines.length === 0) {
      return NextResponse.json({ html: "<p></p>" });
    }

    const system = `You assign layout roles to each line of input text. Do NOT change words.
For each line, output one object { "type": "..." } with the same array length as input lines.
Types: h1, h2, h3, paragraph, blockquote, list-item, spacer.
Short section labels without periods are often h2. Full sentences are paragraph.
Lines starting with - or • or 1. are list-item.`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `${system}\n\nLINES:\n${JSON.stringify(rawLines)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: layoutSchema,
        temperature: 0,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "[]") as {
      type: string;
    }[];

    let layout =
      Array.isArray(parsed) && parsed.length === rawLines.length
        ? parsed
        : rawLines.map(() => ({ type: "paragraph" }));

    function escapeHtml(str: string): string {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    const htmlParts: string[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = escapeHtml(rawLines[i]);
      const role = layout[i]?.type ?? "paragraph";

      switch (role) {
        case "h1":
          htmlParts.push(`<h1>${line}</h1>`);
          break;
        case "h2":
          htmlParts.push(`<h2>${line}</h2>`);
          break;
        case "h3":
          htmlParts.push(`<h3>${line}</h3>`);
          break;
        case "blockquote":
          htmlParts.push(`<blockquote><p>${line}</p></blockquote>`);
          break;
        case "list-item":
          htmlParts.push(`<li>${line}</li>`);
          break;
        case "spacer":
          htmlParts.push(`<p><br><br></p>`);
          break;
        default:
          htmlParts.push(`<p>${line}</p>`);
      }
    }

    const finalParts: string[] = [];
    let bufferList: string[] = [];
    const flushList = () => {
      if (bufferList.length > 0) {
        finalParts.push(`<ul>${bufferList.join("")}</ul>`);
        bufferList = [];
      }
    };

    for (const part of htmlParts) {
      if (part.startsWith("<li>")) {
        bufferList.push(part);
      } else {
        flushList();
        finalParts.push(part);
      }
    }
    flushList();

    return NextResponse.json({ html: finalParts.join("\n") });
  } catch (err: unknown) {
    console.error("block-editor-helper:", err);
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
