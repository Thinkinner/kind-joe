import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

import { getClientIp } from "@/lib/auth/rate-limit";
import { articleImageUrls, isOurCloudinaryUrl } from "@/lib/partner/article-image-urls";
import { isPartnerAuthorized } from "@/lib/partner/auth";
import { checkSocialRateLimit } from "@/lib/social/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_FILE_BYTES * 1.4);
const FOLDER = "kindjoe/articles";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type UploadResult = { secure_url?: string; resource_type?: string };

function cloudinaryReady(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

async function uploadRemoteOrData(file: string): Promise<UploadResult> {
  return cloudinary.uploader.upload(file, {
    folder: FOLDER,
    resource_type: "image",
  });
}

async function uploadBuffer(buffer: Buffer): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve((result ?? {}) as UploadResult);
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

export async function POST(request: Request) {
  if (!isPartnerAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limit = checkSocialRateLimit(`partner-upload:${ip}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  if (!cloudinaryReady()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured (CLOUDINARY_* env vars)." },
      { status: 503 },
    );
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!.trim();

  try {
    const contentType = (request.headers.get("content-type") || "").toLowerCase();
    let secureUrl = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded. Send field `file`." }, { status: 400 });
      }
      if (!file.type.toLowerCase().startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are allowed." }, { status: 415 });
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "Image exceeds 8MB size limit." }, { status: 413 });
      }
      const uploaded = await uploadBuffer(Buffer.from(await file.arrayBuffer()));
      secureUrl = uploaded.secure_url ?? "";
    } else {
      let json: unknown;
      try {
        json = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }
      const body = (json ?? {}) as { imageUrl?: unknown; imageBase64?: unknown };
      const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
      const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";

      if (!imageUrl && !imageBase64) {
        return NextResponse.json(
          { error: "Send imageUrl, imageBase64, or a multipart file field named file." },
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
        const uploaded = await uploadRemoteOrData(imageBase64);
        secureUrl = uploaded.secure_url ?? "";
      } else if (isOurCloudinaryUrl(imageUrl, cloudName)) {
        secureUrl = imageUrl;
      } else if (!isHttpsUrl(imageUrl)) {
        return NextResponse.json(
          { error: "imageUrl must be a public https URL." },
          { status: 400 },
        );
      } else {
        const uploaded = await uploadRemoteOrData(imageUrl);
        if (uploaded.resource_type && uploaded.resource_type !== "image") {
          return NextResponse.json({ error: "Only images are allowed." }, { status: 415 });
        }
        secureUrl = uploaded.secure_url ?? "";
      }
    }

    if (!secureUrl) {
      return NextResponse.json({ error: "Upload failed." }, { status: 502 });
    }

    return NextResponse.json({ success: true, ...articleImageUrls(secureUrl) });
  } catch (error) {
    console.error("[partner/upload-image]", error);
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
