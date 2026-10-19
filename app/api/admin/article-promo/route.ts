import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveStaffApi } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getArticlePromoSettings,
  saveArticlePromoSettings,
} from "@/lib/content/article-promo-settings";

const PatchSchema = z.object({
  videoUrl: z.string().trim().max(2000),
  bannerImageUrl: z.string().trim().max(2000).nullable(),
});

function isHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getArticlePromoSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  }

  const videoUrl = parsed.data.videoUrl;
  const bannerImageUrl = parsed.data.bannerImageUrl || null;
  if (!isHttpUrl(videoUrl) || (bannerImageUrl && !isHttpUrl(bannerImageUrl))) {
    return NextResponse.json(
      { error: "Use a full http or https link." },
      { status: 400 },
    );
  }

  const saved = await saveArticlePromoSettings(
    { videoUrl, bannerImageUrl },
    staff.user.id,
  );
  return NextResponse.json(saved);
}
