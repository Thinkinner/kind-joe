import { Resend } from "resend";

export type AuthEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let client: Resend | null | undefined;

function getResend(): Resend | null {
  if (client !== undefined) return client;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    client = null;
    return null;
  }
  client = new Resend(key);
  return client;
}

export function getTransactionalFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ?? "Kind Joe <onboarding@resend.dev>"
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function authPasswordResetHtml(name: string | undefined, url: string) {
  const safeName = name?.trim() ? escapeHtml(name.trim()) : "";
  const safeUrl = escapeHtml(url);
  return `<p>Hi${safeName ? ` ${safeName}` : ""},</p><p><a href="${safeUrl}">Choose a new password</a></p><p>If you did not request a reset, you can ignore this message.</p>`;
}

export function authVerifyEmailHtml(name: string | undefined, url: string) {
  const safeName = name?.trim() ? escapeHtml(name.trim()) : "";
  const safeUrl = escapeHtml(url);
  return `<p>Hi${safeName ? ` ${safeName}` : ""},</p><p><a href="${safeUrl}">Verify your email</a></p><p>If you did not create an account, you can ignore this message.</p>`;
}

export function authVerifyEmailText(name: string | undefined, url: string) {
  const greeting = name?.trim() ? `Hi ${name.trim()},\n\n` : "";
  return `${greeting}Verify your email by opening this link:\n\n${url}\n\nIf you did not create an account, ignore this email.`;
}

function otpTypeLabel(
  type: "sign-in" | "email-verification" | "forget-password" | "change-email",
): string {
  switch (type) {
    case "sign-in":
      return "sign in to Kind Joe";
    case "forget-password":
      return "reset your Kind Joe password";
    case "email-verification":
      return "verify your Kind Joe email";
    case "change-email":
      return "confirm your Kind Joe email change";
    default:
      return "continue with Kind Joe";
  }
}

export function authOtpEmailHtml(
  otp: string,
  type: "sign-in" | "email-verification" | "forget-password" | "change-email",
) {
  const safeOtp = escapeHtml(otp);
  const purpose = escapeHtml(otpTypeLabel(type));
  return `
<p>Your verification code is:</p>
<p style="font-size:28px;font-weight:600;letter-spacing:0.25em;font-family:ui-monospace,monospace;margin:16px 0;">${safeOtp}</p>
<p>Enter this code to ${purpose}. It expires in 10 minutes.</p>
<p style="color:#64748b;font-size:14px;">If you did not request this, you can ignore this email.</p>
`.trim();
}

export function authOtpEmailText(
  otp: string,
  type: "sign-in" | "email-verification" | "forget-password" | "change-email",
) {
  return `Your Kind Joe code: ${otp}\n\nUse this code to ${otpTypeLabel(type)}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email.`;
}

export function authDeleteAccountHtml(url: string) {
  const safeUrl = escapeHtml(url);
  return `<p>You asked to permanently delete your Kind Joe reader account.</p><p><a href="${safeUrl}">Confirm delete my account</a></p><p>This link expires in 24 hours. If you did not request deletion, ignore this email and your account will stay active.</p>`;
}

export function authDeleteAccountText(url: string) {
  return `Confirm Kind Joe account deletion by opening this link (expires in 24 hours):\n\n${url}\n\nIf you did not request this, ignore this email.`;
}

export function staffInviteEmailHtml(
  roleLabel: string,
  acceptUrl: string,
) {
  const safeUrl = escapeHtml(acceptUrl);
  const safeRole = escapeHtml(roleLabel);
  return `
<p>You’ve been invited to join the Kind Joe team as <strong>${safeRole}</strong>.</p>
<p><a href="${safeUrl}">Accept invitation</a></p>
<p style="color:#64748b;font-size:14px;">This link expires in 7 days. Sign in with this email address (or create an account using it), then open the link again to finish.</p>
`.trim();
}

export function staffInviteEmailText(roleLabel: string, acceptUrl: string) {
  return `You've been invited to join Kind Joe as ${roleLabel}.\n\nAccept (expires in 7 days):\n${acceptUrl}\n\nUse this email to sign in or register, then open the link to finish.`;
}

/**
 * Sends transactional mail via Resend. Better Auth recommends not awaiting
 * these handlers on the request path; use {@link queueAuthEmail} from `lib/auth.ts`.
 */
export async function sendAuthEmail(payload: AuthEmailPayload): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY is not set; skipped send to",
      payload.to,
    );
    return;
  }
  const { error } = await resend.emails.send({
    from: getTransactionalFrom(),
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
  if (error) {
    throw new Error(error.message);
  }
}
