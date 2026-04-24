"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  KeyRound,
  Mail,
  Loader2,
  MoreHorizontal,
  UserPlus,
} from "lucide-react";
import {
  formatStaffRolesForDisplay,
  STAFF_ROLE_PRECEDENCE,
} from "@/lib/auth/staff-roles";
import { buildUniqueAliasSuggestion } from "@/lib/auth/alias-name-suggestions";
import {
  ALL_ADMIN_PERMISSIONS,
  PERMISSIONS,
  type AppPermission,
} from "@/lib/auth/permissions";

type Row = {
  id: string;
  name: string;
  aliasFullName?: string | null;
  email: string;
  accountType: string | null;
  staffRole: string | null;
  staffRoles: string[] | null;
  rolesDisplay: string;
  directoryMasked: boolean;
  isSelf: boolean;
  showRealRoles: boolean;
  canEditRoles: boolean;
  canEditPageAccess?: boolean;
  adminPageAccess?: string[] | null;
  effectivePageAccess?: string[] | null;
};

type PendingInvite = {
  id: string;
  email: string;
  staffRole: string;
  adminPageAccess: AppPermission[] | null;
  expiresAt: string;
  createdAt: string;
};

type TemporaryPasswordResult = {
  email: string;
  temporaryPassword: string;
  emailSent: boolean;
  emailError?: string;
};

const INVITE_ROLES = ["writer", "editor", "admin"] as const;
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
  [PERMISSIONS.ADMIN_SUPERADMIN]: "Superadmin",
  [PERMISSIONS.ADMIN_USERS]: "Staff & roles",
};

const ACCESS_PRESET_OPTIONS = ["admin", "editor", "viewer"] as const;
type AccessPreset = (typeof ACCESS_PRESET_OPTIONS)[number];
type InviteAccessMode = "role_default" | "custom";

const INVITE_ROLE_DEFAULT_PERMISSIONS: Record<
  (typeof INVITE_ROLES)[number],
  AppPermission[]
> = {
  writer: [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.ADMIN_ARTICLES],
  editor: [
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_ARTICLES,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_NEWSLETTER,
  ],
  admin: [
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_ARTICLES,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_VISITOR_JOURNEYS,
    PERMISSIONS.ADMIN_POSTS,
    PERMISSIONS.ADMIN_NEWSLETTER,
    PERMISSIONS.ADMIN_USERS,
  ],
};

const INVITE_PERMISSION_GROUPS: Array<{
  label: string;
  permissions: AppPermission[];
}> = [
  {
    label: "Core",
    permissions: [PERMISSIONS.ADMIN_DASHBOARD],
  },
  {
    label: "Content",
    permissions: [
      PERMISSIONS.ADMIN_ARTICLES,
      PERMISSIONS.ADMIN_ARTICLE_ASSISTANT,
      PERMISSIONS.ADMIN_POSTS,
      PERMISSIONS.ADMIN_NEWSLETTER,
    ],
  },
  {
    label: "Insights",
    permissions: [
      PERMISSIONS.ADMIN_ANALYTICS,
      PERMISSIONS.ADMIN_VISITOR_JOURNEYS,
      PERMISSIONS.ADMIN_PREDICTIONS,
    ],
  },
  {
    label: "Technical",
    permissions: [PERMISSIONS.ADMIN_WEBHOOKS, PERMISSIONS.ADMIN_INGEST_DATA],
  },
  {
    label: "Admin",
    permissions: [PERMISSIONS.ADMIN_USERS, PERMISSIONS.ADMIN_SECURITY],
  },
];

function permissionsForPreset(preset: AccessPreset): AppPermission[] {
  if (preset === "admin") {
    return ALL_ADMIN_PERMISSIONS.filter(
      (perm) => perm !== PERMISSIONS.ADMIN_SUPERADMIN,
    );
  }
  if (preset === "editor") {
    return [
      PERMISSIONS.ADMIN_DASHBOARD,
      PERMISSIONS.ADMIN_ARTICLES,
      PERMISSIONS.ADMIN_ARTICLE_ASSISTANT,
      PERMISSIONS.ADMIN_ANALYTICS,
      PERMISSIONS.ADMIN_VISITOR_JOURNEYS,
      PERMISSIONS.ADMIN_POSTS,
    ];
  }
  return [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.ADMIN_VISITOR_JOURNEYS];
}

