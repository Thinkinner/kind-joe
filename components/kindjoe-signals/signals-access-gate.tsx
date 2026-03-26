"use client";

import { useState, useEffect, FormEvent } from "react";
import { Layers, X } from "lucide-react";

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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050508]/80 p-4 backdrop-blur-md"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signals-lead-title"
        className="relative w-full max-w-md rounded-lg border border-white/10 bg-[#0A0A0F] p-6 shadow-[0_0_80px_rgba(0,0,0,1)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full border border-white/10 p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          <X size={18} aria-hidden />
        </button>

        <div className="mb-6 flex items-center gap-3 pr-10">
          <div className="rounded-md border border-[#00BFFF]/30 bg-[#00BFFF]/10 p-2">
            <Layers size={20} className="text-[#00BFFF]" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400/90">
              Kind Joe Signals
            </p>
            <h1 id="signals-lead-title" className="text-lg font-semibold text-white">
              Unlock the intel stream
            </h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-gray-400">
          The live map stays open for everyone. Share your details once to read
          the full headline list here and get updates from Kind Joe.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                First name
              </span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none ring-[#00BFFF]/0 transition-shadow focus:border-[#00BFFF]/40 focus:ring-2 focus:ring-[#00BFFF]/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Last name
              </span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition-shadow focus:border-[#00BFFF]/40 focus:ring-2 focus:ring-[#00BFFF]/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition-shadow focus:border-[#00BFFF]/40 focus:ring-2 focus:ring-[#00BFFF]/20"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/5 bg-white/[0.02] p-3">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 text-[#00BFFF] focus:ring-[#00BFFF]/30"
            />
            <span className="text-xs leading-snug text-gray-400">
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
