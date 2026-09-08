export type JoesFriendsService = {
  slug: string;
  number: string;
  title: string;
  tagline: string;
  body: string;
  bullets: string[];
  /** Card colours on the home page services grid. */
  cardClassName: string;
};

export const JOES_FRIENDS_SERVICES: JoesFriendsService[] = [
  {
    slug: "manage-your-social",
    number: "01",
    title: "Manage Your Social",
    tagline: "Pages, calendar, captions — kept alive for you.",
    body: "We manage your pages, plan the content calendar, write captions and keep your brand consistently active.",
    bullets: [
      "Content calendar and planning",
      "Caption writing and posting",
      "Page management across platforms",
      "Consistent brand activity",
    ],
    cardClassName: "bg-jf-blue text-white",
  },
  {
    slug: "edit-and-create",
    number: "02",
    title: "Edit + Create",
    tagline: "Edit what you have — or create from scratch.",
    body: "Send us your videos and we’ll edit and post them. Don’t have footage? We can create original social content from scratch for your brand.",
    bullets: [
      "Video editing and packaging",
      "Original social content creation",
      "Platform-ready cuts",
      "Story and trend research",
    ],
    cardClassName: "bg-jf-red text-white",
  },
  {
    slug: "audio-podcast",
    number: "03",
    title: "Audio Podcast",
    tagline: "A channel people listen to — built around your brand.",
    body: "We build an audio-only podcast channel around your company’s personality, interests, expertise and audience — giving people another place to follow you and hear from your brand.",
    bullets: [
      "Channel concept and positioning",
      "Episode concepts and scripting",
      "Audio production with available voices",
      "Ongoing publishing and packaging",
    ],
    cardClassName: "bg-jf-blue-soft text-jf-ink",
  },
];

export function getJoesFriendsService(slug: string) {
  return JOES_FRIENDS_SERVICES.find((service) => service.slug === slug);
}
