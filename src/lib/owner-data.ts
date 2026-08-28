// Property Owner / Landlord mock data model.
//
// This is the fourth HauxHunt role, distinct from Renter, Agent, and
// Property Manager:
//
//   OWNER owns the asset.
//   PROPERTY MANAGER operates the asset (day-to-day, on the owner's behalf).
//   AGENT markets the asset (finds and qualifies renters).
//   RENTER occupies the asset.
//
// An owner does not have to delegate anything — they may self-manage, hand
// a property to a Property Manager, hand marketing to an Agent, both, or
// neither. That flexibility is the point of this file: every property below
// demonstrates a different combination, and the identities (renter, PM,
// agent) are the SAME people already used across the renter dashboard and
// Messages, not a disconnected new cast — see renter-rentals.ts,
// renter-applications.ts, maintenance-data.ts, and the Messages seed data in
// renter-dashboard/messages/page.tsx.
//
// Phase 1 of the Property Team model moved "who works on this property" out
// of this file and into team-data.ts, where it belongs to a Team
// Membership + Property Assignment, not to the property record itself.
// getOwnerProperties() below derives .propertyManager/.agent by asking
// team-data.ts who is actively assigned — this file only owns the physical
// facts (title, location, size, rent, occupancy, listing status).

import type { StaticImageData } from "next/image";

import house1 from "@/assets/images/house1.jpg";
import house2 from "@/assets/images/house2.jpg";
import house3 from "@/assets/images/house3.jpg";
import house4 from "@/assets/images/house4.jpg";
import house5 from "@/assets/images/house5.jpg";
import { getAgentAssignmentFor, getPropertyManagerAssignmentFor, subscribeToTeam } from "@/lib/team-data";

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const OWNER = {
  name: "Pacifique Harerimana",
  email: "owner@gmail.com",
  role: "Property Owner",
};

// Cross-Role Lifecycle Synchronization phase -- Section 52: the smallest
// safe prototype identity mapping, not real authentication. "Julien
// Mugisha" is already the recurring applicant/renter across this file's
// own Applications/Rentals/Payments (HH-APP-0241, HH-RENT-104, etc.) and
// across professional-work.ts's Agent/PM lifecycles -- this constant just
// names that existing convention in one place so Renter-side pages can
// filter the same shared records down to "my own", by identity rather
// than by re-deriving the name string in each file.
export const RENTER_DEMO_NAME = "Julien Mugisha";

// ---------------------------------------------------------------------------
// Shared status vocabulary — kept identical to the words the renter side
// already uses (Listings / Applications / Rentals / Payments / Maintenance),
// so nothing on the owner side invents a second name for the same state.
// ---------------------------------------------------------------------------

export type ListingStatus = "Draft" | "In Review" | "Live" | "Paused" | "Archived";
export type ApplicationStatus =
  | "Submitted"
  | "Under Review"
  | "Action Required"
  | "Decision Pending"
  | "Approved"
  | "Not Selected"
  | "Completed";
export type RentalStatus = "Upcoming" | "Active" | "Ending Soon" | "Ended";
export type PaymentStatus = "Due" | "Pending" | "Paid" | "Failed" | "Overdue";
export type MaintenanceStatus = "Open" | "Scheduled" | "In Progress" | "Resolved";

export type ManagementStatus =
  | "Self-managed"
  | "Managed"
  | "Agent represented"
  | "Managed + Agent represented";

export type OccupancyStatus = "Occupied" | "Vacant" | "Upcoming";

// ---------------------------------------------------------------------------
// Delegation — a Property Manager or Agent currently assigned to a
// property, with the responsibilities the owner granted them for THIS
// property. The underlying source of truth (who is on the team, who holds
// which property assignment) now lives in team-data.ts; these shapes are
// just what getOwnerProperties() derives for display.
// ---------------------------------------------------------------------------

export type PropertyManagerAssignment = {
  professionalId: string;
  membershipId: string | null;
  name: string;
  verified: boolean;
  responsibilities: string[];
  canManageAgents: boolean;
  assignedBy: string;
  assignedByProfessionalId: string | null;
};

export type AgentAssignment = {
  professionalId: string;
  membershipId: string | null;
  name: string;
  verified: boolean;
  responsibilities: string[];
  // Phase 2: who granted this Agent access to this property -- "You" (the
  // Owner) or a Property Manager acting within their own delegated scope.
  assignedBy: string;
  assignedByProfessionalId: string | null;
};

