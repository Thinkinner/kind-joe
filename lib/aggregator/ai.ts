import { GoogleGenAI, Type, Schema } from "@google/genai";

const signalSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intelHeadline: {
      type: Type.STRING,
      description:
        "Professional newswire headline. Objective and scale-appropriate (Global vs Local).",
    },
    intelSummary: {
      type: Type.STRING,
      description:
        "A 2-sentence SITREP (Situation Report). Explain the event and its immediate context.",
    },
    category: {
      type: Type.STRING,
      description:
        "MUST BE: 'Geopolitics', 'Conflicts & Wars', 'Economy & Markets', 'Tech & Science', 'Disasters & Emergencies', 'Viral / Social', or 'Ignore'.",
    },
    city: {
      type: Type.STRING,
      description:
        "Specific city/county if local, or 'Global/Multiple' if macro.",
    },
    country: {
      type: Type.STRING,
      description:
        "Standardized country name (e.g., 'USA', 'Philippines', 'United Kingdom').",
    },
    lat: { type: Type.NUMBER },
    lng: { type: Type.NUMBER },
    impactScore: {
      type: Type.INTEGER,
      description: "1-100 based on strategic weight.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Exactly 5 technical tags. Example: #usa, #california, #border, #security, #active.",
    },
  },
  required: [
    "intelHeadline",
    "intelSummary",
    "category",
    "city",
    "country",
    "lat",
    "lng",
    "impactScore",
    "tags",
  ],
};

const getClient = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not found");
  return new GoogleGenAI({ apiKey });
};

/**
 * MULTI-SCALAR INTELLIGENCE ENGINE
 * Detects global trends while maintaining hyper-local precision when needed.
 */
export const analyzeSignalWithAI = async (
  rawContent: string,
  secondaryContext: string = "",
) => {
  const ai = getClient();

  const aiPrompt = `
    PERSONA: You are a Lead Intelligence Analyst for a global monitoring center. 
    You excel at distinguishing between high-level geopolitical shifts and localized tactical events.

    TASK: Transform raw data into a standardized, non-biased intelligence signal.

    1. THE NEUTRALITY MANDATE:
       - Strictly objective. No emotive language. 
       - Present facts without choosing "sides."
       - Use "Reported," "Observed," "Confirmed," or "Alleged" instead of judgmental verbs.

    2. MULTI-SCALAR GEOGRAPHY:
       - SCALE DETECTION: Determine if the news is GLOBAL, NATIONAL, or LOCAL.
       - IF LOCAL (e.g., Simi Valley, Ventura County, specific city districts):
         - Identify the specific City/County for the 'city' field.
         - Pinpoint exact Lat/Lng for that specific location.
       - IF MACRO (e.g., a National policy or International treaty):
         - Set 'city' to the Capital or 'Multiple'.
         - Set 'country' to the primary nation.
       - IF UNCERTAIN: Use Google Search to find the exact location of landmarks or events mentioned.

    3. SPECIALIZED MONITORING: [ICE / BORDER / DOMESTIC]
       - You are highly attuned to US Border activity, ICE operations, and immigration developments.
       - These are always categorized under "Geopolitics" due to their policy impact.

    4. TAGGING PROTOCOL:
       - Tag 1: Country (#usa, #russia, #china, etc.)
       - Tag 2: Region/State (#california, #southeastasia, #europe, etc.)
       - Tag 3: Core Topic (#border, #energy, #finance, #military, etc.)
       - Tag 4: Sub-Topic (#ice, #semiconductors, #inflation, etc.)
       - Tag 5: Status (#active, #ongoing, #resolved, #alert, etc.)

    5. DATA INPUT:
       "${rawContent}"
       CONTEXT: "${secondaryContext}"
  `;

  return await retry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: aiPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: signalSchema,
        temperature: 0.1, // Absolute focus on consistency and rules
      },
    });

    const cleanedText = cleanJson(response.text || "{}");
    try {
      const result = JSON.parse(cleanedText);

      // Post-analysis refinement
      result.tags = result.tags.map((t: string) =>
        t.toLowerCase().replace("#", ""),
      );

      // Final Noise Filter
      if (result.impactScore < 8 && result.category === "Viral / Social") {
        result.category = "Ignore";
      }

      return result;
    } catch (e) {
      console.error("Factory AI Parse Error:", e);
      return null;
    }
  });
};

async function retry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 2000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status >= 500)) {
      await new Promise((res) => setTimeout(res, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return cleaned.trim();
  return cleaned.substring(start, end + 1).trim();
};
