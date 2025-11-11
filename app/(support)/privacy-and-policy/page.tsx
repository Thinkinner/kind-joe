'use client'
import React from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

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
      <header className="border-b  bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 z-20">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Last updated: November 11, 2025</p>
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
                Please read these Terms of Service ("Terms") carefully before using our website, products, and services (collectively, the "Services"). By accessing or using the Services, you agree to be bound by these Terms.
              </p>
            </div>

            <Divider />

            {/* Sections */}
            <Section id="acceptance" title="1. Acceptance of Terms">
              By using the Services, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy. If you do not agree, you may not use the Services.
            </Section>

            <Section id="changes" title="2. Changes to Terms">
              We may update these Terms from time to time. We will post the updated Terms with a new "Last updated" date. Continued use of the Services after changes take effect constitutes acceptance of the updated Terms.
            </Section>

            <Section id="eligibility" title="3. Eligibility & Accounts">
              You must be at least the age of majority in your jurisdiction to use the Services. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
            </Section>

            <Section id="acceptable-use" title="4. Acceptable Use">
              You agree not to misuse the Services. Prohibited behavior includes, without limitation: violating laws; attempting to access non‑public areas; interfering with security; reverse engineering; transmitting malware; infringing the rights of others; and spamming.
            </Section>

            <Section id="payments" title="5. Payments & Billing">
              If your use involves fees, you authorize us (and our payment processor) to charge you for the Services. Prices may change with prior notice. You are responsible for applicable taxes.
            </Section>

            <Section id="refunds" title="6. Refunds & Cancellations">
              Unless stated otherwise in a separate agreement or required by law, all fees are non‑refundable. You may cancel at any time; cancellation takes effect at the end of your current billing period.
            </Section>

            <Section id="ip" title="7. Intellectual Property">
              We and our licensors own all rights, title, and interest in and to the Services, including software, designs, text, graphics, and logos. These are protected by intellectual property laws. No rights are granted except as expressly set out in these Terms.
            </Section>

            <Section id="user-content" title="8. User Content">
              You retain ownership of content you submit. You grant us a worldwide, non‑exclusive, royalty‑free license to host, store, reproduce, and display your content as needed to operate and improve the Services. You are responsible for your content and must have all necessary rights to share it.
            </Section>

            <Section id="third-parties" title="9. Third‑Party Services">
              The Services may link to or integrate with third‑party products or websites. We are not responsible for their content, policies, or practices. Use them at your own risk.
            </Section>

            <Section id="disclaimer" title="10. Disclaimers">
              THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON‑INFRINGEMENT. We do not warrant uninterrupted, error‑free, or secure operation.
            </Section>

            <Section id="limitation" title="11. Limitation of Liability">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE.
            </Section>

            <Section id="indemnification" title="12. Indemnification">
              You agree to indemnify and hold us harmless from any claims, losses, liabilities, damages, and expenses, including reasonable attorneys’ fees, arising from your use of the Services or violation of these Terms.
            </Section>

            <Section id="termination" title="13. Termination">
              We may suspend or terminate your access to the Services at any time, with or without cause or notice. Upon termination, your right to use the Services will immediately cease.
            </Section>

            <Section id="governing-law" title="14. Governing Law">
              These Terms are governed by the laws of your place of business or, if none is specified, our principal place of business, without regard to conflict‑of‑law principles.
            </Section>

            <Section id="privacy" title="15. Privacy">
              Your use of the Services is also governed by our Privacy Policy. Please review it to understand how we collect, use, and safeguard your information.
            </Section>

            <Section id="contact" title="16. Contact">
              If you have questions about these Terms, contact us at <a href="mailto:support@example.com" className="underline">support@example.com</a>.
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
                  <TOCLink href="#eligibility">Eligibility & Accounts</TOCLink>
                  <TOCLink href="#acceptable-use">Acceptable Use</TOCLink>
                  <TOCLink href="#payments">Payments & Billing</TOCLink>
                  <TOCLink href="#refunds">Refunds & Cancellations</TOCLink>
                  <TOCLink href="#ip">Intellectual Property</TOCLink>
                  <TOCLink href="#user-content">User Content</TOCLink>
                  <TOCLink href="#third-parties">Third‑Party Services</TOCLink>
                  <TOCLink href="#disclaimer">Disclaimers</TOCLink>
                  <TOCLink href="#limitation">Limitation of Liability</TOCLink>
                  <TOCLink href="#indemnification">Indemnification</TOCLink>
                  <TOCLink href="#termination">Termination</TOCLink>
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
                  <TOCLink href="#eligibility">Eligibility & Accounts</TOCLink>
                  <TOCLink href="#acceptable-use">Acceptable Use</TOCLink>
                  <TOCLink href="#payments">Payments & Billing</TOCLink>
                  <TOCLink href="#refunds">Refunds & Cancellations</TOCLink>
                  <TOCLink href="#ip">Intellectual Property</TOCLink>
                  <TOCLink href="#user-content">User Content</TOCLink>
                  <TOCLink href="#third-parties">Third‑Party Services</TOCLink>
                  <TOCLink href="#disclaimer">Disclaimers</TOCLink>
                  <TOCLink href="#limitation">Limitation of Liability</TOCLink>
                  <TOCLink href="#indemnification">Indemnification</TOCLink>
                  <TOCLink href="#termination">Termination</TOCLink>
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
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="text-gray-700">{children}</p>
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
