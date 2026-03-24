export type Source = "X" | "Telegram" | "Discord" | "RSS";
export type Category =
  | "Geopolitics"
  | "Conflicts & Wars"
  | "Economy & Markets"
  | "Tech & Science"
  | "Disasters & Emergencies"
  | "Viral / Social";

export interface Signal {
  id: string;
  headline: string;
  summary: string;
  source: Source;
  category: Category;
  lat: number;
  lng: number;
  city: string;
  country: string;
  impactScore: number; // 1-100
  timestamp: number;
  tags: string[];
}
