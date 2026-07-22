import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { db } from "@/db";
import { joefromsloPosts } from "@/db/schema";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kindjoe.com").replace(
    /\/$/,
    "",
  );

  const [row] = await db
    .insert(joefromsloPosts)
    .values({
      imageUrl: `${site}/brand/joefromslo-logo.png`,
      destinationUrl: `${site}/`,
      caption: "Dummy test post — Kind Joe San Luis Obispo",
      isPinned: true,
      order: 0,
      isActive: true,
    })
    .returning();

  console.log("Inserted dummy joefromslo post:", row);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