// ---------------------------------------------------------------------------
// Properties — the physical assets the owner holds. PROPERTY is distinct
// from LISTING (its public advert, see OWNER_LISTINGS) and from RENTAL (an
// active renter relationship, see OWNER_RENTALS). A property can exist
// without either of the other two.
// ---------------------------------------------------------------------------

export type OwnerPropertyFacts = {
  id: string;
  title: string;
  location: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  size: number; // m²
  amenities: string[];
  image: StaticImageData;
  rent: string | null;
  listingStatus: ListingStatus | "Not Listed";
};

// propertyManager/agent/occupancy are all derived at read time (see
// getOwnerProperties()) -- occupancy used to be a static fact on the seed
// object itself, which meant a rental created after the fact (e.g. Owner
// Rental Setup Continuity's self-managed flow) could never turn a property
// "Occupied" without someone remembering to also edit this field by hand.
// It is now computed from the exact same shared OWNER_RENTALS every other
// Owner/PM/Renter surface already reads (see deriveOccupancy below), so a
// property's occupancy can never disagree with its own Rental data.
export type OwnerProperty = OwnerPropertyFacts & {
  occupancy: OccupancyStatus;
  propertyManager: PropertyManagerAssignment | null;
  agent: AgentAssignment | null;
};

export const BASE_OWNER_PROPERTIES: OwnerPropertyFacts[] = [
  {
    id: "kacyiru-2br",
    title: "Kacyiru Residence",
    location: "Kacyiru, Kigali",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    size: 96,
    amenities: ["Furnished", "Parking", "Backup generator", "Quiet street"],
    image: house1,
    rent: "RWF 850,000 / month",
    listingStatus: "Not Listed",
  },
  {
    id: "nyarutarama-2br",
    title: "Nyarutarama Garden Apartment",
    location: "Nyarutarama, Kigali",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    size: 104,
    amenities: ["Pool access", "Gym", "Secure compound"],
    image: house2,
    rent: "RWF 920,000 / month",
    listingStatus: "Paused",
  },
  {
    id: "remera-3br",
    title: "Remera Family House",
    location: "Remera, Kigali",
    type: "House",
    bedrooms: 3,
    bathrooms: 2,
    size: 168,
    amenities: ["Garden", "Quiet compound", "Parking"],
    image: house3,
    rent: "RWF 780,000 / month",
    listingStatus: "Not Listed",
  },
  {
    id: "kibagabaga-modern-family-home",
    title: "Modern Family Home",
    location: "Kibagabaga, Kigali",
    type: "House",
    bedrooms: 3,
    bathrooms: 2,
    size: 186,
    amenities: ["Furnished", "Parking", "Garden", "Backup power"],
    image: house4,
    rent: "RWF 830,000 / month",
    listingStatus: "Live",
  },
  {
    id: "kimironko-1br",
    title: "Kimironko Apartment",
    location: "Kimironko, Kigali",
    type: "Apartment",
    bedrooms: 1,
    bathrooms: 1,
    size: 52,
    amenities: ["Balcony", "Water tank"],
    image: house5,
    rent: null,
    listingStatus: "Draft",
  },
];

export function managementStatusFor(property: Pick<OwnerProperty, "propertyManager" | "agent">): ManagementStatus {
  if (property.propertyManager && property.agent) return "Managed + Agent represented";
  if (property.propertyManager) return "Managed";
  if (property.agent) return "Agent represented";
  return "Self-managed";
}

// Owner Foundation Cleanup phase -- the one canonical, name-inclusive
// management summary sentence. Overview's Property Portfolio row previously
// computed this with its own inline ternary that disagreed with
// managementStatusFor() above (an Agent-only property read "Self-managed
// rental" here and "Agent represented" in the Delegation sidebar on the
// same page). Both surfaces should describe the same property the same
// way, so this builds directly on managementStatusFor()'s categorization
// rather than re-deriving it. Deliberately does not render responsibility
// labels (e.g. "Review applications") -- those stay inside Team/assignment
// configuration; this only answers "who manages, who leases."
export function managementSummaryFor(property: Pick<OwnerProperty, "propertyManager" | "agent">): string {
  switch (managementStatusFor(property)) {
    case "Managed + Agent represented":
      return `Managed by ${property.propertyManager!.name} · Leasing by ${property.agent!.name}`;
    case "Managed":
      return `Managed by ${property.propertyManager!.name}`;
    case "Agent represented":
      return `Leasing by ${property.agent!.name}`;
    default:
      return "Self-managed";
  }
}

