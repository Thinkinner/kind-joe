import Link from "next/link";

import { FadeIn } from "@/components/joes-friends/fade-in";
import { JoesFriendsHero } from "@/components/joes-friends/hero";
import { MARQUEE_ITEMS } from "@/components/joes-friends/marquee-items";
import { JoesFriendsMarquee } from "@/components/joes-friends/marquee";
import { JOES_FRIENDS_SERVICES } from "@/components/joes-friends/services";

const CASE_STUDY_STATS = [
  { value: "20M+", label: "Reels views" },
  { value: "10K", label: "Followers added" },
  { value: "20.4M", label: "Accounts reached" },
  { value: "1.5M", label: "Likes" },
];

const KIND_JOE_METRICS = [
  { value: "20.8M", label: "Plays" },
  { value: "223K", label: "Shares" },
  { value: "6M+", label: "YouTube views" },
  { value: "17K+", label: "Subs gained" },
];

const PODCAST_CARDS = [
  {
    title: "Your Interest Can Become The Show.",
    body: "You do not have to make every episode about your business. If you are a realtor who loves books, your podcast can be about books, ideas, authors and lessons — while your real estate business remains part of the world around the show.",
  },
  {
    title: "We Build The Audio For You.",
    body: "We can research topics, create episode concepts, write the audio and produce the show using our collection of available voices. No camera. No studio. No weekly recording requirement.",
  },
  {
    title: "Think Channel First.",
    body: "The real asset is not one episode. It is the channel. Over time, followers have somewhere to listen to your stories, interests and point of view. And because the audience is yours, you can also use the podcast to introduce your company, offers, events, services and anything else you want them to know about.",
  },
];

