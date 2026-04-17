import { desc, inArray } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { staffInvitation, user as authUser } from "@/db/auth-schema";
import { articles, users as cmsUsers } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireStaffPermission } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type ActivityItem = {
  id: string;
  at: Date;
  action: string;
  actor: string;
  detail: string;
  tone: "indigo" | "emerald" | "rose" | "amber";
};

function formatWhen(value: Date): string {
  return value.toLocaleString();
}

function parseLimit(raw: string | string[] | undefined): number {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(first ?? "100", 10);
  if (!Number.isFinite(n)) return 100;
  return Math.min(Math.max(n, 25), 200);
}

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffPermission(
    PERMISSIONS.ADMIN_SUPERADMIN,
    "/admin/login",
    "not_found",
  );
  const qp = searchParams ? await searchParams : undefined;
  const limit = parseLimit(qp?.limit);

  const [inviteRows, articleRows] = await Promise.all([
    db
      .select({
        id: staffInvitation.id,
        email: staffInvitation.email,
        staffRole: staffInvitation.staffRole,
        createdByUserId: staffInvitation.createdByUserId,
        createdAt: staffInvitation.createdAt,
        acceptedAt: staffInvitation.acceptedAt,
      })
      .from(staffInvitation)
      .orderBy(desc(staffInvitation.createdAt))
      .limit(limit),
    db
      .select({
        id: articles.id,
        title: articles.title,
        authorId: articles.authorId,
        createdAt: articles.createdAt,
        publishedAt: articles.publishedAt,
        publishedBy: articles.publishedBy,
        deletedAt: articles.deletedAt,
      })
      .from(articles)
      .orderBy(desc(articles.createdAt))
      .limit(limit),
  ]);

  const inviterIds = Array.from(
    new Set(inviteRows.map((row) => row.createdByUserId).filter(Boolean)),
  );
  const cmsUserIds = Array.from(
    new Set(
      articleRows
        .flatMap((row) => [row.authorId, row.publishedBy])
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [inviterRows, cmsAuthorRows] = await Promise.all([
    inviterIds.length
      ? db
          .select({
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
          })
          .from(authUser)
          .where(inArray(authUser.id, inviterIds))
      : Promise.resolve([]),
    cmsUserIds.length
      ? db
          .select({
            id: cmsUsers.id,
            name: cmsUsers.name,
          })
          .from(cmsUsers)
          .where(inArray(cmsUsers.id, cmsUserIds))
      : Promise.resolve([]),
  ]);

  const inviterById = new Map(
    inviterRows.map((row) => [row.id, `${row.name || "Staff"} (${row.email})`]),
  );
  const cmsAuthorById = new Map(cmsAuthorRows.map((row) => [row.id, row.name]));

  const activities: ActivityItem[] = [];

  for (const invite of inviteRows) {
    activities.push({
      id: `invite-created-${invite.id}`,
      at: invite.createdAt,
      action: "Staff invite sent",
      actor: inviterById.get(invite.createdByUserId) || "Unknown admin",
      detail: `${invite.email} invited as ${invite.staffRole}`,
      tone: "indigo",
    });
    if (invite.acceptedAt) {
      activities.push({
        id: `invite-accepted-${invite.id}`,
        at: invite.acceptedAt,
        action: "Staff invite accepted",
        actor: invite.email,
        detail: `${invite.email} accepted ${invite.staffRole} access`,
        tone: "emerald",
      });
    }
  }

  for (const article of articleRows) {
    activities.push({
      id: `article-created-${article.id}`,
      at: article.createdAt,
      action: "Article created",
      actor: cmsAuthorById.get(article.authorId) || "Unknown author",
      detail: article.title,
      tone: "indigo",
    });
    if (article.publishedAt) {
      activities.push({
        id: `article-published-${article.id}`,
        at: article.publishedAt,
        action: "Article published",
        actor:
          (article.publishedBy && cmsAuthorById.get(article.publishedBy)) ||
          cmsAuthorById.get(article.authorId) ||
          "Unknown admin",
        detail: article.title,
        tone: "emerald",
      });
    }
    if (article.deletedAt) {
      activities.push({
        id: `article-deleted-${article.id}`,
        at: article.deletedAt,
        action: "Article deleted",
        actor: "Admin",
        detail: article.title,
        tone: "rose",
      });
    }
  }

  const sorted = activities
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);

  const toneClass: Record<ActivityItem["tone"], string> = {
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Activity Log
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Unified stream of admin movements, including staff onboarding and
          article actions.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Showing latest {sorted.length} events (limit: {limit}, max: 200).
        </p>
      </div>

      <div className="overflow-hidden border-t border-slate-200/70">
        <div className="grid grid-cols-[170px_190px_220px_minmax(0,1fr)] gap-4 border-b border-slate-200/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <p>When</p>
          <p>Action</p>
          <p>Actor</p>
          <p>Details</p>
        </div>

        <ul className="divide-y divide-slate-100">
          {sorted.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-[170px_190px_220px_minmax(0,1fr)] gap-4 px-5 py-3 text-sm"
            >
              <p className="text-xs text-slate-500">{formatWhen(item.at)}</p>
              <div>
                <Badge
                  variant="outline"
                  className={`rounded-md border ${toneClass[item.tone]}`}
                >
                  {item.action}
                </Badge>
              </div>
              <p className="truncate font-medium text-slate-700">{item.actor}</p>
              <p className="truncate text-slate-600">{item.detail}</p>
            </li>
          ))}

          {sorted.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-slate-500">
              No activity recorded yet.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