// ---------------------------------------------------------------------------
// Property-detail overrides — local, session-only edits from "Edit
// Property" (title/location/size/rent/etc). Who's assigned to a property is
// no longer stored here at all — see team-data.ts's PropertyAssignment.
// ---------------------------------------------------------------------------

const OVERRIDES_KEY = "hauxhunt-owner-property-edits";
const OVERRIDES_EVENT = "hauxhunt-owner-property-edits-changed";

type EditableDetails = Pick<OwnerPropertyFacts, "title" | "location" | "type" | "bedrooms" | "bathrooms" | "size" | "rent">;

type Overrides = Record<string, Partial<EditableDetails>>;

function readOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Overrides) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Storage full or unavailable — the change still applies for this tab's
    // in-memory state via the dispatched event below.
  }
  window.dispatchEvent(new Event(OVERRIDES_EVENT));
}

export function subscribeToOwnerProperties(callback: () => void) {
  window.addEventListener(OVERRIDES_EVENT, callback);
  window.addEventListener("storage", callback);
  const unsubscribeTeam = subscribeToTeam(callback); // PM/Agent assignment changes also affect derived properties
  return () => {
    window.removeEventListener(OVERRIDES_EVENT, callback);
    window.removeEventListener("storage", callback);
    unsubscribeTeam();
  };
}

export function updateProperty(propertyId: string, details: Partial<EditableDetails>) {
  const overrides = readOverrides();
  overrides[propertyId] = { ...overrides[propertyId], ...details };
  writeOverrides(overrides);
}

// Owner Properties phase -- Section 9: a property is Occupied/Upcoming
// purely because a real Rental says so, never because a seed fact claims
// it. Active/Ending Soon both read as "there is someone renting this right
// now"; Upcoming means a tenancy is confirmed but hasn't started; anything
// else (no relevant rental, or only an Ended one) is Vacant. getOwnerRentals
// is a hoisted function declaration further down this same file.
function deriveOccupancy(propertyId: string): OccupancyStatus {
  const relevant = getOwnerRentals().filter((r) => r.propertyId === propertyId);
  if (relevant.some((r) => r.status === "Active" || r.status === "Ending Soon")) return "Occupied";
  if (relevant.some((r) => r.status === "Upcoming")) return "Upcoming";
  return "Vacant";
}

export function getOwnerProperties(): OwnerProperty[] {
  const overrides = readOverrides();
  return BASE_OWNER_PROPERTIES.map((property) => {
    const propertyManagerAssignment = getPropertyManagerAssignmentFor(property.id);
    const agentAssignment = getAgentAssignmentFor(property.id);
    return {
      ...property,
      ...overrides[property.id],
      occupancy: deriveOccupancy(property.id),
      propertyManager: propertyManagerAssignment,
      agent: agentAssignment,
    };
  });
}

export function getOwnerProperty(id: string): OwnerProperty | undefined {
  return getOwnerProperties().find((property) => property.id === id);
}

// ---------------------------------------------------------------------------
// Listings — the public advert for a property. Not every property has one.
// ---------------------------------------------------------------------------

export type OwnerListing = {
  propertyId: string;
  status: ListingStatus | "Not Listed";
  views: number | null;
  saves: number | null;
  enquiries: number | null;
  applications: number;
};

export const OWNER_LISTINGS: OwnerListing[] = [
  { propertyId: "kacyiru-2br", status: "Not Listed", views: null, saves: null, enquiries: null, applications: 1 },
  { propertyId: "nyarutarama-2br", status: "Paused", views: 618, saves: 54, enquiries: 12, applications: 1 },
  { propertyId: "remera-3br", status: "Not Listed", views: null, saves: null, enquiries: null, applications: 1 },
  { propertyId: "kibagabaga-modern-family-home", status: "Live", views: 742, saves: 67, enquiries: 18, applications: 2 },
  { propertyId: "kimironko-1br", status: "Draft", views: null, saves: null, enquiries: null, applications: 1 },
];

// ---------------------------------------------------------------------------
// Applications — visible to the owner, operated by whoever is assigned.
// ---------------------------------------------------------------------------

