/**
 * GoHighLevel — sync new reader accounts (create contact only if email not found).
 * Uses the same API as newsletter / Signals routes (v1).
 */

const GHL_BASE = "https://rest.gohighlevel.com/v1";

const READER_SOURCE = "Kind Joe reader signup";
const DEFAULT_TAG = "Kind Joe Reader";

type GhlContact = {
  id: string;
};

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const t = name.trim();
  if (!t) return { firstName: "Reader", lastName: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

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

/**
 * If GHL has no contact for this email, creates one with tag + source.
 * No-op when GOHIGHLEVEL_API_KEY is unset. Errors are logged, not thrown to callers.
 */
export async function ensureReaderContactInGhl(input: {
  email: string;
  name: string;
}): Promise<void> {
  const apiKey = process.env.GOHIGHLEVEL_API_KEY?.trim();
  if (!apiKey) return;

  const email = input.email.trim();
  if (!email) return;

  const tag =
    process.env.GOHIGHLEVEL_READER_TAG?.trim() || DEFAULT_TAG;

  try {
    const existing = await findContactByEmail(apiKey, email);
    if (existing) return;

    const { firstName, lastName } = splitDisplayName(input.name);

    const payload = {
      email,
      firstName,
      ...(lastName ? { lastName } : {}),
      source: READER_SOURCE,
      tags: [tag],
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
      // Race or duplicate: re-check and treat as success if contact now exists
      const again = await findContactByEmail(apiKey, email);
      if (again) return;
      console.error("[ghl reader-sync] create failed:", res.status, err);
    }
  } catch (e) {
    console.error(
      "[ghl reader-sync]",
      e instanceof Error ? e.message : e,
    );
  }
}
