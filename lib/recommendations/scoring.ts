export type RelatedScoreInput = {
  semanticSimilarity: number;
  tagOverlap: number;
  categoryOverlap: number;
  recency: number;
};

const SCORE_WEIGHTS = {
  semanticSimilarity: 0.65,
  tagOverlap: 0.18,
  categoryOverlap: 0.07,
  recency: 0.1,
} as const;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  if (normA === 0 || normB === 0) return 0;
  const cosine = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return clamp01((cosine + 1) / 2);
}

export function jaccardSimilarity(a: Iterable<string>, b: Iterable<string>): number {
  const setA = new Set(Array.from(a, (item) => item.trim().toLowerCase()).filter(Boolean));
  const setB = new Set(Array.from(b, (item) => item.trim().toLowerCase()).filter(Boolean));

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function recencyScore(
  publishedAt: Date | null,
  now = new Date(),
  halfLifeDays = 14,
): number {
  if (!publishedAt) return 0;
  const ageMs = Math.max(0, now.getTime() - publishedAt.getTime());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const decay = Math.exp((-Math.log(2) * ageDays) / Math.max(1, halfLifeDays));
  return clamp01(decay);
}

export function blendRelatedScore(input: RelatedScoreInput): number {
  const score =
    SCORE_WEIGHTS.semanticSimilarity * clamp01(input.semanticSimilarity) +
    SCORE_WEIGHTS.tagOverlap * clamp01(input.tagOverlap) +
    SCORE_WEIGHTS.categoryOverlap * clamp01(input.categoryOverlap) +
    SCORE_WEIGHTS.recency * clamp01(input.recency);
  return clamp01(score);
}

