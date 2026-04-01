"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShieldCheck, Sparkles, ArrowUpRight } from "lucide-react";

type AdminShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/predictions", label: "News Predictions", icon: Sparkles },
  { href: "/admin/security", label: "Security", icon: ShieldCheck },
] as const;

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const publicSite = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#020617] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(99,102,241,0.22),transparent_38%),radial-gradient(circle_at_95%_8%,rgba(56,189,248,0.2),transparent_34%)]" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:px-6 lg:py-6">
        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-[0_20px_55px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:sticky lg:top-6 lg:h-[calc(100dvh-7rem)]">
          <div className="mb-3 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 px-4 py-4 text-white shadow-lg">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-100/90">
              Kind Joe
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-tight">Admin Studio</h1>
            <p className="mt-1 text-xs text-indigo-100/85">Content and prediction controls</p>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-white text-slate-900 shadow-[0_6px_24px_rgba(15,23,42,0.2)]"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${
                      active ? "bg-slate-100 text-slate-800" : "bg-white/10 text-slate-200 group-hover:bg-white/20"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            {publicSite ? (
              <a
                href={`${publicSite}/`}
                className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                rel="noopener noreferrer"
              >
                <span>Back to site</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            ) : (
              <Link
                href="/"
                className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                <span>Back to site</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        </aside>

        <main className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_20px_55px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-white/[0.02] px-4 py-3">
            <p className="text-sm font-medium text-slate-200">Welcome to Admin Studio</p>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
              Live
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0b1224]/70 p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
