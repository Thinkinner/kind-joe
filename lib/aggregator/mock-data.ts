import { Signal, Source, Category, type GeographicScope } from './types';

const SOURCES: Source[] = [
  'X',
  'Telegram',
  'Discord',
  'RSS',
  'Google News',
  'Apple Newsroom',
  'USGS Earthquakes',
];
export const CATEGORIES: Category[] = [
  "World",
  "Military",
  "Finance",
  "Environment",
  "Energy",
  "Tech",
  "Health",
  "Society",
];

const LOCATIONS = [
  { lat: 38.8951, lng: -77.0364, city: 'Washington D.C.', country: 'USA' },
  { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'USA' },
  { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', country: 'USA' },
  { lat: 41.8781, lng: -87.6298, city: 'Chicago', country: 'USA' },
  { lat: 29.7604, lng: -95.3698, city: 'Houston', country: 'USA' },
  { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK' },
  { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
  { lat: 55.7558, lng: 37.6173, city: 'Moscow', country: 'Russia' },
  { lat: 39.9042, lng: 116.4074, city: 'Beijing', country: 'China' },
  { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan' },
  { lat: 31.2304, lng: 121.4737, city: 'Shanghai', country: 'China' },
  { lat: 28.6139, lng: 77.2090, city: 'New Delhi', country: 'India' },
  { lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brazil' },
  { lat: 30.0444, lng: 31.2357, city: 'Cairo', country: 'Egypt' },
  { lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'Australia' },
  { lat: 50.4501, lng: 30.5234, city: 'Kyiv', country: 'Ukraine' },
  { lat: 31.7683, lng: 35.2137, city: 'Jerusalem', country: 'Israel' },
  { lat: 25.2048, lng: 55.2708, city: 'Dubai', country: 'UAE' },
  { lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'Singapore' },
];

export const COUNTRIES = Array.from(new Set(LOCATIONS.map(loc => loc.country))).sort();

export const POPULAR_TAGS = [
  "trump",
  "usa",
  "iran",
  "ice",
  "election",
  "economy",
  "crisis",
  "ai",
  "crypto",
  "fed",
  "nato",
  "china",
  "border",
  "ukraine",
  "eu",
  "opec",
  "energy",
  "defense",
  "cyber",
  "climate",
  "healthcare",
  "supply-chain",
  "tariffs",
  "sanctions",
  "semiconductors",
  "immigration",
  "trade",
  "rates",
  "inflation",
  "stocks",
  "mergers",
  "middle-east",
  "pacific",
  "nuclear",
  "humanitarian",
];

const HEADLINES = [
  "Major policy shift announced",
  "Unprecedented market volatility",
  "Major merger talks advance",
  "Quarterly earnings beat expectations",
  "New technological breakthrough",
  "Diplomatic talks stall",
  "Emergency response initiated",
  "Viral trend sparks debate",
  "Border tensions escalate",
  "Central bank adjusts rates",
  "Cybersecurity breach reported",
  "Natural disaster strikes region",
];

export function generateSignal(): Signal {
  const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const headline = HEADLINES[Math.floor(Math.random() * HEADLINES.length)];
  
  // Add some jitter to coordinates so they don't stack perfectly
  const lat = loc.lat + (Math.random() - 0.5) * 2;
  const lng = loc.lng + (Math.random() - 0.5) * 2;

  const tagCount = 10 + Math.floor(Math.random() * 11);
  const shuffledTags = [...POPULAR_TAGS].sort(() => 0.5 - Math.random());
  const tags = shuffledTags.slice(0, Math.min(tagCount, POPULAR_TAGS.length));

  const scopes: GeographicScope[] = [
    "local",
    "regional",
    "national",
    "global",
  ];
  const geographicScope = scopes[Math.floor(Math.random() * scopes.length)];
  const adminArea =
    geographicScope === "local"
      ? `${loc.city} metro`
      : geographicScope === "regional"
        ? loc.country === "USA"
          ? "Multi-state corridor"
          : `${loc.country} — regional`
        : "";

  return {
    id: Math.random().toString(36).substring(2, 9),
    headline: `${headline} in ${loc.city}`,
    summary: `AI Summary: Reports indicate significant developments regarding ${category.toLowerCase()} originating from ${loc.country}. Situation is developing.`,
    source,
    category,
    lat,
    lng,
    city: loc.city,
    country: loc.country,
    geographicScope,
    adminArea,
    impactScore: Math.floor(Math.random() * 100) + 1,
    timestamp: Date.now(),
    tags,
  };
}
