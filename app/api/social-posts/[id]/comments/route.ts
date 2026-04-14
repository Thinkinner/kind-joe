import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/auth/rate-limit";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import {
  SocialCommentError,
  createSocialPostComment,
  listCommentsForSocialPost,
} from "@/lib/social/comments";
import { checkSocialRateLimit } from "@/lib/social/rate-limit";
import { getSocialPostIdExists } from "@/lib/social/queries";

const postBodySchema = z.object({
  body: z.string(),
  parentId: z.number().int().positive().optional().nullable(),
});

function mapCommentError(err: SocialCommentError): { status: number; body: object } {
  switch (err.code) {
    case "INVALID_BODY":
      return { status: 400, body: { error: err.message, code: err.code } };
    case "POST_NOT_FOUND":
      return { status: 404, body: { error: err.message, code: err.code } };
    case "PARENT_NOT_FOUND":
    case "PARENT_WRONG_POST":
    case "PARENT_NOT_TOP_LEVEL":
      return { status: 400, body: { error: err.message, code: err.code } };
    default:
      return { status: 400, body: { error: err.message } };
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const postId = Number.parseInt(id, 10);
    if (!Number.isFinite(postId) || postId <= 0) {
      return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
    }
    const exists = await getSocialPostIdExists(postId);
    if (!exists) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    const comments = await listCommentsForSocialPost(postId);
    return NextResponse.json({ comments });
  } catch (err) {
    console.error("social_post_comments_list_failed", err);
    return NextResponse.json(
      { error: "Could not load comments." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getClientIp(req);
    const ipLimit = checkSocialRateLimit(`social-comment-ip:${ip}`, 40, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
        },
      );
    }

    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const authorId = user?.id;
    if (!authorId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    const userLimit = checkSocialRateLimit(`social-comment-user:${authorId}`, 20, 60_000);
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: "Commenting too fast. Please wait a bit." },
        {
          status: 429,
          headers: { "Retry-After": String(userLimit.retryAfterSeconds) },
        },
      );
    }

    const { id } = await params;
    const postId = Number.parseInt(id, 10);
    if (!Number.isFinite(postId) || postId <= 0) {
      return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
    }

    const json = await req.json();
    const parsed = postBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { body, parentId } = parsed.data;

    try {
      const comment = await createSocialPostComment({
        postId,
        authorId,
        parentId: parentId ?? null,
        body,
      });
      return NextResponse.json({ comment });
    } catch (e) {
      if (e instanceof SocialCommentError) {
        const { status, body: resBody } = mapCommentError(e);
        return NextResponse.json(resBody, { status });
      }
      throw e;
    }
  } catch (err) {
    console.error("social_post_comments_create_failed", err);
    return NextResponse.json(
      { error: "Could not post comment." },
      { status: 500 },
    );
  }
}
