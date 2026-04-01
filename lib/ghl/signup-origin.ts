/** Cookie set when user browses Kind Joe Watch; cleared after reader signup GHL sync. */
export const GHL_SIGNUP_ORIGIN_COOKIE = "kj_ghl_origin";

/** GHL contact tag + cookie value for Watch funnel signups. */
export const GHL_ORIGIN_KINDJOE_WATCH = "kindjoe-watch";

/** Allowed origin cookie values → appended as GHL tags on reader signup. */
export const GHL_SIGNUP_ORIGIN_ALLOWED = new Set<string>([
  GHL_ORIGIN_KINDJOE_WATCH,
  "kindjoe-web",
]);
