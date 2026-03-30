import Link from "next/link";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const publicSite = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-slate-800">
              Kind Joe Admin
            </span>
          </div>
          {publicSite ? (
            <a
              href={`${publicSite}/`}
              className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
              rel="noopener noreferrer"
            >
              Back to site
            </a>
          ) : (
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              Back to site
            </Link>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
