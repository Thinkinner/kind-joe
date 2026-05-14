/** Signup origin cookie cleared after reader signup GHL sync. */
export const GHL_SIGNUP_ORIGIN_COOKIE = "kj_ghl_origin";

/** Allowed origin cookie values → appended as GHL tags on reader signup. */
export const GHL_SIGNUP_ORIGIN_ALLOWED = new Set<string>(["kindjoe-web"]);
