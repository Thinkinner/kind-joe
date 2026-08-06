"use client";

import { FormEvent, useState } from "react";
import { Building2, CheckCircle2, Loader2, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";

type VenturaBusinessInquiryFormProps = {
  source?: string;
  onSuccess?: () => void;
  compact?: boolean;
};

const fieldClass =
  "h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50/80 px-3.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#D97706] focus:bg-white focus:ring-2 focus:ring-[#D97706]/20";

export function VenturaBusinessInquiryForm({
  source = "ventura_promote_page",
  onSuccess,
  compact = false,
}: VenturaBusinessInquiryFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/ventura-business-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, businessName, source }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Could not submit right now.");
        return;
      }
      setDone(true);
      toast.success("Thanks! We'll be in touch soon.");
      onSuccess?.();
    } catch {
      toast.error("Could not submit right now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h3 className="mt-3 text-xl font-bold tracking-tight text-neutral-950">
          You&apos;re all set
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">
          Thanks for reaching out. Joe Knows Ventura will review your business
          details and follow up soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-3.5" : "space-y-4"}>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
          <User className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          Name
        </span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          autoComplete="name"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
          <Mail className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          autoComplete="email"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
          <Phone className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          Phone
        </span>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(805) 555-0123"
          autoComplete="tel"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
          <Building2 className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          Business name
        </span>
        <input
          required
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Your business name"
          autoComplete="organization"
          className={fieldClass}
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D97706] text-sm font-semibold text-white transition hover:bg-[#B45309] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Submitting...
          </>
        ) : (
          "Submit inquiry"
        )}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-neutral-500">
        We&apos;ll only use this to follow up about promoting your business.
      </p>
    </form>
  );
}
