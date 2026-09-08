import type { Metadata } from "next";

import { JoesFriendsContactForm } from "@/components/joes-friends/contact-form";
import { FadeIn } from "@/components/joes-friends/fade-in";

export const metadata: Metadata = {
  title: { absolute: "Book a Call — Joe's Friends" },
  description:
    "Book a free call with Joe's Friends — social media company by Kind Joe.",
};

export default function JoesFriendsContactPage() {
  return (
    <div className="px-5 pb-24 pt-32 lg:px-8 lg:pb-32 lg:pt-40">
      <div className="mx-auto max-w-[1100px]">
        <FadeIn>
          <p className="font-jf-hand text-2xl text-jf-red">Book a free call</p>
          <h1 className="mt-3 max-w-3xl font-jf-display text-[clamp(2.5rem,7vw,5.5rem)] uppercase leading-[0.92]">
            Stop running your own content department.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-jf-muted">
            Tell us about your brand, your footage situation, and whether you
            want social, podcast, or both. We&apos;ll keep it simple.
          </p>
        </FadeIn>

        <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <div className="space-y-8">
              <div className="jf-stamp bg-jf-blue p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                  New Business
                </p>
                <a
                  href="mailto:newbusiness@kindjoe.com"
                  className="mt-2 block font-jf-display text-2xl uppercase"
                >
                  newbusiness@kindjoe.com
                </a>
              </div>

              <div className="jf-stamp bg-jf-red-soft p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-jf-muted">
                  Hello
                </p>
                <a
                  href="mailto:hello@kindjoe.com"
                  className="mt-2 block font-jf-display text-2xl uppercase"
                >
                  hello@kindjoe.com
                </a>
              </div>

              <p className="font-jf-hand text-2xl text-jf-blue">
                joe&apos;s friends are standing by
              </p>
            </div>
          </FadeIn>

          <FadeIn>
            <JoesFriendsContactForm />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
