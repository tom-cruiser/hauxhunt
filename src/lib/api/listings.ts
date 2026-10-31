import type { MockListing } from "@/data/hero-search-demo";
import { api } from "@/lib/api/client";
import type { ParsedFilter, PropertyPreview } from "@/types";

export type ApiListing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  country: "RW" | "NG" | "KE";
  city: string | null;
  neighbourhood: string | null;
  type: string;
  purpose: "rent" | "sale";
  priceUsd: number;
  viewingFeeRwf: number;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  furnished: boolean;
  amenities: string[];
  verified: boolean;
  boosted: boolean;
  photos: { url: string; thumbnailUrl?: string | null }[];
  coordinates: { latitude: number; longitude: number } | null;
};

type Page<T> = { data: T[]; meta: { total: number; totalPages: number } };

type SearchResponse = {
  parsedFilters: ParsedFilter[];
  data: {
    listing: ApiListing;
    matchPercentage: number;
    whyItMatches: string;
  }[];
};

const TYPE_LABELS: Record<string, string> = {
  house: "House",
  beach_front_apartment: "Beach Front Apartments",
  apartment: "Apartment",
  duplex: "Duplex",
  single_room: "Single room",
  penthouse: "Penthouse",
  shared_apartment: "Shared apartment",
  studio_apartment: "Studio apartment",
  mansion: "Mansion",
  hotel: "Hotel",
  villa: "Villa",
};

/** The UI addresses listings by slug, so `id` stays the slug and `apiId` is the record. */
export function toListing(listing: ApiListing): MockListing {
  return {
    id: listing.slug,
    apiId: listing.id,
    title: listing.title,
    location: listing.location,
    matchLocations: [listing.city, listing.neighbourhood].flatMap((place) =>
      place ? [place.toLowerCase()] : [],
    ),
    currency: "USD",
    price: listing.priceUsd,
    purpose: listing.purpose,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    areaM2: listing.areaM2,
    furnished: listing.furnished,
    description: listing.description,
    typeLabel: TYPE_LABELS[listing.type] ?? "House",
    amenities: listing.amenities,
    verified: listing.verified,
    viewingFeeRwf: listing.viewingFeeRwf,
    coordinates: listing.coordinates,
  };
}

function toPreview(
  listing: ApiListing,
  matchPercentage: number,
  whyItMatches: string,
): PropertyPreview {
  return {
    id: listing.slug,
    title: listing.title,
    location: listing.location,
    currency: "USD",
    price: listing.priceUsd,
    purpose: listing.purpose,
    bedrooms: listing.bedrooms,
    amenities: listing.amenities,
    verified: listing.verified,
    matchPercentage,
    whyItMatches,
  };
}

async function fetchLivePage() {
  return api<Page<ApiListing>>("/listings", {
    query: { pageSize: 100 },
    cache: "no-store",
  });
}

export async function fetchListings() {
  const { data } = await fetchLivePage();
  return data.map(toListing);
}

export async function fetchPreviews() {
  const { data } = await fetchLivePage();
  return data.map((listing) =>
    toPreview(
      listing,
      72,
      "A verified, well-reviewed listing in your launch market.",
    ),
  );
}

export async function fetchListing(idOrSlug: string) {
  return toListing(
    await api<ApiListing>(`/listings/${encodeURIComponent(idOrSlug)}`, {
      cache: "no-store",
    }),
  );
}

export async function searchListings(query: string) {
  const { parsedFilters, data } = await api<SearchResponse>("/search", {
    query: { q: query, pageSize: 100 },
    cache: "no-store",
  });
  return {
    filters: parsedFilters,
    results: data.map(({ listing, matchPercentage, whyItMatches }) =>
      toPreview(listing, matchPercentage, whyItMatches),
    ),
  };
}

const resolvedIds = new Map<string, string>();

/** Writes need the record id, while links and stored ids may still be slugs. */
export async function resolveListingId(idOrSlug: string) {
  const known = resolvedIds.get(idOrSlug);
  if (known) return known;
  const { id } = await api<ApiListing>(
    `/listings/${encodeURIComponent(idOrSlug)}`,
  );
  resolvedIds.set(idOrSlug, id);
  return id;
}
