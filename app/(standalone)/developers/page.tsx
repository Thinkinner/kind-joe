import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { developerDocsNav } from "@/lib/developers/docs-nav";

export default function DevelopersHomePage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-32px_rgb(15_23_42/0.45)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Developer.KindJoe
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[2.5rem] sm:leading-tight">
          Build with KindJoe content APIs
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
          Use KindJoe APIs to fetch public stories, publish from partner apps like Hope, and
          integrate Ventura content on partner sites. This portal covers endpoint docs,
          integration guides, and release notes.
        </p>
        <div className="mt-5 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          Read APIs + server-to-server publish for partners
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {developerDocsNav.flatMap((section) =>
          section.items.map((item) => (
            <Card
              key={item.href}
              className="group gap-0 border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_35px_-28px_rgb(15_23_42/0.55)]"
            >
              <CardHeader className="gap-1 px-5 pt-5 pb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {section.title}
                </p>
                <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                <CardDescription className="leading-relaxed">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pt-0 pb-5">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-900 transition-colors group-hover:bg-slate-100"
                >
                  Open docs
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )),
        )}
      </section>
    </main>
  );
}
