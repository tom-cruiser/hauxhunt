/**
 * Shared, app-wide TypeScript types.
 *
 * Keep cross-cutting types here (e.g. nav items, CMS content shapes).
 * Component-local types should stay colocated with their component.
 */

export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

/** Currency codes for RentUp's launch markets (UIUX Brief §3). */
export type CurrencyCode = "USD";

/**
 * One parsed criterion from a natural-language search query, shown as an
 * editable filter chip (UIUX Brief Flow 3B — "what we understood," not a
 * chat response).
 */
export type ParsedFilter = {
  id: string;
  kind:
    | "location"
    | "bedrooms"
    | "maxPrice"
    | "purpose"
    | "amenity"
    | "availability"
    | "custom";
  label: string;
  /** Set when the parser flagged this fragment as low-confidence/unclear. */
  unclear?: boolean;
};

export type PropertyPreview = {
  id: string;
  title: string;
  location: string;
  currency: CurrencyCode;
  price: number;
  purpose: "rent" | "sale";
  bedrooms: number;
  amenities: string[];
  verified: boolean;
  /** 0–100. Computed against the visitor's current filters, not fixed. */
  matchPercentage: number;
  /** Short, specific reasoning — evidence, not a marketing claim (Creative Direction). */
  whyItMatches: string;
};
