import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { socialPostAttachments, socialPosts } from "@/db/schema";
import { countCommentsForSocialPosts } from "@/lib/social/comments";

export type SocialAttachmentType = "image" | "link";

export type SocialPostAttachmentView = {
  id: number;
  type: SocialAttachmentType;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

export type SocialPostView = {
  id: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    username: string | null;
    image: string | null;
  };
  attachments: SocialPostAttachmentView[];
  commentCount: number;
};

export type CreateSocialPostInput = {
  authorId: string;
  body: string;
  attachments?: Array<{
    type: SocialAttachmentType;
    url: string;
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    siteName?: string | null;
  }>;
};

/** Postgres undefined_table — e.g. migration not applied yet. */
function isUndefinedTableError(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 3 && cur; i++) {
    if (
      typeof cur === "object" &&
      cur !== null &&
      "code" in cur &&
      (cur as { code: unknown }).code === "42P01"
    ) {
      return true;
    }
    cur =
      typeof cur === "object" &&
      cur !== null &&
      "cause" in cur &&
      (cur as { cause: unknown }).cause !== undefined
        ? (cur as { cause: unknown }).cause
        : undefined;
  }
  return false;
}

export async function createSocialPost(
  input: CreateSocialPostInput,
): Promise<SocialPostView> {
  const body = input.body.trim();
  let inserted: Array<{ id: number }>;
  try {
    inserted = await db
      .insert(socialPosts)
      .values({
        authorId: input.authorId,
        body,
      })
      .returning({ id: socialPosts.id });
  } catch (e) {
    if (isUndefinedTableError(e)) {
      throw new Error(
        "Social posts are not set up on this database yet. Run npm run db:migrate using the same DATABASE_URL as this app.",
      );
    }
    throw e;
  }
  const postId = inserted[0]?.id;
  if (!postId) {
    throw new Error("Could not create post.");
  }

  const attachments = (input.attachments ?? []).slice(0, 4);
  if (attachments.length > 0) {
    await db.insert(socialPostAttachments).values(
      attachments.map((a) => ({
        postId,
        type: a.type,
        url: a.url,
        title: a.title ?? null,
        description: a.description ?? null,
        imageUrl: a.imageUrl ?? null,
        siteName: a.siteName ?? null,
      })),
    );
  }

  const post = await getSocialPostById(postId);
  if (!post) {
    throw new Error("Could not load created post.");
  }
  return post;
}

export async function listSocialPosts(params?: {
  limit?: number;
  offset?: number;
}): Promise<SocialPostView[]> {
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const offset = Math.max(0, Math.min(10000, params?.offset ?? 0));

  let rows: Array<{
    id: number;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    authorName: string;
    authorUsername: string | null;
    authorImage: string | null;
  }>;
  try {
    rows = await db
      .select({
        id: socialPosts.id,
        body: socialPosts.body,
        createdAt: socialPosts.createdAt,
        updatedAt: socialPosts.updatedAt,
        authorId: user.id,
        authorName: user.name,
        authorUsername: user.username,
        authorImage: user.image,
      })
      .from(socialPosts)
      .innerJoin(user, eq(socialPosts.authorId, user.id))
      .orderBy(desc(socialPosts.createdAt), desc(socialPosts.id))
      .offset(offset)
      .limit(limit);
  } catch (e) {
    if (isUndefinedTableError(e)) {
      console.warn(
        "[social] social_posts table missing; returning empty social feed until db:migrate.",
      );
      return [];
    }
    throw e;
  }

  if (rows.length === 0) return [];
  const postIds = rows.map((r) => r.id);
  return hydrateSocialPosts(rows, postIds);
}

export async function getSocialPostById(
  postId: number,
): Promise<SocialPostView | null> {
  let rows: Array<{
    id: number;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    authorName: string;
    authorUsername: string | null;
    authorImage: string | null;
  }>;
  try {
    rows = await db
      .select({
        id: socialPosts.id,
        body: socialPosts.body,
        createdAt: socialPosts.createdAt,
        updatedAt: socialPosts.updatedAt,
        authorId: user.id,
        authorName: user.name,
        authorUsername: user.username,
        authorImage: user.image,
      })
      .from(socialPosts)
      .innerJoin(user, eq(socialPosts.authorId, user.id))
      .where(eq(socialPosts.id, postId))
      .limit(1);
  } catch (e) {
    if (isUndefinedTableError(e)) {
      return null;
    }
    throw e;
  }
  if (!rows[0]) return null;
  const hydrated = await hydrateSocialPosts(rows, [postId]);
  return hydrated[0] ?? null;
}

async function hydrateSocialPosts(
  postRows: Array<{
    id: number;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    authorName: string;
    authorUsername: string | null;
    authorImage: string | null;
  }>,
  postIds: number[],
): Promise<SocialPostView[]> {
  let attachmentRows: Array<{
    id: number;
    postId: number;
    type: "image" | "link";
    url: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    siteName: string | null;
    createdAt: Date;
  }> = [];
  try {
    attachmentRows = await db
      .select({
        id: socialPostAttachments.id,
        postId: socialPostAttachments.postId,
        type: socialPostAttachments.type,
        url: socialPostAttachments.url,
        title: socialPostAttachments.title,
        description: socialPostAttachments.description,
        imageUrl: socialPostAttachments.imageUrl,
        siteName: socialPostAttachments.siteName,
        createdAt: socialPostAttachments.createdAt,
      })
      .from(socialPostAttachments)
      .where(inArray(socialPostAttachments.postId, postIds))
      .orderBy(
        asc(socialPostAttachments.createdAt),
        asc(socialPostAttachments.id),
      );
  } catch (e) {
    if (!isUndefinedTableError(e)) {
      throw e;
    }
  }

  const attachmentByPost = new Map<number, SocialPostAttachmentView[]>();
  for (const row of attachmentRows) {
    const arr = attachmentByPost.get(row.postId) ?? [];
    arr.push({
      id: row.id,
      type: row.type,
      url: row.url,
      title: row.title ?? null,
      description: row.description ?? null,
      imageUrl: row.imageUrl ?? null,
      siteName: row.siteName ?? null,
    });
    attachmentByPost.set(row.postId, arr);
  }

  const commentCounts = await countCommentsForSocialPosts(postIds);

  return postRows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: {
      id: row.authorId,
      name: row.authorName,
      username: row.authorUsername,
      image: row.authorImage,
    },
    attachments: attachmentByPost.get(row.id) ?? [],
    commentCount: commentCounts.get(row.id) ?? 0,
  }));
}

export async function getSocialPostIdExists(postId: number): Promise<boolean> {
  let row: Array<{ id: number }>;
  try {
    row = await db
      .select({ id: socialPosts.id })
      .from(socialPosts)
      .where(eq(socialPosts.id, postId))
      .limit(1);
  } catch (e) {
    if (isUndefinedTableError(e)) {
      return false;
    }
    throw e;
  }
  return Boolean(row[0]?.id);
}
