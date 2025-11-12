"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useRouter } from "next/navigation";

type RecapType = "Republican" | "Democratic" | "American Party" | "All" | "";

export default function KindJoeModalForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    zip: "",
    recapType: "" as RecapType,
    agree: false,
  });

  // ✅ Type-safe handler for input/select/checkbox
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const { name, value } = target;
    const checked = (target as HTMLInputElement).checked;

    setForm((p) => ({
      ...p,
      [name]:
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? checked
          : value,
    }));
  };

  const zipPattern = /^\d{5}(?:-\d{4})?$/;
  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.recapType &&
    form.agree &&
    zipPattern.test(form.zip.trim()) &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      await fetch("/api/newslettersubscriber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // ✅ Save subscription flag so modal won't show again
      try {
        window.localStorage.setItem("kj_already_subscribed", "1");
      } catch {}

      // ✅ Redirect to thank-you page
      router.push("/thank-you");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      key="form-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="max-w-xl mx-auto mt-2"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm mb-6 text-slate-700 dark:text-white/80"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          name="firstName"
          placeholder="First name"
          onChange={handleChange}
          required
          className="rounded-lg p-3 border bg-white/80 dark:bg-black/50"
        />
        <input
          name="lastName"
          placeholder="Last name"
          onChange={handleChange}
          required
          className="rounded-lg p-3 border bg-white/80 dark:bg-black/50"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
          required
          className="rounded-lg p-3 border bg-white/80 dark:bg-black/50"
        />
        <select
          name="recapType"
          onChange={handleChange}
          required
          className="rounded-lg p-3 border bg-white/80 dark:bg-black/50"
        >
          <option value="">Choose recap type</option>
          <option value="Republican">Republican</option>
          <option value="Democratic">Democratic</option>
          <option value="American Party">American Party</option>
          <option value="All">All</option>
        </select>
        <input
          name="zip"
          placeholder="ZIP code (12345 or 12345-6789)"
          onChange={handleChange}
          required
          className="rounded-lg p-3 border bg-white/80 dark:bg-black/50"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="agree"
            onChange={handleChange}
            required
          />
          I agree to the Terms & Privacy Policy.
        </label>

        <ShimmerButton type="submit" disabled={!canSubmit}>
          {submitting ? "Submitting..." : "Join Kind Joe — free"}
        </ShimmerButton>
      </form>
    </motion.div>
  );
}
