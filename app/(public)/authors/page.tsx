import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { AUTHOR_PROFILES } from "@/lib/authors/profiles";

export const metadata: Metadata = {
  title: "Authors - KindJoe",
  description:
    "Meet the KindJoe writers behind our reporting, explainers, and local coverage.",
};

export default function AuthorsPage() {
  return (
    <main className="bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-600">
            Our bylines
          </p>
          <h1 className="mt-3 font-[Poppins] text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Meet the people behind KindJoe
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            These editorial profiles help readers understand who is behind our
            stories, what each writer covers, and how our coverage is reviewed.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUTHOR_PROFILES.map((author) => (
            <Link
              key={author.slug}
              href={`/authors/${author.slug}`}
              className="group flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-red-200 hover:bg-red-50/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400">
                  <UserRound className="h-7 w-7" aria-hidden />
                </div>
                <div>
                  <h2 className="font-[Poppins] text-lg font-bold text-slate-950 transition-colors group-hover:text-red-700">
                    {author.name}
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    {author.role}
                  </p>
                </div>
              </div>
              <p className="mt-5 flex-1 text-sm leading-6 text-slate-600">
                {author.shortBio}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-red-700">
                Read bio
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
