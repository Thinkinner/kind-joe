"use server";

import { NewsletterData, AppSettings } from "./types";
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

/**
 * Uploads a single image URL to Cloudinary.
 * Supports Signed Upload (preferred) or Unsigned Preset.
 */
export const uploadImage = async (imageUrl: string, settings: AppSettings): Promise<string> => {
  if (!imageUrl || !settings.cloudinaryCloudName) return "";

  const url = `https://api.cloudinary.com/v1_1/${settings.cloudinaryCloudName}/image/upload`;
  const formData = new FormData();
  
  formData.append("file", imageUrl);

  try {
    // METHOD A: Signed Upload (Uses API Key & Secret)
    if (settings.cloudinaryApiKey && settings.cloudinaryApiSecret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const paramsToSign = { timestamp }; // Add other params here if needed (e.g. public_id, folder)
      
      const signature = await generateSignature(paramsToSign, settings.cloudinaryApiSecret);
      
      formData.append("api_key", settings.cloudinaryApiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
    } 
    // METHOD B: Unsigned Upload (Uses Preset)
    else if (settings.cloudinaryUploadPreset) {
      formData.append("upload_preset", settings.cloudinaryUploadPreset);
    } 
    else {
      // Missing auth details
      console.warn("Missing Cloudinary credentials (API Key/Secret or Upload Preset).");
      return imageUrl;
    }

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Cloudinary upload failed for ${imageUrl}:`, errorText);
      return imageUrl; // Fallback to original
    }

    const data = await response.json();
    return data.secure_url; // Return the new Cloudinary URL
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
  settings: AppSettings,
): Promise<NewsletterData> => {
  await assertStaff();
  // Check if we have enough info to proceed
  const hasSignedAuth =
    settings.cloudinaryCloudName &&
    settings.cloudinaryApiKey &&
    settings.cloudinaryApiSecret;
  const hasPresetAuth = settings.cloudinaryCloudName && settings.cloudinaryUploadPreset;

  if (!hasSignedAuth && !hasPresetAuth) {
    console.log("Cloudinary settings incomplete. Skipping image upload.");
    return data;
  }

  console.log("Starting Cloudinary upload for newsletter images...");

  const newStories = await Promise.all(
    data.stories.map(async (story) => {
      // If no image, skip
      if (!story.imageUrl) return story;

      // Upload and get new URL
      const newUrl = await uploadImage(story.imageUrl, settings);

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
  settings: AppSettings,
): Promise<string> {
  await assertStaff();
  if (!base64DataUri?.includes("base64,")) {
    throw new Error("Invalid base64 image data");
  }
  if (!settings.cloudinaryCloudName) {
    throw new Error("Cloudinary cloud name not configured in settings");
  }

  const url = `https://api.cloudinary.com/v1_1/${settings.cloudinaryCloudName}/image/upload`;
  const formData = new FormData();
  formData.append("file", base64DataUri);

  if (settings.cloudinaryApiKey && settings.cloudinaryApiSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = { timestamp };
    const signature = await generateSignature(
      paramsToSign,
      settings.cloudinaryApiSecret,
    );
    formData.append("api_key", settings.cloudinaryApiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
  } else if (settings.cloudinaryUploadPreset) {
    formData.append("upload_preset", settings.cloudinaryUploadPreset);
  } else {
    throw new Error("Cloudinary API credentials or upload preset required");
  }

  const response = await fetch(url, { method: "POST", body: formData });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }
  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error("Cloudinary returned no URL");
  return data.secure_url;
}