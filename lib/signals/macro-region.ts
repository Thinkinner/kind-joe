/** Broad world region for map labels (signals only store city + country). */
const COUNTRY_TO_REGION: Record<string, string> = {
  USA: "North America",
  Canada: "North America",
  Mexico: "North America",
  Brazil: "South America",
  Argentina: "South America",
  Chile: "South America",
  Colombia: "South America",
  Venezuela: "South America",
  Peru: "South America",
  UK: "Europe",
  "United Kingdom": "Europe",
  France: "Europe",
  Germany: "Europe",
  Italy: "Europe",
  Spain: "Europe",
  Poland: "Europe",
  Ukraine: "Europe",
  Russia: "Europe / Asia",
  "Russian Federation": "Europe / Asia",
  China: "East Asia",
  Japan: "East Asia",
  "South Korea": "East Asia",
  "North Korea": "East Asia",
  Taiwan: "East Asia",
  India: "South Asia",
  Pakistan: "South Asia",
  Bangladesh: "South Asia",
  Afghanistan: "South Asia",
  Iran: "Middle East",
  Iraq: "Middle East",
  Israel: "Middle East",
  "Saudi Arabia": "Middle East",
  UAE: "Middle East",
  Turkey: "Middle East / Europe",
  Egypt: "Africa",
  Nigeria: "Africa",
  "South Africa": "Africa",
  Kenya: "Africa",
  Ethiopia: "Africa",
  Australia: "Oceania",
  "New Zealand": "Oceania",
  Philippines: "Southeast Asia",
  Vietnam: "Southeast Asia",
  Thailand: "Southeast Asia",
  Indonesia: "Southeast Asia",
  Malaysia: "Southeast Asia",
  Singapore: "Southeast Asia",
  "Global/Multiple": "Worldwide",
  Multiple: "Worldwide",
};

export function macroRegionForCountry(country: string): string {
  const k = country.trim();
  if (!k) return "—";
  if (COUNTRY_TO_REGION[k]) return COUNTRY_TO_REGION[k];
  const up = k.toUpperCase();
  if (COUNTRY_TO_REGION[up]) return COUNTRY_TO_REGION[up];
  for (const [name, region] of Object.entries(COUNTRY_TO_REGION)) {
    if (k.toLowerCase() === name.toLowerCase()) return region;
  }
  return "International";
}

export function formatLatLng(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${ns}  ${Math.abs(lng).toFixed(3)}°${ew}`;
}
