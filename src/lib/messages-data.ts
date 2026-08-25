// Messages Synchronization phase (Phase 5) -- the ONE shared conversation
// store every dashboard (Owner, Agent/PM, Renter) reads and writes through.
//
// Before this phase, three fully independent messaging datasets existed:
//   - owner-dashboard/messages/page.tsx: a local INITIAL_CONVERSATIONS
//     array + component useState, never persisted, never shared.
//   - professional-work.ts: a per-professional "inbox" (Conversation keyed
//     by one professionalId, the other party described only by a
//     personName/personRole STRING, sender tagged "renter" | "professional"
//     -- never a real second participant id).
//   - lib/message-threads.ts + renter-dashboard/messages/page.tsx: a
//     renter-only outbound log, merged with the renter page's own
//     hardcoded conversation list, opened by ?host={name} (string match).
// A conversation between the same two real people could exist in up to two
// of these at once, each with its own copy of "what was said," and neither
// side's dashboard could ever show the other's reply.
//
// This file replaces the SHARED-RELATIONSHIP portion of all three with one
// participant-addressed store. It does not absorb every renter conversation
// type -- flatmate matches, HauxHunt support, and enquiries to people who
// aren't registered HauxHunt participants (an off-platform Owner, a
// prospective applicant who isn't the demo renter persona) have no second
// dashboard to synchronize with, so they correctly stay outside this model;
// see the Phase 5 implementation report for the full list.

import { OWNER, RENTER_DEMO_NAME } from "@/lib/owner-data";
import { getProfessional, type ProfessionalRole } from "@/lib/team-data";
import type { StaticImageData } from "next/image";

import ownerPortrait from "@/assets/images/flatmate-billy.jpg";
import renterPortrait from "@/assets/images/julien.jpg";

// ---------------------------------------------------------------------------
// Participants -- stable identity, never a display name (Section 6/7/62/64).
// ---------------------------------------------------------------------------

export type ParticipantRole = "Property Owner" | "Property Manager" | "Agent" | "Renter";

export type Participant = {
  id: string;
  name: string;
  role: ParticipantRole;
  verified: boolean;
  avatar?: StaticImageData;
};

// Single-persona prototype (unchanged from every prior phase): one Owner,
// one demo Renter. These are the smallest stable ids the messaging layer
// needs beyond what team-data.ts already provides for professionals --
// introduced here rather than a new identity/auth system (Section 6).
export const OWNER_PARTICIPANT_ID = "owner-pacifique";
export const RENTER_PARTICIPANT_ID = "renter-julien";

function roleLabelFor(role: ProfessionalRole): ParticipantRole {
  return role === "agent" ? "Agent" : "Property Manager";
}

// The one place any id resolves to a real, named, roled participant --
// Owner, the demo Renter, or any RegisteredProfessional (team-data.ts).
// Returns undefined for anything else (Section 78: fail safe, never guess).
export function getParticipant(id: string): Participant | undefined {
  if (id === OWNER_PARTICIPANT_ID) return { id, name: OWNER.name, role: "Property Owner", verified: true, avatar: ownerPortrait };
  if (id === RENTER_PARTICIPANT_ID) return { id, name: RENTER_DEMO_NAME, role: "Renter", verified: true, avatar: renterPortrait };
  const professional = getProfessional(id);
  if (professional) return { id, name: professional.name, role: roleLabelFor(professional.role), verified: professional.verified, avatar: professional.avatar };
  return undefined;
}

// ---------------------------------------------------------------------------
// Conversation / Message -- the smallest useful shared model (Section 5).
// 1-to-1 only (Section 33); context is optional and never forces every
// conversation to carry every kind of reference (Section 13).
// ---------------------------------------------------------------------------

export type ConversationContextType = "property" | "application" | "rental" | "rental-setup" | "maintenance" | "team";

export type ConversationContext = {
  type: ConversationContextType;
  propertyId?: string;
  applicationId?: string;
  rentalId?: string;
  maintenanceRequestId?: string;
  // Short, human label for the context row/badge ("Maintenance", "Rental
  // Setup") -- presentation only, never used for lookup/identity.
  label: string;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  ts: number;
};

