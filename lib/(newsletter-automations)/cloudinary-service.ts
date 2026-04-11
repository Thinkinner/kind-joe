"use server";

import { NewsletterData } from "./types";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

async function assertStaff() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) throw new Error("Unauthorized");
}

// Helper to generate SHA-1 signature for Cloudinary API
const generateSignature = async (paramsToSign: Record<string, string>, apiSecret: string): Promise<string> => {
  // 1. Sort parameters by name
  const sortedKeys = Object.keys(paramsToSign).sort();
  
  // 2. Create string "key=value&key2=value2"
  const paramString = sortedKeys.map(key => `${key}=${paramsToSign[key]}`).join('&');
  
  // 3. Append secret
  const stringToSign = paramString + apiSecret;

  // 4. Create SHA-1 hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
};

const resolveCloudinaryConfig = (): CloudinaryConfig => ({
  cloudName: (process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
  apiKey: (process.env.CLOUDINARY_API_KEY || "").trim(),
  apiSecret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
  uploadPreset: (process.env.CLOUDINARY_UPLOAD_PRESET || "").trim(),
});

const hasSignedAuth = (cfg: CloudinaryConfig): boolean =>
  Boolean(cfg.cloudName && cfg.apiKey && cfg.apiSecret);

const hasPresetAuth = (cfg: CloudinaryConfig): boolean =>
  Boolean(cfg.cloudName && cfg.uploadPreset);

const withCloudinaryAuth = async (
  formData: FormData,
  cfg: CloudinaryConfig,
): Promise<void> => {
  if (cfg.apiKey && cfg.apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = { timestamp };
    const signature = await generateSignature(paramsToSign, cfg.apiSecret);
    formData.append("api_key", cfg.apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    return;
  }

  if (cfg.uploadPreset) {
    formData.append("upload_preset", cfg.uploadPreset);
    return;
  }

  throw new Error("Cloudinary is not configured (CLOUDINARY_* env vars).");
};

const normalizeImageUrlCandidates = (rawUrl: string): string[] => {
  const base = (rawUrl || "").trim().replace(/&amp;/g, "&");
  if (!base) return [];

  const candidates = new Set<string>([base]);
  let next = base;
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(next);
      if (decoded === next) break;
      if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        candidates.add(decoded);
        next = decoded;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return Array.from(candidates);
};

const uploadToCloudinary = async (
  fileValue: string,
  cfg: CloudinaryConfig,
): Promise<string | null> => {
  if (!cfg.cloudName) return null;

  const url = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`;
  const formData = new FormData();
  formData.append("file", fileValue);
  await withCloudinaryAuth(formData, cfg);

  const response = await fetch(url, { method: "POST", body: formData });
  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`Cloudinary upload failed for ${fileValue}:`, errorText);
    return null;
  }

  const data = (await response.json()) as { secure_url?: string };
  return data.secure_url ?? null;
};

const downloadImageAsDataUri = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUrl, {
      headers: { Accept: "image/*,*/*;q=0.8" },
    });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
};

/**
 * Uploads a single image URL to Cloudinary.
 * Supports Signed Upload (preferred) or Unsigned Preset.
 */
export const uploadImage = async (imageUrl: string): Promise<string> => {
  const cfg = resolveCloudinaryConfig();
  if (!imageUrl || !cfg.cloudName) return "";
  if (imageUrl.includes("res.cloudinary.com")) return imageUrl;

  try {
    const candidates = normalizeImageUrlCandidates(imageUrl);

    for (const candidate of candidates) {
      const uploaded = await uploadToCloudinary(candidate, cfg);
      if (uploaded) return uploaded;
    }

    // Some feeds expose encoded/blocked URLs that Cloudinary cannot pull directly.
    // In that case, download bytes and upload as a data URI.
    for (const candidate of candidates) {
      const dataUri = await downloadImageAsDataUri(candidate);
      if (!dataUri) continue;

      const uploaded = await uploadToCloudinary(dataUri, cfg);
      if (uploaded) return uploaded;
    }

    return imageUrl; // Fallback to original
  } catch (error) {
    console.error(`Error uploading to Cloudinary: ${imageUrl}`, error);
    return imageUrl; // Fallback to original
  }
};

/**
 * Processes the newsletter data, uploading all story images to Cloudinary in parallel.
 * Returns a new NewsletterData object with updated image URLs.
 */
export const processNewsletterImages = async (
  data: NewsletterData,
): Promise<NewsletterData> => {
  await assertStaff();
  const cfg = resolveCloudinaryConfig();

  if (!hasSignedAuth(cfg) && !hasPresetAuth(cfg)) {
    console.log("Cloudinary env vars incomplete. Skipping image upload.");
    return data;
  }

  console.log("Starting Cloudinary upload for newsletter images...");

  const newStories = await Promise.all(
    data.stories.map(async (story) => {
      // If no image, skip
      if (!story.imageUrl) return story;

      // Upload and get new URL
      const newUrl = await uploadImage(story.imageUrl);

      return {
        ...story,
        imageUrl: newUrl
      };
    })
  );

  return {
    ...data,
    stories: newStories,
  };
};

/** Upload a browser data-URL image to Cloudinary (manual story images in review). */
export async function uploadBase64ImageToCloudinary(
  base64DataUri: string,
): Promise<string> {
  await assertStaff();
  if (!base64DataUri?.includes("base64,")) {
    throw new Error("Invalid base64 image data");
  }
  const cfg = resolveCloudinaryConfig();
  if (!cfg.cloudName) {
    throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME missing)");
  }

  const url = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`;
  const formData = new FormData();
  formData.append("file", base64DataUri);
  await withCloudinaryAuth(formData, cfg);

  const response = await fetch(url, { method: "POST", body: formData });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }
  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error("Cloudinary returned no URL");
  return data.secure_url;
}