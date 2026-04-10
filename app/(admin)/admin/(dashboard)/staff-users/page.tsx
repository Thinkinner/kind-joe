"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Loader2, Pencil, UserPlus } from "lucide-react";
import {
  formatStaffRolesForDisplay,
  STAFF_ROLE_PRECEDENCE,
} from "@/lib/auth/staff-roles";
import {
  ALL_ADMIN_PERMISSIONS,
  PERMISSIONS,
  type AppPermission,
} from "@/lib/auth/permissions";

type Row = {
  id: string;
  name: string;
  email: string;
  accountType: string | null;
  staffRole: string | null;
  staffRoles: string[] | null;
  rolesDisplay: string;
  directoryMasked: boolean;
  directoryRoleMask?: string | null;
  isSelf: boolean;
  showRealRoles: boolean;
  canEditRoles: boolean;
  canEditPageAccess?: boolean;
  adminPageAccess?: string[] | null;
  effectivePageAccess?: string[] | null;
  canEditDirectoryMask: boolean;
};

type PendingInvite = {
  id: string;
  email: string;
  staffRole: string;
  expiresAt: string;
  createdAt: string;
};

const INVITE_ROLES = ["writer", "editor", "manager", "admin"] as const;
const PERMISSION_LABELS: Record<AppPermission, string> = {
  [PERMISSIONS.ADMIN_DASHBOARD]: "Dashboard",
  [PERMISSIONS.ADMIN_ARTICLES]: "Articles",
  [PERMISSIONS.ADMIN_ANALYTICS]: "Article analytics",
  [PERMISSIONS.ADMIN_VISITOR_JOURNEYS]: "Visitor journeys",
  [PERMISSIONS.ADMIN_POSTS]: "Posts",
  [PERMISSIONS.ADMIN_NEWSLETTER]: "Newsletter",
  [PERMISSIONS.ADMIN_PREDICTIONS]: "News predictions",
  [PERMISSIONS.ADMIN_WEBHOOKS]: "Webhooks",
  [PERMISSIONS.ADMIN_INGEST_DATA]: "Ingest data",
  [PERMISSIONS.ADMIN_SECURITY]: "Security",
  [PERMISSIONS.ADMIN_USERS]: "Staff & roles",
};