export type Conversation = {
  id: string;
  participantIds: [string, string];
  context?: ConversationContext;
  messages: Message[];
  // Section 43/44: read state belongs to the recipient, not the message.
  // The last time each participant opened this conversation -- a message
  // is unread for a participant if it was sent by the OTHER participant
  // after that participant's own lastReadTs.
  lastReadTs: Record<string, number>;
};

// ---------------------------------------------------------------------------
// Seed -- migrated from all three prior sources (Section 15), not
// reinvented. Where the same relationship existed in more than one of the
// old datasets (e.g. Jean/Owner's PM and the renter's own "kacyiru-owner"
// thread both being Jean <-> Julien about Kacyiru Residence), the content
// is merged into ONE conversation instead of kept as duplicates -- this is
// the concrete case Phase 5 exists to fix. Conversations with someone who
// has no real HauxHunt dashboard identity (an off-platform independent
// Owner, an applicant who isn't the one demo Renter persona) are not
// migrated here -- see the implementation report.
// ---------------------------------------------------------------------------

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = Date.now();

function msg(id: string, senderId: string, text: string, ts: number): Message {
  return { id, senderId, text, ts };
}

const SEED_CONVERSATIONS: Conversation[] = [
  // Owner <-> Jean (Property Manager) -- migrated from Owner Messages'
  // "jean-mugisha" thread (maintenance context).
  {
    id: "conv-owner-jean",
    participantIds: [OWNER_PARTICIPANT_ID, "jean-mugisha"],
    context: { type: "maintenance", propertyId: "kacyiru-2br", maintenanceRequestId: "HH-MNT-1042", label: "Maintenance" },
    messages: [
      msg("m1", "jean-mugisha", "The kitchen tap leak at Kacyiru Residence is scheduled for a visit tomorrow at 10 AM.", now - 5 * HOUR),
      msg("m2", OWNER_PARTICIPANT_ID, "Thanks Jean, please keep me posted once it's resolved.", now - 4 * HOUR),
    ],
    lastReadTs: { [OWNER_PARTICIPANT_ID]: now, "jean-mugisha": now - 4 * HOUR },
  },
  // Owner <-> Sarah (Agent) -- migrated from Owner Messages' "sarah-uwase"
  // thread and professional-work.ts's "conv-pacifique-application" (the
  // same relationship, previously stored twice: once in Owner's own local
  // state, once under Sarah's professional inbox with the Owner named only
  // as a string).
  {
    id: "conv-owner-sarah",
    participantIds: [OWNER_PARTICIPANT_ID, "sarah-uwase"],
    context: { type: "application", propertyId: "remera-3br", applicationId: "HH-APP-0250", label: "Application" },
    messages: [
      msg("m1", "sarah-uwase", "Julien would like to renew at Remera Family House. I'd recommend approving — he's been a reliable tenant.", now - 3 * HOUR),
      msg("m2", "sarah-uwase", "Also flagging that August rent is a few days overdue.", now - 2 * HOUR),
      msg("m3", OWNER_PARTICIPANT_ID, "Thanks for the recommendation, Sarah — I'll take a look at Julien's renewal today.", now - HOUR),
    ],
    lastReadTs: { [OWNER_PARTICIPANT_ID]: now, "sarah-uwase": now - 2 * HOUR },
  },
  // Owner <-> Aline (Agent) -- migrated from Owner Messages' "aline-uwase"
  // thread (rental setup / agreement approval context).
  {
    id: "conv-owner-aline",
    participantIds: [OWNER_PARTICIPANT_ID, "aline-uwase"],
    context: { type: "rental-setup", propertyId: "nyarutarama-2br", label: "Rental Setup" },
    messages: [
      msg("m1", "aline-uwase", "The agreement for Nyarutarama Garden Apartment is ready. It needs your approval before I request the deposit.", now - DAY + 2 * HOUR),
      msg("m2", OWNER_PARTICIPANT_ID, "Reviewing it now, thank you.", now - DAY + 3 * HOUR),
    ],
    lastReadTs: { [OWNER_PARTICIPANT_ID]: now, "aline-uwase": now - DAY + 3 * HOUR },
  },
  // Owner <-> Patrick (Property Manager) -- migrated from Owner Messages'
  // "patrick" thread and professional-work.ts's
  // "conv-pacifique-patrick-application" (again the same relationship, two
  // separate prior records).
  {
    id: "conv-owner-patrick",
    participantIds: [OWNER_PARTICIPANT_ID, "patrick"],
    context: { type: "application", propertyId: "kibagabaga-modern-family-home", applicationId: "HH-APP-0239", label: "Application" },
    messages: [
      msg("m1", "patrick", "A new application came in for Modern Family Home from Divine Keza. I'll begin review shortly.", now - DAY),
      msg("m2", OWNER_PARTICIPANT_ID, "Patrick, let me know once you've had a chance to review Divine's application.", now - 3 * HOUR),
    ],
    lastReadTs: { [OWNER_PARTICIPANT_ID]: now, patrick: now - DAY },
  },
  // Owner <-> Kevin (Agent) -- migrated from Owner Messages' "kevin-nshuti"
  // thread (listing published).
  {
    id: "conv-owner-kevin",
    participantIds: [OWNER_PARTICIPANT_ID, "kevin-nshuti"],
    context: { type: "property", propertyId: "kibagabaga-modern-family-home", label: "Listing" },
    messages: [msg("m1", "kevin-nshuti", "Modern Family Home is now live. I've already had a few enquiries come in.", now - 3 * DAY)],
    lastReadTs: { [OWNER_PARTICIPANT_ID]: now, "kevin-nshuti": now - 3 * DAY },
  },
  // Owner <-> Julien (Renter) -- migrated from Owner Messages'
  // "julien-mugisha" thread. A direct Owner-Renter line, legitimate because
  // of the active Kacyiru tenancy (Section 26) -- distinct from Jean's own
  // PM <-> Renter relationship on the same property below.
  {
    id: "conv-owner-julien",
    participantIds: [OWNER_PARTICIPANT_ID, RENTER_PARTICIPANT_ID],
    context: { type: "rental", propertyId: "kacyiru-2br", rentalId: "HH-RENT-104", label: "Active Rental" },
    messages: [
      msg("m1", RENTER_PARTICIPANT_ID, "Hi, just confirming rent for September will go out on the 1st as usual.", now - 6 * DAY),
      msg("m2", OWNER_PARTICIPANT_ID, "Sounds good, thanks for the update.", now - 6 * DAY + HOUR),
    ],
    lastReadTs: { [OWNER_PARTICIPANT_ID]: now, [RENTER_PARTICIPANT_ID]: now - 6 * DAY + HOUR },
  },
  // Jean (PM) <-> Julien (Renter) -- the central consolidation case Phase 5
  // exists to fix. Previously THREE separate copies of this relationship:
  // professional-work.ts's "conv-julien-kacyiru-maintenance" (maintenance),
  // professional-work.ts's "conv-julien-remera-payment" (a second property
  // Jean also manages for Julien), and the renter's own "kacyiru-owner"
  // thread (rent reminders). Section 61: one relationship across multiple
  // shared properties stays ONE conversation, not one per property.
  {
    id: "conv-jean-julien",
    participantIds: ["jean-mugisha", RENTER_PARTICIPANT_ID],
    context: { type: "maintenance", propertyId: "kacyiru-2br", maintenanceRequestId: "HH-MNT-1042", label: "Kacyiru Residence + 1 more" },
    messages: [
      msg("m1", "jean-mugisha", "Hi Julien, thanks for submitting your application. We are currently verifying references and will get back to you by Friday.", now - 15 * DAY),
      msg("m2", "jean-mugisha", "Just a reminder that rent for Kacyiru Residence is due on the 1st. Let me know if you have any questions about your payment.", now - DAY + 2 * HOUR),
      msg("m3", "jean-mugisha", "Hi Julien, your August rent for Remera Family House is now 5 days overdue — could you let me know when to expect it?", now - 2 * DAY),
      msg("m4", RENTER_PARTICIPANT_ID, "Hi Jean, just checking on the kitchen tap repair — any update on timing?", now - DAY - HOUR),
      msg("m5", "jean-mugisha", "Hi Julien, Moses is scheduled for tomorrow morning between 10 and 11.", now - DAY),
    ],
    lastReadTs: { "jean-mugisha": now, [RENTER_PARTICIPANT_ID]: now - DAY },
  },
  // Sarah (Agent) <-> Julien (Renter) -- migrated from
  // professional-work.ts's "conv-julien-remera-3br" (renewal walkthrough).
  {
    id: "conv-sarah-julien",
    participantIds: ["sarah-uwase", RENTER_PARTICIPANT_ID],
    context: { type: "application", propertyId: "remera-3br", label: "Application" },
    messages: [
      msg("m1", RENTER_PARTICIPANT_ID, "Hello, I'm interested in renewing at Remera Family House. Could we schedule a walkthrough first?", now - 2 * DAY),
      msg("m2", "sarah-uwase", "Hi Julien, of course — I've scheduled tomorrow at 10:00 for a walkthrough.", now - 2 * DAY + HOUR),
    ],
    lastReadTs: { "sarah-uwase": now, [RENTER_PARTICIPANT_ID]: now - 2 * DAY + HOUR },
  },
  // Kevin (Agent) <-> Julien (Renter) -- migrated from
  // professional-work.ts's "conv-julien-remera-house" (an independently
  // authorized property, not a Team assignment -- confirms conversation
  // identity never depends on team membership, Section 60).
  {
    id: "conv-kevin-julien",
    participantIds: ["kevin-nshuti", RENTER_PARTICIPANT_ID],
    context: { type: "property", propertyId: "remera-house-independent", label: "Listing Enquiry" },
    messages: [
      msg("m1", RENTER_PARTICIPANT_ID, "Good afternoon, I saw Remera House listed. Is it still for rent, and can I arrange a viewing?", now - 2 * HOUR),
      msg("m2", "kevin-nshuti", "Hello Julien, yes it's available. I've scheduled a viewing for today at 14:30 — I'll send the entrance details shortly.", now - HOUR),
    ],
    lastReadTs: { "kevin-nshuti": now - HOUR, [RENTER_PARTICIPANT_ID]: now },
  },
  // Renter Messages Integration phase (Phase 5.5) -- migrated from the
  // renter-local "patrick-manager" thread (a viewing confirmation), found
  // while integrating Renter Messages onto this store: Patrick is a real
  // registered professional, so this relationship belongs here too, not
  // just in Owner <-> Patrick's own conversation.
  {
    id: "conv-patrick-julien",
    participantIds: ["patrick", RENTER_PARTICIPANT_ID],
    context: { type: "property", propertyId: "kibagabaga-modern-family-home", label: "Listing Enquiry" },
    messages: [msg("m1", "patrick", "Hello Julien, your viewing request for Saturday at 10:00 AM has been confirmed. See you there!", now - DAY)],
    // No entry for the renter -- hasUnreadFor treats a missing lastReadTs
    // as 0, so this starts unread for Julien, matching the old thread's
    // seeded unreadCount of 1.
    lastReadTs: { patrick: now - DAY },
  },
];

