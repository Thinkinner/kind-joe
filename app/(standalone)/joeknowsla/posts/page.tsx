import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { StandalonePostsFeed } from "@/components/posts/standalone-posts-feed";
import { db } from "@/db";
import { joeknowslaPosts } from "@/db/schema";

type JoeKnowsLaPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

const MAX_STANDALONE_POSTS = 50;

export const dynamic = "force-dynamic";

async function getJoeKnowsLaPostsFromDb(): Promise<JoeKnowsLaPostCard[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const rows = await db
      .select({
        id: joeknowslaPosts.id,
        imageUrl: joeknowslaPosts.imageUrl,
        destinationUrl: joeknowslaPosts.destinationUrl,
      })
      .from(joeknowslaPosts)
      .where(
        or(eq(joeknowslaPosts.isActive, true), isNull(joeknowslaPosts.isActive)),
      )
      .orderBy(
        desc(joeknowslaPosts.isPinned),
        asc(joeknowslaPosts.order),
        desc(joeknowslaPosts.id),
      )
      .limit(MAX_STANDALONE_POSTS);

    return rows;
  } catch (error) {
    console.error("joeknowsla posts query failed:", error);
    return [];
  }
}

export default async function JoeKnowsLaPostsPage() {
  const allPosts = await getJoeKnowsLaPostsFromDb();

  return (
    <main className="mx-auto max-w-5xl pt-2 sm:pt-4">
      <StandalonePostsFeed
        allPosts={allPosts}
        profileImageSrc="/brand/joeknowsla.png"
        profileName="Joe Knows LA"
        subscribeTitle="Get the biggest Los Angeles stories delivered straight to your inbox with the joeknowsla newsletter. Don't miss out!"
        subscribeEndpoint="/api/joeknowsla-post-email-capture"
        subscribeTags={["joeknowsla_posts_feed"]}
        subscribeButtonClassName="bg-[#2563EB] hover:bg-[#1D4ED8]"
      />
    </main>
  );
}
