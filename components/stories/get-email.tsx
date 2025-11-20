"use client";

import { useState, FormEvent } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import KindJoeModalForm from "@/components/modals/email-capture-modal"; // path as you had it

const getEmail = () => {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setOpen(true); // show our custom modal
  };

  return (
    <section className="px-4 py-5">
      <h2 className="text-sm font-bold tracking-tight uppercase text-neutral-800">
        Get Newsletter
      </h2>
      <p className="mt-2 text-xs text-neutral-600">
        Sign up to receive the latest news, articles and updates.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Button
          type="submit"
          className="w-full rounded border border-red-600 bg-red-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-red-700"
        >
          Subscribe
        </Button>
      </form>
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
