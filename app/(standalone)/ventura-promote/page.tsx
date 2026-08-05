import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { VenturaBusinessInquiryForm } from "@/components/ventura/ventura-business-inquiry-form";
import { publicSiteUrl } from "@/lib/site/public-site-url";

export const metadata: Metadata = {
  title: "Promote Your Business • Joe Knows Ventura",
  description:
    "Are you a Ventura County business owner? Tell Joe Knows Ventura about your business and get in front of local readers.",
  alternates: { canonical: publicSiteUrl("/ventura-promote") },
};

export default function VenturaPromotePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#fffaf3] text-neutral-900">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 10% 0%, rgba(217,119,6,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 20%, rgba(180,83,9,0.12), transparent 50%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 text-center">
          <Link
            href="/ventura/posts"
            className="inline-flex items-center gap-2.5 rounded-full border border-orange-200/80 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur"
          >
            <Image
              src="/brand/ventura-profile.jpg"
              width={28}
              height={28}
              alt="Joe Knows Ventura"
              className="h-7 w-7 rounded-full object-cover"
            />
            <span className="text-sm font-semibold text-neutral-800">
              Joe Knows Ventura
            </span>
          </Link>

          <p className="mt-6 text-sm font-semibold tracking-wide text-[#D97706]">
            Local business promo
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
            Promote your business
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-600 sm:text-base">
            Are you a business owner and want to get in front of Ventura County
            readers? Share your details and we&apos;ll follow up.
          </p>
        </div>

        <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_20px_50px_-28px_rgba(120,53,15,0.35)] sm:p-7">
          <VenturaBusinessInquiryForm source="ventura_promote_page" />
        </section>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Back to{" "}
          <Link
            href="/ventura/posts"
            className="font-semibold text-[#D97706] underline-offset-2 hover:underline"
          >
            Ventura posts
          </Link>
        </p>
      </div>
    </main>
  );
}
