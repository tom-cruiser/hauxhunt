// Independent Professional Property Representation -- Phase 3.
//
// Phase 1/2 modeled property access as something an Owner's Team grants:
// invite -> accept -> Owner (or authorized PM) assigns a property. That is
// still true, but it is no longer the ONLY way an Agent or Property Manager
// can have access to a property on HauxHunt. A professional account exists
// independently of any Team:
//
//   PROFESSIONAL
//        |
//        +-- Team memberships (team-data.ts) -- zero, one, or several
//        +-- Independent property authorizations (this file) -- properties
//            represented for an Owner who does not use HauxHunt at all
//
// The two authority sources are kept structurally distinct and are never
// merged into one stored record:
//
//   TEAM_ASSIGNMENT           -- team-data.ts's PropertyAssignment, always
//                                 tied to a teamId and an Owner who has a
//                                 HauxHunt account.
//   INDEPENDENT_AUTHORIZATION -- an OwnerAuthorization below, tied to a
//                                 property THIS FILE owns the facts for and
//                                 an off-platform Owner who has neither an
//                                 account nor a Team. Submitting one does
//                                 NOT create a Team, and never will just
//                                 because HauxHunt reviewed it (Section 58).
//
// "PropertyAccess" (the brief's Section 52 concept) is deliberately NOT a
// third stored table -- that would let it drift from the two real sources
// of truth. It's the read-side merge below (getProfessionalPropertyCards),
// computed fresh every time.
//
// Shared identity (Section 53): a Team-assigned property's facts still come
// from owner-data.ts when it's Pacifique's (BASE_OWNER_PROPERTIES) or from
// OTHER_TEAM_PROPERTIES below when it belongs to a different Team's Owner --
// either way there is exactly one facts record per property id, never a
// second copy. Independent properties are new properties a professional
// entered themselves; they have no Owner-dashboard equivalent to share
// identity with, because no such dashboard exists for their Owner.

import type { StaticImageData } from "next/image";

import house1 from "@/assets/images/house1.jpg";
import house2 from "@/assets/images/house2.jpg";
import house4 from "@/assets/images/house4.jpg";
import house5 from "@/assets/images/house5.jpg";
import house6 from "@/assets/images/house6.jpeg";
import houseField from "@/assets/images/house-isolated-field.jpg";

import { BASE_OWNER_PROPERTIES, OWNER_LISTINGS, type ListingStatus } from "@/lib/owner-data";
import { getActiveAssignmentsFor, getTeamById, type ProfessionalRole } from "@/lib/team-data";

// ---------------------------------------------------------------------------
// Property facts -- Team-assigned (non-Pacifique) and independent share the
// same shape so a card/detail view can render either without knowing which.
// ---------------------------------------------------------------------------

type PropertyFacts = {
  id: string;
  title: string;
  location: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  units: number | null;
  size: number;
  furnished: boolean;
  amenities: string[];
  image: StaticImageData;
};

// Properties belonging to a Team OTHER than Pacifique's -- currently just
// Kigali Homes' one property. Kept separate from owner-data.ts's
// BASE_OWNER_PROPERTIES on purpose (Section 56: Pacifique's Owner dashboard
// must never see another Team's properties).
const OTHER_TEAM_PROPERTIES: PropertyFacts[] = [
  {
    id: "kimihurura-apartment",
    title: "Kimihurura Apartment",
    location: "Kimihurura, Kigali",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    units: null,
    size: 88,
    furnished: true,
    amenities: ["Furnished", "Parking", "Backup power"],
    image: house6,
  },
];

function resolveTeamPropertyFacts(propertyId: string): PropertyFacts | null {
  const owned = BASE_OWNER_PROPERTIES.find((p) => p.id === propertyId);
  if (owned) {
    return {
      id: owned.id,
      title: owned.title,
      location: owned.location,
      type: owned.type,
      bedrooms: owned.bedrooms,
      bathrooms: owned.bathrooms,
      units: null,
      size: owned.size,
      furnished: owned.amenities.includes("Furnished"),
      amenities: owned.amenities,
      image: owned.image,
    };
  }
  return OTHER_TEAM_PROPERTIES.find((p) => p.id === propertyId) ?? null;
}

