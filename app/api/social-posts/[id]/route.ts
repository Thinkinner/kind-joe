import { NextResponse } from "next/server";
import { getSocialPostById } from "@/lib/social/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const postId = Number.parseInt(id, 10);
    if (!Number.isFinite(postId) || postId <= 0) {
      return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
    }
    const post = await getSocialPostById(postId);
    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (err) {
    console.error("social_post_get_failed", err);
    return NextResponse.json(
      { error: "Could not load social post." },
      { status: 500 },
    );
  }
}
