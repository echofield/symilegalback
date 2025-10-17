import fallbackLawyers from './data/lawyers.json';

export interface LawyerSuggestion {
  name: string;
  address?: string;
  rating?: number;
  lat?: number;
  lng?: number;
  phone?: string;
  placeId?: string;
}

interface GooglePlacesResult {
  name: string;
  formatted_address?: string;
  rating?: number;
  geometry?: { location?: { lat?: number; lng?: number } };
  place_id?: string;
  formatted_phone_number?: string;
}

const DEFAULT_LOCATION = { lat: 48.8566, lng: 2.3522 };

function normalise(text: string): string {
  return text.toLowerCase();
}

function scoreFallbackLawyer(entry: (typeof fallbackLawyers)[number], tokens: string[]): number {
  let score = 0;
  const specialties = entry.specialties?.map((s) => normalise(s)) ?? [];
  const name = normalise(entry.name);
  const address = normalise(entry.address || '');

  for (const token of tokens) {
    if (specialties.some((s) => s.includes(token))) score += 3;
    if (name.includes(token)) score += 2;
    if (address.includes(token)) score += 1;
  }

  return score;
}

function buildFallback(query: string): LawyerSuggestion[] {
  const tokens = normalise(query)
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean);

  const scored = fallbackLawyers.map((entry) => ({ entry, score: scoreFallbackLawyer(entry, tokens) }));
  const filtered = scored.filter(({ score }) => score > 0);
  const ranked = (filtered.length > 0 ? filtered : scored).sort(
    (a, b) => b.score - a.score || (b.entry.rating ?? 0) - (a.entry.rating ?? 0),
  );

  return ranked.slice(0, 8).map(({ entry }) => ({
    name: entry.name,
    address: entry.address,
    rating: entry.rating,
    lat: entry.lat,
    lng: entry.lng,
    phone: entry.phone,
  }));
}

export async function getNearbyLawyers(query: string, lat?: number, lng?: number): Promise<LawyerSuggestion[]> {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) return [];
  // Google Maps usage disabled per product decision. Always return curated fallback suggestions.
  return buildFallback(trimmedQuery);
}