export type OwnerApplication = {
  id: string;
  propertyId: string;
  applicant: string;
  status: ApplicationStatus;
  submitted: string;
  handledBy: string;
  handledByRole: string;
  proposedRent: string;
  moveIn: string;
  requiresOwnerApproval: boolean;
  note: string;
  // Set by an assisting Agent/PM (Agent dashboard, Section 34-36) -- a
  // recommendation, never a final decision. Optional because most
  // applications never go through this (e.g. ones a PM decides directly).
  recommendation?: "Approve" | "Not Selected";
  recommendedBy?: string;
  // Cross-Role Lifecycle Synchronization phase -- Section 5/44: distinct
  // from handledBy (kept as historical/original-submission metadata).
  // assistedBy/assistedByRole names the Agent who recommended a decision,
  // so Application Detail can show "Assisted by" and "Reviewed by"
  // separately instead of overloading one field. Set once, by whichever
  // Agent first recommends -- never overwritten by a later PM/Owner action.
  assistedBy?: string;
  assistedByRole?: string;
};

export const OWNER_APPLICATIONS: OwnerApplication[] = [
  {
    id: "HH-APP-0241",
    propertyId: "kacyiru-2br",
    applicant: "Julien Mugisha",
    status: "Under Review",
    submitted: "10 August 2026",
    handledBy: "Jean Mugisha",
    handledByRole: "Property Manager",
    proposedRent: "RWF 850,000 / month",
    moveIn: "1 September 2026",
    requiresOwnerApproval: false,
    note: "Jean Mugisha is reviewing references and identity documents.",
  },
  {
    id: "HH-APP-0248",
    propertyId: "nyarutarama-2br",
    applicant: "Julien Mugisha",
    status: "Action Required",
    submitted: "13 August 2026",
    handledBy: "Aline Uwase",
    handledByRole: "Agent",
    proposedRent: "RWF 920,000 / month",
    moveIn: "1 September 2026",
    requiresOwnerApproval: false,
    note: "Aline Uwase requested an updated reference document from the applicant.",
  },
  {
    id: "HH-APP-0250",
    propertyId: "remera-3br",
    applicant: "Julien Mugisha",
    status: "Decision Pending",
    submitted: "14 August 2026",
    handledBy: "Sarah Uwase",
    handledByRole: "Agent",
    proposedRent: "RWF 780,000 / month",
    moveIn: "1 September 2026",
    requiresOwnerApproval: true,
    note: "Sarah Uwase recommends approving this renewal — the current tenancy is ending soon.",
    // Cross-Role Lifecycle Synchronization phase -- Section 58's own test
    // scenario: Sarah (Agent) already assisted; Jean (PM, "Review
    // applications" on remera-3br) must see this application and Sarah's
    // recommendation even though handledBy still names Sarah.
    recommendation: "Approve",
    recommendedBy: "Sarah Uwase",
    assistedBy: "Sarah Uwase",
    assistedByRole: "Agent",
  },
  {
    id: "HH-APP-0239",
    propertyId: "kibagabaga-modern-family-home",
    applicant: "Divine Keza",
    status: "Submitted",
    submitted: "15 August 2026",
    handledBy: "Patrick",
    handledByRole: "Property Manager",
    proposedRent: "RWF 830,000 / month",
    moveIn: "5 September 2026",
    requiresOwnerApproval: false,
    note: "Patrick has received the application and has not started review yet.",
  },
  {
    id: "HH-APP-0198",
    propertyId: "kibagabaga-modern-family-home",
    applicant: "Eric Niyonzima",
    status: "Not Selected",
    submitted: "2 August 2026",
    handledBy: "Patrick",
    handledByRole: "Property Manager",
    proposedRent: "RWF 830,000 / month",
    moveIn: "1 August 2026",
    requiresOwnerApproval: false,
    note: "This application was not selected.",
  },
  // Owner Applications phase -- Section 46's own required test scenario:
  // kimironko-1br has no Team assignment at all (fully self-managed, see
  // team-data.ts's SEED_ASSIGNMENTS), so this is the one application with
  // nobody else involved. handledBy names the Owner themselves, exactly
  // like an Owner-decided property elsewhere -- Application Detail reads
  // this as "Managed by You" rather than a professional card.
  {
    id: "HH-APP-0255",
    propertyId: "kimironko-1br",
    applicant: "Divine Keza",
    status: "Submitted",
    submitted: "19 August 2026",
    handledBy: OWNER.name,
    handledByRole: OWNER.role,
    proposedRent: "RWF 480,000 / month",
    moveIn: "1 September 2026",
    requiresOwnerApproval: false,
    note: "Divine Keza applied directly. No Agent or Property Manager is assigned to this property.",
  },
];

