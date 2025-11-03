// src/lib/fixtures/articles.ts
export const sampleArticles = [
  {
    id: "art_ai_future",
    slug: "the-future-of-ai-in-2025",
    title: "The Future of AI in 2025: Big Tech's Massive Investments and Regulatory Shifts",
    excerpt:
      "As AI spending accelerates among tech giants, new frameworks and innovations promise to reshape industries, but bubble fears loom large.",
    authorId: "usr_henry",
    coverImage: {
      src: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
      alt: "AI concept illustration",
      width: 1600,
      height: 900,
    },
    isDraft: false,
    publishedAt: new Date("2025-10-31T10:00:00Z"),
    readingMinutes: 6,
    seo: {
      title: "The Future of AI in 2025",
      description:
        "Exploring Big Tech's AI investments, emerging trends like autonomous agents, and policy developments in the US.",
    },
    blocks: [
      { type: "heading", level: 2, text: "A Year of Explosive AI Investment" },
      {
        type: "paragraph",
        text: "Tech giants like Meta, Google, and Microsoft are ramping up AI infrastructure spending, with Meta's Mark Zuckerberg emphasizing preparation for superintelligence amid a potential generational shift.",
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc",
        alt: "AI data center",
        caption: "Massive data centers fuel the AI boom across the US.",
      },
      {
        type: "paragraph",
        text: "Microsoft has secured $400 billion in future sales contracts, including $250 billion in computing power for OpenAI, signaling a pivot to in-house AI models.",
      },
      { type: "heading", level: 3, text: "Trends and Regulatory Horizons" },
      {
        type: "quote",
        text: "In 2025, AI will evolve from a tool to an integral part of work and home life, with agents gaining greater autonomy.",
        cite: "Microsoft AI Trends Report",
      },
      {
        type: "paragraph",
        text: "Key trends include advanced reasoning models for science and coding, while Sen. Ted Cruz's SANDBOX Act proposes regulatory sandboxes to foster innovation, though critics warn of risks from lax oversight.",
      },
    ],
  },
  {
    id: "art_space_exploration",
    slug: "private-space-race-2025",
    title: "The Private Space Race Intensifies: US-China Rivalry and Blue Origin's Breakthrough",
    excerpt:
      "With Blue Origin's New Glenn launch and escalating US-China competition, private firms are driving a new era of orbital access.",
    authorId: "usr_henry",
    coverImage: {
      src: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa",
      alt: "Rocket launch",
      width: 1600,
      height: 900,
    },
    isDraft: false,
    publishedAt: new Date("2025-10-25T12:00:00Z"),
    readingMinutes: 5,
    seo: {
      title: "Private Space Race Heats Up in 2025",
      description:
        "From SpaceX milestones to geopolitical tensions, commercial space exploration accelerates amid global rivalries.",
    },
    blocks: [
      {
        type: "paragraph",
        text: "Blue Origin's successful New Glenn rocket launch from Cape Canaveral marks a pivotal moment, challenging SpaceX's dominance in reusable tech.",
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564",
        alt: "Rocket in flight",
        caption: "New Glenn's debut boosts US private launch capabilities.",
      },
      {
        type: "paragraph",
        text: "The US-China space race escalates, with China's Long March-10 test and US Space Force launches highlighting stakes in lunar ambitions and orbital control.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "SpaceX Starship's booster catch success in Flight 8",
          "NASA's reliance on private partners amid Artemis delays",
          "Emerging investments in space infrastructure",
        ],
      },
    ],
  },
  {
    id: "art_climate_data",
    slug: "climate-data-breakthroughs",
    title: "Climate Data Breakthroughs: Vital Signs Crash Amid Urgent Calls for Action",
    excerpt:
      "New reports reveal accelerating sea-level rise and wildfires, while data-driven solutions push for carbon removal and real-time analytics.",
    authorId: "usr_henry",
    coverImage: {
      src: "https://images.unsplash.com/photo-1502303756785-2a0b1a0d5c2c",
      alt: "Earth from space",
      width: 1600,
      height: 900,
    },
    isDraft: false,
    publishedAt: new Date("2025-10-30T09:00:00Z"),
    readingMinutes: 7,
    seo: {
      title: "Climate Data Breakthroughs 2025",
      description:
        "Satellite-confirmed predictions and emerging tech highlight the need for scaled-up climate solutions in the US.",
    },
    blocks: [
      {
        type: "heading",
        level: 2,
        text: "Vital Signs in Crisis: 2025 Report Highlights" },
      {
        type: "paragraph",
        text: "The 2025 State of the Climate Report warns of crashing planetary vital signs, with deadly US floods and wildfires linked to atmospheric warming.",
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
        alt: "Wildfire smoke",
      },
      {
        type: "paragraph",
        text: "Satellite data confirms 1990s sea-level predictions were accurate, but ice sheet melt exceeds forecasts, urging investments in natural carbon solutions like forests.",
      },
      {
        type: "quote",
        text: "We can’t fix the climate by technology alone; we have to rethink the way we live.",
        cite: "2025 State of the Climate Report",
      },
    ],
  },
  {
    id: "art_tech_policy",
    slug: "new-tech-policy-framework",
    title: "US Tech Policy Shifts: AI Sandboxes and Privacy Wins in California",
    excerpt:
      "From federal AI deregulation to state-level deepfake protections, 2025 sees a patchwork of frameworks balancing innovation and safeguards.",
    authorId: "usr_henry",
    coverImage: {
      src: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620",
      alt: "Capitol building",
      width: 1600,
      height: 900,
    },
    isDraft: false,
    publishedAt: new Date("2025-10-20T10:00:00Z"),
    readingMinutes: 6,
    seo: {
      title: "New US Tech Policy Frameworks 2025",
      description:
        "Congressional AI bills, executive rollbacks, and California's AI Act signal evolving rules for tech accountability.",
    },
    blocks: [
      {
        type: "paragraph",
        text: "Sen. Ted Cruz's SANDBOX Act proposes AI regulatory sandboxes for two-year exemptions, aiming to boost US leadership but drawing civil society concerns over risks.",
      },
      {
        type: "quote",
        text: "Regulatory sandboxes could enable broad innovation, but must not sideline protections.",
        cite: "Tech Advocacy Groups",
      },
      {
        type: "paragraph",
        text: "California Gov. Newsom signed bills on AI transparency and deepfakes, including the Content Origin Protection Act, amid federal shutdowns stalling oversight.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Rollback of Biden-era cybersecurity frameworks",
          "New NIST AI workforce standards",
          "Increased lobbying by Big Tech firms",
        ],
      },
    ],
  },
  {
    id: "art_green_energy",
    slug: "green-energy-innovations",
    title: "Green Energy Boom: Renewables Surpass Coal Despite Policy Headwinds",
    excerpt:
      "Solar and wind lead a renewable surge, overtaking coal generation, as states sue over slashed federal clean energy funds.",
    authorId: "usr_henry",
    coverImage: {
      src: "https://images.unsplash.com/photo-1509395176047-4a66953fd231",
      alt: "Solar panels in desert",
      width: 1600,
      height: 900,
    },
    isDraft: false,
    publishedAt: new Date("2025-10-25T08:00:00Z"),
    readingMinutes: 5,
    seo: {
      title: "Green Energy Innovations 2025",
      description:
        "US renewables hit record highs with solar PV driving 80% of growth, amid battles over subsidies and infrastructure.",
    },
    blocks: [
      {
        type: "heading",
        level: 2,
        text: "Renewables Overtake Coal for the First Time" },
      {
        type: "paragraph",
        text: "Global renewables produced more electricity than coal in early 2025, with US solar up 31% and wind 7.7%, outpacing demand growth.",
      },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-1509395176047-4a66953fd231",
        alt: "Wind farm",
        caption: "Offshore wind expands rapidly in US coastal states.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "DOE's FY25 budget boosts Energy Earthshots for hydrogen and carbon removal",
          "States sue Trump admin over $7B solar funding cuts",
          "Innovations in zeolite catalysts for efficient energy production",
        ],
      },
      {
        type: "paragraph",
        text: "Despite federal subsidy challenges, private investments race ahead, with IEA calling for grid upgrades to sustain the boom.",
      },
    ],
  },
];