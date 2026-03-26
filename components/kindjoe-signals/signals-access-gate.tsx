"use client";

import { useState, useEffect, FormEvent } from "react";
import { Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignalsColorMode } from "@/components/kindjoe-signals/signals-color-mode";

const LS_KEY = "kj_signals_lead_ok";

interface SignalsAccessGateProps {
  open: boolean;
  onClose: () => void;
  onAccessGranted: () => void;
}

export default function SignalsAccessGate({
  open,
  onClose,
  onAccessGranted,
}: SignalsAccessGateProps) {
  const { mode } = useSignalsColorMode();
  const isLight = mode === "light";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setAgree(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!agree) {
      setError("Please agree to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/signals-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          agree: true,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      try {
        window.localStorage.setItem(LS_KEY, "1");
      } catch {
        /* ignore */
      }

      onAccessGranted();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
        aria-labelledby="signals-lead-title"
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
              Kind Joe Signals
            </p>
            <h1
              id="signals-lead-title"
              className={cn(
                "text-lg font-semibold",
                isLight ? "text-slate-900" : "text-white",
              )}
            >
              Unlock the intel stream
            </h1>
          </div>
        </div>

        <p
          className={cn(
            "mb-6 text-sm",
            isLight ? "text-slate-600" : "text-gray-400",
          )}
        >
          The live map stays open for everyone. Share your details once to read
          the full headline list here and get updates from Kind Joe.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span
                className={cn(
                  "mb-1 block text-[10px] font-bold uppercase tracking-widest",
                  isLight ? "text-slate-500" : "text-gray-500",
                )}
              >
                First name
              </span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={cn(
                  "w-full rounded-md border px-3 py-2.5 text-sm outline-none ring-[#00BFFF]/0 transition-shadow focus:border-[#00BFFF]/40 focus:ring-2 focus:ring-[#00BFFF]/20",
                  isLight
                    ? "border-slate-200 bg-slate-50 text-slate-900"
                    : "border-white/10 bg-black/40 text-white",
                )}
              />
            </label>
            <label className="block">
              <span
                className={cn(
                  "mb-1 block text-[10px] font-bold uppercase tracking-widest",
                  isLight ? "text-slate-500" : "text-gray-500",
                )}
              >
                Last name
              </span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={cn(
                  "w-full rounded-md border px-3 py-2.5 text-sm outline-none transition-shadow focus:border-[#00BFFF]/40 focus:ring-2 focus:ring-[#00BFFF]/20",
                  isLight
                    ? "border-slate-200 bg-slate-50 text-slate-900"
                    : "border-white/10 bg-black/40 text-white",
                )}
              />
            </label>
          </div>

          <label className="block">
            <span
              className={cn(
                "mb-1 block text-[10px] font-bold uppercase tracking-widest",
                isLight ? "text-slate-500" : "text-gray-500",
              )}
            >
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "w-full rounded-md border px-3 py-2.5 text-sm outline-none transition-shadow focus:border-[#00BFFF]/40 focus:ring-2 focus:ring-[#00BFFF]/20",
                isLight
                  ? "border-slate-200 bg-slate-50 text-slate-900"
                  : "border-white/10 bg-black/40 text-white",
              )}
            />
          </label>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border p-3",
              isLight
                ? "border-slate-200 bg-slate-50"
                : "border-white/5 bg-white/[0.02]",
            )}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 rounded text-[#00BFFF] focus:ring-[#00BFFF]/30",
                isLight
                  ? "border-slate-300 bg-white"
                  : "border-white/20 bg-black/40",
              )}
            />
            <span
              className={cn(
                "text-xs leading-snug",
                isLight ? "text-slate-600" : "text-gray-400",
              )}
            >
              I agree to share my contact information with Kind Joe for updates
              related to Signals and related products.
            </span>
          </label>

          {error ? (
            <p className="text-sm text-red-400/90" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-[#00BFFF] py-3 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_24px_rgba(0,191,255,0.2)] transition-all hover:bg-[#00BFFF]/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Unlock feed"}
          </button>
        </form>
      </div>
    </div>
  );
}
