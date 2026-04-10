import Image from "next/image";
import { headers } from "next/headers";
import { CompactLiveWatchPill } from "@/components/kindjoe-signals/compact-live-watch-pill";
import { StandalonePostsGrid } from "@/components/posts/standalone-posts-grid";
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
    <main className="mx-auto max-w-4xl pt-4 sm:pt-6">
      <header className="mb-8 border-b border-neutral-200/80 px-3 pb-8 pt-2 sm:mb-10 sm:px-4 sm:pb-10 sm:pt-4">
        <div className="mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 sm:gap-x-5 sm:gap-y-3">
          <div className="flex h-10 shrink-0 items-center gap-2.5">
            <Image
              src="/brand/kindjoe-profile.jpg"
              width={40}
              height={40}
              alt="thekindjoe profile"
              className="rounded-full ring-2 ring-neutral-100"
            />
            <span className="text-sm font-semibold leading-none tracking-tight text-neutral-900 sm:text-base">
              thekindjoe
            </span>
          </div>
          <div className="flex h-10 items-center">
            <CompactLiveWatchPill variant="light" />
          </div>
        </div>
      </header>

      <StandalonePostsGrid allPosts={allPosts} />
    </main>
  );
}
