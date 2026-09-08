import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FadeIn } from "@/components/joes-friends/fade-in";
import {
  JOES_FRIENDS_SERVICES,
  getJoesFriendsService,
} from "@/components/joes-friends/services";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return JOES_FRIENDS_SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getJoesFriendsService(slug);
  if (!service) return {};

  return {
    title: { absolute: `${service.title} — Joe's Friends` },
    description: service.body,
  };
}

export default async function JoesFriendsServicePage({
  params,
}: ServicePageProps) {
  const { slug } = await params;
  const service = getJoesFriendsService(slug);
  if (!service) notFound();

  const others = JOES_FRIENDS_SERVICES.filter((item) => item.slug !== slug);

  return (
    <div className="px-5 pb-24 pt-32 lg:px-8 lg:pb-32 lg:pt-40">
      <div className="mx-auto max-w-[1100px]">
        <FadeIn>
          <Link
            href="/joes-friends#services"
            className="text-sm font-bold uppercase tracking-wide text-jf-muted hover:text-jf-red"
          >
            ← All services
          </Link>
          <p className="mt-8 font-jf-hand text-2xl text-jf-blue">
            {service.number} / Service
          </p>
          <h1 className="mt-3 max-w-3xl font-jf-display text-[clamp(2.4rem,6vw,4.8rem)] uppercase leading-[0.92]">
            {service.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-jf-muted">
            {service.tagline}
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <FadeIn>
            <div className="jf-stamp bg-jf-surface p-8 sm:p-10">
              <h2 className="font-jf-display text-2xl uppercase">
                What&apos;s included
              </h2>
              <p className="mt-4 leading-relaxed text-jf-muted">
                {service.body}
              </p>
              <ul className="mt-8 space-y-4">
                {service.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span
                      className="mt-1 font-jf-hand text-xl leading-none text-jf-red"
                      aria-hidden
                    >
                      ✦
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="jf-stamp bg-jf-red p-8 text-white sm:p-10">
              <h2 className="font-jf-display text-2xl uppercase">Ready?</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                Book a free call and we&apos;ll map how{" "}
                {service.title.toLowerCase()} fits your social.
              </p>
              <Link
                href="/joes-friends/contact"
                className="mt-8 inline-flex border-4 border-white bg-jf-ink px-6 py-3 text-sm font-bold uppercase text-white"
              >
                Book a Call →
              </Link>
              <a
                href={`mailto:newbusiness@kindjoe.com?subject=${encodeURIComponent(
                  service.title,
                )}`}
                className="mt-4 block text-sm text-white/70 hover:text-white"
              >
                newbusiness@kindjoe.com
              </a>
            </div>
          </FadeIn>
        </div>

        <div className="mt-20">
          <p className="font-jf-hand text-2xl text-jf-blue">
            also on the machine
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {others.map((other) => (
              <Link
                key={other.slug}
                href={`/joes-friends/services/${other.slug}`}
                className="jf-stamp block bg-jf-blue-soft p-6 transition hover:-translate-y-0.5"
              >
                <h3 className="font-jf-display text-xl uppercase">
                  {other.title}
                </h3>
                <p className="mt-2 text-sm text-jf-muted">{other.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
