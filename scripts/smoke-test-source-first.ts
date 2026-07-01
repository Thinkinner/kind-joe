import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

import { gatherSourceFirstResearch } from "@/lib/ai/source-first-research";
import {
  generateEditorialTopicArticle,
  generateSourceFirstArticle,
} from "@/lib/ai/article-assist-service";

function countWords(markdown: string): number {
  return markdown
    .replace(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g, " ")
    .replace(/[#*_>`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

async function testResearch(topic: string) {
  console.log("\n=== Research:", topic, "===");
  const research = await gatherSourceFirstResearch(topic, {
    searchLimit: 4,
    minSources: 2,
    requireMinSources: false,
  });
  console.log("sources:", research.sources.length);
  console.log("limitedSources:", research.limitedSources);
  console.log("skipped:", research.skipped.length);
  for (const source of research.sources.slice(0, 3)) {
    console.log(`  - [${source.id}] ${source.publisher}: ${source.title.slice(0, 80)}`);
    console.log(`    url: ${source.url.slice(0, 100)}`);
    console.log(`    extracted: ${source.extractedText.length} chars`);
  }
  return research;
}

async function main() {
  const apiKey = (process.env.GOOGLE_API_KEY ?? "").trim();
  if (!apiKey) {
    console.error("GOOGLE_API_KEY missing — cannot run AI smoke test.");
    process.exit(1);
  }

  const topic =
    process.argv[2]?.trim() ||
    "California homeowners association flag display dispute";

  const research = await testResearch(topic);

  if (research.sources.length >= 1) {
    console.log("\n=== Source-first generation ===");
    const generated = await generateSourceFirstArticle({
      query: research.query,
      sources: research.sources.slice(0, Math.min(research.sources.length, 2)),
    });
    const words = countWords(generated.draftMarkdown);
    console.log("title:", generated.title.slice(0, 100));
    console.log("words:", words);
    console.log("excerpt:", generated.excerpt.slice(0, 120));
    console.log("draft preview:", generated.draftMarkdown.slice(0, 400).replace(/\n/g, " "));
    if (words < 450) {
      throw new Error(`Source-first draft too short: ${words} words`);
    }
  } else {
    console.log("\n=== Editorial fallback generation ===");
    const generated = await generateEditorialTopicArticle({
      query: research.query,
      sources: [],
    });
    const words = countWords(generated.draftMarkdown);
    console.log("title:", generated.title.slice(0, 100));
    console.log("words:", words);
    console.log("excerpt:", generated.excerpt.slice(0, 120));
    console.log("draft preview:", generated.draftMarkdown.slice(0, 400).replace(/\n/g, " "));
    if (words < 420) {
      throw new Error(`Editorial draft too short: ${words} words`);
    }
    if (!/editorial note/i.test(generated.draftMarkdown)) {
      throw new Error("Editorial draft missing Editorial Note section");
    }
  }

  console.log("\n✓ Smoke test passed");
}

main().catch((error) => {
  console.error("\n✗ Smoke test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
