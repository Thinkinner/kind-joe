import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { StandalonePostsFeed } from "@/components/posts/standalone-posts-feed";
import { db } from "@/db";
import { joefromsloPosts } from "@/db/schema";

type JoeFromSloPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

const MAX_STANDALONE_POSTS = 50;

export const dynamic = "force-dynamic";

async function getJoeFromSloPostsFromDb(): Promise<JoeFromSloPostCard[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const rows = await db
      .select({
        id: joefromsloPosts.id,
        imageUrl: joefromsloPosts.imageUrl,
        destinationUrl: joefromsloPosts.destinationUrl,
      })
      .from(joefromsloPosts)
      .where(
        or(eq(joefromsloPosts.isActive, true), isNull(joefromsloPosts.isActive)),
      )
      .orderBy(
        desc(joefromsloPosts.isPinned),
        asc(joefromsloPosts.order),
        desc(joefromsloPosts.id),
      )
      .limit(MAX_STANDALONE_POSTS);

    return rows;
  } catch (error) {
    console.error("joefromslo posts query failed:", error);
    return [];
  }
}

export default async function JoeFromSloPostsPage() {
  const allPosts = await getJoeFromSloPostsFromDb();

  return (
    <main className="mx-auto max-w-5xl pt-2 sm:pt-4">
      <StandalonePostsFeed
        allPosts={allPosts}
        profileImageSrc="/brand/joefromslo-logo.png"
        profileName="Kind Joe San Luis Obispo"
        profileImageClassName="border border-neutral-300"
        subscribeTitle="Get the biggest San Luis Obispo stories delivered straight to your inbox with the Kind Joe San Luis Obispo newsletter. Don't miss out!"
        subscribeEndpoint="/api/joefromslo-post-email-capture"
        subscribeTags={["joefromslo_posts_feed"]}
        subscribeButtonClassName="bg-[#0F766E] hover:bg-[#0D9488]"
      />
    </main>
  );
}
