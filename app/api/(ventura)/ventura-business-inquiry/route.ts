import { NextResponse } from "next/server";
import { db } from "@/db";
import { venturaBusinessInquiries } from "@/db/schema";
import { createAdminNotification } from "@/lib/admin/notifications";
import { publicSiteUrl } from "@/lib/site/public-site-url";

type InquiryBody = {
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  source?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as InquiryBody;
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() ?? "";
    const businessName = body.businessName?.trim() ?? "";
    const source =
      body.source?.trim().replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80) ||
      "ventura_posts";

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email is required." },
        { status: 400 },
      );
    }
    if (!phone) {
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    }
    if (!businessName) {
      return NextResponse.json(
        { error: "Business name is required." },
        { status: 400 },
      );
    }

    const [inquiry] = await db
      .insert(venturaBusinessInquiries)
      .values({
        name,
        email,
        phone,
        businessName,
        source,
      })
      .returning();

    const adminPath = "/admin/ventura-business-inquiries";
    await createAdminNotification({
      type: "ventura_business_inquiry",
      title: "New Ventura business promo inquiry",
      body: `${name} · ${businessName} · ${email} · ${phone}`,
      href: adminPath,
      meta: {
        inquiryId: inquiry?.id ?? null,
        name,
        email,
        phone,
        businessName,
      },
      emailSubject: `New Ventura business inquiry: ${businessName}`,
    }).catch((error) => {
      console.error("Failed to create admin notification:", error);
    });

    // Keep CRM sync, but don't fail the request if GHL is down after we saved.
    const apiKey = process.env.VC_GOHIGHLEVEL_API_KEY?.trim();
    if (apiKey) {
      const [firstName, ...rest] = name.split(/\s+/);
      const lastName = rest.join(" ") || "Business";

      const payload = {
        email,
        phone,
        firstName: firstName || name,
        lastName,
        source: "ventura_posts_business",
        tags: [
          "Business Inquiry",
          "Ventura Business Promo",
          "ventura_posts_business",
        ],
        customFields: [
          { name: "businessName", value: businessName },
          { name: "signupOrigin", value: "ventura_posts_business" },
        ],
      };

      try {
        const response = await fetch(
          "https://rest.gohighlevel.com/v1/contacts/",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );
        if (!response.ok) {
          console.error(
            "Ventura business GHL sync failed:",
            await response.text(),
          );
        }
      } catch (error) {
        console.error("Ventura business GHL sync error:", error);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        adminUrl: publicSiteUrl(adminPath),
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to submit business inquiry.",
      },
      { status: 500 },
    );
  }
}
