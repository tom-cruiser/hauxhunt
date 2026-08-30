// Professional operational work -- Enquiries, Viewings, Applications (for
// independently authorized properties), Conversations, and Notifications --
// for the Agent dashboard redesign phase, built to extend to Property
// Manager later without rework.
//
// Every record here resolves to a real propertyId (never a title string)
// and a real professionalId, and is scoped by actually reading who has
// access to what:
//
//   - Property identity, authority source, and listing state all come from
//     professional-properties.ts -- never duplicated here.
//   - Team-assigned Applications are NOT reinvented here -- they're
//     owner-data.ts's existing OWNER_APPLICATIONS, filtered to this
//     professional. Only Independent properties (which never had an
//     application concept before) get a small new seed here.
//   - "Assist with applications" / "Review applications" responsibility
//     gates whether a Team-assigned application is visible at all, the same
//     way Listing management is gated by "Manage listing" (Foundation
//     Cleanup phase) -- reusing the existing responsibility concept, not a
//     new permission system.
//
// Mock person consistency: Julien Mugisha (the recurring renter across
// owner-data.ts's rentals/applications/payments) is reused here rather than
// invented anew, wherever the same lifecycle continues. A small number of
// fresh names (Aline Mukamana, Grace Niyonsaba) exist only where a genuinely
// new, not-yet-progressed enquiry is needed for the interactive demo.

import {
  getOwnerApplication,
  getOwnerApplications,
  updateOwnerApplication,
  RENTER_DEMO_NAME,
  type ApplicationStatus,
  type OwnerApplication,
} from "@/lib/owner-data";
import { getActiveAssignmentsFor, getActiveAssignmentsForProperty, getProfessional, type ProfessionalRole, type RegisteredProfessional } from "@/lib/team-data";
import { getPropertyAccessDetail, getProfessionalPropertyCards, resolveAnyPropertyLocation, resolveAnyPropertyTitle } from "@/lib/professional-properties";
import {
  RENTER_PARTICIPANT_ID,
  getConversationsFor as getSharedConversationsFor,
  getOrCreateConversation,
  getParticipant as getSharedParticipant,
  hasUnreadFor as sharedHasUnreadFor,
  sendMessageAs,
} from "@/lib/messages-data";

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

export type EnquiryStatus = "New" | "Replied" | "Viewing Scheduled" | "Closed";

export type Enquiry = {
  id: string;
  propertyId: string;
  professionalId: string;
  renterName: string;
  message: string;
  receivedAt: string;
  ts: number;
  status: EnquiryStatus;
  viewingId?: string;
  conversationId?: string;
};

const SEED_ENQUIRIES: Enquiry[] = [
  {
    id: "enq-divine-kibagabaga",
    propertyId: "kibagabaga-modern-family-home",
    professionalId: "kevin-nshuti",
    renterName: "Divine Keza",
    message: "Hello, is the Modern Family Home still available? We'd like to come see it this week.",
    receivedAt: "3 days ago",
    ts: Date.now() - 3 * 86_400_000,
    status: "Viewing Scheduled",
    viewingId: "view-divine-kibagabaga",
    conversationId: "conv-divine-kibagabaga",
  },
  {
    id: "enq-aline-kibagabaga",
    propertyId: "kibagabaga-modern-family-home",
    professionalId: "kevin-nshuti",
    renterName: "Aline Mukamana",
    message: "Hi, does the rent include water and backup power? I'm relocating with my family next month.",
    receivedAt: "20 min ago",
    ts: Date.now() - 20 * 60_000,
    status: "New",
  },
  {
    id: "enq-julien-remera-house",
    propertyId: "remera-house-independent",
    professionalId: "kevin-nshuti",
    renterName: "Julien Mugisha",
    message: "Good afternoon, I saw Remera House listed. Is it still for rent, and can I arrange a viewing?",
    receivedAt: "Yesterday",
    ts: Date.now() - 1 * 86_400_000 - 3 * 3_600_000,
    status: "Viewing Scheduled",
    viewingId: "view-julien-remera-house",
    conversationId: "conv-julien-remera-house",
  },
  {
    id: "enq-julien-remera-3br",
    propertyId: "remera-3br",
    professionalId: "sarah-uwase",
    renterName: "Julien Mugisha",
    message: "Hello, I'm interested in renewing at Remera Family House. Could we schedule a walkthrough first?",
    receivedAt: "2 days ago",
    ts: Date.now() - 2 * 86_400_000,
    status: "Viewing Scheduled",
    viewingId: "view-julien-remera-3br",
    conversationId: "conv-julien-remera-3br",
  },
  {
    id: "enq-grace-remera-3br",
    propertyId: "remera-3br",
    professionalId: "sarah-uwase",
    renterName: "Grace Niyonsaba",
    message: "Hi, is Remera Family House pet friendly? We have one small dog.",
    receivedAt: "1 hr ago",
    ts: Date.now() - 1 * 3_600_000,
    status: "New",
  },
  // Property Manager Dashboard phase -- Jean holds "Manage enquiries &
  // viewings" on his Team-assigned properties (Section 19), so his Property
  // Detail's Leasing Activity needs at least one real record to be
  // genuinely testable, not just an empty shell.
  {
    id: "enq-emmanuel-kacyiru",
    propertyId: "kacyiru-2br",
    professionalId: "jean-mugisha",
    renterName: "Emmanuel Nzeyimana",
    message: "Hello, I heard Kacyiru Residence may become available soon. Could you let me know if a unit opens up?",
    receivedAt: "4 hr ago",
    ts: Date.now() - 4 * 3_600_000,
    status: "New",
  },
];