// ---------------------------------------------------------------------------
// Store -- same sessionStorage + window.dispatchEvent/addEventListener
// pattern already established in owner-data.ts / pm-work.ts / team-data.ts.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "hauxhunt-conversations";
const MESSAGES_EVENT = "hauxhunt-messages-changed";

// Runtime crash fix -- readConversations previously trusted whatever shape
// was sitting under STORAGE_KEY once it passed Array.isArray, so a
// conversation persisted under an earlier version of this schema (from
// before this file's current Conversation shape existed) could silently
// reach every reader with a missing participantIds/messages and crash the
// first .filter/.includes that touched it. This validates each entry the
// same "fail safe, never guess" way getParticipant already does -- a
// malformed entry is dropped rather than trusted, never patched or guessed
// at. If nothing valid survives, this falls back to seed data exactly like
// the no-value/parse-error paths already did.
function isValidConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<Conversation>;
  return (
    typeof c.id === "string" &&
    Array.isArray(c.participantIds) &&
    c.participantIds.length === 2 &&
    Array.isArray(c.messages) &&
    typeof c.lastReadTs === "object" &&
    c.lastReadTs !== null
  );
}

function readConversations(): Conversation[] {
  if (typeof window === "undefined") return SEED_CONVERSATIONS;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_CONVERSATIONS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return SEED_CONVERSATIONS;
    const valid = parsed.filter(isValidConversation);
    return valid.length > 0 ? valid : SEED_CONVERSATIONS;
  } catch {
    return SEED_CONVERSATIONS;
  }
}

