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

export const NAV_LOCAL_LINKS: PublicNavLink[] = [
  { name: "L.A. News", href: "/la-news", title: "Los Angeles News" },
  { name: "Ventura County", href: "/ventura-county" },
  { name: "San Luis Obispo", href: "/san-luis-obispo" },
];

export const NAV_TOPIC_LINKS: PublicNavLink[] = [
  { name: "News", href: "/news", title: "Kindjoe News" },
  ...topicLinks,
];

/** Full public nav: home, local desks, topics, newsletter. */
export const PRIMARY_NAV_LINKS: PublicNavLink[] = [
  { name: "Home", href: "/" },
  ...NAV_LOCAL_LINKS,
  ...NAV_TOPIC_LINKS,
  { name: "Newsletter", href: "/newsletter" },
];

/** Topic pages — kept for callers that only want Politics/Tech/Business/Opinion. */
export const SECONDARY_TOPIC_LINKS: PublicNavLink[] = [...topicLinks];

export const FOOTER_EXPLORE_LINKS: PublicNavLink[] = [
  ...PRIMARY_NAV_LINKS.filter((link) => link.href !== "/"),
  { name: "Council Tea", href: "/council-tea" },
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
