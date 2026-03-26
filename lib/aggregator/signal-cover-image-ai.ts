import { GoogleGenAI, Type, Schema } from "@google/genai";

const coverSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    imageUrl: {
      type: Type.STRING,
      description:
        "A direct https:// URL for a photograph or news image clearly related to this story, taken from search results. Empty string if none is appropriate.",
    },
  },
  required: ["imageUrl"],
};

function cleanJson(text: string): string {
  if (!text) return "{}";
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return cleaned.trim();
  return cleaned.substring(start, end + 1).trim();
}

function isLikelyImageUrl(s: string): boolean {
  if (!s || !s.startsWith("https://")) return false;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return false;
    const p = u.pathname.toLowerCase();
    return (
      /\.(jpe?g|png|webp|gif)(\?|$)/i.test(p) ||
      u.hostname.includes("wp.com") ||
      u.hostname.includes("cloudinary") ||
      u.hostname.includes("storage.googleapis")
    );
  } catch {
    return false;
  }
}

/**
 * Uses search-backed Gemini to suggest a real image URL from the open web.
 */
export async function pickCoverImageUrl(context: {
  headline: string;
  summary: string;
  articleTitle: string;
}): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Find a strong editorial photograph or news still that matches this story.
Return ONE direct HTTPS image URL that appears in your search results (must load as an image file or known CDN image).
Do not invent URLs. If nothing credible exists, return an empty string for imageUrl.

Headline: ${context.headline}
Summary: ${context.summary}
Article working title: ${context.articleTitle}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: coverSchema,
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(cleanJson(response.text || "{}")) as {
      imageUrl?: string;
    };
    const raw = (parsed.imageUrl ?? "").trim();
    if (!raw || !isLikelyImageUrl(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}