// ---------------------------------------------------------------------------
// Independent properties + Owner Authorizations
// ---------------------------------------------------------------------------

export type AuthorizationStatus = "Under Review" | "Verified" | "Needs Attention" | "Rejected";

// Deliberately separate from IndependentProperty and from AuthorizationStatus
// (Section 22/28): a property's FACTS, its OWNER'S AUTHORIZATION of the
// professional, and its LISTING (the public advertisement) are three
// different questions, so they're three different records, joined only by
// propertyId. See getListingForProperty below for how this resolves for
// EITHER authority source -- Team-assigned properties belonging to
// Pacifique read their listing from owner-data.ts's existing OWNER_LISTINGS
// (never a second copy); everything else (independent properties, and
// properties on a Team other than Pacifique's) reads from ListingRecord.
export type ListingRecord = {
  id: string;
  propertyId: string;
  status: ListingStatus | "Not Listed";
  title: string;
  description: string;
  rent: string;
  availableFrom: string;
  amenities: string[];
  updatedAt: string;
  // Listing Performance phase -- real engagement counts, present only for a
  // Pacifique property (carried over from owner-data.ts's OWNER_LISTINGS,
  // the same numbers the Owner dashboard shows). Independent properties and
  // properties on any other Team have no traffic-tracking in this
  // prototype, so these stay undefined for them -- never a fabricated 0.
  views?: number | null;
  saves?: number | null;
  enquiries?: number | null;
};

export type IndependentProperty = PropertyFacts;

export type OwnerAuthorization = {
  id: string;
  propertyId: string;
  professionalId: string;
  professionalRole: ProfessionalRole;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  proofDocumentName: string;
  status: AuthorizationStatus;
  submittedAt: string;
  reviewedAt?: string;
  ts: number;
};

const SEED_INDEPENDENT_PROPERTIES: IndependentProperty[] = [
  {
    id: "remera-house-independent",
    title: "Remera House",
    location: "Remera, Kigali",
    type: "House",
    bedrooms: 4,
    bathrooms: 3,
    units: null,
    size: 210,
    furnished: true,
    amenities: ["Garden", "Parking", "Backup power"],
    image: house2,
  },
  {
    id: "vision-apartments-independent",
    title: "Vision Apartments",
    location: "Kibagabaga, Kigali",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    units: 12,
    size: 76,
    furnished: false,
    amenities: ["Parking", "Security"],
    image: house4,
  },
  {
    id: "kibagabaga-residence-independent",
    title: "Kibagabaga Residence",
    location: "Kibagabaga, Kigali",
    type: "House",
    bedrooms: 3,
    bathrooms: 2,
    units: null,
    size: 150,
    furnished: false,
    amenities: ["Parking"],
    image: house1,
  },
  {
    id: "nyamirambo-studio-independent",
    title: "Nyamirambo Studio",
    location: "Nyamirambo, Kigali",
    type: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    units: null,
    size: 34,
    furnished: true,
    amenities: ["Wi-Fi"],
    image: house5,
  },
  {
    id: "gisozi-duplex-independent",
    title: "Gisozi Duplex",
    location: "Gisozi, Kigali",
    type: "House",
    bedrooms: 3,
    bathrooms: 2,
    units: null,
    size: 140,
    furnished: false,
    amenities: ["Parking"],
    image: houseField,
  },
];

