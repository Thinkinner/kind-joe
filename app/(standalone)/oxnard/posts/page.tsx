import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { StandalonePostsFeed } from "@/components/posts/standalone-posts-feed";
import { db } from "@/db";
import { oxnardPosts } from "@/db/schema";

type OxnardPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

const MAX_STANDALONE_POSTS = 50;

export const dynamic = "force-dynamic";

async function getOxnardPostsFromDb(): Promise<OxnardPostCard[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await db
      .select({
        id: oxnardPosts.id,
        imageUrl: oxnardPosts.imageUrl,
        destinationUrl: oxnardPosts.destinationUrl,
      })
      .from(oxnardPosts)
      .where(or(eq(oxnardPosts.isActive, true), isNull(oxnardPosts.isActive)))
      .orderBy(
        desc(oxnardPosts.isPinned),
        asc(oxnardPosts.order),
        desc(oxnardPosts.id),
      )
      .limit(MAX_STANDALONE_POSTS);
  } catch (error) {
    console.error("oxnard posts query failed:", error);
    return [];
  }
}

export default async function OxnardPostsPage() {
  const allPosts = await getOxnardPostsFromDb();

  return (
    <main className="mx-auto max-w-5xl pt-2 sm:pt-4">
      <StandalonePostsFeed
        allPosts={allPosts}
        profileImageSrc="/brand/cityofox.jpg"
        profileName="@cityofox"
        profileImageClassName="rounded-md border border-neutral-200 object-cover"
        subscribeTitle="Get the biggest Oxnard stories delivered straight to your inbox. Don't miss out!"
        subscribeEndpoint="/api/post-email-capture"
        subscribeTags={["oxnard_posts_feed"]}
        subscribeButtonClassName="bg-green-700 hover:bg-green-600"
      />
    </main>
  );
}