// ---------------------------------------------------------------------------
// Application overrides -- same session-only override pattern as property
// facts above (readOverrides/writeOverrides), so an assisting Agent's
// status/note/recommendation actually persists and stays visible to the
// Owner, rather than a second, disconnected copy of "what applications
// look like." Agent dashboard work (status changes, notes, recommendations)
// always goes through here, never a parallel application store.
// ---------------------------------------------------------------------------

const APPLICATION_OVERRIDES_KEY = "hauxhunt-application-overrides";
const APPLICATION_EVENT = "hauxhunt-applications-changed";

type ApplicationOverride = Partial<Pick<OwnerApplication, "status" | "note" | "recommendation" | "recommendedBy" | "assistedBy" | "assistedByRole">>;

function readApplicationOverrides(): Record<string, ApplicationOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(APPLICATION_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ApplicationOverride>) : {};
  } catch {
    return {};
  }
}

function writeApplicationOverrides(overrides: Record<string, ApplicationOverride>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(APPLICATION_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  window.dispatchEvent(new Event(APPLICATION_EVENT));
}

export function subscribeToOwnerApplications(callback: () => void) {
  window.addEventListener(APPLICATION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(APPLICATION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getOwnerApplications(): OwnerApplication[] {
  const overrides = readApplicationOverrides();
  return OWNER_APPLICATIONS.map((application) => ({ ...application, ...overrides[application.id] }));
}

export function getOwnerApplication(id: string): OwnerApplication | undefined {
  return getOwnerApplications().find((a) => a.id === id);
}

export function updateOwnerApplication(applicationId: string, patch: ApplicationOverride) {
  const overrides = readApplicationOverrides();
  overrides[applicationId] = { ...overrides[applicationId], ...patch };
  writeApplicationOverrides(overrides);
}

// ---------------------------------------------------------------------------
// Rentals — an active relationship between a property and a renter.
// ---------------------------------------------------------------------------

export type OwnerRental = {
  id: string;
  propertyId: string;
  renter: string;
  status: RentalStatus;
  rent: string;
  start: string;
  end: string;
  agreementStatus: string;
  depositStatus: string;
  paymentStatus: "Paid" | "Pending" | "Overdue";
  note: string;
};

export const OWNER_RENTALS: OwnerRental[] = [
  {
    id: "HH-RENT-104",
    propertyId: "kacyiru-2br",
    renter: "Julien Mugisha",
    status: "Active",
    rent: "RWF 850,000 / month",
    start: "1 September 2025",
    end: "31 August 2027",
    agreementStatus: "Signed",
    depositStatus: "Paid",
    paymentStatus: "Paid",
    note: "Next rent payment due 1 September 2026.",
  },
  {
    id: "HH-RENT-112",
    propertyId: "nyarutarama-2br",
    renter: "Julien Mugisha",
    status: "Upcoming",
    rent: "RWF 920,000 / month",
    start: "1 September 2026",
    end: "31 August 2027",
    agreementStatus: "Awaiting Owner Approval",
    depositStatus: "Pending",
    paymentStatus: "Pending",
    note: "Aline Uwase prepared the agreement. It needs your approval before the deposit is requested.",
  },
  {
    id: "HH-RENT-087",
    propertyId: "remera-3br",
    renter: "Julien Mugisha",
    status: "Ending Soon",
    rent: "RWF 780,000 / month",
    start: "1 September 2025",
    end: "31 August 2026",
    agreementStatus: "Signed",
    depositStatus: "Paid",
    paymentStatus: "Overdue",
    note: "This tenancy ends in 16 days. A renewal application is awaiting your approval.",
  },
  {
    id: "HH-RENT-041",
    propertyId: "kibagabaga-modern-family-home",
    renter: "Divine Keza",
    status: "Ended",
    rent: "RWF 650,000 / month",
    start: "1 January 2025",
    end: "31 December 2025",
    agreementStatus: "Completed",
    depositStatus: "Refunded",
    paymentStatus: "Paid",
    note: "This 12-month tenancy was completed.",
  },
];

// ---------------------------------------------------------------------------
// Rental overrides/additions -- same session-only override pattern as
// Applications above, PLUS the ability to CREATE a new rental (Property
// Manager Dashboard phase: Rental Setup produces a real OwnerRental, not a
// disconnected PM-only record). Owner, PM, and (conceptually) Renter all
// read the same rental this way.
// ---------------------------------------------------------------------------

const RENTAL_OVERRIDES_KEY = "hauxhunt-rental-overrides";
const RENTAL_ADDITIONS_KEY = "hauxhunt-rental-additions";
const RENTAL_EVENT = "hauxhunt-rentals-changed";

type RentalOverride = Partial<Pick<OwnerRental, "status" | "agreementStatus" | "depositStatus" | "paymentStatus" | "note">>;

function readRentalOverrides(): Record<string, RentalOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(RENTAL_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RentalOverride>) : {};
  } catch {
    return {};
  }
}

function writeRentalOverrides(overrides: Record<string, RentalOverride>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RENTAL_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  window.dispatchEvent(new Event(RENTAL_EVENT));
}

function readRentalAdditions(): OwnerRental[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(RENTAL_ADDITIONS_KEY);
    return raw ? (JSON.parse(raw) as OwnerRental[]) : [];
  } catch {
    return [];
  }
}

function writeRentalAdditions(rentals: OwnerRental[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RENTAL_ADDITIONS_KEY, JSON.stringify(rentals));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  window.dispatchEvent(new Event(RENTAL_EVENT));
}

export function subscribeToOwnerRentals(callback: () => void) {
  window.addEventListener(RENTAL_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(RENTAL_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getOwnerRentals(): OwnerRental[] {
  const overrides = readRentalOverrides();
  const base = OWNER_RENTALS.map((rental) => ({ ...rental, ...overrides[rental.id] }));
  const added = readRentalAdditions().map((rental) => ({ ...rental, ...overrides[rental.id] }));
  return [...base, ...added];
}

export function getOwnerRental(id: string): OwnerRental | undefined {
  return getOwnerRentals().find((r) => r.id === id);
}

export function updateOwnerRental(rentalId: string, patch: RentalOverride) {
  const overrides = readRentalOverrides();
  overrides[rentalId] = { ...overrides[rentalId], ...patch };
  writeRentalOverrides(overrides);
}

// Property Manager Dashboard phase -- Rental Setup calling this is the ONE
// place a new Rental comes into existence; nothing else creates one.
export function createOwnerRental(rental: OwnerRental) {
  const additions = readRentalAdditions();
  writeRentalAdditions([...additions, rental]);
}

// ---------------------------------------------------------------------------
// Payments — rental payments only. Not HauxHunt platform billing.
// ---------------------------------------------------------------------------

export type OwnerPayment = {
  id: string;
  propertyId: string;
  rentalId: string;
  renter: string;
  purpose: string;
  amount: string;
  amountValue: number;
  status: PaymentStatus;
  date: string;
  method: string;
  reference: string;
  managedBy: string | null;
};

export const OWNER_PAYMENTS: OwnerPayment[] = [
  {
    id: "HH-PAY-20551",
    propertyId: "kacyiru-2br",
    rentalId: "HH-RENT-104",
    renter: "Julien Mugisha",
    purpose: "August Rent",
    amount: "RWF 850,000",
    amountValue: 850_000,
    status: "Paid",
    date: "1 August 2026",
    method: "Mobile Money",
    reference: "HH-PAY-20551",
    managedBy: "Jean Mugisha",
  },
  {
    id: "HH-PAY-20481",
    propertyId: "nyarutarama-2br",
    rentalId: "HH-RENT-112",
    renter: "Julien Mugisha",
    purpose: "Rental Setup — Deposit & First Month",
    amount: "RWF 1,700,000",
    amountValue: 1_700_000,
    status: "Pending",
    date: "Requested once the agreement is approved",
    method: "Bank Transfer",
    reference: "HH-PAY-20481",
    managedBy: "Aline Uwase",
  },
  {
    id: "HH-PAY-20397",
    propertyId: "remera-3br",
    rentalId: "HH-RENT-087",
    renter: "Julien Mugisha",
    purpose: "August Rent",
    amount: "RWF 780,000",
    amountValue: 780_000,
    status: "Overdue",
    date: "Due 1 August 2026 · 5 days overdue",
    method: "—",
    reference: "HH-PAY-20397",
    managedBy: "Sarah Uwase",
  },
  {
    id: "HH-PAY-20602",
    propertyId: "kacyiru-2br",
    rentalId: "HH-RENT-104",
    renter: "Julien Mugisha",
    purpose: "September Rent",
    amount: "RWF 850,000",
    amountValue: 850_000,
    status: "Due",
    date: "Due 1 September 2026",
    method: "—",
    reference: "HH-PAY-20602",
    managedBy: "Jean Mugisha",
  },
  {
    id: "HH-PAY-19998",
    propertyId: "kibagabaga-modern-family-home",
    rentalId: "HH-RENT-041",
    renter: "Divine Keza",
    purpose: "December Rent (final month)",
    amount: "RWF 650,000",
    amountValue: 650_000,
    status: "Paid",
    date: "1 December 2025",
    method: "Card",
    reference: "HH-PAY-19998",
    managedBy: "Patrick",
  },
];

// ---------------------------------------------------------------------------
// Payment overrides/additions -- same pattern as Rentals above. PM marking a
// payment "Paid" (a mock action -- Section 79, no real payment processing)
// and Rental Setup creating the first "Deposit & First Month" payment both
// go through here, so Owner/PM see the identical record.
// ---------------------------------------------------------------------------

const PAYMENT_OVERRIDES_KEY = "hauxhunt-payment-overrides";
const PAYMENT_ADDITIONS_KEY = "hauxhunt-payment-additions";
const PAYMENT_EVENT = "hauxhunt-payments-changed";

type PaymentOverride = Partial<Pick<OwnerPayment, "status" | "date" | "method">>;

function readPaymentOverrides(): Record<string, PaymentOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(PAYMENT_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PaymentOverride>) : {};
  } catch {
    return {};
  }
}

function writePaymentOverrides(overrides: Record<string, PaymentOverride>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PAYMENT_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  window.dispatchEvent(new Event(PAYMENT_EVENT));
}

function readPaymentAdditions(): OwnerPayment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(PAYMENT_ADDITIONS_KEY);
    return raw ? (JSON.parse(raw) as OwnerPayment[]) : [];
  } catch {
    return [];
  }
}

