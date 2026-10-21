import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  joefromsloPosts,
  joeknowslaPosts,
  oxnardPosts,
  posts,
  venturaPosts,
} from "@/db/schema";
import { PUBLIC_POST_FEED_PATHS } from "@/lib/feed/public-post-feed-paths";
import type { PartnerPostDeskId } from "@/lib/partner/post-desks";

export type PartnerPostInput = {
  desk: PartnerPostDeskId;
  imageUrl: string;
  destinationUrl: string;
  caption?: string | null;
  isPinned?: boolean;
  order?: number;
  isActive?: boolean;
};

const FEED_PATH: Record<PartnerPostDeskId, string> = {
  kindjoe: "/posts",
  ventura: "/ventura/posts",
  la: "/joeknowsla/posts",
  oxnard: "/oxnard/posts",
  slo: "/joefromslo/posts",
};

export async function insertPartnerPost(input: PartnerPostInput) {
  const values = {
    imageUrl: input.imageUrl,
    destinationUrl: input.destinationUrl,
    caption: input.caption?.trim() || null,
    isPinned: input.isPinned ?? false,
    order: input.order ?? 0,
    isActive: input.isActive ?? true,
  };

  const [row] =
    input.desk === "ventura"
      ? await db.insert(venturaPosts).values(values).returning({ id: venturaPosts.id })
      : input.desk === "la"
        ? await db.insert(joeknowslaPosts).values(values).returning({ id: joeknowslaPosts.id })
        : input.desk === "oxnard"
          ? await db.insert(oxnardPosts).values(values).returning({ id: oxnardPosts.id })
          : input.desk === "slo"
            ? await db
                .insert(joefromsloPosts)
                .values(values)
                .returning({ id: joefromsloPosts.id })
            : await db.insert(posts).values(values).returning({ id: posts.id });

  if (!row) throw new Error("Failed to create post.");

  for (const path of PUBLIC_POST_FEED_PATHS) {
    revalidatePath(path);
  }

  return { id: row.id, feedPath: FEED_PATH[input.desk] };
}
