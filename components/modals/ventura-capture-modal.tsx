"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

type VenturaModalFormProps = {
  onBack: () => void;
  initialEmail?: string;
};

export default function KindJoeModalForm({
  onBack,
  initialEmail = "",
}: VenturaModalFormProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: initialEmail,
    zip: "",
    agree: false,
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target;

    if (target instanceof HTMLInputElement) {
      const { name, type, value, checked } = target;
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }

    if (target instanceof HTMLSelectElement) {
      const { name, value } = target;
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const zipPattern = /^[A-Za-z0-9\s-]{3,20}$/;

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.agree &&
    zipPattern.test(form.zip.trim()) &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);

    try {
      // Build payload that matches the /api/ventura-subscriber POST handler
      const payload = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        zipCode: form.zip || undefined, // backend expects `zipCode`
      };

      const res = await fetch("/api/ventura-subscriber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.error ||
          `Something went wrong. (${res.status} ${res.statusText})`;
        throw new Error(msg);
      }

      try {
        window.localStorage.setItem("kj_already_subscribed", "1");
      } catch {}

      alert("Thank you for joining Kind Joe!");

      setTimeout(() => onBack(), 500);
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-auto rounded-2xl bg-white p-10 shadow-xl"
    >
      <div className="grid gap-5">
        {/* First name */}
        <input
          type="text"
          name="firstName"
          placeholder="First name"
          onChange={handleChange}
          value={form.firstName}
          required
          className="w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-lg text-black shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/20"
        />

        {/* Last name */}
        <input
          type="text"
          name="lastName"
          placeholder="Last name"
          onChange={handleChange}
          value={form.lastName}
          required
          className="w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-lg text-black shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/20"
        />

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          value={form.email}
          required
          className="w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-lg text-black shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/20"
        />

        {/* ZIP */}
        <input
          type="text"
          name="zip"
          placeholder="ZIP or postal code"
          onChange={handleChange}
          value={form.zip}
          required
          inputMode="text"
          className="w-full rounded-sm border border-gray-300 bg-white px-4 py-3 text-lg text-black shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/20"
        />

        {/* Checkbox */}
        <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
          <Checkbox
            checked={form.agree}
            onCheckedChange={(checked) =>
              setForm((prev) => ({ ...prev, agree: Boolean(checked) }))
            }
            required
          />
          <span>I agree to receive Kind Joe updates and emails.</span>
        </label>
      </div>

      {/* Buttons */}
      <div className="mt-8 flex flex-col gap-4">
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full rounded-full px-4 py-3 text-lg font-semibold transition shadow-sm ${
            canSubmit
              ? "bg-black text-white hover:bg-gray-800 active:scale-[0.98]"
              : "cursor-not-allowed bg-orange-300 text-white"
          }`}
        >
          {submitting ? "Submitting..." : "Join Now"}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="text-center text-sm font-medium text-gray-500 hover:text-black cursor-pointer"
        >
          Maybe later
        </button>
      </div>
    </form>
  );
}
