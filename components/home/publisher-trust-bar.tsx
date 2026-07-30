import Link from "next/link";
import { FileText, Mail, Shield } from "lucide-react";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

export function PublisherTrustBar() {
  return (
    <section
      className="relative z-20 mx-auto w-full"
      aria-label="Publisher information"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-white/60 bg-white/90 px-4 py-4 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between md:gap-8">
        <p className="max-w-2xl text-[13px] leading-relaxed text-slate-600 sm:text-sm">
          <span className="font-semibold text-slate-900">Kind Joe</span> is an
          independent local newsroom covering Los Angeles, Ventura County, and
          San Luis Obispo.
        </p>
        <nav
          className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:justify-end md:overflow-visible [&::-webkit-scrollbar]:hidden"
          aria-label="Publisher policies"
        >
          <Link
            href="/about"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-900 hover:text-white sm:px-3.5 sm:py-2"
          >
            <Shield className="h-3.5 w-3.5" aria-hidden />
            About
          </Link>
          <Link
            href="/editorial-policy"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-900 hover:text-white sm:px-3.5 sm:py-2"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Editorial
          </Link>
          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-900 hover:text-white sm:px-3.5 sm:py-2"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Contact
          </Link>
          <a
            href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
            className="hidden items-center text-xs text-slate-400 transition-colors hover:text-slate-700 lg:inline-flex"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>
        </nav>
      </div>
    </section>
  );
}