// Covers all four Authorization states across four different professionals
// (two Agents, two Property Managers) -- see the phase report for the full
// story. Kevin/Jean's Verified examples match the brief's own Sections 54/55.
const SEED_AUTHORIZATIONS: OwnerAuthorization[] = [
  {
    id: "auth-kevin-remera",
    propertyId: "remera-house-independent",
    professionalId: "kevin-nshuti",
    professionalRole: "agent",
    ownerName: "John Doe",
    ownerPhone: "+250 788 111 222",
    proofDocumentName: "Owner-Authorization-Letter.pdf",
    status: "Verified",
    submittedAt: "10 Aug 2026",
    reviewedAt: "12 Aug 2026",
    ts: Date.parse("2026-08-10"),
  },
  {
    id: "auth-jean-vision",
    propertyId: "vision-apartments-independent",
    professionalId: "jean-mugisha",
    professionalRole: "property_manager",
    ownerName: "Jane Doe",
    ownerPhone: "+250 788 333 444",
    proofDocumentName: "Management-Authorization.pdf",
    status: "Verified",
    submittedAt: "5 Aug 2026",
    reviewedAt: "7 Aug 2026",
    ts: Date.parse("2026-08-05"),
  },
  {
    id: "auth-jean-kibagabaga",
    propertyId: "kibagabaga-residence-independent",
    professionalId: "jean-mugisha",
    professionalRole: "property_manager",
    ownerName: "Eric Nkurunziza",
    ownerPhone: "+250 788 555 666",
    proofDocumentName: "Authorization-Letter-Kibagabaga.pdf",
    status: "Under Review",
    submittedAt: "19 Aug 2026",
    ts: Date.parse("2026-08-19"),
  },
  {
    id: "auth-sarah-nyamirambo",
    propertyId: "nyamirambo-studio-independent",
    professionalId: "sarah-uwase",
    professionalRole: "agent",
    ownerName: "Alice Uwimana",
    ownerPhone: "+250 788 777 888",
    proofDocumentName: "Authorization-Nyamirambo.pdf",
    status: "Needs Attention",
    submittedAt: "14 Aug 2026",
    reviewedAt: "16 Aug 2026",
    ts: Date.parse("2026-08-14"),
  },
  {
    id: "auth-patrick-gisozi",
    propertyId: "gisozi-duplex-independent",
    professionalId: "patrick",
    professionalRole: "property_manager",
    ownerName: "Robert Habimana",
    ownerPhone: "+250 788 999 000",
    proofDocumentName: "Authorization-Gisozi.pdf",
    status: "Rejected",
    submittedAt: "8 Aug 2026",
    reviewedAt: "11 Aug 2026",
    ts: Date.parse("2026-08-08"),
  },
];

// Listings for properties that do NOT belong to Pacifique's portfolio --
// independent properties, and (if ever needed) properties on a Team other
// than Pacifique's. Pacifique's own properties keep using owner-data.ts's
// existing OWNER_LISTINGS as their single source of truth; see
// getListingForProperty. kibagabaga-residence-independent and
// gisozi-duplex-independent deliberately have no entry here -- "No Listing"
// created yet, matching their Under Review / Rejected authorization state.
const SEED_LISTINGS: ListingRecord[] = [
  {
    id: "listing-remera-house",
    propertyId: "remera-house-independent",
    status: "Live",
    title: "Remera House",
    description: "A spacious family house in a quiet Remera compound, with a private garden and secure parking.",
    rent: "USD 950 / month",
    availableFrom: "Available now",
    amenities: ["Garden", "Parking", "Backup power"],
    updatedAt: "12 Aug 2026",
  },
  {
    id: "listing-vision-apartments",
    propertyId: "vision-apartments-independent",
    status: "Draft",
    title: "Vision Apartments",
    description: "",
    rent: "",
    availableFrom: "",
    amenities: ["Parking", "Security"],
    updatedAt: "6 Aug 2026",
  },
  {
    id: "listing-nyamirambo-studio",
    propertyId: "nyamirambo-studio-independent",
    status: "Draft",
    title: "Nyamirambo Studio",
    description: "",
    rent: "",
    availableFrom: "",
    amenities: ["Wi-Fi"],
    updatedAt: "15 Aug 2026",
  },
];

