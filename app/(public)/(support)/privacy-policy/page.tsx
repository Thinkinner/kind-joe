'use client'
import React from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/legal/public-contact";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Privacy Policy</h1>
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
                This Privacy Policy explains how <strong>Kind Joe</strong> (<a className="underline" href="https://www.kindjoe.com" target="_blank" rel="noopener noreferrer">kindjoe.com</a>) collects, uses, and safeguards your information when you visit our site and when you subscribe to our newsletter (“Kind Joe Top Stories”). If you do not agree with this Policy, please do not use the Services.
              </p>
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 text-base">
                Our editorial content may reference or summarize publicly available information.{" "}
                <span className="font-medium">Content is curated and summarized from publicly available sources. This platform does not claim ownership of external sources.</span>{" "}
                For how we handle <em>your</em> personal data, see the sections below. See also our{" "}
                <a className="underline" href="/disclaimer">Disclaimer</a>.
              </p>
            </div>

            <Divider />

            {/* Sections */}
            <Section id="info-we-collect" title="1. Information We Collect">
              We collect the following information when you subscribe or interact with our site:
              <ul className="list-disc pl-6 mt-2">
                <li><span className="font-medium">Contact & preferences:</span> name, email address, ZIP code, and the types of news you prefer to receive.</li>
                <li><span className="font-medium">Usage data & cookies:</span> information about how you use our site, collected via cookies and analytics tools (e.g., page views, referrers, approximate location inferred from IP).</li>
              </ul>
            </Section>

            <Section id="how-we-use" title="2. How We Use Your Information">
              We use your information to:
              <ul className="list-disc pl-6 mt-2">
                <li>Send our newsletter and service communications you request.</li>
                <li>Personalize content and measure performance to improve the site.</li>
                <li>Respond to inquiries and provide support.</li>
                <li>Maintain the security and integrity of our Services.</li>
              </ul>
            </Section>

            <Section id="legal-bases" title="3. Legal Bases (Where Applicable)">
              Depending on your location, we may rely on one or more legal bases, such as your consent (e.g., to receive emails or for analytics cookies) and our legitimate interests to operate, secure, and improve the Services.
            </Section>

            <Section id="cookies" title="4. Cookies & Analytics">
              We use cookies and similar technologies:
              <ul className="list-disc pl-6 mt-2">
                <li><span className="font-medium">Essential:</span> required to operate the site.</li>
                <li><span className="font-medium">Analytics:</span> to understand usage and improve content (e.g., Google Analytics). Analytics providers process data on our behalf in accordance with their policies.</li>
              </ul>
              You can manage cookies in your browser settings. Some features may not function properly if certain cookies are disabled.
            </Section>

            <Section id="sharing" title="5. How We Share Information">
              We do <span className="font-medium">not sell</span> your personal data. We may share limited data with service providers (e.g., email delivery, analytics) who act on our instructions and are bound by confidentiality and data protection terms. We may also disclose information if required by law or to protect rights, safety, and security.
            </Section>

            <Section id="security" title="6. Data Security">
              We use reasonable technical and organizational measures to protect your information, including SSL (HTTPS) in transit and internal safeguards in our systems. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </Section>

            <Section id="retention" title="7. Data Retention">
              We retain personal information for as long as needed to provide the Services (e.g., to send you newsletters) and for legitimate business or legal purposes. If you unsubscribe, we will stop sending emails and may retain limited records as permitted by law (e.g., to honor your opt-out).
            </Section>

            <Section id="your-rights" title="8. Your Choices & Rights">
              <ul className="list-disc pl-6 mt-2">
                <li><span className="font-medium">Unsubscribe:</span> use the link in our emails to stop receiving newsletters.</li>
                <li><span className="font-medium">Cookies:</span> manage or block cookies via your browser settings.</li>
                <li><span className="font-medium">Access/Update/Delete:</span> you can request access to, correction of, or deletion of your personal information by contacting <a className="underline" href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>. We will respond in a reasonable time.</li>
              </ul>
            </Section>

            <Section id="children" title="9. Children’s Privacy">
              Our Services are intended for a general audience and are not directed to children under 18. We do not knowingly collect personal information from children under 18. If you believe a child has provided us data, contact us and we will take appropriate steps to remove it.
            </Section>

            <Section id="international" title="10. International Visitors">
              Our Services are operated in the United States. If you access the Services from outside the U.S., you understand that your information may be processed in the U.S., where laws may differ from those in your country.
            </Section>

            <Section id="changes" title="11. Changes to This Policy">
              We may update this Privacy Policy from time to time. When we do, we will revise the “Last updated” date above. Material changes will be highlighted on this page. Your continued use of the Services after changes take effect means you accept the updated Policy.
            </Section>

            <Section id="contact" title="12. Contact Us">
              <p>
                If you have questions or requests about this Privacy Policy, contact us at{" "}
                <a className="underline" href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>.
              </p>
              <p className="mt-4">
                If you are a content owner and want material reviewed or removed, contact us at{" "}
                <a className="underline" href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>.
              </p>
            </Section>

            <Section id="jurisdiction" title="13. Jurisdiction">
              This Privacy Policy is governed by the laws of the United States.
            </Section>
          </section>

          {/* Right sidebar TOC */}
          <aside className="lg:pl-6 lg:border-l border-gray-200 lg:sticky lg:top-20 lg:self-start h-fit">
            <div className="hidden lg:block">
              <h2 className="text-base font-medium text-gray-900 mb-3">On this page</h2>
              <nav aria-label="Table of contents" className="text-sm leading-6">
                <ul className="space-y-2 text-gray-700">
                  <TOCLink href="#info-we-collect">Information We Collect</TOCLink>
                  <TOCLink href="#how-we-use">How We Use Your Info</TOCLink>
                  <TOCLink href="#legal-bases">Legal Bases</TOCLink>
                  <TOCLink href="#cookies">Cookies & Analytics</TOCLink>
                  <TOCLink href="#sharing">How We Share</TOCLink>
                  <TOCLink href="#security">Data Security</TOCLink>
                  <TOCLink href="#retention">Data Retention</TOCLink>
                  <TOCLink href="#your-rights">Your Choices & Rights</TOCLink>
                  <TOCLink href="#children">Children’s Privacy</TOCLink>
                  <TOCLink href="#international">International Visitors</TOCLink>
                  <TOCLink href="#changes">Changes to This Policy</TOCLink>
                  <TOCLink href="#contact">Contact Us</TOCLink>
                  <TOCLink href="#jurisdiction">Jurisdiction</TOCLink>
                </ul>
              </nav>
            </div>

            {/* Mobile TOC (collapsible) */}
            <details className="lg:hidden border-y py-4">
              <summary className="cursor-pointer text-base font-medium">Table of contents</summary>
              <nav aria-label="Table of contents" className="mt-3 text-sm leading-6">
                <ul className="space-y-2 text-gray-700">
                  <TOCLink href="#info-we-collect">Information We Collect</TOCLink>
                  <TOCLink href="#how-we-use">How We Use Your Info</TOCLink>
                  <TOCLink href="#legal-bases">Legal Bases</TOCLink>
                  <TOCLink href="#cookies">Cookies & Analytics</TOCLink>
                  <TOCLink href="#sharing">How We Share</TOCLink>
                  <TOCLink href="#security">Data Security</TOCLink>
                  <TOCLink href="#retention">Data Retention</TOCLink>
                  <TOCLink href="#your-rights">Your Choices & Rights</TOCLink>
                  <TOCLink href="#children">Children’s Privacy</TOCLink>
                  <TOCLink href="#international">International Visitors</TOCLink>
                  <TOCLink href="#changes">Changes to This Policy</TOCLink>
                  <TOCLink href="#contact">Contact Us</TOCLink>
                  <TOCLink href="#jurisdiction">Jurisdiction</TOCLink>
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
      <div className="text-gray-700 text-base">{children}</div>
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
