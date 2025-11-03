// src/app/news/[slug]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import { getArticleBySlug } from "@/db/queries/articles";
import { ArticleRenderer, type Block } from "@/components/article-renderer";
import { Separator } from "@/components/ui/separator";

export const revalidate = 60;

export default async function ArticlePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const article = await getArticleBySlug(slug);

  if (!article) return notFound();

  // --- Type guards and runtime narrowing ---
  const cover =
    typeof article.coverImage === "object" && article.coverImage !== null
      ? (article.coverImage as {
          src?: string;
          alt?: string;
          width?: number;
          height?: number;
        })
      : undefined;

  const blocks: Block[] = Array.isArray(article.blocks)
    ? (article.blocks as Block[])
    : [];

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
      {/* Header */}
      <header className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight leading-tight">
          {article.title}
        </h1>

        <div className="text-sm text-muted-foreground">
          {article.author?.name ?? "Unknown"} •{" "}
          {article.publishedAt
            ? new Date(article.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Unpublished"}{" "}
          {article.readingMinutes
            ? `• ${article.readingMinutes} min read`
            : ""}
        </div>

        {cover?.src && (
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-xl border border-border">
            <Image
              src={cover.src}
              alt={cover.alt ?? "Cover image"}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
      </header>

      <Separator />

      {/* Article Body */}
      <section className="prose prose-slate dark:prose-invert max-w-none">
        {blocks.length > 0 ? (
          <ArticleRenderer blocks={blocks} />
        ) : (
          <p className="text-muted-foreground italic">No content yet.</p>
        )}
      </section>
    </main>
  );
}