// ---------------------------------------------------------------------------
// Viewings -- same status vocabulary the renter side already uses
// (renter-dashboard/visits/page.tsx's ViewingStatus), so a renter's
// "Reschedule Requested" and a professional's "Reschedule Requested" are the
// same state, never a second name for it. "No-show" is the one addition:
// a real, distinct operational state (the renter never arrived to a
// Confirmed viewing) that "Cancelled" (called off in advance) doesn't cover.
// ---------------------------------------------------------------------------

export type ViewingStatus =
  | "Confirmed"
  | "Awaiting Confirmation"
  | "New Time Suggested"
  | "Reschedule Requested"
  | "Completed"
  | "Cancelled"
  | "Viewing unavailable"
  | "Not interested"
  | "No-show";

export type Viewing = {
  id: string;
  propertyId: string;
  professionalId: string;
  enquiryId?: string;
  renterName: string;
  date: string; // display, e.g. "Today", "22 Aug 2026"
  time: string; // "14:30"
  status: ViewingStatus;
};

const SEED_VIEWINGS: Viewing[] = [
  {
    id: "view-divine-kibagabaga",
    propertyId: "kibagabaga-modern-family-home",
    professionalId: "kevin-nshuti",
    enquiryId: "enq-divine-kibagabaga",
    renterName: "Divine Keza",
    date: "17 Aug 2026",
    time: "11:00",
    status: "Completed",
  },
  {
    id: "view-julien-remera-house",
    propertyId: "remera-house-independent",
    professionalId: "kevin-nshuti",
    enquiryId: "enq-julien-remera-house",
    renterName: "Julien Mugisha",
    date: "Today",
    time: "14:30",
    status: "Confirmed",
  },
  {
    id: "view-julien-remera-3br",
    propertyId: "remera-3br",
    professionalId: "sarah-uwase",
    enquiryId: "enq-julien-remera-3br",
    renterName: "Julien Mugisha",
    date: "Tomorrow",
    time: "10:00",
    status: "Confirmed",
  },
];

// ---------------------------------------------------------------------------
// Applications for INDEPENDENT properties -- the one genuinely new mock
// dataset here. Team-assigned applications are never duplicated; see
// getApplicationsFor below, which merges this with owner-data.ts's real
// OWNER_APPLICATIONS.
// ---------------------------------------------------------------------------

export type IndependentApplication = {
  id: string;
  propertyId: string;
  professionalId: string;
  applicant: string;
  status: ApplicationStatus;
  submitted: string;
  proposedRent: string;
  moveIn: string;
  note: string;
  recommendation?: "Approve" | "Not Selected";
  recommendedBy?: string;
  assistedBy?: string;
  assistedByRole?: string;
};

const INDEPENDENT_APPLICATIONS_KEY = "hauxhunt-independent-applications";
const WORK_EVENT = "hauxhunt-professional-work-changed";

