"use client";

import { useState, FormEvent } from "react";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import KindJoeModalForm from "@/components/modals/kindjoe-capture-modal"; // path as you had it

const getEmail = () => {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean || !clean.includes("@")) return;

    setOpen(true); // show our custom modal
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-red-50 p-2 text-red-600">
          <Mail className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Newsletter
          </p>
          <h2 className="mt-1 text-lg font-bold leading-tight text-neutral-900">
            Get the top stories in your inbox
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            One concise update with key stories, sharp analysis, and what matters next.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-neutral-600">
        <p className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-red-500" />
          Curated by the editorial team
        </p>
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-red-500" />
          No spam, unsubscribe anytime
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 rounded-lg border-neutral-300 text-sm"
        />
        <Button
          type="submit"
          className="h-10 w-full rounded-lg bg-red-600 text-xs font-semibold uppercase tracking-wide text-white hover:bg-red-700"
        >
          Subscribe Free
        </Button>
      </form>
      <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
        By subscribing, you agree to receive email updates from Kind Joe.
      </p>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="w-full max-w-2xl">
            <KindJoeModalForm
              onBack={() => setOpen(false)}
              initialEmail={email}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default getEmail;
