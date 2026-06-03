import Link from "next/link";
import { FileText, Mail, Shield, Sparkles } from "lucide-react";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

export function PublisherTrustBar() {
  return (
    <section
      className="relative z-20 -mt-6 mx-auto max-w-7xl px-4 sm:-mt-8 sm:px-6 md:-mt-10 lg:px-8"
      aria-label="Publisher information"
    >
      <div className="rounded-xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-xl shadow-slate-200/40 backdrop-blur-md sm:rounded-2xl sm:px-5 sm:py-5 md:flex md:items-center md:justify-between md:gap-8 md:px-7 md:py-6">
        <div className="flex gap-3 md:items-center md:gap-4">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-600/25 sm:flex md:h-11 md:w-11">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <p className="max-w-xl text-[13px] leading-relaxed text-slate-600 sm:text-sm md:text-[15px]">
            <span className="font-semibold text-slate-900">Kind Joe</span> publishes
            original reporting on kindjoe.com
            <span className="hidden sm:inline">
              {" "}
              — written and edited by our Ventura County newsroom team.
            </span>
            <span className="sm:hidden">.</span>
          </p>
        </div>
        <nav
          className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:mt-0 md:flex-wrap md:justify-end md:overflow-visible [&::-webkit-scrollbar]:hidden"
          aria-label="Publisher policies"
        >
          <Link
            href="/about"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700 sm:px-3.5 sm:py-2 md:text-sm"
          >
            <Shield className="h-3.5 w-3.5" aria-hidden />
            About
          </Link>
          <Link
            href="/editorial-policy"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700 sm:px-3.5 sm:py-2 md:text-sm"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Editorial
          </Link>
          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700 sm:px-3.5 sm:py-2 md:text-sm"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Contact
          </Link>
          <a
            href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
            className="hidden text-xs text-slate-500 hover:text-red-600 lg:inline"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>
        </nav>
      </div>
    </section>
  );
}