function labelForInviteAccess(access: AppPermission[] | null): string {
  if (!access || access.length === 0) return "Role default access";
  return `${access.length} page permissions`;
}

export default function StaffUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupRole, setLookupRole] =
    useState<(typeof INVITE_ROLES)[number]>("writer");
  const [lookupAccessMode, setLookupAccessMode] =
    useState<InviteAccessMode>("role_default");
  const [lookupCustomAccess, setLookupCustomAccess] = useState<AppPermission[]>(
    [],
  );
  const [submittingLookup, setSubmittingLookup] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [cancelingInviteId, setCancelingInviteId] = useState<string | null>(null);
  const [editingInvite, setEditingInvite] = useState<PendingInvite | null>(null);
  const [editingInviteRole, setEditingInviteRole] =
    useState<(typeof INVITE_ROLES)[number]>("writer");
  const [editingInviteAccessMode, setEditingInviteAccessMode] =
    useState<InviteAccessMode>("role_default");
  const [editingInviteCustomAccess, setEditingInviteCustomAccess] = useState<
    AppPermission[]
  >([]);
  const [savingInviteChanges, setSavingInviteChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [globalAccessOpen, setGlobalAccessOpen] = useState(false);

  const [modalUser, setModalUser] = useState<Row | null>(null);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [draftPageAccess, setDraftPageAccess] = useState<AppPermission[]>([]);
  const [draftAliasFullName, setDraftAliasFullName] = useState("");
  const [suggestedAlias, setSuggestedAlias] = useState("");
  const [suggestingAlias, setSuggestingAlias] = useState(false);
  const [savingModal, setSavingModal] = useState(false);
  const [pendingRemoveUser, setPendingRemoveUser] = useState<Row | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [sendingTempPasswordId, setSendingTempPasswordId] = useState<string | null>(
    null,
  );
  const [tempPasswordResult, setTempPasswordResult] =
    useState<TemporaryPasswordResult | null>(null);

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
    setDraftAliasFullName((r.aliasFullName ?? "").trim());
    setSuggestedAlias("");
  };

  const closeModal = () => {
    if (savingModal) return;
    setModalUser(null);
    setDraftAliasFullName("");
    setSuggestedAlias("");
    setSuggestingAlias(false);
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
    setDraftPageAccess(permissionsForPreset(preset));
  };

  const requestAliasSuggestion = async (
    seedName: string,
    usedList: string[],
    fallback: string,
  ) => {
    setSuggestingAlias(true);
    try {
      const res = await fetch("/api/admin/profile/alias-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: seedName,
          used: usedList,
          seed: `${seedName}-${Date.now()}-${Math.random()}`,
        }),
      });
      if (!res.ok) throw new Error("Alias suggestion unavailable.");
      const data = (await res.json().catch(() => ({}))) as { alias?: string | null };
      const next = (data.alias ?? "").trim() || fallback;
      setSuggestedAlias(next);
    } catch {
      setSuggestedAlias(fallback);
    } finally {
      setSuggestingAlias(false);
    }
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
        adminPageAccess?: AppPermission[] | null;
        aliasFullName?: string | null;
      } = {
        userId: modalUser.id,
        staffRoles: draftRoles,
      };
      if (modalUser.canEditPageAccess) {
        body.adminPageAccess = draftPageAccess;
      }
      const normalizedDraftAlias = draftAliasFullName.trim();
      body.aliasFullName = normalizedDraftAlias.length > 0 ? normalizedDraftAlias : null;
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
    const matchedStaff = staffRows.find(
      (r) => r.email.trim().toLowerCase() === email,
    );

    if (matchedStaff) {
      toast.error("This email is already on the staff list.");
      return;
    }
    if (
      viewerCanSeeSuperadmin &&
      lookupAccessMode === "custom" &&
      lookupCustomAccess.length === 0
    ) {
      toast.error("Select at least one page for custom access.");
      return;
    }
    const inviteCustomAccess =
      lookupAccessMode === "custom"
        ? Array.from(new Set(lookupCustomAccess))
        : [];
    const inviteAdminPageAccess =
      viewerCanSeeSuperadmin && lookupAccessMode === "custom"
        ? inviteCustomAccess
        : undefined;

    setSubmittingLookup(true);
    try {
      const res = await fetch("/api/admin/staff-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          staffRole: lookupRole,
          ...(inviteAdminPageAccess !== undefined
            ? { adminPageAccess: inviteAdminPageAccess }
            : {}),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof j.error === "string" ? j.error : "Invite failed",
        );
      }
      toast.success(j.message ?? "Invitation sent.");

      setLookupEmail("");
      setLookupRole("writer");
      setLookupAccessMode("role_default");
      setLookupCustomAccess([]);
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
          ...(invite.adminPageAccess !== null
            ? { adminPageAccess: invite.adminPageAccess }
            : {}),
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

  const cancelInvitation = async (invite: PendingInvite) => {
    setCancelingInviteId(invite.id);
    try {
      const res = await fetch("/api/admin/staff-invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invite.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof j.error === "string" ? j.error : "Could not cancel invitation",
        );
      }
      toast.success(`Invitation canceled for ${invite.email}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel invitation");
    } finally {
      setCancelingInviteId(null);
    }
  };

  const openInviteAccessEditor = (invite: PendingInvite) => {
    setEditingInvite(invite);
    setEditingInviteRole(
      INVITE_ROLES.includes(invite.staffRole as (typeof INVITE_ROLES)[number])
        ? (invite.staffRole as (typeof INVITE_ROLES)[number])
        : "writer",
    );
    if (invite.adminPageAccess && invite.adminPageAccess.length > 0) {
      setEditingInviteAccessMode("custom");
      setEditingInviteCustomAccess(invite.adminPageAccess);
    } else {
      setEditingInviteAccessMode("role_default");
      setEditingInviteCustomAccess([]);
    }
  };

  const savePendingInviteChanges = async () => {
    if (!editingInvite) return;
    if (
      viewerCanSeeSuperadmin &&
      editingInviteAccessMode === "custom" &&
      editingInviteCustomAccess.length === 0
    ) {
      toast.error("Select at least one page for custom access.");
      return;
    }
    const adminPageAccess =
      viewerCanSeeSuperadmin && editingInviteAccessMode === "custom"
        ? Array.from(new Set(editingInviteCustomAccess))
        : null;

    setSavingInviteChanges(true);
    try {
      const res = await fetch("/api/admin/staff-invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingInvite.id,
          staffRole: editingInviteRole,
          ...(viewerCanSeeSuperadmin ? { adminPageAccess } : {}),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof j.error === "string"
            ? j.error
            : "Could not update pending invitation",
        );
      }
      toast.success("Pending invitation updated.");
      setEditingInvite(null);
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update pending invitation",
      );
    } finally {
      setSavingInviteChanges(false);
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

  const sendTemporaryPassword = async (member: Row) => {
    setSendingTempPasswordId(member.id);
    try {
      const res = await fetch("/api/admin/staff-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof j.error === "string"
            ? j.error
            : "Could not generate temporary password",
        );
      }
      const payload: TemporaryPasswordResult = {
        email: typeof j.email === "string" ? j.email : member.email,
        temporaryPassword:
          typeof j.temporaryPassword === "string" ? j.temporaryPassword : "",
        emailSent: Boolean(j.emailSent),
        emailError: typeof j.emailError === "string" ? j.emailError : undefined,
      };
      setTempPasswordResult(payload);
      if (payload.emailSent) {
        toast.success(`Temporary password sent to ${payload.email}.`);
      } else {
        toast.warning(
          `Temporary password created for ${payload.email}, but email failed.`,
        );
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not generate temporary password",
      );
    } finally {
      setSendingTempPasswordId(null);
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
  const identityStatus = exactStaffMatch
    ? "already_staff"
    : exactExistingMatch
      ? "existing_user"
      : normalizedLookupEmail
        ? "new_invite"
        : "idle";
  const hasValidLookupEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizedLookupEmail,
  );
  const viewerSelfRow = rows.find((r) => r.isSelf);
  const viewerRoles = viewerSelfRow?.staffRoles ?? [];
  const viewerIsOwner = viewerRoles.includes("owner");
  const viewerIsAdmin = viewerRoles.includes("admin");
  const viewerCanSeeSuperadmin = Boolean(
    viewerRoles.includes("superadmin"),
  );
  const reviewPermissions =
    viewerCanSeeSuperadmin && lookupAccessMode === "custom"
      ? Array.from(new Set(lookupCustomAccess))
      : INVITE_ROLE_DEFAULT_PERMISSIONS[lookupRole];
  const reviewPermissionLabels = reviewPermissions.map(
    (perm) => PERMISSION_LABELS[perm] ?? perm,
  );
  const canSendInvite =
    hasValidLookupEmail &&
    !exactStaffMatch &&
    !submittingLookup &&
    (!viewerCanSeeSuperadmin ||
      lookupAccessMode === "role_default" ||
      lookupCustomAccess.length > 0);
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
    : viewerIsOwner
      ? STAFF_ROLE_PRECEDENCE.filter((r) => r !== "superadmin")
      : viewerIsAdmin
        ? STAFF_ROLE_PRECEDENCE.filter(
            (r) => r !== "superadmin" && r !== "owner",
          )
        : STAFF_ROLE_PRECEDENCE.filter(
            (r) => r !== "superadmin" && r !== "owner",
          );
  const assignableRoleOptions = editableRoleOptions.filter(
    (role) => role !== "manager",
  );
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
  const reservedAliasNames = rows
    .map((row) => (row.aliasFullName ?? "").trim())
    .filter(Boolean);

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

      <div className="border-y border-slate-200/70 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Team management</h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage invites and control member permissions from one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Sheet open={addOpen} onOpenChange={setAddOpen}>
              <SheetTrigger asChild>
                <Button type="button" size="sm" className="rounded-xl">
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full overflow-y-auto border-l border-slate-200 bg-white sm:max-w-2xl"
              >
                <SheetHeader className="border-b border-slate-100 px-6 py-5">
                  <SheetTitle className="text-xl">Add team member</SheetTitle>
                  <SheetDescription>
                    Invite flow with identity, role, access, and review.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 px-6 py-5">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Step 1 - Identity
                    </p>
                    <label className="sr-only" htmlFor="lookup-email">
                      Email
                    </label>
                    <Input
                      id="lookup-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      className="mt-2 bg-white"
                    />
                    <p className="mt-2 text-xs text-slate-600">
                      {identityStatus === "already_staff"
                        ? "Status: already staff"
                        : identityStatus === "existing_user"
                          ? "Status: existing user"
                          : identityStatus === "new_invite"
                            ? "Status: new invite"
                            : "Status: enter an email to check"}
                    </p>
                    {lookupMatches.length > 0 && !exactExistingMatch && (
                      <div className="mt-2 rounded-lg border border-neutral-200 bg-white">
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

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Step 2 - Role
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {INVITE_ROLES.map((role) => (
                        <Button
                          key={role}
                          type="button"
                          variant={lookupRole === role ? "default" : "outline"}
                          className="capitalize"
                          onClick={() => setLookupRole(role)}
                        >
                          {role}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Step 3 - Access
                    </p>
                    {viewerCanSeeSuperadmin ? (
                      <div className="mt-2 space-y-3">
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-sm text-slate-800">
                            <Checkbox
                              checked={lookupAccessMode === "role_default"}
                              onCheckedChange={(checked) => {
                                if (checked === true) {
                                  setLookupAccessMode("role_default");
                                }
                              }}
                            />
                            Use role default
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-800">
                            <Checkbox
                              checked={lookupAccessMode === "custom"}
                              onCheckedChange={(checked) => {
                                if (checked === true) {
                                  setLookupAccessMode("custom");
                                }
                              }}
                            />
                            Customize page access
                          </label>
                        </div>
                        {lookupAccessMode === "custom" && (
                          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            {INVITE_PERMISSION_GROUPS.map((group) => (
                              <div key={group.label} className="space-y-2">
                                <p className="text-xs font-semibold text-slate-700">
                                  {group.label}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {group.permissions.map((perm) => (
                                    <label
                                      key={perm}
                                      className="flex items-center gap-2 text-sm text-slate-800"
                                    >
                                      <Checkbox
                                        checked={lookupCustomAccess.includes(perm)}
                                        onCheckedChange={(checked) => {
                                          setLookupCustomAccess((prev) => {
                                            if (checked === true) {
                                              return Array.from(new Set([...prev, perm]));
                                            }
                                            return prev.filter((p) => p !== perm);
                                          });
                                        }}
                                      />
                                      {PERMISSION_LABELS[perm]}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">
                        Access follows role defaults.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Step 4 - Review before invite
                    </p>
                    <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                      <p>
                        Email:{" "}
                        <span className="font-medium text-slate-900">
                          {normalizedLookupEmail || "—"}
                        </span>
                      </p>
                      <p>
                        Role:{" "}
                        <span className="font-medium capitalize text-slate-900">
                          {lookupRole}
                        </span>
                      </p>
                      <p>
                        Access level:{" "}
                        <span className="font-medium text-slate-900">
                          {viewerCanSeeSuperadmin && lookupAccessMode === "custom"
                            ? "Customize page access"
                            : "Use role default"}
                        </span>
                      </p>
                      <p>Pages they can access:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {reviewPermissionLabels.map((label) => (
                          <Badge
                            key={label}
                            className="border border-slate-200 bg-white text-slate-700"
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                      <p>
                        Invite expiry:{" "}
                        <span className="font-medium text-slate-900">7 days</span>
                      </p>
                    </div>
                    {identityStatus === "already_staff" && (
                      <p className="mt-2 text-xs text-amber-700">
                        This email is already staff and cannot be invited again.
                      </p>
                    )}
                  </div>
                </div>
                <SheetFooter className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
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
                    disabled={!canSendInvite}
                  >
                    {submittingLookup ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Invite
                      </>
                    )}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
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
        <div className="border-y border-amber-200/70 py-3">
          <h2 className="text-sm font-semibold text-amber-900">Pending invitations</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 px-2 py-2 last:border-b-0"
              >
                <div>
                  <p className="font-medium text-neutral-900">{inv.email}</p>
                  <p className="text-neutral-600">
                    {inv.staffRole} · expires{" "}
                    {new Date(inv.expiresAt).toLocaleDateString()} ·{" "}
                    {labelForInviteAccess(inv.adminPageAccess)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openInviteAccessEditor(inv)}
                  disabled={cancelingInviteId === inv.id}
                >
                  Manage access
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void resendInvitation(inv)}
                  disabled={
                    resendingInviteId === inv.id || cancelingInviteId === inv.id
                  }
                >
                  {resendingInviteId === inv.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Resend"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => void cancelInvitation(inv)}
                  disabled={
                    cancelingInviteId === inv.id || resendingInviteId === inv.id
                  }
                >
                  {cancelingInviteId === inv.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Cancel"
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

      <div className="overflow-x-auto border-t border-slate-200/70">
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
                            onClick={() => void sendTemporaryPassword(r)}
                            disabled={sendingTempPasswordId === r.id || r.isSelf}
                          >
                            {sendingTempPasswordId === r.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <KeyRound className="mr-2 h-4 w-4" />
                            )}
                            Send Temporary Password
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

      <Sheet
        open={editingInvite != null}
        onOpenChange={(open) => {
          if (!open && !savingInviteChanges) setEditingInvite(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-l border-slate-200 bg-white sm:max-w-xl"
          onPointerDownOutside={(e) => {
            if (savingInviteChanges) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (savingInviteChanges) e.preventDefault();
          }}
        >
          <SheetHeader className="border-b border-slate-100 px-6 py-5">
            <SheetTitle className="text-xl">Manage pending invite access</SheetTitle>
            <SheetDescription>
              Update role and access before this invitation is accepted.
            </SheetDescription>
          </SheetHeader>

          {editingInvite ? (
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{editingInvite.email}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Expires {new Date(editingInvite.expiresAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {INVITE_ROLES.map((role) => (
                    <Button
                      key={role}
                      type="button"
                      variant={editingInviteRole === role ? "default" : "outline"}
                      className="capitalize"
                      onClick={() => setEditingInviteRole(role)}
                      disabled={savingInviteChanges}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>

              {viewerCanSeeSuperadmin ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Access
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-800">
                      <Checkbox
                        checked={editingInviteAccessMode === "role_default"}
                        onCheckedChange={(checked) => {
                          if (checked === true) setEditingInviteAccessMode("role_default");
                        }}
                        disabled={savingInviteChanges}
                      />
                      Use role default
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-800">
                      <Checkbox
                        checked={editingInviteAccessMode === "custom"}
                        onCheckedChange={(checked) => {
                          if (checked === true) setEditingInviteAccessMode("custom");
                        }}
                        disabled={savingInviteChanges}
                      />
                      Customize page access
                    </label>
                  </div>
                  {editingInviteAccessMode === "custom" && (
                    <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      {INVITE_PERMISSION_GROUPS.map((group) => (
                        <div key={group.label} className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700">
                            {group.label}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {group.permissions.map((perm) => (
                              <label
                                key={perm}
                                className="flex items-center gap-2 text-sm text-slate-800"
                              >
                                <Checkbox
                                  checked={editingInviteCustomAccess.includes(perm)}
                                  onCheckedChange={(checked) => {
                                    setEditingInviteCustomAccess((prev) => {
                                      if (checked === true) {
                                        return Array.from(new Set([...prev, perm]));
                                      }
                                      return prev.filter((p) => p !== perm);
                                    });
                                  }}
                                  disabled={savingInviteChanges}
                                />
                                {PERMISSION_LABELS[perm]}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Access follows role defaults for non-superadmin users.
                </p>
              )}
            </div>
          ) : null}

          <SheetFooter className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingInvite(null)}
              disabled={savingInviteChanges}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void savePendingInviteChanges()}
              disabled={
                savingInviteChanges ||
                (viewerCanSeeSuperadmin &&
                  editingInviteAccessMode === "custom" &&
                  editingInviteCustomAccess.length === 0)
              }
            >
              {savingInviteChanges ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save invite access"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
            <div className="space-y-2">
              <Label htmlFor="staff-member-alias-full-name">Alias full name</Label>
              <Input
                id="staff-member-alias-full-name"
                value={draftAliasFullName}
                onChange={(e) => setDraftAliasFullName(e.target.value)}
                maxLength={120}
                autoComplete="nickname"
                placeholder="e.g. City Desk Reporter"
                disabled={savingModal}
              />
              <p className="text-xs text-neutral-500">
                This is the byline alias shown publicly for this staff member.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingModal || suggestingAlias || !modalUser}
                  onClick={() => {
                    if (!modalUser) return;
                    const randomSeed = `${modalUser.name}-${Date.now()}-${Math.random()}`;
                    const localSuggestion = buildUniqueAliasSuggestion(
                      randomSeed,
                      reservedAliasNames,
                      modalUser.name,
                    );
                    setSuggestedAlias(localSuggestion);
                    void requestAliasSuggestion(
                      modalUser.name || randomSeed,
                      [...reservedAliasNames, localSuggestion],
                      localSuggestion,
                    );
                  }}
                >
                  {suggestingAlias ? "Generating..." : "Generate alias"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingModal || !suggestedAlias}
                  onClick={() => {
                    if (!suggestedAlias) return;
                    setDraftAliasFullName(suggestedAlias);
                  }}
                >
                  Use suggestion
                </Button>
              </div>
              {suggestedAlias ? (
                <p className="text-xs text-neutral-600">
                  Suggested alias:{" "}
                  <span className="font-semibold text-neutral-900">{suggestedAlias}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3">
              {assignableRoleOptions.map((role) => (
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
      <Dialog
        open={tempPasswordResult != null}
        onOpenChange={(open) => {
          if (!open) setTempPasswordResult(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Temporary password created</DialogTitle>
            <DialogDescription>
              Share this only with {tempPasswordResult?.email}. It works once and
              then they must set a new password.
            </DialogDescription>
          </DialogHeader>
          {tempPasswordResult ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Temporary password
                </p>
                <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
                  {tempPasswordResult.temporaryPassword}
                </p>
              </div>
              {tempPasswordResult.emailSent ? (
                <p className="text-sm text-emerald-700">
                  Email sent to {tempPasswordResult.email}.
                </p>
              ) : (
                <p className="text-sm text-amber-700">
                  Email was not sent. Share this password manually.
                  {tempPasswordResult.emailError
                    ? ` (${tempPasswordResult.emailError})`
                    : ""}
                </p>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setTempPasswordResult(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
