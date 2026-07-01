import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

import {
  createSourceFirstArticleJob,
  processSourceFirstArticleJob,
} from "@/lib/agents/source-first-article-jobs";

async function main() {
  const topic =
    process.argv[2]?.trim() ||
    "California HOA flag display rules homeowners";

  console.log("Creating job for:", topic);
  const job = await createSourceFirstArticleJob({ topic });
  console.log("job id:", job.id);

  const result = await processSourceFirstArticleJob(job);
  const words = result.draftMarkdown
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  console.log("status: done");
  console.log("generationMode:", result.sourceFirst.generationMode);
  console.log("sources:", result.sourceFirst.sources.length);
  console.log("limitedSources:", result.sourceFirst.limitedSources);
  console.log("title:", result.title);
  console.log("words:", words);
  console.log("preview:", result.draftMarkdown.slice(0, 300));

  if (words < 420) throw new Error(`Job result too short: ${words} words`);
  console.log("\n✓ Full job pipeline passed");
}

main().catch((e) => {
  console.error("\n✗ Job pipeline failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
