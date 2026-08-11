import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  ensureLocalNewsTags,
  getArticlesByTagSlugAction,
  getLocalNewsArticlesAction,
} from "@/lib/actions/articles";
import { articlePublicPath } from "@/lib/brand/article-theme";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary/url";
import { formatTimeAgo } from "@/lib/format/time-ago";
import { formatHeadline } from "@/lib/format/headline";
import { LOCAL_NEWS_REGIONS, textMatchesLocalNewsRegion } from "@/lib/local-news/regions";
import type { ArticleSummary } from "@/types/article";

const REGION_LIMIT = 5;

function regionLabelForArticle(
  article: ArticleSummary,
  regionFallback?: string | null,
): string | null {
  const list = Array.isArray(article.tags) ? article.tags : [];
  for (const region of LOCAL_NEWS_REGIONS) {
    if (
      list.some((t: { slug?: string }) =>
        (region.tagSlugs as readonly string[]).includes(t?.slug ?? ""),
      )
    ) {
      return region.name;
    }
  }
  for (const region of LOCAL_NEWS_REGIONS) {
    if (textMatchesLocalNewsRegion(article.category, region)) {
      return region.name;
    }
  }
  return regionFallback ?? null;
}

function LeadFeature({
  article,
  regionFallback,
  priority = false,
  onDark = false,
}: {
  article: ArticleSummary;
  regionFallback?: string | null;
  priority?: boolean;
  onDark?: boolean;
}) {
  const path = articlePublicPath(article.slug);
  const image = optimizeCloudinaryUrl(
    article.coverImageUrl ?? "/placeholder.jpg",
    { width: 1000 },
  );
  const timeAgo = formatTimeAgo(article.publishedAt ?? null);
  const region = regionLabelForArticle(article, regionFallback);
  const headline = formatHeadline(article.title);

  return (
    <Link href={path} className="group min-w-0">
      <div className="relative h-[200px] w-full overflow-hidden bg-neutral-200 sm:h-[230px] lg:h-[260px]">
        <Image
          src={image}
          alt={headline}
          fill
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="mt-3 space-y-2">
        <div
          className={`flex flex-wrap items-center gap-x-2 text-xs font-medium ${
            onDark ? "text-white/55" : "text-neutral-500"
          }`}
        >
          {region ? (
            <span
              className={`font-semibold ${
                onDark ? "text-red-300" : "text-[#CF1A1E]"
              }`}
            >
              {region}
            </span>
          ) : null}
          {region && timeAgo ? (
            <span className={onDark ? "text-white/25" : "text-neutral-300"}>
              ·
            </span>
          ) : null}
          {timeAgo ? <span>{timeAgo}</span> : null}
        </div>
        <h2
          className={`text-xl font-bold leading-snug tracking-tight transition-colors sm:text-2xl ${
            onDark
              ? "text-white group-hover:text-red-200"
              : "text-neutral-950 group-hover:text-[#CF1A1E]"
          }`}
        >
          {headline}
        </h2>
        {article.excerpt ? (
          <p
            className={`line-clamp-3 text-sm leading-relaxed ${
              onDark ? "text-white/65" : "text-neutral-600"
            }`}
          >
            {article.excerpt}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function SideStoryList({
  articles,
  regionFallback,
  onDark = false,
}: {
  articles: ArticleSummary[];
  regionFallback?: string | null;
  onDark?: boolean;
}) {
  return (
    <div
      className={`min-w-0 divide-y ${
        onDark ? "divide-white/15" : "divide-neutral-200/80"
      }`}
    >
      {articles.map((article) => {
        const path = articlePublicPath(article.slug);
        const timeAgo = formatTimeAgo(article.publishedAt ?? null);
        const region = regionLabelForArticle(article, regionFallback);
        const thumb = optimizeCloudinaryUrl(
          article.coverImageUrl ?? "/placeholder.jpg",
          { width: 280 },
        );

        return (
          <Link
            key={article.id}
            href={path}
            className="group grid grid-cols-[88px_1fr] gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[100px_1fr] sm:gap-4"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
              <Image
                src={thumb}
                alt=""
                fill
                sizes="100px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <div
                className={`mb-1 flex flex-wrap items-center gap-x-2 text-[11px] font-medium ${
                  onDark ? "text-white/55" : "text-neutral-500"
                }`}
              >
                {region ? (
                  <span
                    className={`font-semibold ${
                      onDark ? "text-red-300" : "text-[#CF1A1E]"
                    }`}
                  >
                    {region}
                  </span>
                ) : null}
                {region && timeAgo ? (
                  <span className={onDark ? "text-white/25" : "text-neutral-300"}>
                    ·
                  </span>
                ) : null}
                {timeAgo ? <span>{timeAgo}</span> : null}
              </div>
              <h3
                className={`line-clamp-3 text-sm font-semibold leading-snug transition-colors sm:text-[15px] ${
                  onDark
                    ? "text-white group-hover:text-red-200"
                    : "text-neutral-900 group-hover:text-[#CF1A1E]"
                }`}
              >
                {formatHeadline(article.title)}
              </h3>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function FeatureBoard({
  articles,
  regionFallback,
  reverse = false,
  priorityLead = false,
  onDark = false,
}: {
  articles: ArticleSummary[];
  regionFallback?: string | null;
  reverse?: boolean;
  priorityLead?: boolean;
  onDark?: boolean;
}) {
  const [lead, ...rest] = articles;
  if (!lead) return null;

  const side = rest.slice(0, 4);
  const canReverse = reverse && side.length > 0;

  if (side.length === 0) {
    return (
      <div className={reverse ? "lg:flex lg:justify-end" : undefined}>
        <div className="w-full max-w-xl">
          <LeadFeature
            article={lead}
            regionFallback={regionFallback}
            priority={priorityLead}
            onDark={onDark}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-8 lg:items-start lg:gap-10 ${
        canReverse
          ? "lg:grid-cols-[0.9fr_1.2fr]"
          : "lg:grid-cols-[1.2fr_0.9fr]"
      }`}
    >
      <div className={canReverse ? "lg:order-2" : undefined}>
        <LeadFeature
          article={lead}
          regionFallback={regionFallback}
          priority={priorityLead}
          onDark={onDark}
        />
      </div>
      <div className={canReverse ? "lg:order-1" : undefined}>
        <SideStoryList
          articles={side}
          regionFallback={regionFallback}
          onDark={onDark}
        />
      </div>
    </div>
  );
}

function TopStories({ articles }: { articles: ArticleSummary[] }) {
  if (articles.length === 0) return null;

  return (
    <section
      aria-label="Top local stories"
      className="relative overflow-hidden bg-[#07111f] text-white"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 12% 0%, rgba(37,99,235,0.35), transparent 55%), radial-gradient(ellipse 55% 45% at 90% 95%, rgba(207,26,30,0.14), transparent 50%), linear-gradient(165deg, #0a1628 0%, #0c1a32 35%, #08101c 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-white/15 pb-4">
          <div>
            <p className="text-sm font-semibold text-red-400">Today</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Top local stories
            </h1>
          </div>
          <p className="hidden text-sm text-white/45 sm:block">
            {new Intl.DateTimeFormat("en-US", {
              timeZone: "America/Los_Angeles",
              weekday: "long",
              month: "short",
              day: "numeric",
            }).format(new Date())}
          </p>
        </div>
        <FeatureBoard articles={articles} priorityLead onDark />
      </div>
    </section>
  );
}

function RegionSection({
  region,
  articles,
  reverse,
}: {
  region: (typeof LOCAL_NEWS_REGIONS)[number];
  articles: ArticleSummary[];
  reverse: boolean;
}) {
  return (
    <section
      id={region.slug}
      aria-labelledby={`local-${region.slug}`}
      className="scroll-mt-24"
    >
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-neutral-900 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 ${region.accentBarClass}`}
              aria-hidden
            />
            <h2
              id={`local-${region.slug}`}
              className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl"
            >
              {region.name}
            </h2>
          </div>
        </div>
        <Link
          href={region.href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-neutral-600 transition-colors hover:text-[#CF1A1E]"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="py-6 text-sm text-neutral-500">
          New {region.name} stories will appear here soon.
        </p>
      ) : (
        <FeatureBoard
          articles={articles}
          regionFallback={region.name}
          reverse={reverse}
        />
      )}
    </section>
  );
}

export async function LocalNewsSections() {
  // Keep DB calls sequential: Neon pool is small and Promise.all of
  // ensureLocalNewsTags + 4 article queries was timing out connections.
  await ensureLocalNewsTags();

  const topStories = await getLocalNewsArticlesAction(5, 0);
  const regionBundles: Array<{
    region: (typeof LOCAL_NEWS_REGIONS)[number];
    articles: Awaited<ReturnType<typeof getArticlesByTagSlugAction>>;
  }> = [];

  for (const region of LOCAL_NEWS_REGIONS) {
    regionBundles.push({
      region,
      articles: await getArticlesByTagSlugAction(region.slug, REGION_LIMIT, 0),
    });
  }

  return (
    <>
      <TopStories articles={topStories} />
      <div className="mx-auto max-w-[1100px] space-y-14 px-4 py-10 sm:space-y-16 sm:px-6 sm:py-12 lg:px-8">
        {regionBundles.map(({ region, articles }, index) => (
          <RegionSection
            key={region.slug}
            region={region}
            articles={articles}
            reverse={index % 2 === 0}
          />
        ))}
      </div>
    </>
  );
}
