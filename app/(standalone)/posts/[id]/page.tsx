import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedDesktopRail } from "@/components/predictions/feed-desktop-rail";
import { SocialPostCard } from "@/components/social/social-post-card";
import { SocialPostComments } from "@/components/social/social-post-comments";
import { PostEmailGrabber } from "@/components/stories/post-email-grabber";
import { getSocialPostById } from "@/lib/social/queries";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const postId = Number.parseInt(id, 10);
  if (!Number.isFinite(postId) || postId <= 0) {
    return { title: "Post not found" };
  }
  const post = await getSocialPostById(postId);
  if (!post) {
    return { title: "Post not found" };
  }
  const bodyPreview =
    post.body.length <= 120 ? post.body : `${post.body.slice(0, 117)}...`;
  return {
    title: `${post.author.name} · Post`,
    description: bodyPreview,
  };
}

export default async function SocialPostPage({ params }: PageProps) {
  const { id } = await params;
  const postId = Number.parseInt(id, 10);
  if (!Number.isFinite(postId) || postId <= 0) {
    notFound();
  }
  const post = await getSocialPostById(postId);
  if (!post) {
    notFound();
  }

  const nextPath = `/posts/${postId}`;

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white">
      <FeedDesktopRail active="home" />
      <div className="pb-16 pt-2 md:pl-16">
        <div className="mx-auto w-full max-w-[640px] px-2 sm:px-4">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0a0a]/95 px-4 py-3 text-center backdrop-blur">
            <span className="text-sm font-semibold text-white">Post</span>
          </div>

          <section className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f10] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <div className="border-b border-white/10 px-5 py-3 text-sm">
              <Link href="/predictions" className="font-semibold text-white/80 hover:text-white">
                ← Back to predictions
              </Link>
            </div>
            <SocialPostCard post={post} />
            <SocialPostComments postId={postId} nextPath={nextPath} />
          </section>
        </div>
      </div>
      <PostEmailGrabber postId={postId} />
    </div>
  );
}
