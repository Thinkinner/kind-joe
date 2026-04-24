"use server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import {
  NewsletterData,
  RawRssItem,
  PersonalizationConfig,
  NewsletterStory,
} from "@/lib/(newsletter-automations)/types";
import { SYSTEM_INSTRUCTION } from "@/lib/(newsletter-automations)/constants";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

const NEWSLETTER_MODEL =
  process.env.GEMINI_NEWSLETTER_MODEL ?? "gemini-3-flash-preview";

async function assertNewsletterStaff() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) throw new Error("Unauthorized");
}

const getClient = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not found in environment variables");
  return new GoogleGenAI({ apiKey });
};

async function retry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 2500,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status >= 500)) {
      console.warn(`Gemini busy/glitching. Retrying... (${retries} left)`);
      await new Promise((res) => setTimeout(res, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * IMPROVED JSON CLEANER: Handles Markdown blocks (```json ... ```)
 */
const cleanJson = (text: string): string => {
  if (!text) return "{}";

  // 1. First, strip out common markdown code fences characters
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "");

  // 2. Now locate the outer JSON brackets
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  // 3. Validate indices to ensure we have a potential object
  if (start === -1 || end === -1 || start >= end) return cleaned.trim();

  // 4. Return just the JSON part
  return cleaned.substring(start, end + 1).trim();
};

function extractBalancedJsonObject(text: string): string | null {
  const source = (text || "").trim();
  if (!source) return null;

  const start = source.indexOf("{");
  if (start < 0) return null;

  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

function parseGeneratedJson<T>(rawText: string): T {
  const candidates = [
    rawText,
    cleanJson(rawText),
    extractBalancedJsonObject(rawText),
    extractBalancedJsonObject(cleanJson(rawText)),
  ].filter((value): value is string => Boolean(value && value.trim()));

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);

    try {
      return JSON.parse(trimmed) as T;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Unable to parse model JSON payload.");
}

function normalizeSubject(raw: string): string {
  return raw
    .replace(/[’]/g, "'")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(here(?:'s| is)\s+(?:the\s+)?)?subject\s*[:\-]\s*/i, "")
    .replace(/^(email\s+)?subject\s*[:\-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SUBJECT_HARD_MAX_WORDS = 10;
const SUBJECT_PREFERRED_MAX_WORDS = 6;

function subjectWords(value: string): string[] {
  return value
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function finalizeSubjectCandidate(raw: string): string {
  const cleaned = normalizeSubject(raw);
  if (!cleaned) return "";

  const words = subjectWords(cleaned);
  if (!words.length) return "";
  if (words.length <= SUBJECT_HARD_MAX_WORDS) return cleaned;

  const truncated = words.slice(0, SUBJECT_HARD_MAX_WORDS);
  const trailingStopWords = new Set(["the", "a", "an", "and", "or", "of", "to", "for", "with", "from", "in", "on"]);
  while (truncated.length > 4 && trailingStopWords.has(truncated[truncated.length - 1].toLowerCase())) {
    truncated.pop();
  }
  return truncated.join(" ").trim();
}

function tightenSubjectForInbox(raw: string): string {
  const normalized = finalizeSubjectCandidate(raw);
  if (!normalized) return "";

  const words = subjectWords(normalized);
  if (words.length <= SUBJECT_PREFERRED_MAX_WORDS) return normalized;

  const fillerWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "for",
    "with",
    "from",
    "in",
    "on",
    "at",
    "as",
    "amid",
    "after",
    "following",
    "over",
    "under",
    "into",
  ]);

  const compact = words.filter(
    (word, idx) => !(idx > 0 && fillerWords.has(word.toLowerCase())),
  );
  const candidateWords = compact.length >= 4 ? compact : words;
  return candidateWords.slice(0, SUBJECT_PREFERRED_MAX_WORDS).join(" ").trim();
}

function isBoilerplateLine(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    !v ||
    v === "here is" ||
    v === "here's" ||
    v === "here is the" ||
    v === "here's the" ||
    v === "here is the subject" ||
    v === "here's the subject" ||
    v === "here is subject" ||
    v === "here's subject" ||
    v === "subject" ||
    v === "email subject" ||
    v === "here is the json requested" ||
    v === "here's the json requested" ||
    v === "json requested" ||
    v === "here is the json" ||
    v === "here's the json"
  );
}

function isWeakSubjectCandidate(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (isBoilerplateLine(v)) return true;

  const alphaNumChars = v.replace(/[^a-z0-9]/gi, "");
  if (alphaNumChars.length < 3) return true;

  const words = subjectWords(v.toLowerCase());

  if (!words.length) return true;
  if (words.length > 10) return true;
  if (words.length === 1 && words[0].length < 3) return true;

  const weakPatterns = [
    /^here(?:'s| is)(?:\s+the)?$/i,
    /^(email\s+)?subject(?:\s+line)?$/i,
  ];
  if (weakPatterns.some((rx) => rx.test(v))) return true;

  return false;
}

function extractSubjectFromText(text: string): string {
  if (!text) return "";

  const cleanedJson = cleanJson(text);
  try {
    const parsed = JSON.parse(cleanedJson) as { subject?: unknown; title?: unknown };
    const fromJson =
      typeof parsed.subject === "string"
        ? parsed.subject
        : typeof parsed.title === "string"
          ? parsed.title
          : "";
    const normalized = finalizeSubjectCandidate(fromJson);
    if (normalized && !isWeakSubjectCandidate(normalized)) return normalized;
  } catch {
    // Non-JSON fallback below.
  }

  const stripped = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const subjectMatch = stripped.match(/(?:email\s+)?subject\s*[:\-]\s*(.+)/i);
  if (subjectMatch?.[1]) {
    const fromMatch = finalizeSubjectCandidate(subjectMatch[1]);
    if (fromMatch && !isWeakSubjectCandidate(fromMatch)) return fromMatch;
  }

  const firstLine = stripped.split(/\r?\n/).find((line) => line.trim()) || "";
  const normalizedLine = finalizeSubjectCandidate(firstLine);
  if (normalizedLine && !isWeakSubjectCandidate(normalizedLine)) return normalizedLine;

  const nextLine = stripped
    .split(/\r?\n/)
    .map((line) => finalizeSubjectCandidate(line))
    .find((line) => line && !isWeakSubjectCandidate(line));
  if (nextLine) return nextLine;

  const normalizedAll = finalizeSubjectCandidate(stripped);
  return isWeakSubjectCandidate(normalizedAll) ? "" : normalizedAll;
}

function fallbackSubjectFromLeadStory(leadStory: NewsletterStory): string {
  const rawHeadline = (leadStory.headline || "").trim();
  if (!rawHeadline) return "Top Story Update";

  // Drop source/presenter prefix patterns like "Bessent: ...".
  const colonIndex = rawHeadline.indexOf(":");
  const candidate =
    colonIndex > 0 && rawHeadline.slice(0, colonIndex).trim().split(/\s+/).length <= 4
      ? rawHeadline.slice(colonIndex + 1).trim()
      : rawHeadline;

  const words = candidate
    .replace(/[’]/g, "'")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 || /^\d$/.test(w));

  if (!words.length) return "Top Story Update";

  const picked = finalizeSubjectCandidate(words.join(" "));
  return picked || "Top Story Update";
}

const emailSubjectSuggestSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    subject: {
      type: Type.STRING,
      description:
        "Inbox email subject: max 6 words preferred, 10 hard cap; hook from Story 1 only",
    },
  },
  required: ["subject"],
};

const newsletterSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description:
        "Email subject line: ≤6 words when possible (10 max). MUST reflect Story 1 (first in stories) — hook, stakes, shock, value. No 'Daily Brief', dates, or generic digest labels.",
    },
    intro: { type: Type.STRING },
    stories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slotName: { type: Type.STRING },
          category: { type: Type.STRING },
          headline: { type: Type.STRING },
          summary: {
            type: Type.STRING,
            description: "Intro + 3 bullets starting with •",
          },
          imageUrl: { type: Type.STRING },
          sourceUrl: { type: Type.STRING },
          sourceName: { type: Type.STRING },
        },
        required: [
          "slotName",
          "category",
          "headline",
          "summary",
          "sourceUrl",
          "sourceName",
        ],
      },
    },
    signOff: { type: Type.STRING },
  },
  required: ["title", "intro", "stories", "signOff"],
};

