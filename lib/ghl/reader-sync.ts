/**
 * GoHighLevel — sync reader accounts (create contact, or merge tags if email exists).
 * Uses v1 REST API (same as newsletter / Signals routes).
 */

const GHL_BASE = "https://rest.gohighlevel.com/v1";

const READER_SOURCE = "Kind Joe reader signup";
const DEFAULT_TAG = "Kind Joe Reader";

type GhlContact = {
  id: string;
  tags?: string[];
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

function buildReaderTags(extraTags: string[] | undefined): string[] {
  const readerTag =
    process.env.GOHIGHLEVEL_READER_TAG?.trim() || DEFAULT_TAG;
  return [...new Set([readerTag, ...(extraTags ?? [])].filter(Boolean))];
}

/**
 * Ensures this email exists in GHL as a contact with reader + optional origin tags.
 * - New email: POST contact with tags.
 * - Existing: PUT to merge tags (and refresh first/last name from signup).
 * No-op when GOHIGHLEVEL_API_KEY is unset. Errors are logged, not thrown.
 */
export async function ensureReaderContactInGhl(input: {
  email: string;
  name: string;
  /** Extra GHL tags from signup funnel cookie. */
  extraTags?: string[];
}): Promise<void> {
  const apiKey = process.env.GOHIGHLEVEL_API_KEY?.trim();
  if (!apiKey) return;

  const email = input.email.trim();
  if (!email) return;

  const tagsToApply = buildReaderTags(input.extraTags);
  const { firstName, lastName } = splitDisplayName(input.name);

  try {
    const existing = await findContactByEmail(apiKey, email);

    if (existing) {
      const prevTags = Array.isArray(existing.tags) ? existing.tags : [];
      const merged = [...new Set([...prevTags, ...tagsToApply])];
      const tagsUnchanged =
        merged.length === prevTags.length &&
        merged.every((t) => prevTags.includes(t));
      if (tagsUnchanged) return;

      const res = await fetch(`${GHL_BASE}/contacts/${existing.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          ...(lastName ? { lastName } : {}),
          tags: merged,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[ghl reader-sync] merge tags failed:", res.status, err);
      }
      return;
    }

    const payload = {
      email,
      firstName,
      ...(lastName ? { lastName } : {}),
      source: READER_SOURCE,
      tags: tagsToApply,
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
      const again = await findContactByEmail(apiKey, email);
      if (again) {
        const prevTags = Array.isArray(again.tags) ? again.tags : [];
        const merged = [...new Set([...prevTags, ...tagsToApply])];
        const put = await fetch(`${GHL_BASE}/contacts/${again.id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName,
            ...(lastName ? { lastName } : {}),
            tags: merged,
          }),
        });
        if (!put.ok) {
          const putErr = await put.text();
          console.error(
            "[ghl reader-sync] merge after create race failed:",
            put.status,
            putErr,
          );
        }
        return;
      }
      console.error("[ghl reader-sync] create failed:", res.status, err);
    }
  } catch (e) {
    console.error(
      "[ghl reader-sync]",
      e instanceof Error ? e.message : e,
    );
  }
}
