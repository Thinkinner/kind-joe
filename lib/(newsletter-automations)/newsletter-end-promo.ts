import { publicSiteUrl } from "@/lib/site/public-site-url";

/** Always-on Kind Joe newsletter promo, shown after stories like a fixed ad unit. */
export const KINDJOE_NEWSLETTER_END_PROMO = {
  kicker: "Before you go...",
  headline: "Need a WFH Escape Hatch?",
  body: "Escape your kitchen island and dodge the 2:00 PM slump with LA’s best coffee spots, reliable Wi-Fi, and real outlets.",
  buttonLabel: "View the Top 5 LA Cafes",
  href: publicSiteUrl("/editors-picks-5-wfh-escape-hatch-cafes-in-la"),
  footer: "Fresh recommendations and editor picks coming soon.",
} as const;