function writePaymentAdditions(payments: OwnerPayment[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PAYMENT_ADDITIONS_KEY, JSON.stringify(payments));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  window.dispatchEvent(new Event(PAYMENT_EVENT));
}

export function subscribeToOwnerPayments(callback: () => void) {
  window.addEventListener(PAYMENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PAYMENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getOwnerPayments(): OwnerPayment[] {
  const overrides = readPaymentOverrides();
  const base = OWNER_PAYMENTS.map((payment) => ({ ...payment, ...overrides[payment.id] }));
  const added = readPaymentAdditions().map((payment) => ({ ...payment, ...overrides[payment.id] }));
  return [...base, ...added];
}

export function getOwnerPayment(id: string): OwnerPayment | undefined {
  return getOwnerPayments().find((p) => p.id === id);
}

// Cross-Role Lifecycle Synchronization phase -- an unscoped-by-professional
// lookup, for Renter-side pages (which have no professionalId) to read
// their own rental's payments by rentalId (Section 51's stable ID rule).
export function getPaymentsForRentalId(rentalId: string): OwnerPayment[] {
  return getOwnerPayments().filter((p) => p.rentalId === rentalId);
}

export function updateOwnerPayment(paymentId: string, patch: PaymentOverride) {
  const overrides = readPaymentOverrides();
  overrides[paymentId] = { ...overrides[paymentId], ...patch };
  writePaymentOverrides(overrides);
}

export function createOwnerPayment(payment: OwnerPayment) {
  const additions = readPaymentAdditions();
  writePaymentAdditions([...additions, payment]);
}

// ---------------------------------------------------------------------------
// Maintenance — visibility for the owner; operations belong to whoever is
// assigned. Reframed from the same requests the renter filed and the
// technicians already named in maintenance-data.ts, so the same issue reads
// identically from either side.
// ---------------------------------------------------------------------------

export type OwnerMaintenanceRequest = {
  id: string;
  propertyId: string;
  title: string;
  reportedBy: string;
  managedBy: string | null;
  technician: string | null;
  status: MaintenanceStatus;
  priority: "Normal" | "Urgent";
  submitted: string;
  description: string;
  scheduledVisit: { date: string; time: string } | null;
};

export const OWNER_MAINTENANCE: OwnerMaintenanceRequest[] = [
  {
    id: "HH-MNT-1042",
    propertyId: "kacyiru-2br",
    title: "Leaking kitchen tap",
    reportedBy: "Julien Mugisha",
    managedBy: "Jean Mugisha",
    technician: "Moses Habimana",
    status: "In Progress",
    priority: "Normal",
    submitted: "14 August 2026",
    description: "The kitchen tap has been leaking continuously. Water is collecting under the sink.",
    scheduledVisit: { date: "17 August 2026", time: "10:00 AM – 11:00 AM" },
  },
  {
    id: "HH-MNT-1050",
    propertyId: "remera-3br",
    title: "No water in apartment",
    reportedBy: "Julien Mugisha",
    managedBy: "Sarah Uwase",
    technician: null,
    status: "Open",
    priority: "Urgent",
    submitted: "16 August 2026",
    description: "There has been no running water in the house since noon.",
    scheduledVisit: null,
  },
  {
    id: "HH-MNT-1039",
    propertyId: "kacyiru-2br",
    title: "Bathroom door lock sticking",
    reportedBy: "Julien Mugisha",
    managedBy: "Jean Mugisha",
    technician: "Claude Mutabazi",
    status: "Scheduled",
    priority: "Normal",
    submitted: "12 August 2026",
    description: "The bathroom lock is difficult to open from inside.",
    scheduledVisit: { date: "18 August 2026", time: "2:00 PM – 3:00 PM" },
  },
  {
    id: "HH-MNT-1024",
    propertyId: "kacyiru-2br",
    title: "Bedroom light not working",
    reportedBy: "Julien Mugisha",
    managedBy: "Jean Mugisha",
    technician: null,
    status: "Resolved",
    priority: "Normal",
    submitted: "2 August 2026",
    description: "The ceiling light stopped turning on. The faulty fitting was replaced and tested.",
    scheduledVisit: null,
  },
];

// ---------------------------------------------------------------------------
// Owner Overview phase (Phase 4) -- Section 26-28: OWNER_RECENT_ACTIVITY
// used to live here as a fixed array Overview rendered as though it were
// live activity. No record in this file (or pm-work.ts/maintenance-data.ts/
// team-data.ts) carries a real timestamp for "when did this status last
// change" -- only owner-notifications.ts's own notification stream does,
// and deriving Recent Activity from that would just be a second view of
// Notifications (Section 31), which the brief explicitly says to avoid by
// removing the section rather than faking the distinction. Removed rather
// than kept dishonest -- see the Phase 4 implementation report.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Small formatting helpers shared by the owner pages.
// ---------------------------------------------------------------------------

export function propertyTitle(propertyId: string): string {
  return BASE_OWNER_PROPERTIES.find((property) => property.id === propertyId)?.title ?? propertyId;
}

export function propertyLocation(propertyId: string): string {
  return BASE_OWNER_PROPERTIES.find((property) => property.id === propertyId)?.location ?? "";
}

// Owner Overview phase (Phase 4) -- replaces rentReceivedThisMonth(), which
// read the frozen OWNER_PAYMENTS array (never a PM-recorded payment) and
// matched a literal "August 2026" substring in the date string -- the same
// hardcoded-seeded-date pattern Phase 1 already removed from the overdue
// Attention row. Deliberately not scoped to "this calendar month": the
// only field that could express that is the same free-form date string,
// and re-introducing a date match here would be the exact thing Section 50
// says not to do. Expected/Received/Outstanding/Overdue instead means the
// full set of currently-tracked payment obligations, live from
// getOwnerPayments(), status-derived only.
export type OwnerFinancialSummary = {
  expected: number;
  received: number;
  outstanding: number;
  overdue: number;
  overdueCount: number;
};

export function getOwnerFinancialSummary(): OwnerFinancialSummary {
  const tracked = getOwnerPayments().filter((p) => p.status === "Paid" || p.status === "Pending" || p.status === "Overdue" || p.status === "Due");
  const sum = (status: PaymentStatus) => tracked.filter((p) => p.status === status).reduce((total, p) => total + p.amountValue, 0);
  const received = sum("Paid");
  const outstanding = sum("Pending") + sum("Due");
  const overdue = sum("Overdue");
  return {
    expected: received + outstanding + overdue,
    received,
    outstanding,
    overdue,
    overdueCount: tracked.filter((p) => p.status === "Overdue").length,
  };
}

export function formatRwf(amount: number): string {
  return `RWF ${amount.toLocaleString("en-US")}`;
}
