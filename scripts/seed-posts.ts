/**
 * Insert a single KindJoe post card (feed tile) when none exist, or with --force.
 * Usage: npm run db:seed-posts
 * Optional: npm run db:seed-posts -- --destination=https://www.kindjoe.com/my-slug --image=https://...
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

function defaultSiteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kindjoe.com").replace(/\/$/, "");
}

function defaultImageUrl(): string {
  return `${defaultSiteBase()}/brand/kindjoe-profile.jpg`;
}

function defaultDestinationUrl(): string {
  return `${defaultSiteBase()}/developers/kindjoe-posts`;
}

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const destinationUrl = readArg("--destination") ?? defaultDestinationUrl();
  const imageUrl = readArg("--image") ?? defaultImageUrl();
  const caption = readArg("--caption") ?? "KindJoe post cards — how they work";

  const [{ count }] = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
    .from(posts);

  if (count > 0 && !force) {
    console.log(
      JSON.stringify(
        {
          skipped: true,
          reason: "posts table already has rows",
          existingCount: count,
          hint: "Pass --force to insert anyway",
        },
        null,
        2,
      ),
    );
    return;
  }

  const existing = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.destinationUrl, destinationUrl))
    .limit(1);

  if (existing.length > 0) {
    console.log(
      JSON.stringify(
        { skipped: true, reason: "destination already exists", postId: existing[0].id },
        null,
        2,
      ),
    );
    return;
  }

  const [row] = await db
    .insert(posts)
    .values({
      imageUrl,
      destinationUrl,
      caption,
      isPinned: false,
      order: 0,
      isActive: true,
    })
    .returning();

  console.log(JSON.stringify({ created: true, post: row }, null, 2));
}

main().catch((error) => {
  console.error("[seed-posts] failed", error);
  process.exit(1);
});
