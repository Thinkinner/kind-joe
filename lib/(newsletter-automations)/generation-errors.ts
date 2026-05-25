export type GenerationStep =
  | "load_ingest"
  | "fetch_rss"
  | "ai_newsletter"
  | "ai_article"
  | "ai_story"
  | "upload_images"
  | "save_draft"
  | "settings"
  | "publish";

export type GenerationErrorContext = {
  step?: GenerationStep;
  storyIndex?: number;
  storyTotal?: number;
  headline?: string;
};

export type FormattedGenerationError = {
  title: string;
  reason: string;
  hints: string[];
};

const STEP_LABELS: Record<GenerationStep, string> = {
  load_ingest: "Loading article pool from database",
  fetch_rss: "Fetching RSS / news sources",
  ai_newsletter: "AI drafting the newsletter edition",
  ai_article: "AI writing a full article",
  ai_story: "AI building a story card",
  upload_images: "Uploading images to Cloudinary",
  save_draft: "Saving the newsletter draft",
  settings: "Loading newsletter settings",
  publish: "Publishing articles",
};

function stepLabel(step: GenerationStep | undefined): string {
  return step ? STEP_LABELS[step] : "Newsletter generation";
}

function readStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const record = error as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;
  if (typeof record.statusCode === "number") return record.statusCode;
  const cause = record.cause;
  if (typeof cause === "object" && cause !== null && "status" in cause) {
    const status = (cause as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

function readMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
  }
  return "Unknown error";
}

function classifyReason(message: string, status: number | null): {
  reason: string;
  hints: string[];
} {
  const lower = message.toLowerCase();

  if (lower.includes("google_api_key") || lower.includes("api key not found")) {
    return {
      reason: "Gemini API key is missing or not loaded.",
      hints: [
        "Add GOOGLE_API_KEY to .env.local (Google AI Studio key).",
        "Restart npm run dev after changing env vars.",
      ],
    };
  }

  if (lower.includes("unauthorized") || status === 401) {
    return {
      reason: "Your admin session is missing or expired.",
      hints: [
        "Open admin at http://admin.localhost:3000/admin and sign in again.",
        "Use the same host for the whole session (avoid mixing localhost and admin.localhost).",
      ],
    };
  }

  if (
    status === 429 ||
    lower.includes("resource exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("quota")
  ) {
    return {
      reason: "Gemini rate limit or quota was hit.",
      hints: [
        "Wait 1–2 minutes, then try again.",
        "For batch article generation, click Generate again — completed stories are skipped.",
        "Check usage in Google AI Studio if this keeps happening.",
      ],
    };
  }

  if (status === 403 || lower.includes("permission denied")) {
    return {
      reason: "Gemini rejected the request (permission or API access).",
      hints: [
        "Confirm GOOGLE_API_KEY is valid and has access to the configured model.",
        `Model in use: ${process.env.GEMINI_NEWSLETTER_MODEL ?? "gemini-3-flash-preview"}.`,
      ],
    };
  }

  if (
    status !== null &&
    status >= 500 ||
    lower.includes("internal") ||
    lower.includes("unavailable")
  ) {
    return {
      reason: "Gemini or a network service returned a temporary server error.",
      hints: ["Wait a moment and retry.", "If it persists, check Google AI / Cloud status."],
    };
  }

  if (lower.includes("malformed") || lower.includes("parse model json")) {
    return {
      reason: "The AI returned invalid JSON (could not parse the response).",
      hints: [
        "Click Generate again — this is usually transient.",
        "If one story fails repeatedly, try Regenerate on that story only.",
      ],
    };
  }

  if (lower.includes("author id")) {
    return {
      reason: "Newsletter author is not configured.",
      hints: [
        "Open Admin → Newsletter settings and set Author ID to a valid CMS user id.",
      ],
    };
  }

  if (lower.includes("image url") || lower.includes("needs an image")) {
    return {
      reason: "One or more stories are missing an image URL.",
      hints: [
        "Add an image for each story in the review editor before generating articles.",
      ],
    };
  }

  if (lower.includes("no articles found")) {
    return {
      reason: "No source articles were available to build the edition.",
      hints: [
        "Run RSS ingest so news_rss_articles has rows from the last few hours, or",
        "Confirm default RSS feeds are reachable (feed proxy / network).",
      ],
    };
  }

  if (lower.includes("proxy fetch") || lower.includes("rss")) {
    return {
      reason: message,
      hints: [
        "Check your network and that /api/admin/newsletter/feed-proxy works.",
        "Try again — the app rotates through several fetch strategies.",
      ],
    };
  }

  if (lower.includes("cloudinary")) {
    return {
      reason: message,
      hints: [
        "Verify Cloudinary env vars in .env.local.",
        "Confirm image URLs are public and reachable.",
      ],
    };
  }

  return {
    reason: message,
    hints: ["Check the terminal running npm run dev for more detail."],
  };
}

export function formatGenerationError(
  error: unknown,
  context: GenerationErrorContext = {},
): FormattedGenerationError {
  const message = readMessage(error);
  const status = readStatus(error);
  const { reason, hints } = classifyReason(message, status);

  const parts: string[] = [];
  if (
    typeof context.storyIndex === "number" &&
    typeof context.storyTotal === "number"
  ) {
    const headline = context.headline?.trim();
    parts.push(
      headline
        ? `Story ${context.storyIndex + 1} of ${context.storyTotal}: “${headline}”`
        : `Story ${context.storyIndex + 1} of ${context.storyTotal}`,
    );
  } else if (context.step) {
    parts.push(stepLabel(context.step));
  }

  const title =
    parts.length > 0 ? `Could not finish: ${parts[0]}` : "Generation failed";

  return { title, reason, hints };
}

export function formatGenerationErrorMessage(
  error: unknown,
  context: GenerationErrorContext = {},
): string {
  const { title, reason, hints } = formatGenerationError(error, context);
  const lines = [title, "", `Reason: ${reason}`];
  if (hints.length > 0) {
    lines.push("", "What to try:");
    for (const hint of hints) {
      lines.push(`• ${hint}`);
    }
  }
  return lines.join("\n");
}
