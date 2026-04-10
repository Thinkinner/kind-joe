"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

const WATCH_NEXT = "/kindjoe-watch";
const DELAY_MS = 5 * 60 * 1000;
/** Session-only: user dismissed the nudge this visit (tab session). */
const SESSION_DISMISS_KEY = "kj_watch_account_nudge_dismissed";

const loginHref = `/login?next=${encodeURIComponent(WATCH_NEXT)}`;
const registerHref = `/register?next=${encodeURIComponent(WATCH_NEXT)}`;

/**
 * After `DELAY_MS` on Kind Joe Watch (signed-out only), prompt account creation
 * so readers can keep using the product long-term. Dismissible for this tab session.
 */
export function KindJoeWatchAccountNudge() {
  const { data: session, isPending } = authClient.useSession();
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPending) return;
    if (session?.user) {
      setOpen(false);
      return;
    }
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") return;

    const id = window.setTimeout(() => {
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") return;
      setOpen(true);
    }, DELAY_MS);

    return () => window.clearTimeout(id);
  }, [isPending, session?.user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[190] flex items-center justify-center p-4 backdrop-blur-sm",
        isLight ? "bg-slate-900/40" : "bg-[#050508]/75",
      )}
      role="presentation"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="watch-account-nudge-title"
        className={cn(
          "relative w-full max-w-md rounded-xl border p-6 shadow-2xl sm:p-8",
          isLight
            ? "border-slate-200 bg-white"
            : "border-white/10 bg-[#0A0A0F]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            "absolute right-3 top-3 rounded-full border p-2 transition-colors",
            isLight
              ? "border-slate-200 text-slate-500 hover:bg-slate-100"
              : "border-white/10 text-gray-500 hover:bg-white/5",
          )}
          aria-label="Close"
        >
          <X size={18} aria-hidden />
        </button>

        <div className="mb-5 flex items-start gap-3 pr-10">
          <div className="rounded-lg border border-[#00BFFF]/30 bg-[#00BFFF]/10 p-2.5">
            <UserPlus className="h-5 w-5 text-[#00BFFF]" aria-hidden />
          </div>
          <div>
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.2em]",
                isLight ? "text-red-600" : "text-red-400/90",
              )}
            >
              Kind Joe Watch
            </p>
            <h2
              id="watch-account-nudge-title"
              className={cn(
                "mt-1 text-lg font-semibold leading-snug",
                isLight ? "text-slate-900" : "text-white",
              )}
            >
              Create a free account to keep watching
            </h2>
          </div>
        </div>

        <p
          className={cn(
            "mb-6 text-sm leading-relaxed",
            isLight ? "text-slate-600" : "text-gray-400",
          )}
        >
          You&apos;ve been here a while. Save your place and get the full experience —
          create an account in a minute, or sign in if you already have one.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
          <Link
            href={registerHref}
            className="flex w-full items-center justify-center rounded-lg bg-[#00BFFF] py-3 text-center text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_24px_rgba(0,191,255,0.2)] transition-all hover:bg-[#00BFFF]/90"
          >
            Create account
          </Link>
          <Link
            href={loginHref}
            className={cn(
              "flex w-full items-center justify-center rounded-lg border py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors",
              isLight
                ? "border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                : "border-white/15 text-gray-200 hover:border-white/25 hover:bg-white/[0.04]",
            )}
          >
            Sign in
          </Link>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className={cn(
            "mt-5 w-full text-center text-xs font-medium underline-offset-2 transition-colors hover:underline",
            isLight ? "text-slate-500" : "text-gray-500",
          )}
        >
          Continue without an account for now
        </button>
      </div>
    </div>
  );
}
