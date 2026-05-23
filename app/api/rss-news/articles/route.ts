import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { newsRssArticles, newsRssSource } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveInt(raw: string | null, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalBoolean(raw: string | null): boolean | undefined {
  if (!raw) return undefined;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

function parseCsvInts(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function parseCsvStrings(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function isAuthorized(request: Request): boolean {
  const secret = (process.env.RSS_NEWS_READ_API_KEY || "").trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader === `Bearer ${secret}`) return true;

  const apiKeyHeader = (request.headers.get("x-api-key") || "").trim();
  return apiKeyHeader === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    console.warn("[rss-news/articles] unauthorized request", {
      ip: requestIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const configuredMaxLimit = parsePositiveInt(
    process.env.RSS_NEWS_READ_MAX_LIMIT || "200",
    200,
  );
  const maxLimit = Math.min(configuredMaxLimit, 500);
  const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 50), maxLimit);
  const cursorId = parsePositiveInt(searchParams.get("cursor"), 0);
  const offset = Math.min(parsePositiveInt(searchParams.get("offset"), 0), 5000);
  const sourceId = parsePositiveInt(searchParams.get("sourceId"), 0);
  const sourceIds = parseCsvInts(searchParams.get("sourceIds"));
  const ids = parseCsvInts(searchParams.get("ids"));
  const aiProcessed = parseOptionalBoolean(searchParams.get("aiProcessed"));
  const hasImage = parseOptionalBoolean(searchParams.get("hasImage"));
  const q = (searchParams.get("q") || "").trim();
  const createdFrom = parseDate(searchParams.get("createdFrom"));
  const createdTo = parseDate(searchParams.get("createdTo"));
  const publishedFrom = parseDate(searchParams.get("publishedFrom"));
  const publishedTo = parseDate(searchParams.get("publishedTo"));
  const sortByRaw = (searchParams.get("sortBy") || "id").trim();
  const sortOrderRaw = (searchParams.get("sortOrder") || "desc").trim().toLowerCase();
  const sortOrder: "asc" | "desc" = sortOrderRaw === "asc" ? "asc" : "desc";
  const fields = new Set(parseCsvStrings(searchParams.get("fields")));

  const sortBy: "id" | "publishedAt" | "createdAt" =
    sortByRaw === "publishedAt" || sortByRaw === "createdAt" ? sortByRaw : "id";

  const conditions: SQL[] = [];
  if (cursorId > 0) conditions.push(lt(newsRssArticles.id, cursorId));
  if (sourceId > 0) conditions.push(eq(newsRssArticles.sourceId, sourceId));
  if (sourceIds.length > 0) conditions.push(inArray(newsRssArticles.sourceId, sourceIds));
  if (ids.length > 0) conditions.push(inArray(newsRssArticles.id, ids));
  if (typeof aiProcessed === "boolean") {
    conditions.push(eq(newsRssArticles.aiProcessed, aiProcessed));
  }
  if (typeof hasImage === "boolean") {
    conditions.push(hasImage ? isNotNull(newsRssArticles.imageUrl) : isNull(newsRssArticles.imageUrl));
  }
  if (q.length > 0) {
    const likeQuery = `%${q}%`;
    conditions.push(
      or(
        ilike(newsRssArticles.title, likeQuery),
        ilike(newsRssArticles.modifiedTitle, likeQuery),
        ilike(newsRssArticles.contentSnippet, likeQuery),
      )!,
    );
  }
  if (createdFrom) conditions.push(gte(newsRssArticles.createdAt, createdFrom));
  if (createdTo) conditions.push(lte(newsRssArticles.createdAt, createdTo));
  if (publishedFrom) conditions.push(gte(newsRssArticles.publishedAt, publishedFrom));
  if (publishedTo) conditions.push(lte(newsRssArticles.publishedAt, publishedTo));

  const defaultFields = new Set([
    "id",
    "sourceId",
    "sourceName",
    "sourceUrl",
    "title",
    "modifiedTitle",
    "link",
    "imageUrl",
    "publishedAt",
    "createdAt",
    "aiProcessed",
  ]);
  const activeFields = fields.size > 0 ? fields : defaultFields;
  const includeSnippet = activeFields.has("contentSnippet");

  const orderBy =
    sortBy === "publishedAt"
      ? sortOrder === "asc"
        ? asc(newsRssArticles.publishedAt)
        : desc(newsRssArticles.publishedAt)
      : sortBy === "createdAt"
        ? sortOrder === "asc"
          ? asc(newsRssArticles.createdAt)
          : desc(newsRssArticles.createdAt)
        : sortOrder === "asc"
          ? asc(newsRssArticles.id)
          : desc(newsRssArticles.id);

  const rows = await db
    .select({
      id: newsRssArticles.id,
      sourceId: newsRssArticles.sourceId,
      sourceName: newsRssSource.name,
      sourceUrl: newsRssSource.url,
      title: newsRssArticles.title,
      modifiedTitle: newsRssArticles.modifiedTitle,
      link: newsRssArticles.link,
      imageUrl: newsRssArticles.imageUrl,
      ...(includeSnippet ? { contentSnippet: newsRssArticles.contentSnippet } : {}),
      publishedAt: newsRssArticles.publishedAt,
      createdAt: newsRssArticles.createdAt,
      aiProcessed: newsRssArticles.aiProcessed,
    })
    .from(newsRssArticles)
    .innerJoin(newsRssSource, eq(newsRssArticles.sourceId, newsRssSource.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .offset(offset)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const canUseCursorPagination =
    sortBy === "id" && sortOrder === "desc" && offset === 0;
  const nextCursor =
    hasMore && canUseCursorPagination
      ? pageRows[pageRows.length - 1]?.id ?? null
      : null;

  console.info("[rss-news/articles] read", {
    ip: requestIp(request),
    limit,
    offset,
    count: pageRows.length,
    hasSnippet: activeFields.has("contentSnippet"),
    hasQuery: q.length > 0,
  });

  return NextResponse.json({
    success: true,
    count: pageRows.length,
    limit,
    maxLimit,
    offset,
    sortBy,
    sortOrder,
    nextCursor,
    hasMore,
    items: pageRows.map((row) => ({
      ...(activeFields.has("id") ? { id: row.id } : {}),
      ...(activeFields.has("sourceId") ? { sourceId: row.sourceId } : {}),
      ...(activeFields.has("sourceName")
        ? { sourceName: row.sourceName }
        : {}),
      ...(activeFields.has("sourceUrl") ? { sourceUrl: row.sourceUrl } : {}),
      ...(activeFields.has("title") ? { title: row.title } : {}),
      ...(activeFields.has("modifiedTitle")
        ? { modifiedTitle: row.modifiedTitle }
        : {}),
      ...(activeFields.has("link") ? { link: row.link } : {}),
      ...(activeFields.has("imageUrl") ? { imageUrl: row.imageUrl } : {}),
      ...(activeFields.has("contentSnippet")
        ? { contentSnippet: row.contentSnippet }
        : {}),
      ...(activeFields.has("publishedAt")
        ? { publishedAt: row.publishedAt?.toISOString?.() ?? null }
        : {}),
      ...(activeFields.has("createdAt")
        ? { createdAt: row.createdAt?.toISOString?.() ?? null }
        : {}),
      ...(activeFields.has("aiProcessed")
        ? { aiProcessed: row.aiProcessed }
        : {}),
    })),
  });
}
