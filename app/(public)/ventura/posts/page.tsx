import Image from "next/image";
import Link from "next/link";
import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { CompactLiveWatchPill } from "@/components/kindjoe-signals/compact-live-watch-pill";
import { db } from "@/db";
import { venturaPosts } from "@/db/schema";

type VenturaPostCard = {
  id: number;
  imageUrl: string;
  destinationUrl: string;
};

async function getVenturaPostsFromDb(): Promise<VenturaPostCard[]> {
  if (!process.env.DATABASE_URL) return [];

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
}

function cloudinaryFourByFive(imageUrl: string) {
  if (!imageUrl.includes("/upload/")) return imageUrl;
  return imageUrl.replace("/upload/", "/upload/ar_4:5,c_fill,g_auto,w_800/");
}

export default async function VenturaPostsPage() {
  const allPosts = await getVenturaPostsFromDb();

  return (
    <main className="mx-auto max-w-4xl pt-4 sm:pt-6">
      <header className="mb-8 border-b border-neutral-200/80 px-3 pb-8 pt-2 sm:mb-10 sm:px-4 sm:pb-10 sm:pt-4">
        <div className="mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 sm:gap-x-5 sm:gap-y-3">
          <div className="flex h-10 shrink-0 items-center gap-2.5">
            <Image
              src="/brand/horizontal-logo.svg"
              width={120}
              height={28}
              alt="Ventura posts"
              className="h-auto w-[120px]"
            />
            <span className="text-sm font-semibold leading-none tracking-tight text-neutral-900 sm:text-base">
              ventura
            </span>
          </div>
          <div className="flex h-10 items-center">
            <CompactLiveWatchPill variant="light" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3">
        {allPosts.map((post) => {
          const optimizedImage = cloudinaryFourByFive(post.imageUrl);
          return (
            <Link
              key={post.id}
              href={post.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-[4/5] overflow-hidden border border-gray-100 bg-gray-50"
            >
              <Image
                src={optimizedImage}
                fill
                alt=""
                className="object-cover transition duration-700 ease-in-out hover:scale-105"
                sizes="(max-width: 768px) 33vw, 400px"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity hover:opacity-100">
                <span className="bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-tighter shadow-sm">
                  Read Story
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
