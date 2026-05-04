'use client'
import React from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Skip link */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 z-20">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Last updated: March 31, 2026</p>
        </div>
      </header>

      {/* Main layout: content + right TOC */}
      <div id="content" className="mx-auto max-w-6xl px-6 py-10 text-[17px] md:text-[18px] lg:text-[19px] leading-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          {/* Primary content */}
          <section className="space-y-10">
            {/* Intro */}
            <div className="space-y-5">
              <p className="text-gray-700">
                Welcome to <strong>Kind Joe</strong> (<a className="underline" href="https://www.kindjoe.com" target="_blank" rel="noopener noreferrer">kindjoe.com</a>), a platform providing daily, unbiased news and related content (the “Services”). By accessing or using the Services, you agree to these Terms of Service (the “Terms”). If you do not agree, do not use the Services.
              </p>
            </div>

            <Divider />

            {/* Sections */}
            <Section id="acceptance" title="1. Acceptance of Terms">
              By using the Services, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy. These Terms apply to all visitors and users of the site.
            </Section>

            <Section id="changes" title="2. Changes to Terms">
              We may update these Terms from time to time. When we do, we will revise the “Last updated” date above. Your continued use of the Services after changes take effect constitutes acceptance of the updated Terms.
            </Section>

            <Section id="eligibility" title="3. Eligibility">
              The Services are intended for a general audience and are not directed to children under 18. By using the Services, you represent that you are at least 18 years old (or the age of majority in your jurisdiction).
            </Section>

            <Section id="acceptable-use" title="4. Acceptable Use">
              You agree not to misuse the Services. Prohibited behavior includes, without limitation: violating laws or regulations; attempting to access non-public areas; interfering with security or integrity of the site; reverse engineering; transmitting malware; infringing third-party rights; or engaging in spamming or abusive activities.
            </Section>

            <Section id="ip" title="5. Content & Intellectual Property">
              Kind Joe may curate, summarize, or present information drawn from publicly available sources (for example, news reporting, official releases, or other materials that are already public).{" "}
              Third-party names, marks, and materials remain the property of their respective owners.
              We and our licensors own rights in the selection, arrangement, presentation, original writing, design, software, branding, and other proprietary aspects of the Services, subject to those third-party rights. No rights are granted except as expressly set out in these Terms. You may not reproduce, distribute, or modify our content without prior written permission.
            </Section>

            <Section id="editorial" title="6. Editorial Independence & Corrections">
              Kind Joe strives to provide unbiased, accurate, and timely reporting. However, news evolves and information may change after publication. We do not guarantee completeness or accuracy, and content is provided for general informational purposes only. We may update, correct, or clarify articles as new information becomes available.
            </Section>

            <Section id="third-parties" title="7. Third-Party Links & Analytics">
              The Services may link to or integrate with third-party websites, tools, or analytics providers (e.g., Google Analytics). These third parties have their own terms and privacy practices. We are not responsible for their content, policies, or practices; use them at your own risk.
            </Section>

            <Section id="newsletter" title="8. Newsletter & Communications">
              If you subscribe to “Kind Joe Top Stories,” you consent to receive emails from us. You can unsubscribe at any time via the link in our emails. Email frequency may vary.
            </Section>

            <Section id="disclaimer" title="9. Disclaimers">
              THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not warrant uninterrupted, error-free, or secure operation, or that content is current or free of inaccuracies.
            </Section>

            <Section id="limitation" title="10. Limitation of Liability">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL KIND JOE OR ITS AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES.
            </Section>

            <Section id="indemnification" title="11. Indemnification">
              You agree to indemnify and hold Kind Joe harmless from any claims, losses, liabilities, damages, and expenses (including reasonable attorneys’ fees) arising from your use of the Services or violation of these Terms.
            </Section>

            <Section id="termination" title="12. Suspension or Termination">
              We may suspend or terminate access to the Services at any time, with or without cause or notice. Upon termination, your right to use the Services will immediately cease.
            </Section>

            <Section id="governing-law" title="13. Governing Law">
              These Terms are governed by the laws of the United States, without regard to its conflict-of-laws rules.
            </Section>

            <Section id="privacy" title="14. Privacy">
              Your use of the Services is also governed by our Privacy Policy, which explains how we collect, use, and protect personal information (including names, emails, ZIP codes, and news preferences) and our use of cookies and analytics.
            </Section>

            <Section id="contact" title="15. Contact">
              If you have questions about these Terms, contact us at{" "}
              <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="underline">{PUBLIC_CONTACT_EMAIL}</a>.
            </Section>
          </section>

          {/* Right sidebar TOC */}
          <aside className="lg:pl-6 lg:border-l border-gray-200 lg:sticky lg:top-20 lg:self-start h-fit">
            <div className="hidden lg:block">
              <h2 className="text-base font-medium text-gray-900 mb-3">On this page</h2>
              <nav aria-label="Table of contents" className="text-sm leading-6">
                <ul className="space-y-2 text-gray-700">
                  <TOCLink href="#acceptance">Acceptance of Terms</TOCLink>
                  <TOCLink href="#changes">Changes to Terms</TOCLink>
                  <TOCLink href="#eligibility">Eligibility</TOCLink>
                  <TOCLink href="#acceptable-use">Acceptable Use</TOCLink>
                  <TOCLink href="#ip">Content & IP</TOCLink>
                  <TOCLink href="#editorial">Editorial Independence</TOCLink>
                  <TOCLink href="#third-parties">Third-Party Links & Analytics</TOCLink>
                  <TOCLink href="#newsletter">Newsletter</TOCLink>
                  <TOCLink href="#disclaimer">Disclaimers</TOCLink>
                  <TOCLink href="#limitation">Limitation of Liability</TOCLink>
                  <TOCLink href="#indemnification">Indemnification</TOCLink>
                  <TOCLink href="#termination">Suspension/Termination</TOCLink>
                  <TOCLink href="#governing-law">Governing Law</TOCLink>
                  <TOCLink href="#privacy">Privacy</TOCLink>
                  <TOCLink href="#contact">Contact</TOCLink>
                </ul>
              </nav>
            </div>

            {/* Mobile TOC (collapsible) */}
            <details className="lg:hidden border-y py-4">
              <summary className="cursor-pointer text-base font-medium">Table of contents</summary>
              <nav aria-label="Table of contents" className="mt-3 text-sm leading-6">
                <ul className="space-y-2 text-gray-700">
                  <TOCLink href="#acceptance">Acceptance of Terms</TOCLink>
                  <TOCLink href="#changes">Changes to Terms</TOCLink>
                  <TOCLink href="#eligibility">Eligibility</TOCLink>
                  <TOCLink href="#acceptable-use">Acceptable Use</TOCLink>
                  <TOCLink href="#ip">Content & IP</TOCLink>
                  <TOCLink href="#editorial">Editorial Independence</TOCLink>
                  <TOCLink href="#third-parties">Third-Party Links & Analytics</TOCLink>
                  <TOCLink href="#newsletter">Newsletter</TOCLink>
                  <TOCLink href="#disclaimer">Disclaimers</TOCLink>
                  <TOCLink href="#limitation">Limitation of Liability</TOCLink>
                  <TOCLink href="#indemnification">Indemnification</TOCLink>
                  <TOCLink href="#termination">Suspension/Termination</TOCLink>
                  <TOCLink href="#governing-law">Governing Law</TOCLink>
                  <TOCLink href="#privacy">Privacy</TOCLink>
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

/**
 * Hook to smoothly scroll to an anchor using Framer Motion's `animate`.
 * Respects prefers-reduced-motion.
 */
function useSmoothScroll() {
  const prefersReducedMotion = useReducedMotion();

  return React.useCallback(
    (hash: string) => {
      if (!hash || !hash.startsWith("#")) return;
      const el = document.querySelector(hash) as HTMLElement | null;
      if (!el) return;

      const targetY = window.scrollY + el.getBoundingClientRect().top - 112; // matches scroll-mt-28 (7rem)

      if (prefersReducedMotion) {
        window.scrollTo({ top: targetY });
        return;
      }

      const controls = animate(window.scrollY, targetY, {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1], // expo-like ease
        onUpdate: (latest) => window.scrollTo(0, latest),
      });

      // Safety: stop if user interrupts with wheel/touch
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
    // keep href for accessibility, but prevent default jump
    e.preventDefault();
    smoothScroll(href);
    // Update hash without instant jump
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
