import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/auth/rate-limit";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { checkSocialRateLimit } from "@/lib/social/rate-limit";
import { createSocialPost, listSocialPosts } from "@/lib/social/queries";

const attachmentSchema = z.object({
  type: z.enum(["image", "link"]),
  url: z.string().url().max(2000),
  title: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(800).optional().nullable(),
  imageUrl: z.string().url().max(2000).optional().nullable(),
  siteName: z.string().trim().max(120).optional().nullable(),
});

const createSocialPostSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  attachments: z.array(attachmentSchema).max(4).optional().default([]),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit = Number(limitRaw ?? "20");
    const offset = Number(offsetRaw ?? "0");

    const posts = await listSocialPosts({
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    return NextResponse.json({
      posts,
      hasMore:
        posts.length ===
        Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20)),
      nextOffset: (Number.isFinite(offset) ? Math.max(0, offset) : 0) + posts.length,
    });
  } catch (err) {
    console.error("social_posts_list_failed", err);
    return NextResponse.json(
      { error: "Could not load social posts." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipLimit = checkSocialRateLimit(`social-post-ip:${ip}`, 20, 60_000);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userLimit = checkSocialRateLimit(`social-post-user:${authorId}`, 12, 60_000);
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: "Posting too fast. Please wait a bit." },
        {
          status: 429,
          headers: { "Retry-After": String(userLimit.retryAfterSeconds) },
        },
      );
    }

    const parsed = createSocialPostSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const post = await createSocialPost({
      authorId,
      body: parsed.data.body,
      attachments: parsed.data.attachments,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("social_post_create_failed", err);
    if (err instanceof Error && /not set up on this database yet/i.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Could not create post." },
      { status: 500 },
    );
  }
}
