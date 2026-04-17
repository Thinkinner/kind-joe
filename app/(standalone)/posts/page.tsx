import { headers } from "next/headers";
import { StandalonePostsFeed } from "@/components/posts/standalone-posts-feed";
import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";

type PostCard = { id: number; imageUrl: string; destinationUrl: string };

async function resolvePostsApiUrl(): Promise<string | null> {
  const raw = (process.env.NEXT_PUBLIC_ADMIN_API || "").trim();
  if (!raw) return null;

  const joinPosts = (base: string) =>
    base.endsWith("/") ? `${base}posts` : `${base}/posts`;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return joinPosts(raw);
  }

  if (raw.startsWith("/")) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const protoHeader = h.get("x-forwarded-proto");
    const proto =
      protoHeader?.split(",")[0]?.trim() ??
      (host.startsWith("localhost") || host.startsWith("127.")
        ? "http"
        : "https");
    return joinPosts(`${proto}://${host}${raw}`);
  }

  return joinPosts(`https://${raw.replace(/^\/+/, "")}`);
}

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
    .orderBy(desc(posts.isPinned), asc(posts.order), desc(posts.id));

  return rows;
}

async function getPosts(): Promise<PostCard[]> {
  const apiUrl = await resolvePostsApiUrl();
  if (apiUrl) {
    try {
      const res = await fetch(apiUrl, { cache: "no-store" });
      if (res.ok) {
        const data: unknown = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data as PostCard[];
        }
      }
    } catch {
      // fallback to local DB
    }
  }
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
