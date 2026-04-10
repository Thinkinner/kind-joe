"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Globe2,
  Mail,
  Loader2,
  MoreHorizontal,
  UserPlus,
} from "lucide-react";
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
  [PERMISSIONS.ADMIN_ARTICLE_ASSISTANT]: "Article assistant",
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

const ACCESS_PRESET_OPTIONS = ["admin", "editor", "viewer"] as const;
type AccessPreset = (typeof ACCESS_PRESET_OPTIONS)[number];

export default function StaffUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupRole, setLookupRole] =
    useState<(typeof INVITE_ROLES)[number]>("writer");
  const [submittingLookup, setSubmittingLookup] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [globalAccessOpen, setGlobalAccessOpen] = useState(false);

  const [modalUser, setModalUser] = useState<Row | null>(null);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [draftPageAccess, setDraftPageAccess] = useState<AppPermission[]>([]);
  const [draftMask, setDraftMask] = useState("");
  const [savingModal, setSavingModal] = useState(false);
  const [pendingRemoveUser, setPendingRemoveUser] = useState<Row | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

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

  const applyAccessPreset = (preset: AccessPreset) => {
    let next: AppPermission[];
    if (preset === "admin") {
      next = ALL_ADMIN_PERMISSIONS.filter(
        (perm) => perm !== PERMISSIONS.ADMIN_SUPERADMIN,
      );
    } else if (preset === "editor") {
      next = [
        PERMISSIONS.ADMIN_DASHBOARD,
        PERMISSIONS.ADMIN_ARTICLES,
        PERMISSIONS.ADMIN_ARTICLE_ASSISTANT,
        PERMISSIONS.ADMIN_ANALYTICS,
        PERMISSIONS.ADMIN_VISITOR_JOURNEYS,
        PERMISSIONS.ADMIN_POSTS,
      ];
    } else {
      next = [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.ADMIN_VISITOR_JOURNEYS];
    }
    setDraftPageAccess(next);
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

  const resendInvitation = async (invite: PendingInvite) => {
    setResendingInviteId(invite.id);
    try {
      const res = await fetch("/api/admin/staff-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: invite.email,
          staffRole: invite.staffRole,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof j.error === "string" ? j.error : "Could not resend invite",
        );
      }
      toast.success(`Invitation resent to ${invite.email}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend invite");
    } finally {
      setResendingInviteId(null);
    }
  };

  const removeMember = async () => {
    if (!pendingRemoveUser) return;
    setRemovingMember(true);
    try {
      const res = await fetch("/api/admin/staff-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingRemoveUser.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof j.error === "string" ? j.error : "Could not remove member",
        );
      }
      setRows((prev) => prev.filter((row) => row.id !== pendingRemoveUser.id));
      setPendingRemoveUser(null);
      setModalUser(null);
      toast.success("Member removed from team.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove member");
    } finally {
      setRemovingMember(false);
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
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleStaffRows = staffRows.filter((row) => {
    if (!normalizedSearch) return true;
    return (
      row.name.toLowerCase().includes(normalizedSearch) ||
      row.email.toLowerCase().includes(normalizedSearch)
    );
  });
  const ownerAdminRows = staffRows.filter((row) => {
    const roles = row.staffRoles ?? [];
    return (roles.includes("owner") || roles.includes("admin")) && row.canEditRoles;
  });
  const editableRoleOptions = viewerCanSeeSuperadmin
    ? [...STAFF_ROLE_PRECEDENCE]
    : STAFF_ROLE_PRECEDENCE.filter((r) => r !== "superadmin");
  const roleBadgeClass = (role: string) => {
    if (role === "superadmin") {
      return "rounded-full border border-indigo-900/20 bg-indigo-900/90 px-2.5 py-0.5 text-xs font-medium text-white";
    }
    if (role === "admin") {
      return "rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700";
    }
    return "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700";
  };
  const initials = (name: string, email: string) => {
    const src = name.trim() || email;
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return src.slice(0, 2).toUpperCase();
  };

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

      <div className="rounded-xl border border-slate-200/70 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Team management</h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage invites and control member permissions from one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" className="rounded-xl">
                  <UserPlus className="h-4 w-4" />
                  Add Member
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
            {viewerCanSeeSuperadmin ? (
              <Dialog open={globalAccessOpen} onOpenChange={setGlobalAccessOpen}>
                <DialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="rounded-xl">
                    <Globe2 className="h-4 w-4" />
                    Global Access Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Global Access Settings</DialogTitle>
                    <DialogDescription>
                      Pick an owner/admin member to edit their page access.
                    </DialogDescription>
                  </DialogHeader>
                  {ownerAdminRows.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No owner/admin members available.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ownerAdminRows.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{row.name}</p>
                            <p className="text-xs text-slate-600">{row.email}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setGlobalAccessOpen(false);
                              openEditModal(row);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </div>
      </div>

      {invites.length > 0 && (
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
          <h2 className="text-sm font-semibold text-amber-900">Pending invitations</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/70 bg-white px-3 py-2"
              >
                <div>
                  <p className="font-medium text-neutral-900">{inv.email}</p>
                  <p className="text-neutral-600">
                    {inv.staffRole} · expires{" "}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void resendInvitation(inv)}
                  disabled={resendingInviteId === inv.id}
                >
                  {resendingInviteId === inv.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Resend"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search member by name or email"
          className="max-w-sm bg-white"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Roles</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleStaffRows.map((r) => {
              const real = r.staffRoles ?? [];
              const displayRoles = formatStaffRolesForDisplay(real);
              const canOpenModal = r.canEditRoles && r.staffRoles != null;

              return (
                <tr
                  key={r.id}
                  className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/50"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-slate-200 bg-slate-100">
                        <AvatarFallback className="bg-slate-100 text-xs font-medium text-slate-600">
                          {initials(r.name, r.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-slate-900">{r.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-500">{r.email}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(displayRoles.length > 0 ? displayRoles : [r.rolesDisplay]).map(
                        (role) => (
                          <Badge
                            key={`${r.id}-${role}`}
                            className={roleBadgeClass(role.toLowerCase())}
                          >
                            {role}
                          </Badge>
                        ),
                      )}
                      {r.directoryMasked && (
                        <Badge className="border-0 bg-amber-100 text-amber-700">
                          Masked
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {canOpenModal ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => openEditModal(r)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              toast.message("Transfer ownership flow coming soon")
                            }
                          >
                            Transfer Ownership
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setPendingRemoveUser(r);
                              setModalUser(null);
                            }}
                          >
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {visibleStaffRows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-neutral-500">
                  {staffRows.length === 0
                    ? "No staff users with roles yet."
                    : "No members match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
            <DialogTitle>Edit Member Permissions</DialogTitle>
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
                <div className="mb-3">
                  <Select
                    onValueChange={(value) => applyAccessPreset(value as AccessPreset)}
                    disabled={savingModal}
                  >
                    <SelectTrigger className="w-full bg-white sm:w-[220px]">
                      <SelectValue placeholder="Apply permission preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_PRESET_OPTIONS.map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {preset[0].toUpperCase()}
                          {preset.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

          <DialogFooter className="w-full sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!modalUser) return;
                setPendingRemoveUser(modalUser);
                setModalUser(null);
              }}
              disabled={savingModal || removingMember || modalUser?.isSelf}
            >
              Remove Member
            </Button>
            <div className="flex items-center gap-2">
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
              disabled={savingModal || removingMember}
            >
              {savingModal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={pendingRemoveUser != null}
        onOpenChange={(open) => {
          if (!open && !removingMember) setPendingRemoveUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void removeMember();
              }}
              disabled={removingMember}
              className="bg-red-600 hover:bg-red-700"
            >
              {removingMember ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
