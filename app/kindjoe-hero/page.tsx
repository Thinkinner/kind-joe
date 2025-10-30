"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Check, ArrowLeft } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useTheme } from "next-themes";

export default function KindJoeHero() {
  const { resolvedTheme } = useTheme(); // "light" | "dark" | undefined

  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    zip: "",
    source: "",
    agree: false,
  });
  const [showForm, setShowForm] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement | null>(null);
  const ctaRef = React.useRef<HTMLButtonElement | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Simple client-side guard
    if (!form.agree) return;
    console.log("Subscribed:", form);
  };

  const handleRevealForm = () => {
    setShowForm(true);
    requestAnimationFrame(() => {
      const first = formRef.current?.querySelector(
        "input[name='firstName']"
      ) as HTMLInputElement | null;
      first?.focus();
    });
  };

  const handleBack = () => {
    setShowForm(false);
    requestAnimationFrame(() => {
      ctaRef.current?.focus();
    });
  };

  const features = [
    { id: 1, text: "No subscriptions." },
    { id: 2, text: "No paywalls." },
    { id: 3, text: "Just real news for real people." },
  ];

  // Optional: change the shimmer button bg per theme
  const ctaBg =
    resolvedTheme === "dark"
      ? "rgba(201, 0, 0, 1)"
      : "rgba(201, 0, 0, 1)";

  // helper: US ZIP (12345 or 12345-6789)
  const zipPattern = "^\\d{5}(?:-\\d{4})?$";

  const canSubmit =
    form.firstName.trim() &&
    form.email.trim() &&
    form.agree &&
    new RegExp(zipPattern).test(form.zip.trim());

  return (
    <section
      className={[
        "relative min-h-[80dvh] sm:min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center px-4 sm:px-6 lg:px-8",
        // background image can also change in dark mode if you want a different asset:
        "bg-[url('/kindjoe-hero.png')]",
        "dark:bg-[url('/kindjoe-hero-dark.png')]",
        // text colors by theme
        "text-slate-900 dark:text-white",
      ].join(" ")}
    >
      {/* Overlay adapts to theme: lighter veil on light, darker on dark */}
      <div className="absolute inset-0 dark:bg-black/40" />

      <div className="relative z-10 w-full max-w-5xl rounded-4xl shadow-lg p-6 sm:p-8 lg:p-10 backdrop-blur-md
                      border bg-white/100 border-black/10
                      dark:bg-black/5 dark:border-white/50">
        <Image
          src="/brand/square-logo.svg"
          width={100}
          height={100}
          alt="Kind Joe Logo"
          className="mx-auto"
        />

        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.div
              key="hero-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center py-10 flex flex-col gap-5 max-w-3xl mx-auto"
            >
              <h1 className="text-3xl sm:text-4xl font-bold">
                Hi Fellow Americans,
              </h1>

              <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-white/90">
                Blue or red — because at the end of the day, we’re all just average Joes trying to make sense of the world together.
              </p>
              <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-white/90">
                We’re Kind Joe, a small team of 12 editors and journalists who built this site for one reason: to save you time and keep you informed without the noise.
              </p>
              <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-white/90">
                Every day, we send a free newsletter with a quick, easy-to-read summary of what’s happening—from politics and local news to money, culture, and even a movie of the day.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mx-auto max-w-4xl"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  {features.map((f, i) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.08 * i, duration: 0.4 }}
                      className="rounded-2xl p-4 sm:p-5 text-center shadow-sm
                                 border bg-white/70 text-slate-900
                                 border-black/10
                                 dark:border-white/20 dark:bg-black/50 dark:text-white"
                    >
                      <div className="mx-auto mb-3 flex h-7 w-7 items-center justify-center rounded-full border border-green-500">
                        <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
                      </div>
                      <p className="text-sm font-medium leading-snug">{f.text}</p>
                    </motion.div>
                  ))}
                </div>

                <ShimmerButton
                  ref={ctaRef}
                  type="button"
                  aria-label="Subscribe to Kind Joe"
                  className="w-full sm:w-auto justify-self-start px-6 py-3 font-semibold mx-auto mt-5"
                  shimmerColor="#7CFFCB"
                  background={ctaBg}
                  onClick={handleRevealForm}
                >
                  Subscribe free
                </ShimmerButton>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="form-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-xl mx-auto mt-6"
            >
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm mb-6 text-slate-700 hover:text-slate-900
                           dark:text-white/70 dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg px-4 py-3 outline-none
                             border bg-white/80 text-slate-900 placeholder:text-slate-500
                             focus:border-black/30 focus:ring-2 focus:ring-black/10
                             border-black/10
                             dark:border-white/20 dark:bg-black/50 dark:text-white dark:placeholder:text-white/70
                             dark:focus:border-white/40 dark:focus:ring-white/20"
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full rounded-lg px-4 py-3 outline-none
                             border bg-white/80 text-slate-900 placeholder:text-slate-500
                             focus:border-black/30 focus:ring-2 focus:ring-black/10
                             border-black/10
                             dark:border-white/20 dark:bg-black/50 dark:text-white dark:placeholder:text-white/70
                             dark:focus:border-white/40 dark:focus:ring-white/20"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg px-4 py-3 outline-none
                             border bg-white/80 text-slate-900 placeholder:text-slate-500
                             focus:border-black/30 focus:ring-2 focus:ring-black/10
                             border-black/10
                             dark:border-white/20 dark:bg-black/50 dark:text-white dark:placeholder:text-white/70
                             dark:focus:border-white/40 dark:focus:ring-white/20"
                />

                {/* Full-width, beautiful select */}
                <div className="relative">
                  <select
                    name="source"
                    value={form.source}
                    onChange={handleChange}
                    required
                    aria-label="How did you hear about us?"
                    className="w-full appearance-none rounded-lg px-4 py-3 outline-none
                               border bg-white/80 text-slate-900
                               focus:border-black/30 focus:ring-2 focus:ring-black/10
                               border-black/10 shadow-sm
                               dark:border-white/20 dark:bg-black/50 dark:text-white
                               dark:focus:border-white/40 dark:focus:ring-white/20"
                  >
                    <option value="" disabled>
                      How did you hear about us?
                    </option>
                    <option>Friend or family</option>
                    <option>Search engine</option>
                    <option>Facebook</option>
                    <option>Twitter / X</option>
                    <option>Instagram</option>
                    <option>Podcast</option>
                    <option>Other</option>
                  </select>
                  {/* Chevron icon using a CSS triangle to avoid extra deps */}
                  <span
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 border-x-transparent border-b-0 border-t-8 border-t-slate-400 border-x-8"
                    aria-hidden
                  />
                </div>

                {/* ZIP code */}
                <input
                  type="text"
                  name="zip"
                  placeholder="ZIP code (12345 or 12345-6789)"
                  value={form.zip}
                  onChange={handleChange}
                  pattern={zipPattern}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  required
                  className="w-full rounded-lg px-4 py-3 outline-none
                             border bg-white/80 text-slate-900 placeholder:text-slate-500
                             focus:border-black/30 focus:ring-2 focus:ring-black/10
                             border-black/10 shadow-sm
                             dark:border-white/20 dark:bg-black/50 dark:text-white dark:placeholder:text-white/70
                             dark:focus:border-white/40 dark:focus:ring-white/20"
                />

                {/* Consent */}
                <label className="flex items-start gap-3 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={form.agree}
                    onChange={handleChange}
                    required
                    className="mt-1 h-4 w-4 rounded border-black/20 text-black focus:ring-black/20
                               dark:border-white/30 dark:focus:ring-white/30"
                    aria-describedby="consent-help"
                  />
                  <span className="text-sm text-slate-700 dark:text-white/90">
                    I agree to the
                    {" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      Terms
                    </a>
                    {" "}and{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      Privacy Policy
                    </a>
                    .
                    <span id="consent-help" className="sr-only">
                      You must agree before subscribing.
                    </span>
                  </span>
                </label>

                <ShimmerButton
                  type="submit"
                  className="w-full px-6 py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  shimmerColor="#7CFFCB"
                  background={ctaBg}
                  disabled={!canSubmit}
                >
                  Subscribe now
                </ShimmerButton>

                {/* Secondary action below the button */}
                <button
                  type="button"
                  onClick={() => console.log("Already subscribed click")}
                  className="w-full text-center text-sm text-slate-600 underline underline-offset-2 hover:no-underline mt-1
                             dark:text-white/80"
                  aria-label="I'm already subscribed"
                >
                  I'm already subscribed
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
