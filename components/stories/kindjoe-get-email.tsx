"use client";

import { useState, FormEvent } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import KindJoeModalForm from "@/components/modals/kindjoe-capture-modal";

export default function GetEmail() {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean || !clean.includes("@")) return;
    setOpen(true);
  };

  return (
    <section className="relative overflow-hidden text-white">
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 0% 0%, rgba(207,26,30,0.25), transparent 55%), linear-gradient(165deg, #0b1220 0%, #111827 50%, #0a1628 100%)",
        }}
      />

      <div className="relative p-5 sm:p-6">
        <p className="text-sm font-semibold text-red-400">Inbox</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
          Local stories, once a day
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          LA, Ventura County &amp; SLO — the essentials, no fluff.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-5 flex flex-col gap-3"
        >
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-none border-0 border-b border-white/25 bg-transparent px-0 text-sm text-white shadow-none placeholder:text-white/35 focus-visible:border-red-400 focus-visible:ring-0"
          />
          <Button
            type="submit"
            className="h-11 w-full rounded-none bg-red-600 text-sm font-semibold text-white hover:bg-red-500"
          >
            Subscribe
          </Button>
        </form>

        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          Free · Unsubscribe anytime
        </p>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="w-full max-w-2xl">
            <KindJoeModalForm
              onBack={() => setOpen(false)}
              initialEmail={email}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
