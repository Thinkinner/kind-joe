/** Public POST: marketing signup → GoHighLevel; no user session (not reader-private). */
import { NextResponse } from "next/server";
import {
  SIGNALS_ACCESS_COOKIE,
  SIGNALS_ACCESS_VALUE,
} from "@/lib/signals/access";

const GHL_BASE = "https://rest.gohighlevel.com/v1";
const SIGNALS_TAG = "KindJoe Signals";

type GhlContact = {
  id: string;
  tags?: string[];
};

async function findContactByEmail(
  apiKey: string,
  email: string,
): Promise<GhlContact | null> {
  const res = await fetch(
    `${GHL_BASE}/contacts/?query=${encodeURIComponent(email)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { contacts?: GhlContact[] };
  return data.contacts?.[0] ?? null;
}

/** Create new contact, or merge KindJoe Signals tag onto an existing email. */
async function upsertSignalsLeadToGhl(
  apiKey: string,
  email: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const existing = await findContactByEmail(apiKey, email);

  if (existing) {
    const prevTags = Array.isArray(existing.tags) ? existing.tags : [];
    const tags = [...new Set([...prevTags, SIGNALS_TAG])];
    const res = await fetch(`${GHL_BASE}/contacts/${existing.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
        tags,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(
        `Failed to update Go High Level contact: ${res.status} — ${err}`,
      );
    }
    return;
  }

  const payload = {
    email,
    firstName,
    lastName,
    source: "KindJoe Signals",
    tags: [SIGNALS_TAG],
  };

  const res = await fetch(`${GHL_BASE}/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    // Duplicate or race: try merge path
    const again = await findContactByEmail(apiKey, email);
    if (again) {
      const prevTags = Array.isArray(again.tags) ? again.tags : [];
      const tags = [...new Set([...prevTags, SIGNALS_TAG])];
      const put = await fetch(`${GHL_BASE}/contacts/${again.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName, tags }),
      });
      if (!put.ok) {
        const putErr = await put.text();
        throw new Error(
          `Failed to merge Go High Level contact: ${put.status} — ${putErr}`,
        );
      }
      return;
    }
    throw new Error(
      `Failed to add contact to Go High Level: ${res.status} — ${err}`,
    );
  }
}

const emailOk = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOHIGHLEVEL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Go High Level is not configured." },
        { status: 500 },
      );
    }

    const body = (await req.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      agree?: boolean;
    };

    const email = (body.email ?? "").trim();
    const firstName = (body.firstName ?? "").trim();
    const lastName = (body.lastName ?? "").trim();

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required." },
        { status: 400 },
      );
    }

    if (!emailOk(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (body.agree !== true) {
      return NextResponse.json(
        { error: "You must agree to continue." },
        { status: 400 },
      );
    }

    await upsertSignalsLeadToGhl(apiKey, email, firstName, lastName);

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set({
      name: SIGNALS_ACCESS_COOKIE,
      value: SIGNALS_ACCESS_VALUE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error.";
    console.error("[signals-lead]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
