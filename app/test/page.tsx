"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Mail, User } from "lucide-react";
import Image from "next/image";

export default function KindJoeHero() {
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [showForm, setShowForm] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement | null>(null);
  const ctaRef = React.useRef<HTMLButtonElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Subscribed:", form);
  };

  const handleRevealForm = () => {
    setShowForm(true);
    // Smooth focus when the form appears
    requestAnimationFrame(() => {
      const first = formRef.current?.querySelector(
        "input[name='firstName']"
      ) as HTMLInputElement | null;
      first?.focus();
    });
  };

  const handleBack = () => {
    setShowForm(false);
    // Return focus to the CTA for accessibility
    requestAnimationFrame(() => {
      ctaRef.current?.focus();
    });
  };

  return (
    <section
      className="relative min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center px-4 sm:px-6 lg:px-8"
      style={{ backgroundImage: "url('/kindjoe-hero.png')" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10 w-full max-w-5xl"
      >
        {/* Logo always on top */}
        <div className="flex justify-center pb-6 sm:pb-8">
          <Image
            src="/brand/square-logo.svg"
            width={137}
            height={137}
            alt="Kind Joe Logo"
            priority
          />
        </div>

        {/* Content area – single column; text swaps with form */}
        <div className="grid grid-cols-1 items-start">
          <AnimatePresence mode="wait" initial={false}>
            {!showForm ? (
              <motion.div
                key="copy"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 text-left"
              >
                <div className="flex justify-start items-center gap-2">
                  <Badge variant="secondary" className="text-[11px] sm:text-xs">
                    We Are Kind Joe
                  </Badge>
                  <span className="text-[11px] sm:text-xs text-muted-foreground">
                    12 editors & journalists
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
                  Hi Fellow Americans,
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Blue or red — because at the end of the day, we’re all just
                  average Joes trying to make sense of the world together.
                </p>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  We’re <span className="font-semibold text-foreground">Kind Joe</span>, a
                  small team of 12 editors and journalists who built this site for
                  one reason: to save you time and keep you informed without the
                  noise.
                </p>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Every day, we send a <span className="font-semibold">free newsletter</span> with a
                  quick, easy-to-read summary of what’s happening—from politics and
                  local news to money, culture, and even a movie of the day.
                </p>

                <ul className="space-y-2 text-base sm:text-lg">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>No subscriptions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>No paywalls.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Just real news for real people.</span>
                  </li>
                </ul>

                <p className="text-xs sm:text-sm text-muted-foreground mt-4">
                  We the people, the average Joes — {" "}
                  <span className="font-semibold text-foreground">WE ARE THE NEWS NOW.</span>
                  <br />– Kind Joe
                </p>

                <div className="pt-2">
                  <Button
                    ref={ctaRef}
                    onClick={handleRevealForm}
                    className="h-[52px] sm:h-[56px] w-full sm:w-auto text-base font-semibold"
                    aria-expanded={showForm}
                    aria-controls="kindjoe-signup"
                  >
                    Get the Daily Brief
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <form
                  id="kindjoe-signup"
                  ref={formRef}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4"
                  aria-label="Sign up for the Daily Brief"
                >
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60" />
                    <Input
                      type="text"
                      name="firstName"
                      required
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="First Name"
                      className="pl-12 py-5 sm:py-6 text-base border-2 border-border focus:border-primary focus:ring-2 focus:ring-slate-950 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60" />
                    <Input
                      type="text"
                      name="lastName"
                      required
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Last Name"
                      className="pl-12 py-5 sm:py-6 text-base border-2 border-border focus:border-primary focus:ring-2 focus:ring-slate-950 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60" />
                    <Input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Email Address"
                      className="pl-12 py-5 sm:py-6 text-base border-2 border-border focus:border-primary focus:ring-2 focus:ring-slate-950 transition-all"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button
                      type="submit"
                      className="h-[52px] sm:h-[56px] w-full text-base font-semibold"
                    >
                      Get the Daily Brief
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-[52px] sm:h-[56px] w-full text-base"
                      onClick={handleBack}
                    >
                      Back
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}
