export const PREDICTION_CATEGORIES = [
  "general",
  "politics",
  "economy",
  "technology",
  "science",
  "sports",
  "world",
  "culture",
] as const;

export type PredictionCategory = (typeof PREDICTION_CATEGORIES)[number];

export const PREDICTION_CATEGORY_LABELS: Record<PredictionCategory, string> = {
  general: "General",
  politics: "Politics",
  economy: "Economy",
  technology: "Technology",
  science: "Science",
  sports: "Sports",
  world: "World",
  culture: "Culture",
};
