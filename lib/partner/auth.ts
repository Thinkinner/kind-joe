/** Shared server-to-server auth for Hope → Kind Joe partner routes. */
export function isPartnerAuthorized(request: Request): boolean {
  const secret = (process.env.HOPE_PUBLISH_API_KEY || "").trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader === `Bearer ${secret}`) return true;

  const apiKeyHeader = (request.headers.get("x-api-key") || "").trim();
  return apiKeyHeader === secret;
}
