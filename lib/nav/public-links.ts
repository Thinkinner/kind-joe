import { TOPIC_LABELS, TOPIC_SLUGS } from "@/lib/content/topics";

export type PublicNavLink = {
  name: string;
  href: string;
  title?: string;
};

const topicLinks: PublicNavLink[] = TOPIC_SLUGS.map((topic) => ({
  name: TOPIC_LABELS[topic],
  href: `/${topic}`,
}));

/** Primary header — local coverage first. */
export const PRIMARY_NAV_LINKS: PublicNavLink[] = [
  { name: "Home", href: "/" },
  { name: "L.A. News", href: "/la-news", title: "Los Angeles News" },
  { name: "Ventura County", href: "/ventura-county" },
  { name: "San Luis Obispo", href: "/san-luis-obispo" },
  { name: "Newsletter", href: "/newsletter" },
];

/** Topic pages — footer / secondary explore only. */
export const SECONDARY_TOPIC_LINKS: PublicNavLink[] = [
  ...topicLinks,
  { name: "News", href: "/news", title: "Kind Joe News" },
];

export const FOOTER_EXPLORE_LINKS: PublicNavLink[] = [
  ...PRIMARY_NAV_LINKS.filter((link) => link.href !== "/" && link.href !== "/newsletter"),
  ...SECONDARY_TOPIC_LINKS,
  { name: "Council Tea", href: "/council-tea" },
  { name: "Newsletter", href: "/newsletter" },
];

export const FOOTER_CONNECT_LINKS: PublicNavLink[] = [
  { name: "Authors", href: "/authors" },
  { name: "Search", href: "/search" },
  { name: "Contact Us", href: "/contact" },
  { name: "Advertise", href: "/advertise" },
  { name: "About", href: "/about" },
];

export const FOOTER_LEGAL_LINKS: PublicNavLink[] = [
  { name: "Terms of Use", href: "/terms-of-service" },
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Disclaimer", href: "/disclaimer" },
  { name: "Editorial Policy", href: "/editorial-policy" },
];
