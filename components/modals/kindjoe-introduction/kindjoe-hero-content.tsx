"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

export default function KindJoeHeroContent({
  onJoinClick,
  hasSubscribedFlag,
  onAlreadySubscribed,
}: {
  onJoinClick: () => void;
  hasSubscribedFlag: boolean;
  onAlreadySubscribed: () => void;
}) {
  const features = [
    { id: 3, text: "Just real news for real people." },
    { id: 1, text: "No subscriptions." },
    { id: 2, text: "No paywalls." },
  ];

  return (
    <motion.div
      key="hero-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="text-center py-6 flex flex-col gap-5 max-w-3xl mx-auto"
    >
      <h1 className="text-3xl sm:text-4xl font-bold">Hi Fellow Americans,</h1>

      <p className="text-base sm:text-lg text-slate-700 dark:text-white/90">
        We're Kind Joe — a small team of editors and journalists who built this
        site to save you time and keep you informed without the noise.
      </p>

      <div className="grid gap-4 hidden lg:block sm:grid-cols-3 mt-4">
        {features.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-2xl p-4 sm:p- border bg-white/70 dark:bg-black/50"
          >
            <div className="mx-auto mb-3 flex h-7 w-7 items-center justify-center rounded-full border border-green-500">
              <Check className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-sm font-medium">{f.text}</p>
          </motion.div>
        ))}
      </div>

      {features.map((f, i) => (
        <div className="mx-auto mb-3 flex items-center justify-center gap-2 ">
          <Check className="h-6 w-6 text-green-500" />
          <p className="text-sm font-medium">{f.text}</p>
        </div>
      ))}

      <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onJoinClick}
          className="bg-red-600 font-bold text-white px-8 py-3 rounded-full border-2 border-slate-300 text-slate-900 dark:text-white hover:bg-red-700 dark:hover:bg-red-600 transition cursor-pointer"
        >
          Join Kind Joe — free
        </button>

        <Link href="/">
          <button
            onClick={onAlreadySubscribed}
            className="px-8 py-3 rounded-full border-2 border-slate-300 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
          >
            Already subscribed
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
