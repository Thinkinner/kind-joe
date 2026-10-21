import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { z } from "zod";

import { getClientIp } from "@/lib/auth/rate-limit";
import { isPartnerAuthorized } from "@/lib/partner/auth";
import { insertPartnerPost } from "@/lib/partner/insert-partner-post";
import { isOurCloudinaryUrl } from "@/lib/partner/article-image-urls";
import {
  resolvePartnerPostDesk,
  type PartnerPostDeskId,
} from "@/lib/partner/post-desks";
import { checkSocialRateLimit } from "@/lib/social/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_FILE_BYTES * 1.4);
const FOLDER = "kindjoe/posts";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const JsonSchema = z.object({
  desk: z.string().min(1),
  destinationUrl: z.string().url(),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  caption: z.string().optional(),
  isPinned: z.boolean().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

function cloudinaryReady(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

function parseBool(value: FormDataEntryValue | null): boolean | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return undefined;
}

function parseOrder(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function uploadBuffer(buffer: Buffer): Promise<string> {
  const result = await new Promise<{ secure_url?: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, resource_type: "image" },
      (error, uploaded) => {
        if (error) reject(error);
        else resolve(uploaded ?? {});
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
  return result.secure_url ?? "";
}

async function uploadRemote(file: string): Promise<string> {
  const result = await cloudinary.uploader.upload(file, {
    folder: FOLDER,
    resource_type: "image",
  });
  if (result.resource_type && result.resource_type !== "image") {
    throw new Error("Only images are allowed.");
  }
  return result.secure_url ?? "";
}

function cloudinaryNotConfigured() {
  return NextResponse.json(
    { error: "Cloudinary is not configured (CLOUDINARY_* env vars)." },
    { status: 503 },
  );
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function deskError() {
  return NextResponse.json(
    {
      error:
        "Unknown desk. Use kindjoe, ventura, la, oxnard, or slo.",
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  if (!isPartnerAuthorized(request)) return unauthorized();

  const ip = getClientIp(request);
  const limit = checkSocialRateLimit(`partner-posts:${ip}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const contentType = (request.headers.get("content-type") || "").toLowerCase();

  try {
    let desk: PartnerPostDeskId | null = null;
    let destinationUrl = "";
    let imageUrl = "";
    let caption: string | undefined;
    let isPinned: boolean | undefined;
    let order: number | undefined;
    let isActive: boolean | undefined;
    let imageBase64 = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      desk = resolvePartnerPostDesk(String(formData.get("desk") ?? ""));
      destinationUrl = String(formData.get("destinationUrl") ?? "").trim();
      caption = String(formData.get("caption") ?? "").trim() || undefined;
      isPinned = parseBool(formData.get("isPinned"));
      order = parseOrder(formData.get("order"));
      isActive = parseBool(formData.get("isActive"));
      imageUrl = String(formData.get("imageUrl") ?? "").trim();

      const file = formData.get("file");
      if (file instanceof File) {
        if (!file.type.toLowerCase().startsWith("image/")) {
          return NextResponse.json({ error: "Only image files are allowed." }, { status: 415 });
        }
        if (file.size > MAX_FILE_BYTES) {
          return NextResponse.json({ error: "Image exceeds 8MB size limit." }, { status: 413 });
        }
        if (!cloudinaryReady()) return cloudinaryNotConfigured();
        imageUrl = await uploadBuffer(Buffer.from(await file.arrayBuffer()));
      }
    } else {
      let json: unknown;
      try {
        json = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }
      const parsed = JsonSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten().fieldErrors },
          { status: 400 },
        );
      }
      desk = resolvePartnerPostDesk(parsed.data.desk);
      destinationUrl = parsed.data.destinationUrl;
      imageUrl = parsed.data.imageUrl?.trim() ?? "";
      imageBase64 = parsed.data.imageBase64?.trim() ?? "";
      caption = parsed.data.caption;
      isPinned = parsed.data.isPinned;
      order = parsed.data.order;
      isActive = parsed.data.isActive;
    }

    if (!desk) return deskError();

    let destination: URL;
    try {
      destination = new URL(destinationUrl);
    } catch {
      return NextResponse.json(
        { error: "destinationUrl must be a valid URL." },
        { status: 400 },
      );
    }
    if (destination.protocol !== "http:" && destination.protocol !== "https:") {
      return NextResponse.json(
        { error: "destinationUrl must be an http(s) URL." },
        { status: 400 },
      );
    }

    if (imageBase64) {
      if (!imageBase64.startsWith("data:image/") || !imageBase64.includes("base64,")) {
        return NextResponse.json(
          { error: "imageBase64 must be a data:image/...;base64,... URI." },
          { status: 400 },
        );
      }
      if (imageBase64.length > MAX_BASE64_CHARS) {
        return NextResponse.json({ error: "Image exceeds 8MB size limit." }, { status: 413 });
      }
      if (!cloudinaryReady()) return cloudinaryNotConfigured();
      imageUrl = await uploadRemote(imageBase64);
    }

    if (!imageUrl) {
      return NextResponse.json(
        {
          error:
            "Send imageUrl, imageBase64, or a multipart image field named file.",
        },
        { status: 400 },
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
    if (!isOurCloudinaryUrl(imageUrl, cloudName)) {
      if (!cloudinaryReady()) return cloudinaryNotConfigured();
      imageUrl = await uploadRemote(imageUrl);
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "Image upload failed." }, { status: 502 });
    }

    const created = await insertPartnerPost({
      desk,
      imageUrl,
      destinationUrl,
      caption,
      isPinned,
      order,
      isActive,
    });

    return NextResponse.json(
      {
        success: true,
        desk,
        id: created.id,
        feedPath: created.feedPath,
        imageUrl,
        destinationUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes('relation "') && message.includes("does not exist")) {
      return NextResponse.json(
        { error: "Posts table is missing. Run DB migrations." },
        { status: 503 },
      );
    }
    console.error("[partner/posts]", error);
    const publicMessage = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: publicMessage }, { status: 500 });
  }
}
