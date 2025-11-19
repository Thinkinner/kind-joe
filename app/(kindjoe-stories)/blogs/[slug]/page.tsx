import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HeddaStyleArticle } from "@/components/stories/demo-article-layout";
import { articlesData } from "@/data/articlesData";
import type { ArticleData } from "@/types/demo-articles";

type Props = {
  params: Promise<{ slug: string }>; // 👈 fix for async params
};

/**
 * Generate static params for all article slugs
 */
export function generateStaticParams() {
  return (articlesData as ArticleData[]).map((a) => ({
    slug: a.slug, // use the existing slug field
  }));
}

/**
 * Generate metadata for OpenGraph / Twitter cards
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; // ✅ await params

  const article = (articlesData as ArticleData[]).find(
    (a) => a.slug === slug
  );

  if (!article) {
    return { title: "Article not found" };
  }

  const title = article.title;
  const description = article.dek || "Read the full story on KindJoe.";

  const ogUrl: string =
    article.image || article.coverImage?.src || "/articles/hedda-1.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: ogUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

/**
 * Article Page
 */
export default async function ArticleSlugPage({ params }: Props) {
  const { slug } = await params; // ✅ await params here too

  const article = (articlesData as ArticleData[]).find(
    (a) => a.slug === slug
  );

  if (!article) notFound();

  const imageSrc: string =
    article.image || article.coverImage?.src || "/articles/hedda-1.jpg";

  const altText: string =
    article.coverImage?.alt || article.title || "Article image";

  return (
    <HeddaStyleArticle
      data={{
        slug: article.slug,
        title: article.title,
        dek: article.dek,
        image: imageSrc,
        coverImage: {
          src: imageSrc,
          alt: altText,
          height: article.coverImage?.height ?? 600,
        },
        date: article.date,
        tags: article.tags,
        content: article.content,
      }}
    />
  );
}