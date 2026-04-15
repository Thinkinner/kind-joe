import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { StandalonePostsFeed } from "@/components/posts/standalone-posts-feed";
import { db } from "@/db";
import { venturaPosts } from "@/db/schema";

type VenturaPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

async function getVenturaPostsFromDb(): Promise<VenturaPostCard[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const rows = await db
      .select({
        id: venturaPosts.id,
        imageUrl: venturaPosts.imageUrl,
        destinationUrl: venturaPosts.destinationUrl,
      })
      .from(venturaPosts)
      .where(or(eq(venturaPosts.isActive, true), isNull(venturaPosts.isActive)))
      .orderBy(
        desc(venturaPosts.isPinned),
        asc(venturaPosts.order),
        desc(venturaPosts.id),
      );

    return rows;
  } catch (error) {
    console.error("ventura posts query failed:", error);
    return [];
  }
}

export default async function VenturaPostsPage() {
  const allPosts = await getVenturaPostsFromDb();

  return (
    <main className="mx-auto max-w-5xl pt-2 sm:pt-4">
      <StandalonePostsFeed
        allPosts={allPosts}
        profileImageSrc="/brand/ventura-profile.jpg"
        profileName="Joe Knows Ventura"
        featuredImageSrc="/brand/kindjoe-bg.jpg"
        featuredDestinationUrl="https://www.youtube.com/@thekindjoe-w4d"
        subscribeTitle="Get the biggest Ventura stories delivered straight to your inbox. Don't miss out!"
        subscribeEndpoint="/api/ventura-post-email-capture"
        subscribeTags={["ventura_posts_feed"]}
        subscribeButtonClassName="bg-[#D97706] hover:bg-[#B45309]"
      />
    </main>
  );
}