export default function JoesFriendsPage() {
  return (
    <>
      <JoesFriendsHero />

      <section className="border-y-4 border-jf-ink bg-jf-blue py-4 text-white">
        <JoesFriendsMarquee items={MARQUEE_ITEMS} speed={26} />
      </section>

      <section
        id="services"
        className="scroll-mt-24 border-y border-jf-line bg-jf-surface px-5 py-16 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-[1280px]">
          <FadeIn>
            <p className="font-jf-hand text-2xl text-jf-red">01 / Services</p>
            <h2 className="mt-3 max-w-4xl font-jf-display text-[clamp(2rem,5vw,3.8rem)] uppercase leading-[0.95]">
              Social media. That&apos;s the job.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-jf-muted">
              We&apos;re a social media company — not an agency. Narrow offer.
              Proven niche. Millions of views from Kind Joe already in the bag.
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {JOES_FRIENDS_SERVICES.map((service, index) => (
              <FadeIn key={service.slug} delay={index * 0.08}>
                <Link
                  href={`/joes-friends/services/${service.slug}`}
                  className={`group relative block h-full overflow-hidden border-4 border-jf-ink p-7 transition hover:-translate-y-1 hover:shadow-[8px_8px_0_#121212] ${service.cardClassName}`}
                >
                  <div className="jf-halftone absolute inset-0 opacity-20" />
                  <div className="relative">
                    <p className="font-jf-hand text-2xl opacity-90">
                      {service.number}
                    </p>
                    <h3 className="mt-3 font-jf-display text-3xl uppercase leading-none">
                      {service.title}
                    </h3>
                    <p className="mt-5 text-sm leading-relaxed opacity-90 sm:text-base">
                      {service.body}
                    </p>
                    <span className="mt-8 inline-block text-sm font-bold uppercase tracking-wide underline underline-offset-4">
                      Dig in →
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="system" className="scroll-mt-24 px-5 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1280px]">
          <FadeIn>
            <p className="font-jf-hand text-2xl text-jf-blue">02 / Proof</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <h2 className="font-jf-display text-[clamp(2rem,5vw,3.8rem)] uppercase leading-[0.95]">
                Case study / JKV
              </h2>
              <span className="-rotate-2 bg-jf-red px-3 py-1 font-jf-hand text-xl text-white shadow-[3px_3px_0_#121212]">
                Kind Joe
              </span>
              <span className="rotate-1 border-2 border-jf-ink bg-jf-surface px-3 py-1 font-jf-hand text-lg">
                Joe Knows Ventura
              </span>
            </div>
            <p className="mt-5 max-w-2xl text-lg text-jf-muted">
              Kind Joe’s Joe Knows Ventura page proves the model: local Ventura
              County crime news, community stories, and topics people already
              care about — packaged for the feed.
            </p>
          </FadeIn>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <FadeIn>
              <div className="jf-stamp h-full bg-jf-blue p-7 text-white sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">
                  Instagram Reels · 30 days
                </p>
                <h3 className="mt-4 font-jf-display text-3xl uppercase leading-tight sm:text-4xl">
                  Millions of views from a proven niche.
                </h3>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                  This is the niche. Local media energy on social. Not generic
                  brand posts — stories that get watched.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {CASE_STUDY_STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="border-2 border-white/30 bg-white/5 p-4"
                    >
                      <p className="font-jf-display text-3xl uppercase leading-none sm:text-4xl">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-jf-red-soft">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="flex h-full flex-col gap-5">
                <div className="jf-stamp bg-jf-red-soft p-6 sm:p-7">
                  <p className="font-jf-hand text-2xl text-jf-red">the niche</p>
                  <p className="mt-3 text-base leading-relaxed text-jf-ink/80">
                    Crime news. Community stories. Local topics Ventura County
                    already cares about — so the page stays worth following.
                  </p>
                </div>
                <div className="jf-stamp flex flex-1 flex-col justify-between bg-jf-surface p-6 sm:p-7">
                  <div>
                    <p className="font-jf-hand text-2xl text-jf-blue">
                      kind joe metrics
                    </p>
                    <div className="mt-4 space-y-3">
                      {KIND_JOE_METRICS.map((metric) => (
                        <div
                          key={metric.label}
                          className="flex items-baseline justify-between border-b-2 border-jf-ink/15 pb-2"
                        >
                          <span className="font-jf-display text-2xl uppercase sm:text-3xl">
                            {metric.value}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wide text-jf-muted">
                            {metric.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-6 font-jf-hand text-2xl text-jf-red">
                    hammer this home
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section
        id="podcast"
        className="scroll-mt-24 border-y-4 border-jf-ink bg-jf-blue px-5 py-16 text-white lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-[1280px]">
          <FadeIn>
            <p className="font-jf-hand text-2xl text-jf-red-soft">
              03 / Podcast
            </p>
            <h2 className="mt-3 max-w-4xl font-jf-display text-[clamp(2rem,5vw,3.6rem)] uppercase leading-[0.95]">
              Social first. Audio next.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-white/80">
              Same niche energy as the feed — an audio channel your audience can
              follow when they&apos;re not scrolling.
            </p>
          </FadeIn>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {PODCAST_CARDS.map((card, index) => (
              <FadeIn key={card.title} delay={index * 0.08}>
                <div className="h-full border-2 border-white/40 bg-white/5 p-5">
                  <h3 className="font-jf-display text-lg uppercase leading-tight">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/80">
                    {card.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-12 border-4 border-white bg-jf-red p-7 sm:p-9">
            <p className="font-jf-hand text-2xl text-jf-red-soft">ready?</p>
            <h3 className="mt-2 max-w-3xl font-jf-display text-[clamp(1.6rem,3.5vw,2.8rem)] uppercase leading-[0.95]">
              Stop running your own content department.
            </h3>
            <p className="mt-4 max-w-xl text-white/90">
              Social media company. Proven niche. Millions of views. Book a free
              call and we&apos;ll run yours.
            </p>
            <Link
              href="/joes-friends/contact"
              className="mt-7 inline-block border-4 border-white bg-jf-ink px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:-translate-y-0.5"
            >
              Book a Free Call →
            </Link>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
