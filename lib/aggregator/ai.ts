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
        "MUST BE: 'Geopolitics', 'Conflicts & Wars', 'Economy & Markets', 'Business', 'Tech & Science', 'Disasters & Emergencies', 'Viral / Social', or 'Ignore'.",
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
    geographicScope: {
      type: Type.STRING,
      description:
        "Exactly one of: local, regional, national, global. local = city/neighborhood/incident site; regional = state/province/metro area; national = country-wide policy or event; global = multi-country or worldwide.",
    },
    adminArea: {
      type: Type.STRING,
      description:
        "Sub-national jurisdiction for local/regional stories: state/province, county, metro (e.g. 'Ventura County, California', 'Texas', 'Île-de-France'). Empty string if national or global.",
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
        "Up to 20 distinct filter tags: lowercase slugs (no #). Cover geography (country, region, city if local), core story topics, subtopics, actors/orgs, sector, and status. Most important first; omit padding if fewer apply.",
    },
  },
  required: [
    "intelHeadline",
    "intelSummary",
    "category",
    "city",
    "country",
    "geographicScope",
    "adminArea",
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

    2. MULTI-SCALAR GEOGRAPHY (REQUIRED FIELDS geographicScope + adminArea):
       - geographicScope MUST be exactly: local | regional | national | global
         • local: single city, town, neighborhood, or specific venue (crime scene, plant, base).
         • regional: state/province, multi-county metro, or sub-national corridor.
         • national: policy, election, or story covering an entire country without a tighter place.
         • global: treaties, wars spanning states, markets, climate — cross-border or planet-scale.
       - adminArea: ALWAYS set for local and regional (state/county/metro name). Use "" (empty) for national/global unless a clear sub-national lens exists.
       - city: Most specific place name readers would use; use 'Multiple' or capital if only national/global.
       - Pinpoint Lat/Lng for the primary location; use country centroid only if truly national with no city.
       - IF UNCERTAIN: Use Google Search for landmarks, jurisdictions, and metro names.

    3. SPECIALIZED MONITORING: [ICE / BORDER / DOMESTIC]
       - You are highly attuned to US Border activity, ICE operations, and immigration developments.
       - These are always categorized under "Geopolitics" due to their policy impact.

    3b. BUSINESS VS ECONOMY & MARKETS
       - Use "Economy & Markets" for macro and system-level finance: central banks, rates, inflation, sovereign debt, broad indices, trade policy framed as macro, financial stability.
       - Use "Business" for company- and industry-centric stories: M&A, earnings, executive moves, product launches, corporate restructuring, labor disputes at a specific firm, sector news where the primary lens is companies (not macro policy alone).

    4. TAGGING PROTOCOL (up to 20 tags, lowercase, no # character in strings):
       - Aim for rich coverage so users can filter in the UI: geography stack (country, region/state, city or metro if local), 2–6 core and sub-topics, notable entities or org types if relevant, sector/industry, mechanism (policy, markets, military, legal, etc.), and status (ongoing, resolved, alert).
       - Each tag is one slug or short hyphenated phrase (e.g. "south-china-sea", "rate-cut"). No duplicates. Order by importance. Use as many as genuinely apply, up to 20; do not pad with generic filler.

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

      // Post-analysis: normalize, dedupe, cap at 20
      const rawTags = Array.isArray(result.tags) ? result.tags : [];
      const seen = new Set<string>();
      const normalized: string[] = [];
      for (const t of rawTags) {
        const tag = String(t)
          .toLowerCase()
          .replace(/#/g, "")
          .trim()
          .replace(/\s+/g, "-");
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        normalized.push(tag);
        if (normalized.length >= 20) break;
      }
      result.tags = normalized;

      // Final Noise Filter
      if (result.impactScore < 8 && result.category === "Viral / Social") {
        result.category = "Ignore";
      }

      const allowedScopes = ["local", "regional", "national", "global"] as const;
      let gs = String(result.geographicScope ?? "global")
        .toLowerCase()
        .trim();
      if (!allowedScopes.includes(gs as (typeof allowedScopes)[number])) {
        gs = "global";
      }
      result.geographicScope = gs;
      result.adminArea = String(result.adminArea ?? "").trim();

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
