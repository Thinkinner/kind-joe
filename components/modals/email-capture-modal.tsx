"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Props = {
  autoOpenDelayMs?: number;
  storageKey?: string; // marks dismissed in localStorage
  initiallyOpen?: boolean;
  onSubscribe?: (data: {
    email: string;
    firstName: string;
    lastName: string;
    zip: string;
    category: string;
  }) => Promise<void> | void;
};

export default function NewsletterPopup({
  autoOpenDelayMs = 1500,
  storageKey = "newsletter_popup_dismissed",
  initiallyOpen = false,
  onSubscribe,
}: Props) {
  const [open, setOpen] = useState<boolean>(initiallyOpen);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    zip: "",
    category: "General",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailRef = useRef<HTMLInputElement | null>(null);

  // Respect prior dismissal + auto open
  useEffect(() => {
    if (typeof window === "undefined") return;

    // If previously dismissed, don't auto-open regardless of initiallyOpen
    const dismissed = window.localStorage.getItem(storageKey) === "1";
    if (dismissed) return;

    if (initiallyOpen) {
      setOpen(true);
      return;
    }

    const t = window.setTimeout(() => setOpen(true), autoOpenDelayMs);
    return () => window.clearTimeout(t);
  }, [autoOpenDelayMs, initiallyOpen, storageKey]);

  // Focus email when dialog opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => emailRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // Persist dismissal when dialog closes in any way
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!open) {
      window.localStorage.setItem(storageKey, "1");
    }
  }, [open, storageKey]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.email) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Invalid email";
    if (!form.firstName) e.firstName = "First name is required";
    if (!form.lastName) e.lastName = "Last name is required";
    if (!form.zip) e.zip = "ZIP / Postal code is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      await (onSubscribe
        ? onSubscribe(form)
        : new Promise((r) => setTimeout(r, 900)));
      setSuccess(true);
      // Mark as dismissed, then close
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, "1");
      }
      setTimeout(() => setOpen(false), 900);
    } finally {
      setSubmitting(false);
    }
  }

  function closePopup() {
    setOpen(false); // dismissal handled in useEffect
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="
          max-w-none
          w-[95vw] sm:w-[92vw] md:w-[90vw]
          lg:max-w-6xl
          bg-white p-8 md:p-12 lg:p-16 shadow-2xl"
      >
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <DialogTitle className="text-4xl font-bold leading-tight">
              Sign up for our newsletter
            </DialogTitle>
            <DialogDescription asChild>
              <p className="mt-4 text-lg text-gray-700">
                Share your email and we'll share the latest trusted news.
              </p>
            </DialogDescription>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm((s) => ({ ...s, firstName: e.target.value }))
                }
                placeholder="First name"
                className={`w-full h-14 rounded-lg border px-4 text-base focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  errors.firstName ? "border-red-400" : "border-gray-200"
                }`}
                aria-invalid={!!errors.firstName}
                aria-describedby={
                  errors.firstName ? "err-firstName" : undefined
                }
              />
              {errors.firstName && (
                <p id="err-firstName" className="sr-only">
                  {errors.firstName}
                </p>
              )}

              <Input
                value={form.lastName}
                onChange={(e) =>
                  setForm((s) => ({ ...s, lastName: e.target.value }))
                }
                placeholder="Last name"
                className={`w-full h-14 rounded-lg border px-4 text-base focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  errors.lastName ? "border-red-400" : "border-gray-200"
                }`}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? "err-lastName" : undefined}
              />
              {errors.lastName && (
                <p id="err-lastName" className="sr-only">
                  {errors.lastName}
                </p>
              )}
            </div>

            <Input
              ref={emailRef}
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
              placeholder="Email address"
              className={`w-full h-14 rounded-lg border px-4 text-base focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                errors.email ? "border-red-400" : "border-gray-200"
              }`}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "err-email" : undefined}
            />
            {errors.email && (
              <p id="err-email" className="sr-only">
                {errors.email}
              </p>
            )}

            <Input
              value={form.zip}
              onChange={(e) => setForm((s) => ({ ...s, zip: e.target.value }))}
              placeholder="ZIP / Postal code"
              className={`w-full h-14 rounded-lg border px-4 text-base focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                errors.zip ? "border-red-400" : "border-gray-200"
              }`}
              aria-invalid={!!errors.zip}
              aria-describedby={errors.zip ? "err-zip" : undefined}
            />
            {errors.zip && (
              <p id="err-zip" className="sr-only">
                {errors.zip}
              </p>
            )}

            <div className="relative">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((s) => ({ ...s, category: e.target.value }))
                }
                className={`w-full h-14 rounded-lg border px-4 pr-10 text-base text-gray-800
                  bg-white appearance-none
                  focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1
                  ${errors.category ? "border-red-400" : "border-gray-200"}
                  transition-all duration-200
                `}
              >
                <option value="General">General</option>
                <option value="Technology">Technology</option>
                <option value="Business">Business</option>
                <option value="Health">Health</option>
              </select>

              {/* Chevron Icon */}
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 9l6 6 6-6"
                />
              </svg>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-sky-600 py-4 text-white text-lg font-semibold disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Subscribe"}
              </Button>

              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePopup}
                  className="rounded-lg border py-4 px-6 text-lg"
                >
                  Cancel
                </Button>
              </DialogClose>
            </div>

            {success && (
              <div className="mt-2 text-green-600 text-base">
                Thanks — check your inbox for a confirmation link!
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