/**
 * COMPACT ARTICLE SCHEMA
 */
const articleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    slug: { type: Type.STRING },
    title: { type: Type.STRING },
    excerpt: { type: Type.STRING },
    contentHtml: { type: Type.STRING, description: "Full HTML article body" },
    seoTitle: { type: Type.STRING },
    seoDescription: { type: Type.STRING },
    seoKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    readingMinutes: { type: Type.INTEGER },
  },
  required: [
    "slug",
    "title",
    "excerpt",
    "contentHtml",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "readingMinutes",
  ],
};

const singleStorySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    slotName: { type: Type.STRING },
    category: { type: Type.STRING },
    headline: { type: Type.STRING },
    summary: { type: Type.STRING },
    imageUrl: { type: Type.STRING },
    sourceUrl: { type: Type.STRING },
    sourceName: { type: Type.STRING },
  },
  required: [
    "slotName",
    "category",
    "headline",
    "summary",
    "sourceUrl",
    "sourceName",
    "imageUrl",
  ],
};

type GenAIClient = ReturnType<typeof getClient>;

async function generateEmailSubjectFromLeadStory(
  ai: GenAIClient,
  leadStory: NewsletterStory,
): Promise<string> {
  return retry(async () => {
    const response = await ai.models.generateContent({
      model: NEWSLETTER_MODEL,
      contents: `Create ONLY the inbox email subject line for this LEAD story (Story 1 in a newsletter).

Headline: ${leadStory.headline}
Category: ${leadStory.category || "News"}
Summary: ${(leadStory.summary || "").slice(0, 1200)}

Rules (follow strictly):
- Base the hook ONLY on this story’s stakes, conflict, or surprise—not a generic digest title.
- Keep it short and direct: target 4-6 words (hard reject if over 6).
- Punchy: curiosity, shock, value, power, money, or urgency. Credible; do not invent facts.
- No emoji. No "Daily Brief", "Newsletter", "Recap", month/day/year dates, or ALL CAPS.
- Output JSON only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: emailSubjectSuggestSchema,
        temperature: 0.35,
        maxOutputTokens: 128,
      },
    });
    const s = extractSubjectFromText(response.text || "");
    if (!s) {
      const fallback = fallbackSubjectFromLeadStory(leadStory);
      console.warn("newsletter_subject_fallback_used", {
        leadHeadline: leadStory.headline,
        fallback,
      });
      return tightenSubjectForInbox(fallback);
    }
    return tightenSubjectForInbox(s);
  });
}

/**
 * Suggest inbox email subject from Story 1 (lead): short, hooky, Story-1–anchored.
 */
export const suggestNewsletterEmailSubject = async (
  leadStory: NewsletterStory | null | undefined,
): Promise<string> => {
  await assertNewsletterStaff();
  if (!leadStory?.headline?.trim()) {
    throw new Error("Add Story 1 with a headline first.");
  }
  const ai = getClient();
  return generateEmailSubjectFromLeadStory(ai, leadStory);
};

/**
 * GENERATE FULL NEWSLETTER (Initial Draft)
 */
export const generateNewsletter = async (
  rawItems: RawRssItem[],
  config: PersonalizationConfig,
): Promise<NewsletterData> => {
  await assertNewsletterStaff();
  const ai = getClient();

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. CRITICAL: Sort ALL items by pubDate descending (Newest first)
  const sortedItems = [...rawItems].sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    // Fallback to 0 if date parsing fails, but generally puts newest first
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });

  // 2. Filter for the last 24 hours
  let latestItems = sortedItems.filter((item) => {
    const itemDate = new Date(item.pubDate);
    return itemDate >= twentyFourHoursAgo;
  });

  // 3. SAFE FALLBACK: If under 10 items, fall back to 48 hours instead of infinity
  if (latestItems.length < 10) {
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    latestItems = sortedItems.filter((item) => {
      const itemDate = new Date(item.pubDate);
      return itemDate >= fortyEightHoursAgo;
    });
  }

  console.log(
    `Filtering complete. Total items: ${rawItems.length}. Items from last 24-48h: ${latestItems.length}`,
  );

  // Because it's sorted, slice(0, 75) guarantees the absolute newest 75 articles
  const selectionPool = latestItems.slice(0, 75);

  const inputData = selectionPool.map((item) => ({
    title: item.title,
    snippet: item.contentSnippet,
    source: item.sourceName,
    url: item.link,
    imageUrl: item.imageUrl,
    date: item.pubDate,
  }));

  // 4. Give the AI the exact current time so it knows what "Today" means
  const currentDateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });

  const personaHints = [
    config.contentStrategy?.trim() &&
      `Editor content strategy:\n${config.contentStrategy.trim()}`,
    config.writingStyle?.trim() &&
      `Voice / writing style:\n${config.writingStyle.trim()}`,
    config.exampleContent?.trim() &&
      `Example newsletter (match tone & structure where helpful):\n${config.exampleContent.trim().slice(0, 6000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    return await retry(async () => {
      const response = await ai.models.generateContent({
        model: NEWSLETTER_MODEL,
        contents: `Today is ${currentDateString}.
${personaHints ? `\n${personaHints}\n` : ""}
Build the newsletter from these articles. Discard older dates if a newer/trending story exists: ${JSON.stringify(inputData)}

REMINDER — JSON field "title": This is the email inbox subject line. It MUST be derived from Story 1 (the first story you put in "stories") — short hook, ≤6 words when possible, never more than 10 words. Spicy, high-stakes, curiosity-driving. Not a newsletter name or date.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          // 5. CRITICAL: Give it Google Search so it knows what is ACTUALLY trending globally today
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: newsletterSchema,
          temperature: 0.3,
        },
      });

      let data: NewsletterData;
      try {
        data = parseGeneratedJson<NewsletterData>(response.text || "{}");
      } catch (e) {
        console.error(
          "Newsletter JSON Parse Error. Raw text:\n",
          response.text,
        );
        throw new Error("AI generated malformed newsletter data. Try again.");
      }

      data.date = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      });

      if (data.stories?.[0] && (!data.title || !data.title.trim())) {
        try {
          data.title = await generateEmailSubjectFromLeadStory(
            ai,
            data.stories[0],
          );
        } catch {
          /* leave title empty; user can use Suggest from Story 1 */
        }
      }

      return data;
    });
  } catch (error) {
    console.error("Gemini Newsletter Error:", error);
    throw error;
  }
};

/**
 * GENERATE FULL ARTICLE CONTENT
 */
export const generateFullArticleContent = async (story: NewsletterStory) => {
  await assertNewsletterStaff();
  const ai = getClient();
  const now = new Date();
  const currentDateTimeString = now.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
  });

  // SIMPLIFIED PROMPT: Removed complex <br/> requirements to reduce JSON errors.
  // We let the frontend handle spacing between paragraphs.
  const prompt = `As-of timestamp (use this as "now"): ${currentDateTimeString}.

Research and write a 300-400 word news article for: ${story.headline}.
Context: ${story.summary}

Timeliness and title rules (critical):
- Treat people/titles based on the as-of timestamp above and grounded web results.
- Do NOT use stale role labels.
- Only call someone "former" if they are truly former as of the timestamp.
- Example: if Donald Trump is the sitting U.S. president as of the timestamp, write "President Donald Trump" (not "former president Donald Trump").

Formatting rules:
- Use ONLY <p> tags for 'contentHtml'. Do not add extra line breaks like <br>.
- Return a series of paragraphs.
- Each <p> must contain EXACTLY 2 sentences only.
- Repeat this format until the total article reaches ~300-400 words.`;

  return retry(async () => {
    const response = await ai.models.generateContent({
      model: NEWSLETTER_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: articleSchema,
        temperature: 0.4,
        maxOutputTokens: 8192,
      },
    });

    let parsed;

    try {
      parsed = parseGeneratedJson<{
        slug: string;
        title: string;
        excerpt: string;
        contentHtml: string;
        seoTitle: string;
        seoDescription: string;
        seoKeywords: string[];
        readingMinutes: number;
      }>(response.text || "{}");
    } catch (e) {
      // CRITICAL LOGGING: This will show up in your terminal if it fails again.
      console.error(
        "Article JSON Parse Error.\n--- RAW TEXT START ---\n",
        response.text,
        "\n--- RAW TEXT END ---",
      );
      throw new Error(
        "The AI generated malformed data. Please click 'Generate' again.",
      );
    }

    const sources =
      response.candidates?.[0]?.groundingMetadata?.searchEntryPoint
        ?.renderedContent;

    return { ...parsed, content: parsed.contentHtml, sources };
  });
};

/**
 * REGENERATE SINGLE STORY CARD
 */
export const regenerateSingleStory = async (
  currentStory: NewsletterStory,
  instruction: string,
  sourcePool?: RawRssItem[],
): Promise<NewsletterStory> => {
  await assertNewsletterStaff();
  const ai = getClient();
  return retry(async () => {
    const response = await ai.models.generateContent({
      model: NEWSLETTER_MODEL,
      contents: `Task: ${instruction}. Context: ${JSON.stringify(
        currentStory,
      )}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: singleStorySchema,
        temperature: 0.4,
      },
    });

    try {
      return parseGeneratedJson<NewsletterStory>(response.text || "{}");
    } catch (e) {
      console.error("Regen JSON Parse Error. Raw text:\n", response.text);
      throw new Error("AI generated malformed data. Please try again.");
    }
  });
};

export const generateStoryFromSelectedArticle = async (
  selectedItem: RawRssItem,
  targetSlotName: string,
): Promise<NewsletterStory> => {
  await assertNewsletterStaff();
  const ai = getClient();

  return retry(async () => {
    const articleUrl = (selectedItem.link || "").trim();
    const sourceSnippet = (
      selectedItem.contentSnippet ||
      selectedItem.content ||
      ""
    ).slice(0, 6000);
    const sourceTitle = (selectedItem.title || "").trim();

    const prompt = `
      You are an expert news editor writing in a clean, fast, and uncensored "news-wire" style. 
      I have manually selected a specific article to replace the story in the slot: "${targetSlotName}".
      
      ARTICLE DETAILS:
      Title: ${sourceTitle || "(not provided)"}
      Source: ${selectedItem.sourceName}
      URL: ${articleUrl || "(none provided)"}
      Content Snippet / Notes: ${sourceSnippet || "(none provided)"}

      TASK:
      Write exactly ONE story formatted perfectly for the newsletter slot "${targetSlotName}".

      SOURCEING RULES (CRITICAL):
      - If a URL is provided, prioritize that URL as the primary source and validate details from it.
      - If only notes are provided, rely on those notes and your grounded web checks when needed.
      - Do not invent facts. If uncertain, keep claims conservative.
      
      STRICT FORMATTING RULES for the 'summary' field (CRITICAL):
      1. INTRO: Write EXACTLY 1 to 2 short sentences total. Combine the Who/What/Where into a tight, punchy intro. Do NOT write a long paragraph.
      2. BULLETS: Follow the intro with EXACTLY 3 bullet points starting with "• ". Each bullet must be a single, short sentence detailing a key fact.

      EXAMPLE OF EXACT EXPECTED LENGTH AND TONE FOR 'summary':
      The Senate Homeland Security Committee narrowly approved Sen. Markwayne Mullin to lead the Department of Homeland Security.

      • The nomination advanced despite a public clash between Mullin and Committee Chair Rand Paul.
      • Democrats provided the necessary votes to move the nomination to the full Senate floor.
      • The move comes as the department remains unfunded, causing operational breakdowns at borders and airports.
    `;

    const response = await ai.models.generateContent({
      model: NEWSLETTER_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: singleStorySchema,
        temperature: 0.2,
      },
    });

    try {
      const parsedStory = parseGeneratedJson<NewsletterStory>(
        response.text || "{}",
      );

      // Force the source data to match the selected article exactly so AI doesn't hallucinate it
      return {
        ...parsedStory,
        slotName: targetSlotName,
        sourceUrl: selectedItem.link,
        sourceName: selectedItem.sourceName,
        imageUrl: parsedStory.imageUrl || selectedItem.imageUrl || "",
      };
    } catch (e) {
      console.error(
        "Single Story Regen JSON Parse Error. Raw text:\n",
        response.text,
      );
      throw new Error("AI generated malformed data. Please try again.");
    }
  });
};
