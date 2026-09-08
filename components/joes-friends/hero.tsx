"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { JoesFriendsMascot } from "./mascot";

const STATS = [
  { value: "20M+", label: "Views" },
  { value: "10K", label: "Followers added" },
  { value: "6M+", label: "YouTube views" },
  { value: "17K+", label: "Subs gained" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function JoesFriendsHero() {
  const reduceMotion = useReducedMotion();

  const rise = (y: number, delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: EASE },
        };

  return (
    <section className="relative overflow-hidden px-5 pb-14 pt-28 lg:px-8 lg:pb-20 lg:pt-36">
      <div className="pointer-events-none absolute -right-10 top-20 h-48 w-48 rounded-full bg-jf-red/15 blur-2xl" />
      <div className="pointer-events-none absolute left-10 top-40 h-56 w-56 rounded-full bg-jf-blue/10 blur-2xl" />

      <div className="relative mx-auto grid max-w-[1280px] items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <motion.p
            className="inline-block -rotate-1 bg-jf-red px-3 py-1 font-jf-hand text-xl text-white shadow-[3px_3px_0_#121212] sm:text-2xl"
            {...rise(12, 0)}
          >
            Titans Of The Media Industry
          </motion.p>

          <motion.h1
            className="mt-5 max-w-4xl font-jf-display text-[clamp(2.4rem,7vw,5.8rem)] uppercase leading-[0.92]"
            {...rise(18, 0.08)}
          >
            Stop Running Your Own Content Department
          </motion.h1>

          <motion.div
            className="mt-7 inline-block -rotate-1 bg-jf-blue px-4 py-2 text-white shadow-[6px_6px_0_#121212]"
            {...rise(16, 0.16)}
          >
            <p className="font-jf-display text-xl uppercase sm:text-2xl">
              We run your social.
            </p>
          </motion.div>

          <motion.p
            className="mt-7 max-w-2xl text-base leading-relaxed text-jf-muted sm:text-lg"
            {...rise(16, 0.24)}
          >
            A social media company built by Kind Joe. We manage your pages, edit
            and create the posts, and grow the audience — with a proven niche
            already delivering millions of views.
          </motion.p>

          <motion.div
            className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4"
            {...rise(16, 0.32)}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="jf-stamp bg-jf-surface px-3 py-3">
                <p className="font-jf-display text-2xl uppercase leading-none">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-jf-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-4"
            {...rise(16, 0.4)}
          >
            <Link
              href="/joes-friends/contact"
              className="jf-stamp bg-jf-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:-translate-y-0.5"
            >
              Get Started
            </Link>
            <Link
              href="/joes-friends#system"
              className="jf-stamp bg-jf-surface px-6 py-3 text-sm font-bold uppercase tracking-wide text-jf-ink transition hover:-translate-y-0.5"
            >
              See The Proof
            </Link>
            <svg
              viewBox="0 0 120 60"
              className="ml-1 hidden h-10 w-20 text-jf-blue sm:block"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 42C28 18 58 8 96 16"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M82 8l18 10-14 14"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-sm"
          initial={
            reduceMotion ? undefined : { opacity: 0, scale: 0.92, rotate: 4 }
          }
          animate={
            reduceMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
        >
          <div className="jf-slash-bg jf-stamp relative bg-jf-red-soft p-6 pb-8">
            <JoesFriendsMascot />
            <p className="mt-2 text-center font-jf-hand text-3xl text-jf-blue">
              your social crew
            </p>
          </div>
          <div className="absolute -left-4 top-6 rotate-[-12deg] bg-jf-blue px-3 py-1 font-jf-hand text-xl text-white shadow-[3px_3px_0_#121212]">
            Kind Joe
          </div>
          <div className="absolute -bottom-3 right-2 rotate-[8deg] border-2 border-dashed border-jf-red bg-jf-surface px-3 py-1 font-jf-hand text-lg text-jf-red">
            millions of views
          </div>
        </motion.div>
      </div>
    </section>
  );
}
