import Link from "next/link";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

export default function AdvertisePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <header className="mb-10 border-b border-slate-200 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
            Advertise
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            Reach the Kind Joe audience
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
            Kind Joe publishes daily stories and analysis across politics, tech,
            business, opinion, and Ventura County coverage. We offer direct
            sponsorship opportunities for brands that want premium, contextual
            placements in a policy-safe environment.
          </p>
        </header>

        <section className="mb-10 grid gap-6 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Audience
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              News-engaged readers looking for clear summaries and original
              perspective on current events, policy, markets, and local impact.
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Placement Types
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Homepage modules, in-article sponsorship placements, newsletter
              sponsorships, and category-level opportunities.
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Turnaround
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Initial review in 2-3 business days. Campaign start dates depend
              on inventory and creative approval timing.
            </p>
          </article>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Campaign process
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm leading-relaxed text-slate-600 md:text-base">
            <li>Share your goals, timing, and preferred placement type.</li>
            <li>Receive inventory options, pricing, and expected delivery.</li>
            <li>Submit creative assets for policy and quality review.</li>
            <li>Approve final setup and launch your campaign.</li>
            <li>Get completion reporting at campaign end.</li>
          </ol>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 p-6 md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Advertising standards
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-600 md:text-base">
            <li>
              Creatives must comply with applicable law and Google advertising
              policies.
            </li>
            <li>
              We do not run deceptive, malicious, or misleading ad experiences.
            </li>
            <li>
              We reserve the right to reject campaigns that conflict with
              editorial integrity or platform safety standards.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl bg-slate-900 p-6 text-white md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Start an advertising inquiry
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
            Email your company name, campaign objective, preferred dates, and
            budget range. Our team will reply with availability and package
            options.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={`mailto:${PUBLIC_CONTACT_EMAIL}?subject=Advertising%20Inquiry`}
              className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Email {PUBLIC_CONTACT_EMAIL}
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open contact page
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}