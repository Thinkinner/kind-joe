const CITY_MAP: Record<string, { lat: number; lng: number; country: string }> = {
  "London": { lat: 51.5074, lng: -0.1278, country: "UK" },
  "Washington": { lat: 38.8951, lng: -77.0364, country: "USA" },
  "Kyiv": { lat: 50.4501, lng: 30.5234, country: "Ukraine" },
  "Israel": { lat: 31.7683, lng: 35.2137, country: "Israel" },
  // Add more or use an AI API here later
};

export function getLocationFromText(text: string) {
  for (const city in CITY_MAP) {
    if (text.toLowerCase().includes(city.toLowerCase())) {
      return { city, ...CITY_MAP[city] };
    }
  }
  return { city: "Unknown", lat: 0, lng: 0, country: "Global" };
}