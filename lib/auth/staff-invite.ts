import { createHash, randomBytes } from "crypto";
import { z } from "zod";

/** Roles an owner/admin can assign via email invite (not `owner`). */
export const INVITABLE_STAFF_ROLES = [
  "writer",
  "editor",
  "manager",
  "admin",
] as const;

export type InvitableStaffRole = (typeof INVITABLE_STAFF_ROLES)[number];

export const InvitableStaffRoleSchema = z.enum(INVITABLE_STAFF_ROLES);

const ROLE_LABELS: Record<InvitableStaffRole, string> = {
  writer: "Writer",
  editor: "Editor",
  manager: "Manager",
  admin: "Admin",
};

export function staffRoleLabel(role: string): string {
  return ROLE_LABELS[role as InvitableStaffRole] ?? role;
}

export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw.trim()).digest("hex");
}