const SEED_INDEPENDENT_APPLICATIONS: IndependentApplication[] = [
  {
    id: "IND-APP-0001",
    propertyId: "remera-house-independent",
    professionalId: "kevin-nshuti",
    applicant: "Julien Mugisha",
    status: "Under Review",
    submitted: "21 Aug 2026",
    proposedRent: "USD 950 / month",
    moveIn: "1 Oct 2026",
    note: "Kevin Nshuti is verifying references before moving this forward.",
  },
  // Cross-Role Lifecycle Synchronization phase -- Section 56's own test
  // scenario: Jean's Verified Independent property (Vision Apartments),
  // already Approved (the off-platform Owner's decision happened outside
  // HauxHunt -- Section 35, no fabricated Owner account), so Jean can walk
  // Start Rental Setup -> Send -> Renter receives it end to end.
  {
    id: "IND-APP-0002",
    propertyId: "vision-apartments-independent",
    professionalId: "jean-mugisha",
    applicant: "Julien Mugisha",
    status: "Approved",
    submitted: "18 Aug 2026",
    proposedRent: "USD 700 / month",
    moveIn: "1 Sep 2026",
    note: "Approved by the property owner outside HauxHunt. Ready for rental setup.",
  },
];

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
  window.dispatchEvent(new Event(WORK_EVENT));
}

