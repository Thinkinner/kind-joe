const REQUIRED_PATHS = [
  "/",
  "/news",
  "/tech",
  "/politics",
  "/business",
  "/opinion",
  "/search?q=kind",
  "/ventura-county",
  "/newsletter",
  "/joes-friends",
  "/contact",
  "/advertise",
  "/about",
  "/privacy-policy",
  "/terms-of-service",
  "/disclaimer",
  "/editorial-policy",
] as const;

const EXPECTED_MARKERS: Record<(typeof REQUIRED_PATHS)[number], string[]> = {
  "/": ["Kind Joe"],
  "/news": ["Kindjoe News"],
  "/tech": ["Tech"],
  "/politics": ["Politics"],
  "/business": ["Business"],
  "/opinion": ["Opinion"],
  "/search?q=kind": ["Search"],
  "/ventura-county": ["Ventura County"],
  "/newsletter": ["Newsletter"],
  // Apostrophes are HTML-escaped in the markup, so match on the headline instead.
  "/joes-friends": ["Stop Running Your Own Content Department"],
  "/contact": ["Contact"],
  "/advertise": ["Advertise"],
  "/about": ["Kind Joe"],
  "/privacy-policy": ["Privacy Policy"],
  "/terms-of-service": ["Terms of Service"],
  "/disclaimer": ["Disclaimer"],
  "/editorial-policy": ["Editorial Policy"],
};

const PLACEHOLDER_PATTERNS = [
  /coming soon/i,
  /under construction/i,
  /lorem ipsum/i,
] as const;

type LinkCheckResult = {
  path: string;
  ok: boolean;
  reason?: string;
};

function resolveBaseUrl(): string {
  const raw =
    process.env.PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

async function checkPath(baseUrl: string, path: string): Promise<LinkCheckResult> {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      return {
        path,
        ok: false,
        reason: `expected HTTP 200, received ${response.status}`,
      };
    }

    const html = await response.text();
    if (!html || html.trim().length < 400) {
      return {
        path,
        ok: false,
        reason: "response body appears too short or empty",
      };
    }

    const hit = PLACEHOLDER_PATTERNS.find((pattern) => pattern.test(html));
    if (hit) {
      return {
        path,
        ok: false,
        reason: `placeholder content matched pattern ${hit.toString()}`,
      };
    }

    const markers = EXPECTED_MARKERS[path as keyof typeof EXPECTED_MARKERS] ?? [];
    if (markers.length > 0) {
      const foundMarker = markers.some((marker) => html.includes(marker));
      if (!foundMarker) {
        return {
          path,
          ok: false,
          reason: `expected page marker missing (${markers.join(" | ")})`,
        };
      }
    }

    return { path, ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown network error";
    return { path, ok: false, reason: detail };
  }
}

async function main() {
  const baseUrl = resolveBaseUrl();
  console.log(`Checking public links against ${baseUrl}`);

  const results = await Promise.all(
    REQUIRED_PATHS.map((path) => checkPath(baseUrl, path)),
  );

  const failures = results.filter((result) => !result.ok);
  for (const result of results) {
    if (result.ok) {
      console.log(`PASS ${result.path}`);
      continue;
    }
    console.error(`FAIL ${result.path} - ${result.reason}`);
  }

  if (failures.length > 0) {
    console.error(`\nLink integrity check failed (${failures.length} issue(s)).`);
    process.exit(1);
  }

  console.log("\nAll required public links are healthy.");
}

void main();
