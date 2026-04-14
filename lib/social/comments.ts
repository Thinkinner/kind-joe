import { asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { socialPostComments, socialPosts } from "@/db/schema";
import {
  SOCIAL_COMMENT_MAX_LENGTH,
  type SocialCommentAuthorView,
  type SocialCommentNodeView,
} from "@/lib/social/comments-public";

export { SOCIAL_COMMENT_MAX_LENGTH };
export type { SocialCommentAuthorView, SocialCommentNodeView };

type Row = {
  id: number;
  postId: number;
  authorId: string;
  parentId: number | null;
  body: string;
  createdAt: Date;
  authorName: string;
  authorImage: string | null;
  authorUsername: string | null;
};

function asIso(d: Date): string {
  return d.toISOString();
}

function rowToAuthor(r: Row): SocialCommentAuthorView {
  return {
    id: r.authorId,
    name: r.authorName,
    image: r.authorImage,
    username: r.authorUsername,
  };
}

export async function countCommentsForSocialPosts(
  postIds: number[],
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (postIds.length === 0) return map;
  try {
    const rows = await db
      .select({
        postId: socialPostComments.postId,
        n: count(),
      })
      .from(socialPostComments)
      .where(inArray(socialPostComments.postId, postIds))
      .groupBy(socialPostComments.postId);
    for (const r of rows) {
      map.set(r.postId, Number(r.n));
    }
    return map;
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: unknown }).code === "42P01"
    ) {
      for (const id of postIds) map.set(id, 0);
      return map;
    }
    throw e;
  }
}

export async function listCommentsForSocialPost(
  postId: number,
): Promise<SocialCommentNodeView[]> {
  const rows = await db
    .select({
      id: socialPostComments.id,
      postId: socialPostComments.postId,
      authorId: socialPostComments.authorId,
      parentId: socialPostComments.parentId,
      body: socialPostComments.body,
      createdAt: socialPostComments.createdAt,
      authorName: user.name,
      authorImage: user.image,
      authorUsername: user.username,
    })
    .from(socialPostComments)
    .innerJoin(user, eq(socialPostComments.authorId, user.id))
    .where(eq(socialPostComments.postId, postId))
    .orderBy(asc(socialPostComments.createdAt));

  const typed = rows as Row[];
  const byParent = new Map<number | null, Row[]>();
  for (const r of typed) {
    const key = r.parentId;
    const arr = byParent.get(key) ?? [];
    arr.push(r);
    byParent.set(key, arr);
  }

  const tops = byParent.get(null) ?? [];
  return tops.map((r) => ({
    id: r.id,
    authorId: r.authorId,
    author: rowToAuthor(r),
    body: r.body,
    createdAt: asIso(r.createdAt),
    parentId: null,
    replies: (byParent.get(r.id) ?? []).map((reply) => ({
      id: reply.id,
      authorId: reply.authorId,
      author: rowToAuthor(reply),
      body: reply.body,
      createdAt: asIso(reply.createdAt),
      parentId: reply.parentId,
      replies: [],
    })),
  }));
}

export class SocialCommentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_BODY"
      | "POST_NOT_FOUND"
      | "PARENT_NOT_FOUND"
      | "PARENT_WRONG_POST"
      | "PARENT_NOT_TOP_LEVEL",
  ) {
    super(message);
    this.name = "SocialCommentError";
  }
}

export async function createSocialPostComment(params: {
  postId: number;
  authorId: string;
  parentId?: number | null;
  body: string;
}): Promise<SocialCommentNodeView> {
  const raw = params.body.trim();
  if (!raw) {
    throw new SocialCommentError("Comment cannot be empty.", "INVALID_BODY");
  }
  if (raw.length > SOCIAL_COMMENT_MAX_LENGTH) {
    throw new SocialCommentError(
      `Comment must be at most ${SOCIAL_COMMENT_MAX_LENGTH} characters.`,
      "INVALID_BODY",
    );
  }

  const post = await db
    .select({ id: socialPosts.id })
    .from(socialPosts)
    .where(eq(socialPosts.id, params.postId))
    .limit(1);
  if (!post[0]) {
    throw new SocialCommentError("Post not found.", "POST_NOT_FOUND");
  }

  const parentId: number | null = params.parentId ?? null;
  if (parentId != null) {
    const parent = await db
      .select({
        id: socialPostComments.id,
        postId: socialPostComments.postId,
        parentId: socialPostComments.parentId,
      })
      .from(socialPostComments)
      .where(eq(socialPostComments.id, parentId))
      .limit(1);
    const p = parent[0];
    if (!p) {
      throw new SocialCommentError("Parent comment not found.", "PARENT_NOT_FOUND");
    }
    if (p.postId !== params.postId) {
      throw new SocialCommentError(
        "Parent comment does not belong to this post.",
        "PARENT_WRONG_POST",
      );
    }
    if (p.parentId != null) {
      throw new SocialCommentError(
        "You can only reply to top-level comments.",
        "PARENT_NOT_TOP_LEVEL",
      );
    }
  }

  const inserted = await db
    .insert(socialPostComments)
    .values({
      postId: params.postId,
      authorId: params.authorId,
      parentId,
      body: raw,
    })
    .returning({
      id: socialPostComments.id,
      postId: socialPostComments.postId,
      authorId: socialPostComments.authorId,
      parentId: socialPostComments.parentId,
      body: socialPostComments.body,
      createdAt: socialPostComments.createdAt,
    });

  const row = inserted[0];
  if (!row) {
    throw new SocialCommentError("Could not create comment.", "INVALID_BODY");
  }

  const authorRows = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      username: user.username,
    })
    .from(user)
    .where(eq(user.id, params.authorId))
    .limit(1);
  const a = authorRows[0];
  if (!a) {
    throw new SocialCommentError("Author not found.", "INVALID_BODY");
  }

  return {
    id: row.id,
    authorId: row.authorId,
    author: {
      id: a.id,
      name: a.name,
      image: a.image,
      username: a.username,
    },
    body: row.body,
    createdAt: asIso(row.createdAt),
    parentId: row.parentId,
    replies: [],
  };
}
