import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { CouncilTeaEmbed } from "@/components/ventura-county/council-tea-embed";

export const metadata: Metadata = {
  title: "Council Tea — Ventura County Meeting Q&A",
  description:
    "Ask questions about Ventura County council and planning meetings. Council Tea answers from saved meeting transcripts and summaries.",
  openGraph: {
    title: "Council Tea — Ventura County Meeting Q&A",
    description:
      "Ask questions about Ventura County council and planning meetings.",
    type: "website",
  },
};

export default function CouncilTeaPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <Link
          href="/ventura-county"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ventura County
        </Link>

        <header className="mb-8 border-b border-orange-100 pb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-600">
            <MessageCircle className="h-3.5 w-3.5" />
            Ventura County
          </div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900 font-[Poppins] sm:text-4xl">
            Council <span className="text-orange-600">Tea</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-neutral-600">
            Ask a question about local council or planning meetings. Answers
            are drawn from saved transcripts and summaries for cities across
            Ventura County.
          </p>
        </header>

        <CouncilTeaEmbed variant="page" title="Council Tea" />

        <p className="mt-6 text-center text-xs text-neutral-400">
          Currently available for Simi Valley and Ventura County. More cities
          coming soon.
        </p>
      </main>
    </div>
  );
}
