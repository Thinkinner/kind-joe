"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Sparkles,
  Webhook,
  Database,
  Menu,
  X,
  FileText,
  BarChart2,
  ImageIcon,
  Mail,
  Users,
  Route,
  MoreHorizontal,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { PERMISSIONS, type AppPermission } from "@/lib/auth/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminShellProps = {
  children: React.ReactNode;
  navPermissions: Partial<Record<AppPermission, boolean>>;
};

const baseNav = [
  { href: "/admin", label: "Dashboard", icon: Home, permission: PERMISSIONS.ADMIN_DASHBOARD },
  { href: "/admin/articles", label: "Articles", icon: FileText, permission: PERMISSIONS.ADMIN_ARTICLES },
  { href: "/admin/article-analytics", label: "Article analytics", icon: BarChart2, permission: PERMISSIONS.ADMIN_ANALYTICS },
  { href: "/admin/visitor-journeys", label: "Visitor journeys", icon: Route, permission: PERMISSIONS.ADMIN_VISITOR_JOURNEYS },
  { href: "/admin/posts", label: "Posts", icon: ImageIcon, permission: PERMISSIONS.ADMIN_POSTS },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail, permission: PERMISSIONS.ADMIN_NEWSLETTER },
  { href: "/admin/predictions", label: "News Predictions", icon: Sparkles, permission: PERMISSIONS.ADMIN_PREDICTIONS },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook, permission: PERMISSIONS.ADMIN_WEBHOOKS },
  { href: "/admin/ingest-data", label: "Ingest data", icon: Database, permission: PERMISSIONS.ADMIN_INGEST_DATA },
  { href: "/admin/staff-users", label: "Staff & roles", icon: Users, permission: PERMISSIONS.ADMIN_USERS },
] as const;

export function AdminShell({ children, navPermissions }: AdminShellProps) {
  const navItems = baseNav.filter((item) => navPermissions[item.permission]);
  const pathname = usePathname();
  const router = useRouter();
  const isNewsletterRoute =
    pathname === "/admin/newsletter" || pathname.startsWith("/admin/newsletter/");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="admin-root min-h-dvh bg-white text-neutral-900 antialiased">
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
        className={cn(
          "fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-[2px] transition-opacity lg:hidden",
          mobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileNavOpen(false)}
      />

      <div className="flex min-h-dvh">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(15.5rem,88vw)] flex-col border-r border-red-900/30 bg-red-700 text-red-50 shadow-xl transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-30 lg:h-dvh lg:w-52 lg:shrink-0 lg:translate-x-0 lg:shadow-none xl:w-56",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-red-900/30 px-3 py-2.5 lg:px-3">
            <div>
              <Image
                src="/brand/horizontal-logo.svg"
                alt="Kind Joe"
                width={180}
                height={43}
                className="h-auto w-[118px] lg:w-[122px]"
                priority
              />
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200/40 text-red-50 transition hover:bg-red-600 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-px overflow-y-auto overscroll-contain px-2 py-2 pb-2">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-red-100/70">
              Menu
            </p>
            {navItems.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin" || pathname === "/admin/"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border-l-2 py-1.5 pl-2 pr-2 text-[13px] font-medium leading-snug transition-colors",
                    active
                      ? "border-white bg-red-600 text-white"
                      : "border-transparent text-red-50/90 hover:bg-red-600/70 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                      active
                        ? "border-white/30 bg-white text-red-700"
                        : "border-red-200/30 bg-red-600/70 text-red-100 group-hover:border-white/30 group-hover:bg-white group-hover:text-red-700",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-red-900/30 p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-red-200/40 bg-red-600 px-2.5 py-2 text-xs font-medium text-red-50 transition hover:bg-red-500"
                >
                  <span>More</span>
                  <MoreHorizontal className="h-3.5 w-3.5 text-red-100" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navPermissions[PERMISSIONS.ADMIN_SECURITY] && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/security">
                      <Settings className="h-4 w-4" aria-hidden />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  variant="destructive"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span>{signingOut ? "Signing out..." : "Sign out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main column — mobile menu only; no workspace title bar */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center border-b border-neutral-200 bg-white px-3 lg:hidden">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 transition hover:bg-neutral-50"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              isNewsletterRoute
                ? "p-0"
                : "p-4 sm:p-6 lg:p-8",
            )}
          >
            <div
              className={cn(
                isNewsletterRoute
                  ? "flex min-h-0 w-full min-w-0 flex-1 flex-col bg-white"
                  : "w-full bg-white p-5 sm:p-6 lg:p-8",
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
