"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ALL_ADMIN_PERMISSIONS,
  PERMISSIONS,
  type AppPermission,
} from "@/lib/auth/permissions";
import { toast } from "sonner";

type StaffAccessRow = {
  id: string;
  name: string;
  email: string;
  staffRoles: string[] | null;
  isSelf: boolean;
  canEditPageAccess?: boolean;
  adminPageAccess?: string[] | null;
};

const PERMISSION_LABELS: Partial<Record<AppPermission, string>> = {
  [PERMISSIONS.ADMIN_DASHBOARD]: "Dashboard",
  [PERMISSIONS.ADMIN_ARTICLES]: "Articles",
  [PERMISSIONS.ADMIN_ANALYTICS]: "Article analytics",
  [PERMISSIONS.ADMIN_POSTS]: "Posts",
  [PERMISSIONS.ADMIN_NEWSLETTER]: "Newsletter",
  [PERMISSIONS.ADMIN_PREDICTIONS]: "Predictions",
  [PERMISSIONS.ADMIN_WEBHOOKS]: "Webhooks",
  [PERMISSIONS.ADMIN_INGEST_DATA]: "Ingest data",
  [PERMISSIONS.ADMIN_SECURITY]: "Security",
  [PERMISSIONS.ADMIN_USERS]: "Staff & roles",
  [PERMISSIONS.ADMIN_ASSIGNED_LINKS]: "Assigned links",
  [PERMISSIONS.ADMIN_SLACK_CHANNELS]: "Slack channels",
  [PERMISSIONS.ADMIN_SUPERADMIN]: "Super admin",
};

export function SuperAdminPageAccessPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [savingForUserId, setSavingForUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffAccessRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AppPermission[]>>({});

  const load = async () => {
    const res = await fetch("/api/admin/staff-users?limit=500", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load staff users");
    const data = (await res.json()) as StaffAccessRow[];
    setRows(data);

    const initial: Record<string, AppPermission[]> = {};
    for (const row of data) {
      initial[row.id] = Array.isArray(row.adminPageAccess)
        ? (row.adminPageAccess.filter((p): p is AppPermission =>
            (ALL_ADMIN_PERMISSIONS as string[]).includes(p),
          ) as AppPermission[])
        : [];
    }
    setDrafts(initial);
  };

  useEffect(() => {
    if (!isOpen || hasLoaded) return;
    (async () => {
      setLoading(true);
      try {
        await load();
        setHasLoaded(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, hasLoaded]);

  const targetRows = useMemo(
    () =>
      rows.filter((row) => {
        const roles = row.staffRoles ?? [];
        const isOwnerOrAdmin = roles.includes("owner") || roles.includes("admin");
        return isOwnerOrAdmin && !row.isSelf && row.canEditPageAccess;
      }),
    [rows],
  );

  const togglePermission = (
    userId: string,
    permission: AppPermission,
    checked: boolean,
  ) => {
    setDrafts((prev) => {
      const current = prev[userId] ?? [];
      if (checked) {
        return {
          ...prev,
          [userId]: Array.from(new Set([...current, permission])),
        };
      }
      return {
        ...prev,
        [userId]: current.filter((p) => p !== permission),
      };
    });
  };

  const saveUserAccess = async (userId: string) => {
    setSavingForUserId(userId);
    try {
      const res = await fetch("/api/admin/staff-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          adminPageAccess: drafts[userId] ?? [],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Could not save access",
        );
      }
      toast.success("Page access updated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSavingForUserId(null);
    }
  };

  return (
    <Card className="space-y-5 border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Admin & Owner Page Access
            </h2>
            <p className="text-xs text-muted-foreground">
              Superadmin can disable specific admin pages for owner/admin
              accounts.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? (
            <ChevronDown className="mr-1 h-4 w-4" />
          ) : (
            <ChevronRight className="mr-1 h-4 w-4" />
          )}
          {isOpen ? "Hide Access" : "Show Access"}
        </Button>
      </div>

      {!isOpen ? null : loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading page access controls...
        </div>
      ) : targetRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No owner/admin accounts available.</p>
      ) : (
        <div className="space-y-4">
          {targetRows.map((row) => (
            <div
              key={row.id}
              className="space-y-3 rounded-xl border border-border bg-muted/50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {row.name} <span className="text-muted-foreground">({row.email})</span>
                </p>
                <Button
                  size="sm"
                  onClick={() => void saveUserAccess(row.id)}
                  disabled={savingForUserId === row.id}
                >
                  {savingForUserId === row.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Access"
                  )}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ALL_ADMIN_PERMISSIONS.filter(
                  (perm) => perm !== PERMISSIONS.ADMIN_SUPERADMIN,
                ).map((perm) => (
                  <label key={`${row.id}-${perm}`} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(drafts[row.id] ?? []).includes(perm)}
                      onCheckedChange={(checked) =>
                        togglePermission(row.id, perm, checked === true)
                      }
                    />
                    <span className="text-foreground">
                      {PERMISSION_LABELS[perm] ?? perm}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
