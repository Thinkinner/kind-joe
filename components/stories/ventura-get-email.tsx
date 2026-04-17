"use client";

import { useState, FormEvent } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import VenturaModalFormProps from "@/components/modals/ventura-capture-modal"; // path as you had it

const VenturaGetEmail = () => {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setOpen(true); // show our custom modal
  };

  return (
    <section className="border-b border-neutral-200 pb-5">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-900">
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
          className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus-visible:ring-2 focus-visible:ring-orange-500"
        />
        <Button
          type="submit"
          className="h-10 w-full rounded-md border border-orange-600 bg-orange-600 px-3 text-xs font-semibold uppercase tracking-wide text-white hover:bg-orange-700"
        >
          Subscribe
        </Button>
      </form>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="w-full max-w-2xl">
            <VenturaModalFormProps
              onBack={() => setOpen(false)}
              initialEmail={email}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default VenturaGetEmail;
