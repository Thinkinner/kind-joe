import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, UserRound } from "lucide-react";
import {
  AUTHOR_PROFILES,
  getAuthorProfile,
} from "@/lib/authors/profiles";

type AuthorPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return AUTHOR_PROFILES.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorProfile(slug);

  if (!author) {
    return {
      title: "Author Not Found - KindJoe",
    };
  }

  return {
    title: `${author.name} - KindJoe Author Bio`,
    description: author.shortBio,
    alternates: {
      canonical: `/authors/${author.slug}`,
    },
  };
}

export default async function AuthorBioPage({ params }: AuthorPageProps) {
  const { slug } = await params;
  const author = getAuthorProfile(slug);

  if (!author) notFound();

  return (
    <main className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/authors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-red-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All authors
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 px-6 py-8 text-white sm:px-8 sm:py-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-5">
                <div
                  aria-label={author.name}
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white/20 bg-white/10 text-slate-300 shadow-lg"
                >
                  <UserRound className="h-12 w-12" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-200">
                    Author bio
                  </p>
                  <h1 className="mt-2 font-[Poppins] text-3xl font-extrabold tracking-tight sm:text-5xl">
                    {author.name}
                  </h1>
                  <p className="mt-2 text-base font-medium text-slate-200">
                    {author.role}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm text-slate-200 sm:items-end">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-200" aria-hidden />
                  {author.location}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-red-200" aria-hidden />
                  {author.contactLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-10">
            <article>
              <p className="text-lg font-semibold leading-8 text-slate-900">
                {author.shortBio}
              </p>

              <div className="mt-7 space-y-5 text-base leading-8 text-slate-700">
                {author.bio.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="font-[Poppins] text-lg font-bold text-slate-950">
                  Editorial standards
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  KindJoe author profiles are written to clarify each byline&apos;s
                  coverage focus, editorial role, and reader contact path. Story
                  tips, corrections, and sourcing questions can be sent through
                  the contact channel listed above.
                </p>
              </div>
            </article>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-[Poppins] text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Coverage areas
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {author.beats.map((beat) => (
                    <span
                      key={beat}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      {beat}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-[Poppins] text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                  Background
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  {author.credentials.map((item) => (
                    <li key={item} className="border-l border-red-500 pl-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
