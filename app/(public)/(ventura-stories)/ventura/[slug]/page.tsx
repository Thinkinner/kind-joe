// app/ventura/[slug]/page.tsx
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { DM_Sans } from "next/font/google";

// Actions
import {
  getFullArticleBySlug,
  getArticleCategories,
  getRecommendedArticles,
} from "@/lib/actions/articles";

// Components
import ArticleContent from "@/components/stories/article-single-page-content";
import ShareButtons from "@/components/stories/share-buttons";
import VenturaGetEmail from "@/components/stories/ventura-get-email";
import ArticleTracker from "@/components/article-tracker";
import { RecommendedCard } from "@/components/cards/recommended-card"; // The new horizontal card
import { formatToLA } from "@/lib/format-date";

export const revalidate = 60;

const googleSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-google-sans",
  display: "swap",
});

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getFullArticleBySlug(slug);

  if (!data) return {};
  const { article: a } = data;

  const seo = typeof a.seo === "string" ? JSON.parse(a.seo) : (a.seo as any);
  const title = seo?.title || a.title;
  const description = seo?.description || a.excerpt || undefined;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kindjoe.com";
  const canonicalUrl = seo?.canonical || `${siteUrl}/ventura/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: a.coverImageUrl ? [a.coverImageUrl] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: a.coverImageUrl ? [a.coverImageUrl] : [],
    },
  };
}

export default async function VenturaArticleBySlug(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  // 1. Fetch Primary Data
  const data = await getFullArticleBySlug(slug);
  if (!data) notFound();

  const { article: a, authorName, authorAvatar, tags } = data;

  // 2. 🧠 SAFETY REDIRECT
  // If this article DOES NOT have the ventura-county tag, send it to the main layout
  const hasVenturaTag = tags?.some((t: any) => t.slug === "ventura-county");
  if (!hasVenturaTag) {
    redirect(`/${slug}`);
  }

  // 3. Parallel fetch UI elements (Categories and Smart Recommendations)
  const [cats, recommended] = await Promise.all([
    getArticleCategories(a.id),
    getRecommendedArticles(a.id, a.category, 5), // Priority to same category
  ]);

  const content =
    typeof a.content === "string" ? JSON.parse(a.content) : a.content;

  return (
    <main className={`py-8 ${googleSans.variable}`}>
      <ArticleTracker articleId={a.id} />

      <div className="mx-auto max-w-6xl px-4 lg:px-0">
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(260px,1.4fr)] lg:gap-8">
          {/* MAIN ARTICLE */}
          <article className="lg:pb-8">
            <header className="px-4 lg:px-6 pt-4 pb-3">
              {/* Breadcrumb / Category */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide">
                {cats.length > 0 && (
                  <span className="bg-orange-600 text-white px-2 py-0.5 font-semibold rounded-sm">
                    {cats[0].name}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="mt-4 text-2xl lg:text-[36px] font-extrabold leading-tight tracking-tight text-neutral-900 font-[Poppins]">
                {a.title}
              </h1>

              {/* Ventura Branded Publisher Bar */}
              <div className="mt-6 mb-6 flex items-center justify-between border-y border-neutral-100 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <img
                      src="/brand/ventura-profile.jpg"
                      alt="Joe Knows Ventura"
                      className="h-full w-full rounded-full object-cover ring-2 ring-white shadow-sm border"
                    />
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white">
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-3 h-3"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-900 leading-none">
                      Joe Knows Ventura
                    </span>
                    <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 font-medium">
                      <span>Official Publisher</span>
                      <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
                      <time className="text-neutral-700 font-semibold">
                        {formatToLA(
                          a.publishedAt ?? a.publishAt ?? a.createdAt,
                        )}
                      </time>
                    </div>
                  </div>
                </div>
              </div>

              <ShareButtons />
            </header>

            {/* Hero Image */}
            <div className="mt-4 lg:mt-6 px-4 lg:px-6">
              <div className="overflow-hidden rounded-xl shadow-sm">
                <img
                  src={a.coverImageUrl ?? "/placeholder.jpg"}
                  alt={a.title}
                  className="w-full h-full object-cover aspect-[16/9]"
                />
              </div>
              <div className="mt-2 text-right text-[10px] text-neutral-400 uppercase tracking-wider">
                Image source: Joe Knows Ventura
              </div>
            </div>

            {/* ADSENSE_PAUSED_TOKEN_V1: In-article ad temporarily disabled.
            <section className="mt-6 px-4 lg:px-6">
              <AdsenseUnit
                slot={inlineAdSlot}
                label="In-article ad"
                minHeightClassName="min-h-[140px]"
              />
            </section>
            */}

            {/* Content Area with Orange Links */}
            <div className="mt-8 px-4 lg:px-6">
              <div className="tiptap prose prose-lg prose-neutral max-w-none prose-headings:font-bold prose-a:text-orange-600">
                <ArticleContent value={content} />
              </div>
            </div>
          </article>

          {/* SIDEBAR */}
          <aside className="mt-8 lg:mt-0 space-y-8 lg:sticky lg:top-24 self-start">
            <VenturaGetEmail />

            {/* ADSENSE_PAUSED_TOKEN_V1: Sidebar ad temporarily disabled.
            <section className="px-4 lg:px-0">
              <AdsenseUnit
                slot={sidebarAdSlot}
                label="Sidebar ad"
                minHeightClassName="min-h-[280px]"
              />
            </section>
            */}

            {/* Ventura Promo Box */}
            <section className="px-4 lg:px-0">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 to-orange-300 shadow-xl shadow-orange-500/20">
                <div className="relative p-8 text-white">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10"></div>
                  <div className="relative">
                    <h3 className="text-2xl font-black leading-tight">
                      Joe Knows <br /> Ventura
                    </h3>
                    <p className="mt-3 text-sm font-medium text-orange-50">
                      Local news and featured stories from the 805.
                    </p>
                    <a
                      href="https://www.instagram.com/joeknowsventura/"
                      target="_blank"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-orange-600 shadow-md"
                    >
                      Watch Now
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* RECOMMENDED - Smart Horizontal Cards */}
            <section className="px-4 lg:px-0">
              <h3 className="mb-6 border-b border-neutral-200 pb-2 text-sm font-black uppercase tracking-widest text-neutral-900">
                Recommended
              </h3>
              <div className="flex flex-col gap-6">
                {recommended.map((item) => (
                  <RecommendedCard key={item.id} article={item as any} />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
