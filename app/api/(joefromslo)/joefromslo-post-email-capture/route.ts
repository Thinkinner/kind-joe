import { NextResponse } from "next/server";

type CaptureBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
};

function sanitizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CaptureBody;
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const goHighLevelApiKey = process.env.GOHIGHLEVEL_API_KEY?.trim();
    if (!goHighLevelApiKey) {
      return NextResponse.json(
        { error: "KindJoe GoHighLevel is not configured." },
        { status: 500 },
      );
    }

    const additionalTags = (body.tags ?? [])
      .map((tag) => sanitizeTag(tag))
      .filter((tag) => tag.length > 0);

    const payload = {
      email,
      firstName: body.firstName?.trim() || "KindJoeSLO",
      lastName: body.lastName?.trim() || "Reader",
      source: "joefromslo_posts",
      tags: [
        "Newsletter Subscriber",
        "kindjoe_posts",
        "joefromslo_posts",
        "joefromslo_page",
        ...additionalTags,
      ],
      customFields: [{ name: "signupOrigin", value: "joefromslo_posts" }],
    };

    const response = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${goHighLevelApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: `Failed to capture email: ${details}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to capture Kind Joe San Luis Obispo email.",
      },
      { status: 500 },
    );
  }
}
