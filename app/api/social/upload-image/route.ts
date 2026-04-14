import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { getClientIp } from "@/lib/auth/rate-limit";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { checkSocialRateLimit } from "@/lib/social/rate-limit";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = checkSocialRateLimit(`social-upload-ip:${ip}`, 15, 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
      },
    );
  }

  const session = await getServerSession();
  const user = session?.user as AuthAppUser | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userLimit = checkSocialRateLimit(`social-upload-user:${user.id}`, 8, 60_000);
  if (!userLimit.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a bit." },
      {
        status: 429,
        headers: { "Retry-After": String(userLimit.retryAfterSeconds) },
      },
    );
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json(
      { error: "Cloudinary is not configured (CLOUDINARY_* env vars)." },
      { status: 503 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (!file.type.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 415 },
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds 8MB size limit." },
        { status: 413 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "kindjoe/social-posts",
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error) reject(error);
            else if (result?.secure_url) resolve(result as { secure_url: string });
            else reject(new Error("Upload failed"));
          },
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
      },
    );

    return NextResponse.json({ url: uploadResult.secure_url });
  } catch (err: unknown) {
    console.error("social_image_upload_failed", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
