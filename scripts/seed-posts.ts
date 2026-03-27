/**
 * Inserts a few demo rows into `posts` when the table is empty.
 * Run: `npm run db:seed-posts` (requires DATABASE_URL in .env).
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { posts } from "../db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    console.error("DATABASE_URL is missing. Add it to .env and try again.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  try {
    const existing = await db.select({ id: posts.id }).from(posts).limit(1);
    if (existing.length > 0) {
      console.log("Posts table already has rows; skipping seed.");
      return;
    }

    await db.insert(posts).values([
      {
        imageUrl: "https://picsum.photos/seed/kindjoe-a/800/1000",
        destinationUrl: "https://thekindjoe.com",
        caption: "Sample grid tile",
        isPinned: true,
        order: 0,
        isActive: true,
      },
      {
        imageUrl: "https://picsum.photos/seed/kindjoe-b/800/1000",
        destinationUrl: "https://thekindjoe.com/posts",
        caption: "Sample grid tile",
        isPinned: false,
        order: 1,
        isActive: true,
      },
      {
        imageUrl: "https://picsum.photos/seed/kindjoe-c/800/1000",
        destinationUrl: "https://thekindjoe.com",
        caption: "Sample grid tile",
        isPinned: false,
        order: 2,
        isActive: true,
      },
    ]);

    console.log("Seeded 3 sample posts. Edit or replace them in the `posts` table.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