export function subscribeToProfessionalWork(callback: () => void) {
  window.addEventListener(WORK_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(WORK_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getEnquiries(): Enquiry[] {
  return readList("hauxhunt-enquiries", SEED_ENQUIRIES);
}
function writeEnquiries(list: Enquiry[]) {
  writeList("hauxhunt-enquiries", list);
}

function getViewings(): Viewing[] {
  return readList("hauxhunt-viewings", SEED_VIEWINGS);
}
function writeViewings(list: Viewing[]) {
  writeList("hauxhunt-viewings", list);
}

function getIndependentApplications(): IndependentApplication[] {
  return readList(INDEPENDENT_APPLICATIONS_KEY, SEED_INDEPENDENT_APPLICATIONS);
}
function writeIndependentApplications(list: IndependentApplication[]) {
  writeList(INDEPENDENT_APPLICATIONS_KEY, list);
}

// ---------------------------------------------------------------------------
// Property-scoped reads. "Which properties does this professional actually
// have access to" always comes from professional-properties.ts -- an
// enquiry/viewing/application whose propertyId isn't in that list is never
// shown, no matter what's in these seed lists (Section 20/52).
// ---------------------------------------------------------------------------

function accessiblePropertyIds(professionalId: string): Set<string> {
  return new Set(getProfessionalPropertyCards(professionalId).map((c) => c.propertyId));
}

export function getEnquiriesFor(professionalId: string): Enquiry[] {
  const ids = accessiblePropertyIds(professionalId);
  return getEnquiries()
    .filter((e) => e.professionalId === professionalId && ids.has(e.propertyId))
    .sort((a, b) => b.ts - a.ts);
}

export function getViewingsFor(professionalId: string): Viewing[] {
  const ids = accessiblePropertyIds(professionalId);
  return getViewings().filter((v) => v.professionalId === professionalId && ids.has(v.propertyId));
}

export function getEnquiry(enquiryId: string): Enquiry | undefined {
  return getEnquiries().find((e) => e.id === enquiryId);
}

export function getViewing(viewingId: string): Viewing | undefined {
  return getViewings().find((v) => v.id === viewingId);
}

// Whether this professional may see/act on Team-assigned applications for a
// property -- "Assist with applications" (Agent) or "Review applications"
// (PM), read straight from their granted responsibilities for that specific
// assignment. Independent applications are gated by Verified authorization
// instead (mirrors the Listing permission rule from Foundation Cleanup).
function hasApplicationAccess(professionalId: string, propertyId: string): boolean {
  const assignment = getActiveAssignmentsFor(professionalId).find((a) => a.propertyId === propertyId);
  if (!assignment) return false;
  return assignment.responsibilities.includes("Assist with applications") || assignment.responsibilities.includes("Review applications");
}

export type AgentApplicationView = {
  id: string;
  propertyId: string;
  applicant: string;
  status: ApplicationStatus;
  submitted: string;
  moveIn: string;
  proposedRent: string;
  note: string;
  requiresOwnerApproval: boolean;
  recommendation?: "Approve" | "Not Selected";
  recommendedBy?: string;
  assistedBy?: string;
  assistedByRole?: string;
  source: "TEAM_ASSIGNMENT" | "INDEPENDENT_AUTHORIZATION";
};

// Cross-Role Lifecycle Synchronization phase -- Section 3/4/43/58: fixes
// the bug the PM phase report identified. VISIBILITY and HANDLER are
// different questions:
//   - Agent visibility is unchanged (frozen -- Section 49): an Agent sees
//     an application only if they are its current handledBy, exactly as
//     before this phase.
//   - PM visibility is now property-responsibility-based: a PM with
//     "Review applications" for a property sees EVERY application on it,
//     regardless of who handledBy currently names. This is the actual fix.
function isApplicationVisibleTo(professional: RegisteredProfessional, application: OwnerApplication): boolean {
  if (professional.role === "property_manager") return true;
  return application.handledBy === professional.name;
}

// The one merged read: real Team-assigned applications (owner-data.ts,
// filtered to this professional + gated by their actual responsibility) +
// this file's Independent applications (gated by Verified authorization,
// checked via professional-properties.ts). Never a disconnected second
// architecture.
export function getApplicationsFor(professionalId: string): AgentApplicationView[] {
  const professional = getProfessional(professionalId);
  if (!professional) return [];

  const team: AgentApplicationView[] = getOwnerApplications()
    .filter((a) => isApplicationVisibleTo(professional, a) && hasApplicationAccess(professionalId, a.propertyId))
    .map((a) => ({
      id: a.id,
      propertyId: a.propertyId,
      applicant: a.applicant,
      status: a.status,
      submitted: a.submitted,
      moveIn: a.moveIn,
      proposedRent: a.proposedRent,
      note: a.note,
      requiresOwnerApproval: a.requiresOwnerApproval,
      recommendation: a.recommendation,
      recommendedBy: a.recommendedBy,
      assistedBy: a.assistedBy,
      assistedByRole: a.assistedByRole,
      source: "TEAM_ASSIGNMENT",
    }));

  const independent: AgentApplicationView[] = getIndependentApplications()
    .filter((a) => a.professionalId === professionalId)
    .filter((a) => {
      const card = getPropertyAccessDetail(professionalId, a.propertyId);
      return card?.authorizationStatus === "Verified";
    })
    .map((a) => ({
      id: a.id,
      propertyId: a.propertyId,
      applicant: a.applicant,
      status: a.status,
      submitted: a.submitted,
      moveIn: a.moveIn,
      proposedRent: a.proposedRent,
      note: a.note,
      requiresOwnerApproval: false,
      recommendation: a.recommendation,
      recommendedBy: a.recommendedBy,
      assistedBy: a.assistedBy,
      assistedByRole: a.assistedByRole,
      source: "INDEPENDENT_AUTHORIZATION",
    }));

  return [...team, ...independent].sort((a, b) => b.submitted.localeCompare(a.submitted));
}

// Section 44: the PM with "Review applications" for a property, resolved
// from the real PropertyAssignment -- displayed as "Current reviewer"
// distinct from the original handledBy/assistedBy attribution, without
// storing a redundant field on the application itself.
export function getCurrentReviewerFor(propertyId: string): { name: string; roleLabel: string } | null {
  const assignment = getActiveAssignmentsForProperty(propertyId).find((a) => a.role === "property_manager" && a.responsibilities.includes("Review applications"));
  if (!assignment) return null;
  const professional = getProfessional(assignment.professionalId);
  if (!professional) return null;
  return { name: professional.name, roleLabel: "Property Manager" };
}

// Owner Rental Setup Continuity phase -- originally resolved a PM with
// "Manage rental setup" so Owner Applications/Rental Setup could defer to
// them instead of showing a competing control. Rentals was since removed as
// a partner-dashboard surface entirely (no PM/Agent page can start, view, or
// complete rental setup any more, whatever their PropertyAssignment
// responsibilities say) -- so this always returns null now, meaning the
// Owner is unconditionally the one who owns the tenancy-setup task. Kept as
// a function (rather than inlined at each call site) so both Owner
// Applications and the Owner Rental Setup route stay in agreement, and so a
// future PM-side Rentals surface, if ever rebuilt, has one place to resolve
// this from again.
// propertyId is kept, unused, for call-site/API-shape parity (see above).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getRentalSetupManagerFor(propertyId: string): { name: string; roleLabel: string } | null {
  return null;
}

// Owner Applications phase -- promoted here (from the Owner Applications
// page, which used to define this locally) so Owner Properties (Phase 3)
// can compute the same "does this application need my decision" signal for
// its own operational summary without re-deriving the rule a second time.
// Same logic as before: an Owner decides when either the Owner's own
// approval was explicitly required, or nobody with "Review applications"
// currently holds that responsibility for the property.
export function ownerDecidesApplication(application: Pick<OwnerApplication, "requiresOwnerApproval" | "propertyId">): boolean {
  if (application.requiresOwnerApproval) return true;
  return getCurrentReviewerFor(application.propertyId) === null;
}

export function getApplication(applicationId: string): (OwnerApplication | IndependentApplication) & { source: "TEAM_ASSIGNMENT" | "INDEPENDENT_AUTHORIZATION" } | null {
  const owned = getOwnerApplication(applicationId);
  if (owned) return { ...owned, source: "TEAM_ASSIGNMENT" };
  const independent = getIndependentApplications().find((a) => a.id === applicationId);
  if (independent) return { ...independent, source: "INDEPENDENT_AUTHORIZATION" };
  return null;
}

// ---------------------------------------------------------------------------
// Conversations -- Messages Synchronization phase (Phase 5): this file used
// to own a full per-professional Conversation model (SEED_CONVERSATIONS,
// its own sender:"renter"|"professional" tag, the other party recorded only
// as a personName/personRole STRING -- never a real second participant, so
// a renter or Owner reply could never appear here). That model is gone;
// messages-data.ts is now the one shared conversation store every dashboard
// reads and writes. What remains below is a thin compatibility adapter for
// the two call sites that predate this phase and were intentionally left
// untouched -- dashboard-shell.tsx's unread nav badge and
// agent-overview.tsx's "Recent Messages" card -- both only ever read
// personName/unread/messages off the return value, so getConversationsFor
// reshapes messages-data.ts's real participant-addressed Conversation into
// that exact old shape rather than requiring either file to change.
// agent-messages-workspace.tsx (Messages itself) calls messages-data.ts
// directly and no longer goes through this adapter at all.
// ---------------------------------------------------------------------------

export type MessageContext = "Property Enquiry" | "Viewing" | "Application" | "Team" | "Rental" | "Payment" | "Maintenance";

export type ConversationMessage = { sender: "renter" | "professional"; text: string; time: string };

export type Conversation = {
  id: string;
  propertyId: string | null;
  professionalId: string;
  personName: string;
  personRole: string;
  context: MessageContext;
  messages: ConversationMessage[];
  unread: boolean;
  updatedAt: string;
  ts: number;
};

function toLegacyContext(type: string | undefined): MessageContext {
  switch (type) {
    case "maintenance":
      return "Maintenance";
    case "application":
    case "rental-setup":
      return "Application";
    case "rental":
      return "Rental";
    case "team":
      return "Team";
    default:
      return "Property Enquiry";
  }
}

export function getConversationsFor(professionalId: string): Conversation[] {
  return getSharedConversationsFor(professionalId).map((c) => {
    const otherId = c.participantIds.find((id) => id !== professionalId) ?? "";
    const other = getSharedParticipant(otherId);
    const last = c.messages[c.messages.length - 1];
    return {
      id: c.id,
      propertyId: c.context?.propertyId ?? null,
      professionalId,
      personName: other?.name ?? "Unknown",
      personRole: other?.role ?? "",
      context: toLegacyContext(c.context?.type),
      messages: c.messages.map((m) => ({
        sender: m.senderId === professionalId ? ("professional" as const) : ("renter" as const),
        text: m.text,
        time: new Date(m.ts).toLocaleDateString(),
      })),
      unread: sharedHasUnreadFor(c, professionalId),
      updatedAt: last ? new Date(last.ts).toLocaleDateString() : "",
      ts: last?.ts ?? 0,
    };
  });
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4).toString(36)}`;
}

// ---------------------------------------------------------------------------
// Mutations that cross Enquiry -> Conversation -> Viewing (Section 23/66).
// ---------------------------------------------------------------------------

// Replying to an enquiry now writes into the SAME shared conversation store
// -- but only when the enquirer is a real, resolvable HauxHunt participant.
// In this prototype that's only ever the one demo Renter persona
// (RENTER_DEMO_NAME); most enquiries come from a prospect with no HauxHunt
// account at all (e.g. "Divine Keza"), who has no dashboard to synchronize
// a shared thread with. For those, the enquiry's own status still updates
// to Replied -- the reply just doesn't produce a Messages thread. This is a
// deliberate, reported limitation (Section 56/60), not a fabricated
// participant identity.
export function replyToEnquiry(enquiryId: string, message: string): string | null {
  const enquiry = getEnquiry(enquiryId);
  if (!enquiry) return null;

  let conversationId: string | undefined = enquiry.conversationId;
  if (enquiry.renterName === RENTER_DEMO_NAME) {
    const conversation = getOrCreateConversation(enquiry.professionalId, RENTER_PARTICIPANT_ID, {
      type: "property",
      propertyId: enquiry.propertyId,
      label: "Property Enquiry",
    });
    if (conversation) {
      sendMessageAs(conversation.id, enquiry.professionalId, message);
      conversationId = conversation.id;
    }
  }

  writeEnquiries(getEnquiries().map((e) => (e.id === enquiryId ? { ...e, status: e.status === "New" ? "Replied" : e.status, conversationId } : e)));
  return conversationId ?? null;
}

export function scheduleViewingFromEnquiry(enquiryId: string, date: string, time: string): string | null {
  const enquiry = getEnquiry(enquiryId);
  if (!enquiry) return null;
  const viewingId = enquiry.viewingId ?? nextId("view");
  const viewings = getViewings();
  const existingIndex = viewings.findIndex((v) => v.id === viewingId);
  const viewing: Viewing = {
    id: viewingId,
    propertyId: enquiry.propertyId,
    professionalId: enquiry.professionalId,
    enquiryId,
    renterName: enquiry.renterName,
    date,
    time,
    status: "Confirmed",
  };
  writeViewings(existingIndex >= 0 ? viewings.map((v, i) => (i === existingIndex ? viewing : v)) : [...viewings, viewing]);
  writeEnquiries(getEnquiries().map((e) => (e.id === enquiryId ? { ...e, status: "Viewing Scheduled", viewingId } : e)));
  return viewingId;
}

export function updateViewingStatus(viewingId: string, status: ViewingStatus) {
  writeViewings(getViewings().map((v) => (v.id === viewingId ? { ...v, status } : v)));
}

export function closeEnquiry(enquiryId: string) {
  writeEnquiries(getEnquiries().map((e) => (e.id === enquiryId ? { ...e, status: "Closed" } : e)));
}

// Agent recommendation, never a final decision (Section 34-36). Team-
// assigned applications write through to owner-data.ts's own override store
// (so the Owner sees it immediately, on their own Applications page);
// Independent applications write to this file's own store.
//
// Cross-Role Lifecycle Synchronization phase -- Section 5/6/44: when an
// Agent recommends, also record assistedBy/assistedByRole, distinct from
// recommendedBy (which is reused for whoever most recently recommended,
// PM or Agent). This lets Application Detail show "Assisted by Kevin
// Nshuti · Agent" even after a PM later reviews the same application.
export function recommendApplicationDecision(
  applicationId: string,
  source: "TEAM_ASSIGNMENT" | "INDEPENDENT_AUTHORIZATION",
  recommendation: "Approve" | "Not Selected",
  recommendedBy: string,
  recommenderRole: ProfessionalRole = "agent",
) {
  const assistedPatch = recommenderRole === "agent" ? { assistedBy: recommendedBy, assistedByRole: "Agent" } : {};
  if (source === "TEAM_ASSIGNMENT") {
    updateOwnerApplication(applicationId, { recommendation, recommendedBy, status: "Decision Pending", ...assistedPatch });
    return;
  }
  writeIndependentApplications(getIndependentApplications().map((a) => (a.id === applicationId ? { ...a, recommendation, recommendedBy, status: "Decision Pending", ...assistedPatch } : a)));
}

// Property Manager Dashboard phase -- a FINAL decision, not a
// recommendation. Only reachable by a PM whose granted responsibilities
// include "Review applications" on a Team-assigned application where the
// Owner has NOT required their own approval (requiresOwnerApproval ===
// false, an existing owner-data.ts field -- never a new permission system).
// Agent's UI never calls this; recommendApplicationDecision above remains
// the only path Agent ever takes.
export function decideApplication(applicationId: string, source: "TEAM_ASSIGNMENT" | "INDEPENDENT_AUTHORIZATION", decision: "Approved" | "Not Selected", decidedBy: string) {
  if (source === "TEAM_ASSIGNMENT") {
    updateOwnerApplication(applicationId, { status: decision, recommendedBy: decidedBy });
    return;
  }
  writeIndependentApplications(getIndependentApplications().map((a) => (a.id === applicationId ? { ...a, status: decision, recommendedBy: decidedBy } : a)));
}

export function updateIndependentApplicationStatus(applicationId: string, status: ApplicationStatus, note?: string) {
  writeIndependentApplications(getIndependentApplications().map((a) => (a.id === applicationId ? { ...a, status, note: note ?? a.note } : a)));
}

// ---------------------------------------------------------------------------
// Notifications -- same seed + live-push + read-state pattern as
// owner-notifications.ts, scoped per professional.
// ---------------------------------------------------------------------------

// Property Manager Dashboard phase adds rental/payment/maintenance as
// genuinely new categories -- purely additive, Agent never produces one.
export type ProfessionalNotificationCategory = "enquiry" | "viewing" | "application" | "team" | "property" | "authorization" | "message" | "rental" | "payment" | "maintenance";

export type ProfessionalNotification = {
  id: string;
  professionalId: string;
  category: ProfessionalNotificationCategory;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
};

const SEED_NOTIFICATIONS: ProfessionalNotification[] = [
  {
    id: "notif-kevin-enquiry",
    professionalId: "kevin-nshuti",
    category: "enquiry",
    title: "New enquiry",
    body: "Aline Mukamana enquired about Modern Family Home.",
    timestamp: Date.now() - 20 * 60_000,
    read: false,
    actionLabel: "View Enquiry",
    actionHref: "/partner-dashboard/enquiries?open=enq-aline-kibagabaga",
  },
  {
    id: "notif-kevin-viewing",
    professionalId: "kevin-nshuti",
    category: "viewing",
    title: "Viewing confirmed",
    body: "Julien Mugisha's viewing at Remera House is confirmed for today at 14:30.",
    timestamp: Date.now() - 2 * 3_600_000,
    read: false,
    actionLabel: "View Calendar",
    actionHref: "/partner-dashboard/enquiries?view=calendar",
  },
  {
    id: "notif-kevin-authorization",
    professionalId: "kevin-nshuti",
    category: "authorization",
    title: "Authorization Verified",
    body: "Your authorization to represent Remera House has been verified.",
    timestamp: Date.now() - 8 * 86_400_000,
    read: true,
    actionLabel: "View Property",
    actionHref: "/partner-dashboard/properties/remera-house-independent",
  },
  {
    id: "notif-kevin-assigned",
    professionalId: "kevin-nshuti",
    category: "property",
    title: "Property assigned",
    body: "You were assigned to Kimihurura Apartment on Kigali Homes.",
    timestamp: Date.now() - 17 * 86_400_000,
    read: true,
    actionLabel: "View Property",
    actionHref: "/partner-dashboard/properties/kimihurura-apartment",
  },
  {
    id: "notif-sarah-enquiry",
    professionalId: "sarah-uwase",
    category: "enquiry",
    title: "New enquiry",
    body: "Grace Niyonsaba enquired about Remera Family House.",
    timestamp: Date.now() - 1 * 3_600_000,
    read: false,
    actionLabel: "View Enquiry",
    actionHref: "/partner-dashboard/enquiries?open=enq-grace-remera-3br",
  },
  {
    id: "notif-sarah-authorization",
    professionalId: "sarah-uwase",
    category: "authorization",
    title: "Authorization Needs Attention",
    body: "We need additional information before we can verify your authorization for Nyamirambo Studio.",
    timestamp: Date.now() - 6 * 86_400_000,
    read: false,
    actionLabel: "Review Property",
    actionHref: "/partner-dashboard/properties/nyamirambo-studio-independent",
  },
  {
    id: "notif-sarah-application",
    professionalId: "sarah-uwase",
    category: "application",
    title: "Sent for decision",
    body: "Your recommendation on Julien Mugisha's renewal was sent to Pacifique Harerimana for decision.",
    timestamp: Date.now() - 1 * 86_400_000,
    read: true,
    actionLabel: "View Application",
    actionHref: "/partner-dashboard/applications?open=HH-APP-0250",
  },
  // Property Manager Dashboard phase -- Jean (multiple responsibilities,
  // canManageAgents) and Patrick (Review applications only, canManageAgents
  // false) each get a distinct notification mix, matching their distinct
  // responsibility scope rather than a generic PM feed.
  {
    id: "notif-jean-payment-overdue",
    professionalId: "jean-mugisha",
    category: "payment",
    title: "Rent overdue",
    body: "Julien Mugisha's August rent for Remera Family House is 5 days overdue.",
    timestamp: Date.now() - 2 * 86_400_000,
    read: false,
    actionLabel: "View Payment",
    actionHref: "/partner-dashboard/payments?open=HH-PAY-20397",
  },
  {
    id: "notif-jean-maintenance",
    professionalId: "jean-mugisha",
    category: "maintenance",
    title: "Urgent maintenance reported",
    body: "Julien Mugisha reported no running water at Remera Family House.",
    timestamp: Date.now() - 4 * 3_600_000,
    read: false,
    actionLabel: "View Request",
    actionHref: "/partner-dashboard/maintenance?open=HH-MNT-1050",
  },
  {
    id: "notif-jean-authorization",
    professionalId: "jean-mugisha",
    category: "authorization",
    title: "Authorization Under Review",
    body: "Your authorization to manage Kibagabaga Residence is still under review.",
    timestamp: Date.now() - 9 * 86_400_000,
    read: true,
    actionLabel: "View Property",
    actionHref: "/partner-dashboard/properties/kibagabaga-residence-independent",
  },
  {
    id: "notif-patrick-application",
    professionalId: "patrick",
    category: "application",
    title: "New application to review",
    body: "Divine Keza applied for Modern Family Home.",
    timestamp: Date.now() - 3 * 3_600_000,
    read: false,
    actionLabel: "View Application",
    actionHref: "/partner-dashboard/applications?open=HH-APP-0239",
  },
  {
    id: "notif-patrick-authorization",
    professionalId: "patrick",
    category: "authorization",
    title: "Authorization Rejected",
    body: "We couldn't verify your authorization for Gisozi Duplex.",
    timestamp: Date.now() - 10 * 86_400_000,
    read: false,
    actionLabel: "View Property",
    actionHref: "/partner-dashboard/properties/gisozi-duplex-independent",
  },
];

const NOTIFICATION_READ_KEY = "hauxhunt-professional-notification-read-ids";
const NOTIFICATION_SESSION_KEY = "hauxhunt-professional-session-notifications";

function getNotificationReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(NOTIFICATION_READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveNotificationReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

function getSessionNotifications(): ProfessionalNotification[] {
  return readList(NOTIFICATION_SESSION_KEY, []);
}

// useSyncExternalStore (agent-notifications.tsx) requires its snapshot
// getter to return the SAME reference when nothing has actually changed --
// otherwise React sees "new data" on every read and can loop ("The result
// of getServerSnapshot should be cached"). getProfessionalNotifications
// used to build a fresh array on every call; cached here (one slot,
// keyed by professionalId, matching notifications.ts's renter-side
// pattern) and invalidated only by the three mutators below.
let notificationsCache: { professionalId: string; result: ProfessionalNotification[] } | null = null;
let unreadCountCache: { professionalId: string; result: number } | null = null;

function invalidateNotificationsCache() {
  notificationsCache = null;
  unreadCountCache = null;
}

export function pushProfessionalNotification(notification: Omit<ProfessionalNotification, "id" | "timestamp" | "read">) {
  const list = getSessionNotifications();
  list.unshift({ ...notification, id: nextId("session-notif"), timestamp: Date.now(), read: false });
  invalidateNotificationsCache();
  writeList(NOTIFICATION_SESSION_KEY, list);
}

export function getProfessionalNotifications(professionalId: string): ProfessionalNotification[] {
  if (notificationsCache && notificationsCache.professionalId === professionalId) return notificationsCache.result;
  const readIds = getNotificationReadIds();
  const seeded = SEED_NOTIFICATIONS.filter((n) => n.professionalId === professionalId).map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
  const live = getSessionNotifications()
    .filter((n) => n.professionalId === professionalId)
    .map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
  const result = [...live, ...seeded].sort((a, b) => b.timestamp - a.timestamp);
  notificationsCache = { professionalId, result };
  return result;
}

export function getProfessionalUnreadCount(professionalId: string): number {
  if (unreadCountCache && unreadCountCache.professionalId === professionalId) return unreadCountCache.result;
  const result = getProfessionalNotifications(professionalId).filter((n) => !n.read).length;
  unreadCountCache = { professionalId, result };
  return result;
}

export function markProfessionalNotificationRead(id: string) {
  const ids = getNotificationReadIds();
  if (ids.has(id)) return;
  ids.add(id);
  saveNotificationReadIds(ids);
  invalidateNotificationsCache();
  window.dispatchEvent(new Event(WORK_EVENT));
}

export function markAllProfessionalNotificationsRead(professionalId: string) {
  const ids = getNotificationReadIds();
  for (const n of getProfessionalNotifications(professionalId)) ids.add(n.id);
  saveNotificationReadIds(ids);
  invalidateNotificationsCache();
  window.dispatchEvent(new Event(WORK_EVENT));
}

// Small formatting helpers reused by Overview/Enquiries/Applications so
// none of them need to re-derive property title/location themselves. Always
// the "any source" resolvers (professional-properties.ts) -- never
// owner-data.ts's Pacifique-only propertyTitle/propertyLocation, which
// would silently go blank for an Independent or other-Team property.
export { resolveAnyPropertyTitle, resolveAnyPropertyLocation };
export type { ProfessionalRole };