function writeConversations(list: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  window.dispatchEvent(new Event(MESSAGES_EVENT));
}

export function subscribeToMessages(callback: () => void) {
  window.addEventListener(MESSAGES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MESSAGES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// ---------------------------------------------------------------------------
// Reads -- always participant-filtered (Section 31/32/68: membership is the
// visibility rule, never property ownership or team membership alone).
// ---------------------------------------------------------------------------

function latestTs(conversation: Conversation): number {
  return conversation.messages.reduce((latest, m) => Math.max(latest, m.ts), 0);
}

// Section 47: sorted by most recent message, always derived, never a
// separately maintained order.
export function getConversationsFor(participantId: string): Conversation[] {
  return readConversations()
    .filter((c) => c.participantIds.includes(participantId))
    .sort((a, b) => latestTs(b) - latestTs(a));
}

// Section 77: only returns a conversation to a real participant of it.
// Anyone else gets undefined -- never partial/leaked content.
export function getConversationFor(participantId: string, conversationId: string): Conversation | undefined {
  return getConversationsFor(participantId).find((c) => c.id === conversationId);
}

export function hasUnreadFor(conversation: Conversation, participantId: string): boolean {
  const lastRead = conversation.lastReadTs[participantId] ?? 0;
  return conversation.messages.some((m) => m.senderId !== participantId && m.ts > lastRead);
}

export function getUnreadConversationCount(participantId: string): number {
  return getConversationsFor(participantId).filter((c) => hasUnreadFor(c, participantId)).length;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4).toString(36)}`;
}

// Section 8/14/35/36/64/65: the ONE lookup+create path every contextual
// "Message" action goes through. Matches by participant SET (order-
// independent, ids only -- never a display name), so the same two people
// always resolve to the same conversation regardless of which screen sent
// them here, and clicking "Message" a second time never creates a
// duplicate. Section 78: refuses to create a conversation with a missing
// participant or with the caller messaging themselves.
export function getOrCreateConversation(participantA: string, participantB: string, context?: ConversationContext): Conversation | null {
  if (!participantA || !participantB || participantA === participantB) return null;
  if (!getParticipant(participantA) || !getParticipant(participantB)) return null;

  const target = [participantA, participantB].sort();
  const conversations = readConversations();
  const existing = conversations.find((c) => {
    const ids = [...c.participantIds].sort();
    return ids[0] === target[0] && ids[1] === target[1];
  });
  if (existing) {
    // A later, more specific context (e.g. a fresh maintenance request) is
    // worth updating in place -- never spawns a second thread for it
    // (Section 14).
    if (context && existing.context?.type !== context.type) {
      const updated = conversations.map((c) => (c.id === existing.id ? { ...c, context } : c));
      writeConversations(updated);
      return { ...existing, context };
    }
    return existing;
  }

  const conversation: Conversation = {
    id: nextId("conv"),
    participantIds: [participantA, participantB],
    context,
    messages: [],
    lastReadTs: {},
  };
  writeConversations([...conversations, conversation]);
  return conversation;
}

// Section 62: sender is always an explicit id, never inferred from
// position/index or a hardcoded role assumption.
export function sendMessageAs(conversationId: string, senderId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const conversations = readConversations();
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation || !conversation.participantIds.includes(senderId)) return;
  const message: Message = { id: nextId("msg"), senderId, text: trimmed, ts: Date.now() };
  writeConversations(conversations.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c)));
}

// Section 44: marks the conversation read for ONE participant only -- the
// other participant's own lastReadTs is untouched.
export function markConversationReadFor(conversationId: string, participantId: string) {
  const conversations = readConversations();
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation || !conversation.participantIds.includes(participantId)) return;
  if (!hasUnreadFor(conversation, participantId)) return;
  writeConversations(
    conversations.map((c) => (c.id === conversationId ? { ...c, lastReadTs: { ...c.lastReadTs, [participantId]: Date.now() } } : c)),
  );
}