export default function StaffUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupRole, setLookupRole] =
    useState<(typeof INVITE_ROLES)[number]>("writer");
  const [submittingLookup, setSubmittingLookup] = useState(false);

  const [modalUser, setModalUser] = useState<Row | null>(null);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [draftPageAccess, setDraftPageAccess] = useState<AppPermission[]>([]);
  const [draftMask, setDraftMask] = useState("");
  const [savingModal, setSavingModal] = useState(false);

  const load = async () => {
    const [usersRes, invRes] = await Promise.all([
      fetch("/api/admin/staff-users", { cache: "no-store" }),
      fetch("/api/admin/staff-invitations", { cache: "no-store" }),
    ]);
    if (!usersRes.ok) throw new Error("users");
    setRows(await usersRes.json());
    if (invRes.ok) {
      const j = await invRes.json();
      setInvites(j.invitations ?? []);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch {
        toast.error("Could not load users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openEditModal = (r: Row) => {
    if (!r.canEditRoles || r.staffRoles == null) return;
    setModalUser(r);
    setDraftRoles([...r.staffRoles]);
    setDraftPageAccess(
      (r.adminPageAccess as AppPermission[] | null) ??
        ((r.effectivePageAccess as AppPermission[] | null) ?? []),
    );
    setDraftMask((r.directoryRoleMask ?? "").trim());
  };

  const closeModal = () => {
    if (savingModal) return;
    setModalUser(null);
  };

  const toggleDraftRole = (role: string, checked: boolean) => {
    setDraftRoles((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, role]));
      }
      return prev.filter((x) => x !== role);
    });
  };

  const saveModal = async () => {
    if (!modalUser) return;
    if (draftRoles.length === 0) {
      toast.error("Choose at least one role.");
      return;
    }
    setSavingModal(true);
    try {
      const body: {
        userId: string;
        staffRoles: string[];
        directoryRoleMask?: string | null;
        adminPageAccess?: AppPermission[] | null;
      } = {
        userId: modalUser.id,
        staffRoles: draftRoles,
      };
      if (modalUser.canEditPageAccess) {
        body.adminPageAccess = draftPageAccess;
      }
      if (modalUser.canEditDirectoryMask) {
        body.directoryRoleMask =
          draftMask.trim() === "" ? null : draftMask.trim();
      }
      const res = await fetch("/api/admin/staff-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          typeof j.error === "string" ? j.error : "Update failed",
        );
      }
      toast.success("Saved");
      await load();
      setModalUser(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingModal(false);
    }
  };

  const handleLookupSubmit = async () => {
    const email = lookupEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Enter an email address.");
      return;
    }
    const matchedExisting = nonStaffRows.find(
      (r) => r.email.trim().toLowerCase() === email,
    );
    const matchedStaff = staffRows.find(
      (r) => r.email.trim().toLowerCase() === email,
    );

    if (matchedStaff) {
      toast.error("This email is already on the staff list.");
      return;
    }

    setSubmittingLookup(true);
    try {
      if (matchedExisting) {
        const res = await fetch("/api/admin/staff-users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: matchedExisting.id,
            staffRoles: [lookupRole],
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof j.error === "string" ? j.error : "Could not add role",
          );
        }
        toast.success("User added to staff.");
      } else {
        const res = await fetch("/api/admin/staff-invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, staffRole: lookupRole }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof j.error === "string" ? j.error : "Invite failed",
          );
        }
        toast.success(j.message ?? "Invitation sent.");
      }

      setLookupEmail("");
      setLookupRole("writer");
      setAddOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSubmittingLookup(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading staff users...
        </div>
      </div>
    );
  }

  const staffRows = rows.filter((r) => (r.accountType ?? "reader") === "staff");
  const nonStaffRows = rows.filter((r) => {
    const isStaff = (r.accountType ?? "reader") === "staff";
    return !isStaff && r.canEditRoles;
  });
  const normalizedLookupEmail = lookupEmail.trim().toLowerCase();
  const lookupMatches = nonStaffRows
    .filter((r) => {
      if (!normalizedLookupEmail) return false;
      const email = r.email.trim().toLowerCase();
      const name = r.name.trim().toLowerCase();
      return (
        email.includes(normalizedLookupEmail) ||
        name.includes(normalizedLookupEmail)
      );
    })
    .slice(0, 5);
  const exactExistingMatch = nonStaffRows.find(
    (r) => r.email.trim().toLowerCase() === normalizedLookupEmail,
  );
  const exactStaffMatch = staffRows.find(
    (r) => r.email.trim().toLowerCase() === normalizedLookupEmail,
  );
  const viewerSelfRow = rows.find((r) => r.isSelf);
  const viewerCanSeeSuperadmin = Boolean(
    viewerSelfRow?.staffRoles?.includes("superadmin"),
  );
  const editableRoleOptions = viewerCanSeeSuperadmin
    ? [...STAFF_ROLE_PRECEDENCE]
    : STAFF_ROLE_PRECEDENCE.filter((r) => r !== "superadmin");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Staff &amp; roles
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          This table shows only people with staff roles. Add people safely via
          invite link or by selecting an existing user from the directory.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">
            Add team member safely
          </h2>
          <p className="mt-1 text-xs text-neutral-600">
            Type email in one modal. Existing user = add role. Not found = send
            invite.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button type="button">
              <UserPlus className="mr-2 h-4 w-4" />
              Add member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
              <DialogDescription>
                Enter an email. If it already exists, we add a role. If not, we
                send an invitation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div>
                <label className="sr-only" htmlFor="lookup-email">
                  Email
                </label>
                <Input
                  id="lookup-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  className="bg-white"
                />
              </div>
              <Select
                value={lookupRole}
                onValueChange={(v) =>
                  setLookupRole(v as (typeof INVITE_ROLES)[number])
                }
              >
                <SelectTrigger className="w-full bg-white sm:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {exactStaffMatch ? (
                <p className="text-xs text-amber-700">
                  This email is already staff.
                </p>
              ) : exactExistingMatch ? (
                <p className="text-xs text-emerald-700">
                  Found existing user: {exactExistingMatch.name} (
                  {exactExistingMatch.email})
                </p>
              ) : (
                normalizedLookupEmail && (
                  <p className="text-xs text-neutral-600">
                    No exact existing user found. This will send an invitation.
                  </p>
                )
              )}
              {lookupMatches.length > 0 && !exactExistingMatch && (
                <div className="rounded-lg border border-neutral-200 bg-white">
                  {lookupMatches.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="flex w-full items-center justify-between border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-neutral-50"
                      onClick={() => setLookupEmail(u.email)}
                    >
                      <span className="font-medium text-neutral-900">
                        {u.name}
                      </span>
                      <span className="text-neutral-600">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={submittingLookup}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleLookupSubmit()}
                disabled={submittingLookup || !!exactStaffMatch}
              >
                {submittingLookup ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : exactExistingMatch ? (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add role
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send invite
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {invites.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-800">
            Pending invitations
          </h2>
          <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white text-sm">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span className="font-medium text-neutral-900">{inv.email}</span>
                <span className="text-neutral-600">
                  {inv.staffRole} · expires{" "}
                  {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Account</th>
              <th className="p-3 font-medium">Roles</th>
            </tr>
          </thead>
          <tbody>
            {staffRows.map((r) => {
              const isStaff = true;
              const real = r.staffRoles ?? [];
              const displayRoles = formatStaffRolesForDisplay(real);
              const summary =
                displayRoles.length > 0
                  ? displayRoles.join(", ")
                  : isStaff
                    ? "—"
                    : "—";
              const canOpenModal = r.canEditRoles && r.staffRoles != null;

              return (
                <tr key={r.id} className="border-t border-neutral-100 align-top">
                  <td className="p-3 font-medium text-neutral-900">{r.name}</td>
                  <td className="p-3 text-neutral-600">{r.email}</td>
                  <td className="p-3">
                    {isStaff ? (
                      <span className="text-neutral-800">Staff</span>
                    ) : (
                      <span className="text-neutral-500">User</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {canOpenModal ? (
                          <span className="text-neutral-900">{summary}</span>
                        ) : (
                          <div>
                            <span className="text-neutral-900">
                              {r.rolesDisplay}
                            </span>
                            {r.directoryMasked && (
                              <span className="ml-2 text-xs text-amber-700">
                                (label hidden from non-owners/non-superadmins)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {canOpenModal && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1"
                          onClick={() => openEditModal(r)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {staffRows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-neutral-500">
                  No staff users with roles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-500">
        Bootstrap superadmin (CLI):{" "}
        <code className="rounded bg-neutral-100 px-1">
          npm run auth:promote-staff -- you@site.com superadmin
        </code>
      </p>

      <Dialog
        open={modalUser != null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!savingModal}
          onPointerDownOutside={(e) => {
            if (savingModal) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (savingModal) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit roles</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1 text-left">
                <p>
                  {modalUser ? (
                    <>
                      <span className="font-medium text-neutral-900">
                        {modalUser.name}
                      </span>
                      <span className="text-neutral-600">
                        {" "}
                        ({modalUser.email})
                      </span>
                    </>
                  ) : null}
                </p>
                {(modalUser?.accountType ?? "reader") !== "staff" && (
                  <p className="text-amber-800">
                    This account is a User. Saving will promote them to Staff
                    with the roles you select.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="flex flex-col gap-3">
              {editableRoleOptions.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-center gap-3 text-neutral-900"
                >
                  <Checkbox
                    checked={draftRoles.includes(role)}
                    onCheckedChange={(c) =>
                      toggleDraftRole(role, c === true)
                    }
                    disabled={savingModal}
                  />
                  <span className="capitalize">{role}</span>
                </label>
              ))}
            </div>

            {modalUser?.canEditDirectoryMask && (
              <div className="border-t border-neutral-100 pt-4">
                <p className="mb-2 text-xs text-neutral-500">
                  Directory label (optional): what{" "}
                  <strong>non-owners/non-superadmins</strong> see instead of your real roles.
                  Owners and superadmins always see the truth.
                </p>
                <Input
                  className="bg-white"
                  placeholder='e.g. "Writer" or "Editor, Writer"'
                  value={draftMask}
                  onChange={(e) => setDraftMask(e.target.value)}
                  disabled={savingModal}
                />
              </div>
            )}

            {modalUser?.canEditPageAccess && (
              <div className="border-t border-neutral-100 pt-4">
                <p className="mb-2 text-xs text-neutral-500">
                  Page access (superadmin only): controls which admin pages appear
                  in sidebar and are accessible for this user.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ALL_ADMIN_PERMISSIONS.map((perm) => (
                    <label
                      key={perm}
                      className="flex cursor-pointer items-center gap-3 text-neutral-900"
                    >
                      <Checkbox
                        checked={draftPageAccess.includes(perm)}
                        onCheckedChange={(checked) => {
                          setDraftPageAccess((prev) => {
                            if (checked === true) {
                              return Array.from(new Set([...prev, perm]));
                            }
                            return prev.filter((p) => p !== perm);
                          });
                        }}
                        disabled={savingModal}
                      />
                      <span className="text-sm">
                        {PERMISSION_LABELS[perm] ?? perm}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={savingModal}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveModal()}
              disabled={savingModal}
            >
              {savingModal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
