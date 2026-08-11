import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  articleCategories,
  articleTags,
  categories,
  tags,
} from "@/db/schema";
import { slugify } from "@/lib/helpers/articles";
import {
  getLocalNewsRegionBySlug,
  inferCanonicalRegionTagSlugs,
} from "@/lib/local-news/regions";

export async function saveArticleTaxonomy(
  articleId: string,
  category: string,
  rawTags: string[],
) {
  const categoryName = (category || "General").trim();
  if (categoryName) {
    const catSlug = slugify(categoryName);
    if (catSlug) {
      await db
        .insert(categories)
        .values({ name: categoryName, slug: catSlug })
        .onConflictDoNothing({ target: categories.slug });
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, catSlug))
        .limit(1);
      if (cat) {
        await db
          .insert(articleCategories)
          .values({ articleId, categoryId: cat.id })
          .onConflictDoNothing({
            target: [articleCategories.articleId, articleCategories.categoryId],
          });
      }
    }
  }

  const withRegionTags = [...rawTags];
  for (const slug of inferCanonicalRegionTagSlugs({
    category: categoryName,
    tags: rawTags,
  })) {
    if (!withRegionTags.some((tag) => slugify(tag) === slug)) {
      withRegionTags.push(slug);
    }
  }

  const normalizedTags = withRegionTags
    .map((tag) => {
      const trimmed = tag.trim();
      const slug = slugify(trimmed);
      const region = getLocalNewsRegionBySlug(slug);
      return {
        name: region?.name ?? trimmed,
        slug: region?.slug ?? slug,
      };
    })
    .filter((tag) => tag.name && tag.slug)
    .slice(0, 20);

  for (const tagEntry of normalizedTags) {
    await db
      .insert(tags)
      .values({ name: tagEntry.name, slug: tagEntry.slug })
      .onConflictDoNothing({ target: tags.slug });
    const [tagRow] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, tagEntry.slug))
      .limit(1);
    if (!tagRow) continue;
    await db
      .insert(articleTags)
      .values({ articleId, tagId: tagRow.id })
      .onConflictDoNothing({
        target: [articleTags.articleId, articleTags.tagId],
      });
  }
}
