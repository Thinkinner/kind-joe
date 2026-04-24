const FIRST_NAMES = [
  "Adrian",
  "Aiden",
  "Alec",
  "Amelia",
  "Ariana",
  "Avery",
  "Bianca",
  "Blake",
  "Caleb",
  "Camila",
  "Carter",
  "Charlotte",
  "Chloe",
  "Clara",
  "Cole",
  "Daisy",
  "Daniel",
  "Dylan",
  "Elena",
  "Elijah",
  "Elliot",
  "Emerson",
  "Emma",
  "Ethan",
  "Eva",
  "Gabriel",
  "Grace",
  "Hannah",
  "Harper",
  "Henry",
  "Isla",
  "Jasper",
  "Julian",
  "Kara",
  "Liam",
  "Lila",
  "Lucas",
  "Mason",
  "Maya",
  "Mia",
  "Natalie",
  "Noah",
  "Nora",
  "Oliver",
  "Owen",
  "Paige",
  "Quinn",
  "Reese",
  "Roman",
  "Sofia",
  "Theo",
  "Violet",
  "Wesley",
  "Zoe",
] as const;

const LAST_NAMES = [
  "Alvarez",
  "Bennett",
  "Brooks",
  "Campbell",
  "Castillo",
  "Coleman",
  "Collins",
  "Dawson",
  "Diaz",
  "Foster",
  "Garcia",
  "Graham",
  "Griffin",
  "Hall",
  "Harper",
  "Hayes",
  "Hughes",
  "Jenkins",
  "Kelly",
  "King",
  "Lane",
  "Lawson",
  "Lewis",
  "Lopez",
  "Marshall",
  "Martinez",
  "Mitchell",
  "Monroe",
  "Morgan",
  "Morris",
  "Nelson",
  "Ortiz",
  "Parker",
  "Patel",
  "Perry",
  "Price",
  "Ramirez",
  "Reed",
  "Rivera",
  "Roberts",
  "Rogers",
  "Scott",
  "Simmons",
  "Sullivan",
  "Taylor",
  "Turner",
  "Walker",
  "Ward",
  "Watson",
  "Wright",
] as const;

function normalizeWord(value: string): string {
  return value[0]?.toUpperCase() + value.slice(1).toLowerCase();
}

function fromDisplayName(seed: string): string | null {
  const cleaned = seed.trim().replace(/\s+/g, " ");
  const tokens = cleaned
    .split(" ")
    .map((token) => token.replace(/[^a-zA-Z'-]/g, ""))
    .filter(Boolean);
  if (tokens.length < 2) return null;
  return `${normalizeWord(tokens[0])} ${normalizeWord(tokens[tokens.length - 1])}`;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildAliasCandidate(seed: string, attempt: number): string {
  const score = hashSeed(`${seed}:${attempt}`);
  const first = FIRST_NAMES[score % FIRST_NAMES.length];
  const last = LAST_NAMES[((score >>> 3) + attempt * 7) % LAST_NAMES.length];
  const includeMiddleInitial = score % 6 === 0;
  if (!includeMiddleInitial) {
    return `${first} ${last}`;
  }
  const middleInitial = String.fromCharCode(65 + (score % 26));
  return `${first} ${middleInitial}. ${last}`;
}

export function buildUniqueAliasSuggestion(
  seed: string,
  used: string[],
  excludeName?: string,
): string {
  const baseFromName = fromDisplayName(seed);
  const blocked = new Set(
    used
      .concat(excludeName ? [excludeName] : [])
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  if (baseFromName && !blocked.has(baseFromName.toLowerCase())) {
    return baseFromName;
  }

  const generatorSeed = seed.trim() || `${Date.now()}`;
  for (let i = 0; i < 120; i += 1) {
    const candidate = buildAliasCandidate(generatorSeed, i);
    if (!blocked.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return buildAliasCandidate(`${generatorSeed}-${Math.random()}`, 0);
}
