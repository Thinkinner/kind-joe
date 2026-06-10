import "dotenv/config";
import { db } from "@/db";
import { articles, articleTags, tags } from "@/db/schema";
import { and, eq, isNull, isNotNull, lte, or, sql, gte } from "drizzle-orm";
import { resolveArticleContentMarkdown } from "@/lib/content/resolve-article-content-markdown";

const ADSENSE_MIN_WORDS = 600;
const ADSENSE_MIN_EXCERPT_WORDS = 12;
const ADSENSE_MIN_META = 70;
const RECENT_DAYS = Number(process.env.AUDIT_RECENT_DAYS ?? "90");

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~\-|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function publishedWhere(now = new Date()) {
  return and(
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    or(
      and(isNotNull(articles.publishedAt), lte(articles.publishedAt, now)),
      and(
        isNull(articles.publishedAt),
        isNotNull(articles.publishAt),
        lte(articles.publishAt, now),
      ),
    ),
  );
}

type AuditRow = {
  slug: string;
  title: string;
  category: string | null;
  wordCount: number;
  excerptWords: number;
  metaLen: number;
  hasCover: boolean;
  isVentura: boolean;
  readingMinutes: number | null;
  publishedAt: string | null;
  issues: string[];
  status: "pass" | "warn" | "fail";
  url: string;
};

async function main() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS);

  const recentFilter = or(
    gte(articles.publishedAt, cutoff),
    and(isNull(articles.publishedAt), gte(articles.publishAt, cutoff)),
  );

  const rows = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      category: articles.category,
      coverImageUrl: articles.coverImageUrl,
      readingMinutes: articles.readingMinutes,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      seo: articles.seo,
      content: articles.content,
      contentMarkdown: articles.contentMarkdown,
      contentHtml: articles.contentHtml,
      isVentura: sql<boolean>`bool_or(${tags.slug} = 'ventura-county')`,
    })
    .from(articles)
    .leftJoin(articleTags, eq(articleTags.articleId, articles.id))
    .leftJoin(tags, eq(tags.id, articleTags.tagId))
    .where(and(publishedWhere(now), recentFilter))
    .groupBy(
      articles.slug,
      articles.title,
      articles.excerpt,
      articles.category,
      articles.coverImageUrl,
      articles.readingMinutes,
      articles.publishedAt,
      articles.publishAt,
      articles.seo,
      articles.content,
      articles.contentMarkdown,
      articles.contentHtml,
    )
    .orderBy(sql`coalesce(${articles.publishedAt}, ${articles.publishAt}) desc`);

  const audits: AuditRow[] = rows.map((row) => {
    const markdown =
      resolveArticleContentMarkdown({
        contentMarkdown: row.contentMarkdown,
        content: row.content,
        contentHtml: row.contentHtml,
      }) ?? "";
    const plain = stripMarkdown(markdown);
    const wordCount = countWords(plain);
    const excerptWords = countWords(row.excerpt ?? "");

    const seoRaw =
      typeof row.seo === "string"
        ? (JSON.parse(row.seo) as { description?: string })
        : ((row.seo as { description?: string } | null) ?? {});
    const metaLen = (seoRaw.description ?? "").trim().length;

    const issues: string[] = [];
    if (wordCount < ADSENSE_MIN_WORDS) {
      issues.push(`Body ${wordCount} words (need ${ADSENSE_MIN_WORDS}+)`);
    }
    if (excerptWords < ADSENSE_MIN_EXCERPT_WORDS) {
      issues.push(`Excerpt too short (${excerptWords} words)`);
    }
    if (metaLen === 0) {
      issues.push("Missing meta description");
    } else if (metaLen < ADSENSE_MIN_META) {
      issues.push(`Meta description short (${metaLen} chars)`);
    }
    if (!row.coverImageUrl) {
      issues.push("Missing cover image");
    }

    let status: AuditRow["status"] = "pass";
    if (wordCount < ADSENSE_MIN_WORDS) status = "fail";
    else if (issues.length > 0) status = "warn";

    const isVentura = Boolean(row.isVentura);
    const url = isVentura ? `/ventura/${row.slug}` : `/${row.slug}`;

    return {
      slug: row.slug,
      title: row.title,
      category: row.category,
      wordCount,
      excerptWords,
      metaLen,
      hasCover: Boolean(row.coverImageUrl),
      isVentura,
      readingMinutes: row.readingMinutes,
      publishedAt: (row.publishedAt ?? row.publishAt)?.toISOString() ?? null,
      issues,
      status,
      url,
    };
  });

  const pass = audits.filter((a) => a.status === "pass");
  const warn = audits.filter((a) => a.status === "warn");
  const fail = audits.filter((a) => a.status === "fail");

  const buckets = {
    under300: audits.filter((a) => a.wordCount < 300).length,
    under600: audits.filter((a) => a.wordCount < 600).length,
    over600: audits.filter((a) => a.wordCount >= 600).length,
    over1000: audits.filter((a) => a.wordCount >= 1000).length,
  };

  console.log(`\n=== AdSense Article Audit (last ${RECENT_DAYS} days) ===\n`);
  console.log(`Total published: ${audits.length}`);
  console.log(`PASS: ${pass.length} | WARN: ${warn.length} | FAIL: ${fail.length}`);
  console.log(`Word counts: <300=${buckets.under300} | <600=${buckets.under600} | 600+=${buckets.over600} | 1000+=${buckets.over1000}`);

  console.log(`\n--- FAIL (${fail.length}) — under 600 words ---`);
  for (const a of fail) {
    console.log(`  [${a.wordCount}w] ${a.title.slice(0, 72)}`);
    console.log(`         ${a.url} | ${a.issues.join("; ")}`);
  }

  if (warn.length > 0) {
    console.log(`\n--- WARN (${warn.length}) — 600+ words but other issues ---`);
    for (const a of warn) {
      console.log(`  [${a.wordCount}w] ${a.title.slice(0, 72)}`);
      console.log(`         ${a.url} | ${a.issues.join("; ")}`);
    }
  }

  console.log(`\n--- PASS (${pass.length}) — AdSense baseline met ---`);
  for (const a of pass) {
    console.log(`  [${a.wordCount}w] ${a.title.slice(0, 72)}`);
    console.log(`         ${a.url}`);
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
