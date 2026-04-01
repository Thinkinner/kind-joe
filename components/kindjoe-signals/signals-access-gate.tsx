"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

const WATCH_NEXT = "/kindjoe-watch";
const loginHref = `/login?next=${encodeURIComponent(WATCH_NEXT)}`;
const registerHref = `/register?next=${encodeURIComponent(WATCH_NEXT)}`;

interface SignalsAccessGateProps {
  open: boolean;
  onClose: () => void;
}

export default function SignalsAccessGate({
  open,
  onClose,
}: SignalsAccessGateProps) {
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md",
        isLight ? "bg-slate-900/35" : "bg-[#050508]/80",
      )}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signals-auth-title"
        className={cn(
          "relative w-full max-w-md rounded-lg border p-6 shadow-[0_0_80px_rgba(0,0,0,1)] sm:p-8",
          isLight
            ? "border-slate-200 bg-white"
            : "border-white/10 bg-[#0A0A0F]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute right-3 top-3 rounded-full border p-2 transition-colors",
            isLight
              ? "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              : "border-white/10 text-gray-500 hover:bg-white/5 hover:text-white",
          )}
          aria-label="Close"
        >
          <X size={18} aria-hidden />
        </button>

        <div className="mb-6 flex items-center gap-3 pr-10">
          <div className="rounded-md border border-[#00BFFF]/30 bg-[#00BFFF]/10 p-2">
            <Layers size={20} className="text-[#00BFFF]" aria-hidden />
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
            <h1
              id="signals-auth-title"
              className={cn(
                "text-lg font-semibold",
                isLight ? "text-slate-900" : "text-white",
              )}
            >
              View the full feed
            </h1>
          </div>
        </div>

        <p
          className={cn(
            "mb-6 text-sm",
            isLight ? "text-slate-600" : "text-gray-400",
          )}
        >
          Sign in or create an account to view the full headline list and live
          updates here.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
          <Link
            href={loginHref}
            className="flex w-full items-center justify-center rounded-md bg-[#00BFFF] py-3 text-center text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_24px_rgba(0,191,255,0.2)] transition-all hover:bg-[#00BFFF]/85"
          >
            Sign in
          </Link>
          <Link
            href={registerHref}
            className={cn(
              "flex w-full items-center justify-center rounded-md border py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors",
              isLight
                ? "border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                : "border-white/15 text-gray-200 hover:border-white/25 hover:bg-white/[0.04]",
            )}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
