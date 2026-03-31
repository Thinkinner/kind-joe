import { auth } from "@/lib/auth";
import { limitAuthPost } from "@/lib/auth/rate-limit";
import { logAuthEvent } from "@/lib/auth/log";
import {
  requiresTurnstileForPath,
  turnstileConfigured,
  verifyTurnstileToken,
} from "@/lib/auth/turnstile";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

/** Path after `/api/auth/` */
function authRelativePath(requestUrl: string): string {
  const u = new URL(requestUrl);
  const prefix = "/api/auth/";
  if (!u.pathname.startsWith(prefix)) return u.pathname;
  return u.pathname.slice(prefix.length);
}

export async function GET(request: Request) {
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const authPath = authRelativePath(request.url);

  const limited = await limitAuthPost(request, authPath);
  if (!limited.success) {
    logAuthEvent("warn", "auth_post_rate_limited", { path: authPath });
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (limited.retryAfter != null && limited.retryAfter > 0) {
      (headers as Record<string, string>)["Retry-After"] = String(
        limited.retryAfter,
      );
    }
    return Response.json(
      { message: "Too many requests. Please try again later." },
      { status: 429, headers },
    );
  }

  if (turnstileConfigured() && requiresTurnstileForPath(authPath)) {
    const token = request.headers.get("x-turnstile-token");
    const ok = await verifyTurnstileToken(token);
    if (!ok) {
      return Response.json(
        { message: "Security check failed. Please try again." },
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return handlers.POST(request);
}

export async function PATCH(request: Request) {
  return handlers.PATCH(request);
}

export async function PUT(request: Request) {
  return handlers.PUT(request);
}

export async function DELETE(request: Request) {
  return handlers.DELETE(request);
}
