export type AuthorProfile = {
  slug: string;
  name: string;
  aliases?: string[];
  role: string;
  location: string;
  shortBio: string;
  bio: string[];
  beats: string[];
  credentials: string[];
  contactLabel: string;
};

export const AUTHOR_PROFILES: AuthorProfile[] = [
  {
    slug: "casey-hayes",
    name: "Casey Hayes",
    role: "Politics and Community Editor",
    location: "California",
    shortBio:
      "Casey Hayes covers politics, community impact, public safety, and the local angles behind national stories.",
    bio: [
      "Casey Hayes writes and edits coverage on political disputes, community concerns, and public safety stories. Casey's work is built around readable context and straightforward explanations for readers catching up quickly.",
      "The goal is to connect the headline to the people, rules, agencies, or public records that shape what happens next.",
    ],
    beats: ["Politics", "Community impact", "Public safety", "Local context"],
    credentials: [
      "Editor and writer for civic and community coverage",
      "Focus on public records, agency statements, and local impact",
      "Helps shape coverage for clarity and reader usefulness",
    ],
    contactLabel: "casey@kindjoe.com",
  },
  {
    slug: "dell-jay",
    name: "Dell Jay",
    aliases: ["dell jayy", "Dee Jay"],
    role: "News and Public Affairs Writer",
    location: "Los Angeles, California",
    shortBio:
      "Dell Jay covers fast-moving public affairs, political disputes, court filings, and the local context behind major national headlines.",
    bio: [
      "Dell Jay writes about the parts of the news cycle that need a little more context: what happened, what is confirmed, what is still disputed, and why readers are paying attention. His coverage focuses on public affairs, court documents, political pressure points, and accountability stories.",
      "Before writing for KindJoe, Dell worked across local news briefs, community explainers, and editorial research projects. His reporting style is direct, document-aware, and built for readers who want the key facts without the noise.",
    ],
    beats: ["Politics", "Courts", "Public affairs", "Accountability"],
    credentials: [
      "Background in local news briefs and editorial research",
      "Focus on court records, public statements, and source attribution",
      "Writes explainers for developing political and civic stories",
    ],
    contactLabel: "dell@kindjoe.com",
  },
  {
    slug: "beige-parker",
    name: "Beige Parker",
    aliases: ["Paige Parker"],
    role: "Culture and Community Reporter",
    location: "California",
    shortBio:
      "Beige Parker writes about culture, community stories, viral moments, education, lifestyle shifts, and the people behind the headline.",
    bio: [
      "Beige Parker covers the human side of the news: the people affected, the communities responding, and the cultural conversations that turn a local story into something much bigger. Her work often connects online attention to real-world impact.",
      "Beige has a background in community newsletters, arts coverage, and service-style reporting. She brings a reader-first approach to stories about families, schools, entertainment, and neighborhood life.",
    ],
    beats: ["Culture", "Community", "Education", "Lifestyle"],
    credentials: [
      "Experience with community and culture coverage",
      "Focus on human-interest reporting and reader service",
      "Tracks viral stories with local and social context",
    ],
    contactLabel: "beige@kindjoe.com",
  },
  {
    slug: "elena-sterling",
    name: "Elena Sterling",
    role: "Business, Tech, and Trends Contributor",
    location: "Southern California",
    shortBio:
      "Elena Sterling covers business decisions, technology platforms, consumer trends, and the money or incentives behind public stories.",
    bio: [
      "Elena Sterling writes about the systems behind the story: businesses, platforms, markets, and technology changes that shape what people see, buy, and debate. Her coverage aims to make complicated money and tech angles easier to understand.",
      "Before contributing to KindJoe, Elena worked on research briefs and trend reports covering media platforms, consumer behavior, and small business shifts. Her stories focus on clear context, practical stakes, and what may happen next.",
    ],
    beats: ["Business", "Technology", "Markets", "Consumer trends"],
    credentials: [
      "Background in trend research and newsletter editing",
      "Focus on accessible business and technology explainers",
      "Tracks platform, consumer, and market signals",
    ],
    contactLabel: "elena@kindjoe.com",
  },
  {
    slug: "jin-rokuda",
    name: "Jin Rokuda",
    role: "National News and Culture Writer",
    location: "California",
    shortBio:
      "Jin Rokuda covers national news, cultural moments, public reaction, and the online conversations shaping major stories.",
    bio: [
      "Jin Rokuda writes about the intersection of national news and public attention. His stories track how major events move through communities, media platforms, and everyday conversation.",
      "Jin's work focuses on clear timelines, useful context, and the difference between confirmed reporting and social-media speculation.",
    ],
    beats: ["National news", "Culture", "Media", "Online conversation"],
    credentials: [
      "Writer and editor for national and culture coverage",
      "Focus on timelines, context, and media reaction",
      "Tracks how stories develop across platforms",
    ],
    contactLabel: "jin@kindjoe.com",
  },
  {
    slug: "kristian-thorne",
    name: "Kristian Thorne",
    role: "Politics and Analysis Writer",
    location: "Southern California",
    shortBio:
      "Kristian Thorne writes about politics, policy fights, elections, and the arguments behind high-stakes public decisions.",
    bio: [
      "Kristian Thorne covers politics with an emphasis on analysis that remains grounded in reported facts. His stories explain the players, incentives, and consequences behind political decisions and public controversies.",
      "His work is designed for readers who want more than a headline but less than a policy paper: a clear account of what changed, who is affected, and why it matters.",
    ],
    beats: ["Politics", "Policy", "Elections", "Analysis"],
    credentials: [
      "Writer focused on politics and policy explainers",
      "Emphasis on neutral framing and practical stakes",
      "Regular contributor to KindJoe public-affairs coverage",
    ],
    contactLabel: "kristian@kindjoe.com",
  },
  {
    slug: "lana-j-yang",
    name: "Lana J. Yang",
    role: "Local News and Features Contributor",
    location: "California",
    shortBio:
      "Lana J. Yang covers local stories, public-interest features, community updates, and reader-focused explainers.",
    bio: [
      "Lana J. Yang contributes local and public-interest stories for KindJoe, often focusing on the details that help readers understand how a broader issue shows up in daily life.",
      "Her coverage blends concise reporting with service-oriented context, especially for community updates, neighborhood issues, and stories with practical reader takeaways.",
    ],
    beats: ["Local news", "Features", "Community", "Reader service"],
    credentials: [
      "Contributor to local and public-interest coverage",
      "Focus on community context and practical takeaways",
      "Writes reader-friendly explainers and features",
    ],
    contactLabel: "lana@kindjoe.com",
  },
];

export function getAuthorProfile(slug: string) {
  return AUTHOR_PROFILES.find((profile) => profile.slug === slug) ?? null;
}

export function authorNameToSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getAuthorProfileByName(name: string) {
  const normalized = name.trim().toLowerCase();

  return (
    AUTHOR_PROFILES.find(
      (profile) =>
        profile.name.trim().toLowerCase() === normalized ||
        profile.aliases?.some((alias) => alias.trim().toLowerCase() === normalized),
    ) ??
    getAuthorProfile(authorNameToSlug(name))
  );
}
