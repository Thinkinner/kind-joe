import Link from "next/link";

import { MARQUEE_ITEMS } from "./marquee-items";
import { JoesFriendsMarquee } from "./marquee";

const FOOTER_LINKS = [
  { href: "/joes-friends#services", label: "Services" },
  { href: "/joes-friends#system", label: "Proof" },
  { href: "/joes-friends#podcast", label: "Podcast" },
  { href: "/joes-friends/contact", label: "Book a Call" },
];

export function JoesFriendsFooter() {
  return (
    <footer className="border-t-4 border-jf-ink bg-jf-ink text-white">
      <div className="border-b border-white/20 bg-jf-red py-4 text-white">
        <JoesFriendsMarquee items={MARQUEE_ITEMS} speed={28} />
      </div>

      <div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-5 py-16 lg:flex-row lg:justify-between lg:px-8">
        <div>
          <p className="font-jf-display text-3xl uppercase">Joe&apos;s Friends</p>
          <p className="mt-2 font-jf-hand text-2xl text-jf-red">by Kind Joe</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            We run your social.
          </p>
        </div>

        <div className="flex flex-wrap gap-16">
          <div className="flex flex-col gap-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm uppercase tracking-wide text-white/70 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="mailto:hello@kindjoe.com"
              className="text-sm text-white/70 hover:text-white"
            >
              hello@kindjoe.com
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/70 hover:text-white"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15 px-5 py-5 lg:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Joe&apos;s Friends / Kind Joe</p>
          <p className="font-jf-hand text-base text-jf-red-soft">
            social media company
          </p>
        </div>
      </div>
    </footer>
  );
}
