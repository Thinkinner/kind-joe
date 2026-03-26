import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { SignalDeepDiveArticle } from "./signal-deep-dive-types";

const sectionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    heading: { type: Type.STRING },
    body: {
      type: Type.STRING,
      description:
        "Multiple short paragraphs (plain text). Use blank lines between paragraphs.",
    },
  },
  required: ["heading", "body"],
};

const articleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    dek: {
      type: Type.STRING,
      description: "One-line subtitle under the headline.",
    },
    sections: {
      type: Type.ARRAY,
      items: sectionSchema,
      description:
        "4–7 sections: background, what is known, recent developments, stakeholders, risks/unknowns.",
    },
    sourcesNote: {
      type: Type.STRING,
      description:
        "Honest note that the piece is synthesized from web search and may omit or misstate details.",
    },
  },
  required: ["title", "dek", "sections", "sourcesNote"],
};

function cleanJson(text: string): string {
  if (!text) return "{}";
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return cleaned.trim();
  return cleaned.substring(start, end + 1).trim();
}

export type SignalBriefPayload = {
  headline: string;
  summary: string;
  category: string;
  country: string;
  city: string;
  tags: string[];
};

/**
 * Uses Gemini + Google Search to draft a longer neutral article from a live signal.
 */
export async function generateSignalDeepDiveArticle(
  signal: SignalBriefPayload,
): Promise<SignalDeepDiveArticle | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an investigative editor for a global news desk. Your job is to EXPAND a short live "signal" into a full reader-facing article.

RULES:
- Use Google Search aggressively to find recent, credible reporting on this exact topic or very close variants of the headline.
- If search results are thin or contradictory, say so in the prose and in sourcesNote. Do NOT invent quotes, statistics, or named sources that search did not support.
- Neutral, factual tone. Prefer "reported," "according to," "officials said" where appropriate.
- The article must stand alone: someone who only sees this briefing should understand the story.
- tags (comma-separated hints): ${signal.tags.join(", ")}

SIGNAL HEADLINE: ${signal.headline}
SIGNAL SUMMARY (SITREP): ${signal.summary}
CATEGORY: ${signal.category}
LOCATION: ${signal.city}, ${signal.country}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: articleSchema,
      temperature: 0.35,
    },
  });

  const cleanedText = cleanJson(response.text || "{}");
  try {
    const parsed = JSON.parse(cleanedText) as SignalDeepDiveArticle;
    if (
      !parsed.title ||
      !Array.isArray(parsed.sections) ||
      parsed.sections.length === 0
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
