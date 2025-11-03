import { z } from "zod";

// --- individual block types ---
const headingBlock = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).default(2),
  text: z.string().min(1),
});

const paragraphBlock = z.object({
  type: z.literal("paragraph"),
  text: z.string().min(1),
});

const imageBlock = z.object({
  type: z.literal("image"),
  src: z.string().url(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const quoteBlock = z.object({
  type: z.literal("quote"),
  text: z.string().min(1),
  cite: z.string().optional(),
});

const listBlock = z.object({
  type: z.literal("list"),
  style: z.enum(["bullet", "number"]).default("bullet"),
  items: z.array(z.string().min(1)).min(1),
});

const embedBlock = z.object({
  type: z.literal("embed"),
  provider: z.enum(["youtube", "twitter", "tiktok", "generic"]).default("generic"),
  url: z.string().url(),
});

// --- combined schema ---
export const BlockSchema = z.discriminatedUnion("type", [
  headingBlock,
  paragraphBlock,
  imageBlock,
  quoteBlock,
  listBlock,
  embedBlock,
]);

export const BlocksSchema = z.array(BlockSchema).max(200);

// --- full article input shape (optional) ---
export const ArticleInputSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  authorId: z.string(),
  coverImage: z
    .object({
      src: z.string().url(),
      alt: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  blocks: BlocksSchema,
  publish: z.boolean().optional(),
});
