"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function ThankYouPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/blogs"), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-center bg-gradient-to-b from-white to-slate-50 dark:from-zinc-900 dark:to-black text-slate-900 dark:text-white px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md mx-auto"
      >
        <h1 className="text-3xl font-semibold mb-2">🎉 Thanks for subscribing!</h1>
        <p className="text-slate-600 dark:text-slate-300 text-base mb-6">
          You’re now part of Kind Joe. Redirecting you to the latest stories…
        </p>
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "linear" }}
          />
        </div>
      </motion.div>
    </main>
  );
}