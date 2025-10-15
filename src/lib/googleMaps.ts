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

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return buildFallback(trimmedQuery);
  }

  const centreLat = typeof lat === 'number' ? lat : DEFAULT_LOCATION.lat;
  const centreLng = typeof lng === 'number' ? lng : DEFAULT_LOCATION.lng;
  const textQuery = encodeURIComponent(`${trimmedQuery} avocat`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${textQuery}&location=${centreLat},${centreLng}&radius=50000&key=${key}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return buildFallback(trimmedQuery);
    }
    const data = (await response.json()) as { results?: GooglePlacesResult[] };
    if (!Array.isArray(data.results) || data.results.length === 0) {
      return buildFallback(trimmedQuery);
    }

    return data.results.slice(0, 10).map((result) => ({
      name: result.name,
      address: result.formatted_address,
      rating: typeof result.rating === 'number' ? result.rating : undefined,
      lat: result.geometry?.location?.lat,
      lng: result.geometry?.location?.lng,
      placeId: result.place_id,
    }));
  } catch (error) {
    console.error('googleMaps:getNearbyLawyers', error);
    return buildFallback(trimmedQuery);
  }
}
