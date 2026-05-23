import { StandalonePostsFeed } from "@/components/posts/standalone-posts-feed";
import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";

type PostCard = { id: number; imageUrl: string; destinationUrl: string };

const MAX_STANDALONE_POSTS = 50;

export const dynamic = "force-dynamic";

async function getPostsFromDb(): Promise<PostCard[]> {
  if (!process.env.DATABASE_URL) return [];

  const rows = await db
    .select({
      id: posts.id,
      imageUrl: posts.imageUrl,
      destinationUrl: posts.destinationUrl,
    })
    .from(posts)
    .where(or(eq(posts.isActive, true), isNull(posts.isActive)))
    .orderBy(desc(posts.isPinned), asc(posts.order), desc(posts.id))
    .limit(MAX_STANDALONE_POSTS);

  return rows;
}

async function getPosts(): Promise<PostCard[]> {
  return getPostsFromDb();
}

export default async function StandalonePostsPage() {
  const allPosts = await getPosts();

  return (
    <main className="mx-auto max-w-5xl pt-2 sm:pt-4">
      <StandalonePostsFeed
        allPosts={allPosts}
        profileImageSrc="/brand/kindjoe-profile.jpg"
        profileName="thekindjoe"
        subscribeTitle="Get the biggest entertainment news stories delivered straight to your inbox with the kindjoe newsletter. Don't miss out!"
        subscribeEndpoint="/api/post-email-capture"
        subscribeTags={["kindjoe_posts_feed"]}
        subscribeButtonClassName="bg-neutral-700 hover:bg-neutral-800"
      />
    </main>
  );
}
