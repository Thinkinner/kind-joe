import "dotenv/config";
import { getArticlesAction, getEditorsPicksAction } from "@/lib/actions/articles";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveArticleContentMarkdown } from "@/lib/content/resolve-article-content-markdown";

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripMarkdown(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~\-|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function auditSlug(slug: string, label: string) {
  const [row] = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      seo: articles.seo,
      content: articles.content,
      contentMarkdown: articles.contentMarkdown,
      contentHtml: articles.contentHtml,
    })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);
  if (!row) {
    console.log(`[MISSING] ${label}: ${slug}`);
    return;
  }
  const md =
    resolveArticleContentMarkdown({
      contentMarkdown: row.contentMarkdown,
      content: row.content,
      contentHtml: row.contentHtml,
    }) ?? "";
  const wc = countWords(stripMarkdown(md));
  const seo =
    typeof row.seo === "string"
      ? (JSON.parse(row.seo) as { description?: string })
      : ((row.seo as { description?: string } | null) ?? {});
  const metaLen = (seo.description ?? "").trim().length;
  const status = wc >= 600 ? "PASS" : "FAIL";
  console.log(`[${status}] ${wc}w | ${label} | ${row.title.slice(0, 65)}`);
  console.log(`        /${slug}`);
  if (wc < 600) console.log(`        Issue: only ${wc} words (need 600+)`);
  if (!row.coverImageUrl) console.log(`        Issue: missing cover image`);
  if (metaLen === 0) console.log(`        Issue: missing meta description`);
  else if (metaLen < 70) console.log(`        Issue: meta only ${metaLen} chars`);
}

async function main() {
  const latest = await getArticlesAction(9, 0);
  const picks = await getEditorsPicksAction(5);

  console.log("\n=== HOMEPAGE: Latest grid (first 9) ===\n");
  for (const a of latest) await auditSlug(a.slug, "Latest");

  console.log("\n=== HOMEPAGE: Editor's picks (5) ===\n");
  for (const a of picks) await auditSlug(a.slug, "Pick");
}

void main();
