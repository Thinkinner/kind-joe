import { GoogleGenAI, Type, Schema } from "@google/genai";

// Define the Schema for Structured Output
const signalSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    intelHeadline: {
      type: Type.STRING,
      description: "Professional, punchy, objective headline (max 80 chars)",
    },
    intelSummary: {
      type: Type.STRING,
      description:
        "2-3 sentence analysis explaining why this event matters globally",
    },
    category: {
      type: Type.STRING,
      description:
        "One of: Geopolitics, Conflicts & Wars, Economy & Markets, Tech & Science, Disasters & Emergencies, Viral / Social",
    },
    city: { type: Type.STRING },
    country: { type: Type.STRING },
    lat: { type: Type.NUMBER, description: "Precise latitude" },
    lng: { type: Type.NUMBER, description: "Precise longitude" },
    impactScore: { type: Type.INTEGER, description: "Score from 1 to 100" },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exactly 5 lowercase tags",
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

export const analyzeSignalWithAI = async (
  headline: string,
  summary: string,
) => {
  const ai = getClient();

  // FIX: We explicitly define the 'prompt' variable here so it is not 'undefined'
  const aiPrompt = `
    You are a senior Geopolitical Intelligence Editor. 
    Analyze this raw data and transform it into a professional intelligence signal.
    
    RAW DATA:
    Headline: ${headline}
    Context: ${summary}

    Determine precise coordinates for the event. If the event is global or national, use the capital city.
  `;

  return retry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: aiPrompt, // Use the variable defined above
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: signalSchema,
        temperature: 0.2,
      },
    });

    const cleanedText = cleanJson(response.text || "{}");
    try {
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("AI JSON Parse Error:", response.text);
      return null;
    }
  });
};
