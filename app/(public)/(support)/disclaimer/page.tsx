'use client'
import React from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>

      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 z-20">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Disclaimer</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Last updated: March 31, 2026</p>
        </div>
      </header>

      <div id="content" className="mx-auto max-w-6xl px-6 py-10 text-[17px] md:text-[18px] lg:text-[19px] leading-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          <section className="space-y-10">
            <div
              className="rounded-xl border border-gray-200 bg-gray-50 p-5 md:p-6 text-gray-800 shadow-sm"
              role="note"
            >
              <p className="text-base md:text-lg font-medium text-gray-900 leading-relaxed">
                Content is curated and summarized from publicly available sources. This platform does not claim ownership of external sources.
              </p>
            </div>

            <div className="space-y-5">
              <p className="text-gray-700">
                This Disclaimer explains important limits on how you should use <strong>Kind Joe</strong> (
                <a className="underline" href="https://www.kindjoe.com" target="_blank" rel="noopener noreferrer">
                  kindjoe.com
                </a>
                ) and how we present information. It works together with our{" "}
                <a className="underline" href="/terms-of-service">Terms of Service</a> and{" "}
                <a className="underline" href="/privacy-policy">Privacy Policy</a>.
              </p>
            </div>

            <Divider />

            <Section id="sources" title="1. Sources & curation">
              We may organize, summarize, excerpt, or link to information from newspapers, broadcasters, government releases, and other public materials. Presentation on Kind Joe does not imply endorsement of any third party, and we do not represent that we control or own third-party content. Where we provide links, you are subject to the destination site&apos;s own terms and policies.
            </Section>

            <Section id="informational" title="2. Informational use only">
              Content on the Services is for general information and discussion. It is not legal, financial, medical, or other professional advice. You should consult a qualified professional before relying on any information for decisions that could affect your health, finances, or legal rights.
            </Section>

            <Section id="accuracy" title="3. Accuracy & timeliness">
              Public information changes. We strive for care and clarity but do not warrant that content is complete, current, or error-free. See our{" "}
              <a className="underline" href="/terms-of-service#disclaimer">Terms of Service (Disclaimers)</a>{" "}
              for additional legal limitations.
            </Section>

            <Section id="takedown" title="4. Content owners">
              If you are a content owner and want material reviewed or removed, contact us at{" "}
              <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="underline">{PUBLIC_CONTACT_EMAIL}</a>.
            </Section>

            <Section id="contact" title="5. Contact">
              Other questions about this Disclaimer:{" "}
              <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="underline">{PUBLIC_CONTACT_EMAIL}</a>.
            </Section>
          </section>

          <aside className="lg:pl-6 lg:border-l border-gray-200 lg:sticky lg:top-20 lg:self-start h-fit">
            <div className="hidden lg:block">
              <h2 className="text-base font-medium text-gray-900 mb-3">On this page</h2>
              <nav aria-label="Table of contents" className="text-sm leading-6">
                <ul className="space-y-2 text-gray-700">
                  <TOCLink href="#sources">Sources & curation</TOCLink>
                  <TOCLink href="#informational">Informational use</TOCLink>
                  <TOCLink href="#accuracy">Accuracy & timeliness</TOCLink>
                  <TOCLink href="#takedown">Content owners</TOCLink>
                  <TOCLink href="#contact">Contact</TOCLink>
                </ul>
              </nav>
            </div>

            <details className="lg:hidden border-y py-4">
              <summary className="cursor-pointer text-base font-medium">Table of contents</summary>
              <nav aria-label="Table of contents" className="mt-3 text-sm leading-6">
                <ul className="space-y-2 text-gray-700">
                  <TOCLink href="#sources">Sources & curation</TOCLink>
                  <TOCLink href="#informational">Informational use</TOCLink>
                  <TOCLink href="#accuracy">Accuracy & timeliness</TOCLink>
                  <TOCLink href="#takedown">Content owners</TOCLink>
                  <TOCLink href="#contact">Contact</TOCLink>
                </ul>
              </nav>
            </details>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 space-y-3">
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-gray-700 text-base">{children}</p>
    </section>
  );
}

function Divider() {
  return <hr className="border-gray-200 my-4" />;
}

function useSmoothScroll() {
  const prefersReducedMotion = useReducedMotion();

  return React.useCallback(
    (hash: string) => {
      if (!hash || !hash.startsWith("#")) return;
      const el = document.querySelector(hash) as HTMLElement | null;
      if (!el) return;

      const targetY = window.scrollY + el.getBoundingClientRect().top - 112;

      if (prefersReducedMotion) {
        window.scrollTo({ top: targetY });
        return;
      }

      const controls = animate(window.scrollY, targetY, {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (latest) => window.scrollTo(0, latest),
      });

      const stopOnUserScroll = () => controls.stop();
      window.addEventListener("wheel", stopOnUserScroll, { passive: true, once: true });
      window.addEventListener("touchstart", stopOnUserScroll, { passive: true, once: true });
    },
    [prefersReducedMotion]
  );
}

function TOCLink({ href, children }: { href: string; children: React.ReactNode }) {
  const smoothScroll = useSmoothScroll();

  const onClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    smoothScroll(href);
    history.pushState(null, "", href);
  };

  return (
    <li>
      <motion.a
        href={href}
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        whileHover={{ x: 2 }}
        className="inline-block hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-md"
      >
        {children}
      </motion.a>
    </li>
  );
}
