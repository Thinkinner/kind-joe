"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account", label: "Account" },
] as const;

export function AccountSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1"
      aria-label="Account sections"
    >
      {items.map(({ href, label }) => {
        const active =
          href === "/account"
            ? pathname === "/account"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors ${
              active
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
