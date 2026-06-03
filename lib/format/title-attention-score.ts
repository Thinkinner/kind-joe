/** Heuristic score for sidebar "worth a click" ranking — not clickbait, just strong hooks. */
export function titleAttentionScore(title: string): number {
  const text = title.trim();
  if (!text) return 0;

  let score = 0;

  if (/\d/.test(text)) score += 3;
  if (/\$[\d,]+|\d+\s*(million|billion|thousand|%)|\d+\.\d+/i.test(text)) score += 2;
  if (/\?/.test(text)) score += 2;
  if (/\b(how|why|what|who|when|where)\b/i.test(text)) score += 1;
  if (/\b(breaking|exclusive|just in|urgent|crisis|arrest|indicted|guilty|verdict)\b/i.test(text)) {
    score += 2;
  }
  if (/\b(ventura|simi valley|oxnard|thousand oaks|los angeles|california|805)\b/i.test(text)) {
    score += 2;
  }

  const words = text.split(/\s+/).length;
  if (words >= 6 && words <= 16) score += 2;
  else if (words >= 4 && words <= 20) score += 1;
  if (words > 22) score -= 2;

  if (text === text.toUpperCase() && text.length > 20) score += 1;

  return score;
}