// ---------------------------------------------------------------------------
// Session-persisted state -- same readList/writeList/event pattern as
// team-data.ts.
// ---------------------------------------------------------------------------

const PROPERTIES_KEY = "hauxhunt-independent-properties";
const AUTHORIZATIONS_KEY = "hauxhunt-owner-authorizations";
const LISTINGS_KEY = "hauxhunt-professional-listings";
const EVENT = "hauxhunt-independent-properties-changed";

function readList<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : seed;
  } catch {
    return seed;
  }
}

function writeList<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage full/unavailable -- change still applies for this render.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeToIndependentProperties(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getIndependentProperties(): IndependentProperty[] {
  return readList(PROPERTIES_KEY, SEED_INDEPENDENT_PROPERTIES);
}

export function getOwnerAuthorizations(): OwnerAuthorization[] {
  return readList(AUTHORIZATIONS_KEY, SEED_AUTHORIZATIONS);
}

export function getIndependentProperty(propertyId: string): IndependentProperty | undefined {
  return getIndependentProperties().find((p) => p.id === propertyId);
}

function getListingRecords(): ListingRecord[] {
  return readList(LISTINGS_KEY, SEED_LISTINGS);
}

// Resolves ONE canonical listing for any property this file knows about,
// regardless of authority source (Section 62/63: always by propertyId,
// never a title string). Priority:
//   1. A listing this professional created/edited THIS session (always
//      wins once it exists -- it's the freshest truth).
//   2. For a Pacifique property, owner-data.ts's existing OWNER_LISTINGS
//      entry (never duplicated here).
//   3. A seeded independent listing (SEED_LISTINGS above).
//   4. null -- "No Listing" (Section 56: a property with no listing yet
//      still exists and remains fully accessible; this is not an error
//      state).
export function getListingForProperty(propertyId: string): ListingRecord | null {
  const stored = getListingRecords().find((l) => l.propertyId === propertyId);
  if (stored) return stored;

  const ownerListing = OWNER_LISTINGS.find((l) => l.propertyId === propertyId);
  if (ownerListing) {
    const facts = resolveTeamPropertyFacts(propertyId);
    const ownerProperty = BASE_OWNER_PROPERTIES.find((p) => p.id === propertyId);
    return {
      id: `owner-listing-${propertyId}`,
      propertyId,
      status: ownerListing.status,
      title: facts?.title ?? propertyId,
      description: "",
      rent: ownerProperty?.rent ?? "",
      availableFrom: "",
      amenities: facts?.amenities ?? [],
      updatedAt: "",
      views: ownerListing.views,
      saves: ownerListing.saves,
      enquiries: ownerListing.enquiries,
    };
  }

  const seeded = SEED_LISTINGS.find((l) => l.propertyId === propertyId);
  return seeded ?? null;
}

// The single write for "Save as draft" / "Submit for review" from the
// property-bound Create/Edit Listing flow (Section 25/31). Always resolves
// through propertyId; never creates a second property to attach a listing
// to (Section 15/24). Upserts by propertyId, so re-saving the same
// property's listing updates it rather than accumulating duplicates.
export function saveListingForProperty(
  propertyId: string,
  fields: { title: string; description: string; rent: string; availableFrom: string; amenities: string[] },
  status: ListingStatus,
): ListingRecord {
  const records = getListingRecords();
  const existing = records.find((l) => l.propertyId === propertyId);
  const record: ListingRecord = {
    id: existing?.id ?? nextId("listing"),
    propertyId,
    status,
    title: fields.title,
    description: fields.description,
    rent: fields.rent,
    availableFrom: fields.availableFrom,
    amenities: fields.amenities,
    updatedAt: today(),
  };
  const next = existing ? records.map((l) => (l.propertyId === propertyId ? record : l)) : [...records, record];
  writeList(LISTINGS_KEY, next);
  return record;
}

export function getAuthorization(authorizationId: string): OwnerAuthorization | undefined {
  return getOwnerAuthorizations().find((a) => a.id === authorizationId);
}

export function getAuthorizationForProperty(propertyId: string): OwnerAuthorization | undefined {
  return getOwnerAuthorizations().find((a) => a.propertyId === propertyId);
}

export function getAuthorizationsFor(professionalId: string): OwnerAuthorization[] {
  return getOwnerAuthorizations()
    .filter((a) => a.professionalId === professionalId)
    .sort((a, b) => b.ts - a.ts);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4).toString(36)}`;
}

function today() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// The single write for the whole "Add Property" flow (Section 12): creates
// the property facts (status "Draft" listing, nothing public yet) and an
// OwnerAuthorization record in "Under Review", atomically from the
// professional's point of view. Never creates a Team, never creates an
// Owner account -- see the header comment.
export function submitIndependentProperty(input: {
  professionalId: string;
  professionalRole: ProfessionalRole;
  title: string;
  location: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  units: number | null;
  size: number;
  furnished: boolean;
  amenities: string[];
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  proofDocumentName: string;
}): { propertyId: string; authorizationId: string } {
  const propertyId = nextId("prop");
  const properties = getIndependentProperties();
  properties.push({
    id: propertyId,
    title: input.title,
    location: input.location,
    type: input.type,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    units: input.units,
    size: input.size,
    furnished: input.furnished,
    amenities: input.amenities,
    image: houseField,
  });
  writeList(PROPERTIES_KEY, properties);

  const authorizationId = nextId("auth");
  const authorizations = getOwnerAuthorizations();
  authorizations.push({
    id: authorizationId,
    propertyId,
    professionalId: input.professionalId,
    professionalRole: input.professionalRole,
    ownerName: input.ownerName,
    ownerPhone: input.ownerPhone,
    ownerEmail: input.ownerEmail,
    proofDocumentName: input.proofDocumentName,
    status: "Under Review",
    submittedAt: today(),
    ts: Date.now(),
  });
  writeList(AUTHORIZATIONS_KEY, authorizations);

  return { propertyId, authorizationId };
}

// Discreet prototype-only mechanism (Section 49) to preview every
// Authorization status -- no real review engine exists. Property Detail
// puts this behind a small, clearly-labeled control, never a developer
// panel.
export function setAuthorizationStatus(authorizationId: string, status: AuthorizationStatus) {
  const authorizations = getOwnerAuthorizations().map((a) => (a.id === authorizationId ? { ...a, status, reviewedAt: today() } : a));
  writeList(AUTHORIZATIONS_KEY, authorizations);
}

// ---------------------------------------------------------------------------
// The unified read model -- "PropertyAccess" (Section 52), computed fresh
// from the two real sources rather than stored as a third one.
// ---------------------------------------------------------------------------

export type AuthoritySource = "TEAM_ASSIGNMENT" | "INDEPENDENT_AUTHORIZATION";

export type ProfessionalPropertyCard = {
  source: AuthoritySource;
  propertyId: string;
  title: string;
  location: string;
  image: StaticImageData;
  role: ProfessionalRole;
  status: "Active" | AuthorizationStatus;
  type: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  furnished: boolean;
  amenities: string[];
  // Resolved via getListingForProperty for EITHER source (Section 16-18) --
  // null means "No Listing", a real and normal state, not an error.
  listing: ListingRecord | null;
  // TEAM_ASSIGNMENT only
  teamId?: string;
  teamName?: string;
  propertyOwnerName?: string;
  assignedBy?: string;
  responsibilities?: string[];
  // INDEPENDENT_AUTHORIZATION only
  authorizationId?: string;
  authorizationStatus?: AuthorizationStatus;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  proofDocumentName?: string;
  units?: number | null;
};

// Whether THIS professional may create/edit the listing on this property
// (Section 19/21). Reuses the existing responsibility/authorization
// concepts rather than inventing a new permission system:
//   TEAM_ASSIGNMENT           -- needs "Manage listing" in their granted
//                                 responsibilities for that assignment.
//   INDEPENDENT_AUTHORIZATION -- needs their authorization to be Verified;
//                                 Under Review / Needs Attention / Rejected
//                                 can prepare property info but never
//                                 publish (Section 22/23).
export function canManageListingFor(card: ProfessionalPropertyCard): boolean {
  if (card.source === "TEAM_ASSIGNMENT") {
    return card.responsibilities?.includes("Manage listing") ?? false;
  }
  return card.authorizationStatus === "Verified";
}

// Every property this professional has access to, from EITHER source,
// across every Team they belong to. This is what the professional's own
// Properties page reads; nothing here is scoped to a single Team on
// purpose (Section 3/32: a professional is not limited to one Team).
export function getProfessionalPropertyCards(professionalId: string): ProfessionalPropertyCard[] {
  const team: ProfessionalPropertyCard[] = getActiveAssignmentsFor(professionalId)
    .map((a) => {
      const facts = resolveTeamPropertyFacts(a.propertyId);
      if (!facts) return null;
      const teamRecord = getTeamById(a.teamId);
      const card: ProfessionalPropertyCard = {
        source: "TEAM_ASSIGNMENT",
        propertyId: a.propertyId,
        title: facts.title,
        location: facts.location,
        image: facts.image,
        role: a.role,
        status: "Active",
        type: facts.type,
        bedrooms: facts.bedrooms,
        bathrooms: facts.bathrooms,
        size: facts.size,
        furnished: facts.furnished,
        amenities: facts.amenities,
        listing: getListingForProperty(a.propertyId),
        teamId: a.teamId,
        teamName: teamRecord?.name ?? "Team",
        propertyOwnerName: teamRecord?.ownerName ?? "",
        assignedBy: a.assignedBy,
        responsibilities: a.responsibilities,
      };
      return card;
    })
    .filter((c): c is ProfessionalPropertyCard => c !== null);

  const independent: ProfessionalPropertyCard[] = getAuthorizationsFor(professionalId)
    .map((auth) => {
      const facts = getIndependentProperty(auth.propertyId);
      if (!facts) return null;
      const card: ProfessionalPropertyCard = {
        source: "INDEPENDENT_AUTHORIZATION",
        propertyId: auth.propertyId,
        title: facts.title,
        location: facts.location,
        image: facts.image,
        role: auth.professionalRole,
        status: auth.status,
        type: facts.type,
        bedrooms: facts.bedrooms,
        bathrooms: facts.bathrooms,
        size: facts.size,
        furnished: facts.furnished,
        amenities: facts.amenities,
        listing: getListingForProperty(auth.propertyId),
        authorizationId: auth.id,
        authorizationStatus: auth.status,
        ownerName: auth.ownerName,
        ownerPhone: auth.ownerPhone,
        ownerEmail: auth.ownerEmail,
        proofDocumentName: auth.proofDocumentName,
        units: facts.units,
      };
      return card;
    })
    .filter((c): c is ProfessionalPropertyCard => c !== null);

  return [...team, ...independent];
}

export function getPropertyAccessDetail(professionalId: string, propertyId: string): ProfessionalPropertyCard | null {
  return getProfessionalPropertyCards(professionalId).find((c) => c.propertyId === propertyId) ?? null;
}

// Resolves a title for ANY property id this file knows about (Team-assigned
// on any Team, or independent) -- for copy/notifications that only have an
// id, e.g. "assigned to {title}". Falls back to the raw id, matching
// owner-data.ts's propertyTitle() convention.
export function resolveAnyPropertyTitle(propertyId: string): string {
  return resolveTeamPropertyFacts(propertyId)?.title ?? getIndependentProperty(propertyId)?.title ?? propertyId;
}

export function resolveAnyPropertyLocation(propertyId: string): string {
  return resolveTeamPropertyFacts(propertyId)?.location ?? getIndependentProperty(propertyId)?.location ?? "";
}
