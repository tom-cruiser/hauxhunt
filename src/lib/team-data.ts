// Property Team model — Phase 1.
//
// This is the single most important architectural change of this phase:
// TEAM MEMBERSHIP and PROPERTY ASSIGNMENT are now two separate concepts,
// where before (owner-data.ts's old assignPropertyManager/assignAgent) they
// were one atomic action. The lifecycle is now:
//
//   Registered professional (exists on HauxHunt, not on this team)
//     -> invited (TeamInvitation, status "Pending")
//     -> accepts or declines
//     -> Team Member (TeamMembership, status "Active") -- with ZERO
//        properties by default
//     -> Owner separately assigns a property (PropertyAssignment)
//     -> Owner separately grants responsibilities for that property
//
// A Property Manager membership additionally carries `canManageAgents`, a
// distinct, higher-level, owner-granted permission.
//
// Phase 2 spends that permission: a PM with canManageAgents === true may
// invite Agents to the Owner's Team and assign them to properties, but only
// within the PM's OWN delegated property scope (the properties where that
// PM holds an Active "property_manager" PropertyAssignment). The Agent still
// joins the OWNER's team (TEAM_ID never changes based on who invited), and
// every invitation/assignment records WHO acted (`invitedByProfessionalId`
// / `assignedByProfessionalId`) so the Owner retains full visibility and can
// always override. See getManagedPropertyIdsFor / getAgentAssignmentWithinScope
// / getAssignablePropertyIdsFor / getInvitationsCreatedBy below.
//
// Phase 3 -- a professional is NOT owned by a Team. They exist independently
// and may belong to zero, one, or multiple Teams (see the TEAMS registry
// below), plus separately hold INDEPENDENT_AUTHORIZATION property access
// that has no Team at all (see professional-properties.ts, which is the
// source of truth for that second authority source and layers on top of
// this file rather than duplicating it). Because a professional can now be
// active in more than one Team, every getter that used to implicitly mean
// "Pacifique's team" (there was only ever one) now takes an OPTIONAL teamId
// filter: omit it for "everything this professional has, across every
// Team" (what the professional's own dashboard wants), pass TEAM_ID for
// "only Pacifique's team" (what Pacifique's OWNER dashboard must keep
// seeing -- see Section 56 of the Phase 3 brief: an Owner must never see
// another Team's people or a professional's independent work).
//
// This file is the source of truth for "who works on what." owner-data.ts
// now derives OwnerProperty.propertyManager/.agent from the assignments
// here rather than storing them itself -- see getOwnerProperties() there.

import type { StaticImageData } from "next/image";

import jeanPortrait from "@/assets/images/flatmate-joseph.jpg";
import patrickPortrait from "@/assets/images/flatmate-patrick.png";
import gracePortrait from "@/assets/images/flatmate-linda.jpg";
import kevinPortrait from "@/assets/images/flatmate-jackson.jpg";
import alinePortrait from "@/assets/images/flatmate-aline.png";
import sarahPortrait from "@/assets/images/flatmate-queen.jpg";
import davidPortrait from "@/assets/images/flatmate-jacob.jpg";
import emmanuelPortrait from "@/assets/images/flatmate-samuel kwizera.jpg";
import immaculeePortrait from "@/assets/images/flatmate-joan.jpg";

// ---------------------------------------------------------------------------
// Teams. Phase 1/2 only ever created/read ONE team (Pacifique's) -- TEAM_ID
// and TEAM_NAME below are that team specifically, and every existing
// Owner-dashboard file still uses them exactly as before (unchanged).
//
// Phase 3 adds the general registry: a professional can be Active in
// several of these at once. A second, small, mock team ("Kigali Homes")
// exists purely so the professional side has real multi-team data to show
// (My Teams, a second Team-assigned property) -- it does NOT get its own
// Owner dashboard; that owner has no HauxHunt account/login in this
// prototype, only a name for display (see getTeamById).
// ---------------------------------------------------------------------------

export const TEAM_ID = "pacifique-property-team";
export const TEAM_NAME = "Pacifique's Property Team";

export type Team = { id: string; name: string; ownerName: string };

export const TEAMS: Team[] = [
  { id: TEAM_ID, name: TEAM_NAME, ownerName: "Pacifique Harerimana" },
  { id: "kigali-homes-team", name: "Kigali Homes", ownerName: "Diane Umuhoza" },
];

export function getTeamById(teamId: string): Team | undefined {
  return TEAMS.find((t) => t.id === teamId);
}

// ---------------------------------------------------------------------------
// Registered professionals -- people who have a HauxHunt Agent or Property
// Manager account, independent of any Owner's team. The Owner does not
// create these accounts; they only search this pool to invite from. This is
// a mock stand-in for a real user directory -- see the audit ("Assignment
// Without a Team") for why one doesn't exist yet.
// ---------------------------------------------------------------------------

export type ProfessionalRole = "agent" | "property_manager";

export type RegisteredProfessional = {
  id: string;
  name: string;
  role: ProfessionalRole;
  verified: boolean;
  location: string;
  email: string;
  avatar?: StaticImageData;
};

export const REGISTERED_PROFESSIONALS: RegisteredProfessional[] = [
  // Agents
  { id: "kevin-nshuti", name: "Kevin Nshuti", role: "agent", verified: true, location: "Kigali, Rwanda", email: "kevin.nshuti@example.com", avatar: kevinPortrait },
  { id: "aline-uwase", name: "Aline Uwase", role: "agent", verified: true, location: "Kigali, Rwanda", email: "aline.uwase@example.com", avatar: alinePortrait },
  { id: "sarah-uwase", name: "Sarah Uwase", role: "agent", verified: true, location: "Kigali, Rwanda", email: "sarah.uwase@example.com", avatar: sarahPortrait },
  { id: "david-m", name: "David M.", role: "agent", verified: false, location: "Kigali, Rwanda", email: "david.m@example.com", avatar: davidPortrait },
  { id: "emmanuel-bizimana", name: "Emmanuel Bizimana", role: "agent", verified: true, location: "Kigali, Rwanda", email: "emmanuel.b@example.com", avatar: emmanuelPortrait },
  { id: "eric-rugamba", name: "Eric Rugamba", role: "agent", verified: false, location: "Kigali, Rwanda", email: "eric.rugamba@example.com" },
  // Property Managers
  { id: "jean-mugisha", name: "Jean Mugisha", role: "property_manager", verified: true, location: "Kigali, Rwanda", email: "jean.mugisha@example.com", avatar: jeanPortrait },
  { id: "patrick", name: "Patrick", role: "property_manager", verified: false, location: "Kigali, Rwanda", email: "patrick@example.com", avatar: patrickPortrait },
  { id: "grace-umutoni", name: "Grace Umutoni", role: "property_manager", verified: true, location: "Kigali, Rwanda", email: "grace.umutoni@example.com", avatar: gracePortrait },
  { id: "immaculee-mukamana", name: "Immaculee Mukamana", role: "property_manager", verified: true, location: "Kigali, Rwanda", email: "immaculee.m@example.com", avatar: immaculeePortrait },
];

export function getProfessional(id: string): RegisteredProfessional | undefined {
  return REGISTERED_PROFESSIONALS.find((p) => p.id === id);
}

// Messages Synchronization phase (Phase 5) -- a handful of existing Owner
// records (OwnerApplication.handledBy, MaintenanceRequest.managedBy) only
// ever stored a professional's display name, never their id. Used only as
// a one-time bridge at the exact call sites that have nothing but a name to
// start from -- the conversation itself is still addressed by the
// resolved, stable professionalId afterward, never by this name again.
export function getProfessionalByName(name: string): RegisteredProfessional | undefined {
  return REGISTERED_PROFESSIONALS.find((p) => p.name === name);
}

// ---------------------------------------------------------------------------
// Shared responsibility vocabulary. Kept here (moved from owner-data.ts)
// because responsibilities now attach to a PropertyAssignment, not to a
// property record directly.
// ---------------------------------------------------------------------------

export const AGENT_RESPONSIBILITIES = ["Manage listing", "Respond to enquiries", "Manage viewings", "Assist with applications"] as const;

export const PM_RESPONSIBILITIES = [
  "Manage listing",
  "Manage enquiries & viewings",
  "Review applications",
  "Manage rental setup",
  "Manage active rentals",
  "Track rent payments",
  "Handle maintenance",
  "Communicate with renters",
] as const;

export function defaultResponsibilitiesFor(role: ProfessionalRole): string[] {
  return role === "agent" ? [...AGENT_RESPONSIBILITIES] : [...PM_RESPONSIBILITIES];
}

// The person performing an invite/assign action, for display purposes only
// (Phase 2). `professionalId` is who to look up (role, verified, etc);
// `roleLabel` is what to print next to their name ("Property Manager").
// Absent everywhere an Owner acted -- the Owner has no professionalId here.
export type TeamActor = { name: string; professionalId: string; roleLabel: string };

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export type InvitationStatus = "Pending" | "Accepted" | "Declined" | "Cancelled";

export type TeamInvitation = {
  id: string;
  teamId: string;
  professionalId: string;
  role: ProfessionalRole;
  status: InvitationStatus;
  invitedBy: string;
  // Phase 2: who actually sent this invitation, when it wasn't the Owner --
  // a Property Manager acting on the Owner's behalf (see getManagedPropertyIdsFor).
  // Undefined means the Owner sent it. The invitation still always joins the
  // OWNER's team (teamId is always TEAM_ID) -- this field is provenance only,
  // never a second team owner.
  invitedByProfessionalId?: string;
  invitedAt: string;
  ts: number;
};

const SEED_INVITATIONS: TeamInvitation[] = [
  { id: "inv-kevin", teamId: TEAM_ID, professionalId: "kevin-nshuti", role: "agent", status: "Accepted", invitedBy: "You", invitedAt: "18 Aug 2026", ts: Date.parse("2026-08-18") },
  { id: "inv-aline", teamId: TEAM_ID, professionalId: "aline-uwase", role: "agent", status: "Accepted", invitedBy: "You", invitedAt: "16 Aug 2026", ts: Date.parse("2026-08-16") },
  { id: "inv-sarah", teamId: TEAM_ID, professionalId: "sarah-uwase", role: "agent", status: "Accepted", invitedBy: "You", invitedAt: "14 Aug 2026", ts: Date.parse("2026-08-14") },
  { id: "inv-david", teamId: TEAM_ID, professionalId: "david-m", role: "agent", status: "Accepted", invitedBy: "You", invitedAt: "20 Aug 2026", ts: Date.parse("2026-08-20") },
  { id: "inv-jean", teamId: TEAM_ID, professionalId: "jean-mugisha", role: "property_manager", status: "Accepted", invitedBy: "You", invitedAt: "15 Aug 2026", ts: Date.parse("2026-08-15") },
  { id: "inv-patrick", teamId: TEAM_ID, professionalId: "patrick", role: "property_manager", status: "Accepted", invitedBy: "You", invitedAt: "12 Aug 2026", ts: Date.parse("2026-08-12") },
  { id: "inv-grace", teamId: TEAM_ID, professionalId: "grace-umutoni", role: "property_manager", status: "Accepted", invitedBy: "You", invitedAt: "17 Aug 2026", ts: Date.parse("2026-08-17") },
  { id: "inv-emmanuel", teamId: TEAM_ID, professionalId: "emmanuel-bizimana", role: "agent", status: "Pending", invitedBy: "You", invitedAt: "20 Aug 2026", ts: Date.parse("2026-08-20") },
  { id: "inv-immaculee", teamId: TEAM_ID, professionalId: "immaculee-mukamana", role: "property_manager", status: "Pending", invitedBy: "You", invitedAt: "19 Aug 2026", ts: Date.parse("2026-08-19") },
  { id: "inv-eric", teamId: TEAM_ID, professionalId: "eric-rugamba", role: "agent", status: "Declined", invitedBy: "You", invitedAt: "10 Aug 2026", ts: Date.parse("2026-08-10") },
  // Phase 3 -- Kevin's second Team membership, on a completely different
  // Owner's team. "You" wouldn't mean anything from Kevin's point of view
  // here, so invitedBy is Kigali Homes' own owner name.
  { id: "inv-kevin-kigali", teamId: "kigali-homes-team", professionalId: "kevin-nshuti", role: "agent", status: "Accepted", invitedBy: "Diane Umuhoza", invitedAt: "3 Aug 2026", ts: Date.parse("2026-08-03") },
];

// ---------------------------------------------------------------------------
// Team membership -- exists independently of property assignment. An Active
// member may have zero properties.
// ---------------------------------------------------------------------------

export type MembershipStatus = "Active" | "Left" | "Removed";

export type TeamMembership = {
  id: string;
  teamId: string;
  professionalId: string;
  role: ProfessionalRole;
  status: MembershipStatus;
  joinedAt: string;
  canManageAgents?: boolean; // Property Manager only
};

const SEED_MEMBERSHIPS: TeamMembership[] = [
  { id: "mem-kevin", teamId: TEAM_ID, professionalId: "kevin-nshuti", role: "agent", status: "Active", joinedAt: "18 Aug 2026" },
  { id: "mem-aline", teamId: TEAM_ID, professionalId: "aline-uwase", role: "agent", status: "Active", joinedAt: "16 Aug 2026" },
  { id: "mem-sarah", teamId: TEAM_ID, professionalId: "sarah-uwase", role: "agent", status: "Active", joinedAt: "14 Aug 2026" },
  { id: "mem-david", teamId: TEAM_ID, professionalId: "david-m", role: "agent", status: "Active", joinedAt: "20 Aug 2026" },
  { id: "mem-jean", teamId: TEAM_ID, professionalId: "jean-mugisha", role: "property_manager", status: "Active", joinedAt: "15 Aug 2026", canManageAgents: true },
  { id: "mem-patrick", teamId: TEAM_ID, professionalId: "patrick", role: "property_manager", status: "Active", joinedAt: "12 Aug 2026", canManageAgents: false },
  { id: "mem-grace", teamId: TEAM_ID, professionalId: "grace-umutoni", role: "property_manager", status: "Active", joinedAt: "17 Aug 2026", canManageAgents: false },
  // Phase 3 -- Kevin also belongs to a second, unrelated team.
  { id: "mem-kevin-kigali", teamId: "kigali-homes-team", professionalId: "kevin-nshuti", role: "agent", status: "Active", joinedAt: "3 Aug 2026" },
];

// ---------------------------------------------------------------------------
// Property assignments -- the only thing that grants a team member access
// to a specific property, and the only place responsibilities live.
// ---------------------------------------------------------------------------

export type AssignmentStatus = "Active" | "Removed";

export type PropertyAssignment = {
  id: string;
  teamId: string;
  propertyId: string;
  professionalId: string;
  role: ProfessionalRole;
  responsibilities: string[];
  status: AssignmentStatus;
  // Who granted this specific property assignment: "You" for the Owner, or
  // a Property Manager's display name when they assigned it within their
  // own delegated scope (Phase 2). assignedByProfessionalId is that PM's
  // id, for role lookup -- undefined means the Owner assigned it.
  assignedBy: string;
  assignedByProfessionalId?: string;
};

const SEED_ASSIGNMENTS: PropertyAssignment[] = [
  {
    id: "asn-jean-kacyiru",
    teamId: TEAM_ID,
    propertyId: "kacyiru-2br",
    professionalId: "jean-mugisha",
    role: "property_manager",
    status: "Active",
    assignedBy: "You",
    responsibilities: [
      "Manage enquiries & viewings",
      "Review applications",
      "Manage rental setup",
      "Manage active rentals",
      "Track rent payments",
      "Handle maintenance",
      "Communicate with renters",
    ],
  },
  // Jean's second managed property -- gives the Phase 2 demo identity a
  // real, multi-property scope to enforce against (Kacyiru + Remera are
  // Jean's; Nyarutarama, Modern Family Home, and Kimironko are NOT, per the
  // Phase 2 brief's property-scope example).
  {
    id: "asn-jean-remera",
    teamId: TEAM_ID,
    propertyId: "remera-3br",
    professionalId: "jean-mugisha",
    role: "property_manager",
    status: "Active",
    assignedBy: "You",
    responsibilities: [
      "Manage enquiries & viewings",
      "Review applications",
      "Manage rental setup",
      "Manage active rentals",
      "Track rent payments",
      "Handle maintenance",
      "Communicate with renters",
    ],
  },
  {
    id: "asn-aline-nyarutarama",
    teamId: TEAM_ID,
    propertyId: "nyarutarama-2br",
    professionalId: "aline-uwase",
    role: "agent",
    status: "Active",
    assignedBy: "You",
    responsibilities: ["Manage listing", "Respond to enquiries", "Manage viewings", "Assist with applications"],
  },
  {
    id: "asn-sarah-remera",
    teamId: TEAM_ID,
    propertyId: "remera-3br",
    professionalId: "sarah-uwase",
    role: "agent",
    status: "Active",
    assignedBy: "You",
    responsibilities: ["Manage listing", "Respond to enquiries", "Manage viewings", "Assist with applications"],
  },
  {
    id: "asn-patrick-kibagabaga",
    teamId: TEAM_ID,
    propertyId: "kibagabaga-modern-family-home",
    professionalId: "patrick",
    role: "property_manager",
    status: "Active",
    assignedBy: "You",
    responsibilities: ["Review applications", "Communicate with renters"],
  },
  {
    id: "asn-kevin-kibagabaga",
    teamId: TEAM_ID,
    propertyId: "kibagabaga-modern-family-home",
    professionalId: "kevin-nshuti",
    role: "agent",
    status: "Active",
    assignedBy: "You",
    responsibilities: ["Manage listing", "Respond to enquiries", "Manage viewings"],
  },
  // Grace Umutoni and David M. are deliberately left with no assignment
  // here -- they are the "Active team member, zero properties" example
  // required by the phase spec. Kevin is also deliberately NOT pre-assigned
  // to any of Jean's properties (Kacyiru/Remera) -- that assignment is the
  // live Phase 2 demo action (see the phase report, Scenario D).
  //
  // Phase 3 -- Kevin's Kigali Homes assignment. Its property facts (title,
  // location, image) live in professional-properties.ts, not owner-data.ts
  // -- Kimihurura Apartment does not belong to Pacifique's portfolio.
  {
    id: "asn-kevin-kimihurura",
    teamId: "kigali-homes-team",
    propertyId: "kimihurura-apartment",
    professionalId: "kevin-nshuti",
    role: "agent",
    status: "Active",
    assignedBy: "Diane Umuhoza",
    responsibilities: ["Manage listing", "Respond to enquiries", "Manage viewings", "Assist with applications"],
  },
];

// ---------------------------------------------------------------------------
// Session-persisted state. Each store keeps the FULL current list (seed +
// accumulated mutations), not a sparse override -- these are growing/
// mutating record lists, not per-field overrides on a fixed set of
// properties (contrast with owner-data.ts's overrides pattern).
// ---------------------------------------------------------------------------

const INVITATIONS_KEY = "hauxhunt-team-invitations";
const MEMBERSHIPS_KEY = "hauxhunt-team-memberships";
const ASSIGNMENTS_KEY = "hauxhunt-team-assignments";
const TEAM_EVENT = "hauxhunt-team-changed";

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
  window.dispatchEvent(new Event(TEAM_EVENT));
}

export function subscribeToTeam(callback: () => void) {
  window.addEventListener(TEAM_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(TEAM_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getTeamInvitations(): TeamInvitation[] {
  return readList(INVITATIONS_KEY, SEED_INVITATIONS);
}

export function getTeamMemberships(): TeamMembership[] {
  return readList(MEMBERSHIPS_KEY, SEED_MEMBERSHIPS);
}

export function getPropertyAssignments(): PropertyAssignment[] {
  return readList(ASSIGNMENTS_KEY, SEED_ASSIGNMENTS);
}

// ---------------------------------------------------------------------------
// Derived getters
// ---------------------------------------------------------------------------

// teamId omitted = every Active member across every Team (rarely what you
// want -- this reads as "everyone", not "my team"). Owner-dashboard code
// always passes TEAM_ID explicitly.
export function getActiveMemberships(teamId?: string): TeamMembership[] {
  return getTeamMemberships().filter((m) => m.status === "Active" && (teamId === undefined || m.teamId === teamId));
}

export function getMembershipFor(professionalId: string, teamId?: string): TeamMembership | undefined {
  return getTeamMemberships().find((m) => m.professionalId === professionalId && (teamId === undefined || m.teamId === teamId));
}

// Every Team this professional is currently an Active member of -- the
// professional's OWN view of their memberships (contrast with
// getActiveMemberships, which is a Team's view of its members).
export function getActiveMembershipsFor(professionalId: string): TeamMembership[] {
  return getTeamMemberships().filter((m) => m.professionalId === professionalId && m.status === "Active");
}

export function getPendingInvitations(teamId?: string): TeamInvitation[] {
  return getTeamInvitations().filter((i) => i.status === "Pending" && (teamId === undefined || i.teamId === teamId));
}

export function getInvitationFor(professionalId: string, teamId?: string): TeamInvitation | undefined {
  // Most recent invitation for this person on this Team, if any.
  return getTeamInvitations()
    .filter((i) => i.professionalId === professionalId && (teamId === undefined || i.teamId === teamId))
    .sort((a, b) => b.ts - a.ts)[0];
}

export function getActiveAssignmentsFor(professionalId: string, teamId?: string): PropertyAssignment[] {
  return getPropertyAssignments().filter((a) => a.professionalId === professionalId && a.status === "Active" && (teamId === undefined || a.teamId === teamId));
}

export function getActiveAssignmentsForProperty(propertyId: string): PropertyAssignment[] {
  return getPropertyAssignments().filter((a) => a.propertyId === propertyId && a.status === "Active");
}

// A property's current PM/Agent, joined with their professional identity.
// This is what owner-data.ts's getOwnerProperties() calls to derive
// OwnerProperty.propertyManager / .agent.
export function getPropertyManagerAssignmentFor(propertyId: string) {
  const assignment = getActiveAssignmentsForProperty(propertyId).find((a) => a.role === "property_manager");
  if (!assignment) return null;
  const professional = getProfessional(assignment.professionalId);
  if (!professional) return null;
  const membership = getMembershipFor(assignment.professionalId);
  return {
    professionalId: professional.id,
    membershipId: membership?.id ?? null,
    name: professional.name,
    verified: professional.verified,
    responsibilities: assignment.responsibilities,
    canManageAgents: membership?.canManageAgents ?? false,
    assignedBy: assignment.assignedBy,
    assignedByProfessionalId: assignment.assignedByProfessionalId ?? null,
  };
}

export function getAgentAssignmentFor(propertyId: string) {
  const assignment = getActiveAssignmentsForProperty(propertyId).find((a) => a.role === "agent");
  if (!assignment) return null;
  const professional = getProfessional(assignment.professionalId);
  if (!professional) return null;
  const membership = getMembershipFor(assignment.professionalId);
  return {
    professionalId: professional.id,
    membershipId: membership?.id ?? null,
    name: professional.name,
    verified: professional.verified,
    responsibilities: assignment.responsibilities,
    assignedBy: assignment.assignedBy,
    assignedByProfessionalId: assignment.assignedByProfessionalId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Phase 2 -- Property Manager -> Agent delegation. A PM's "scope" is always
// derived from their OWN active property_manager assignments, never stored
// separately -- so it can never drift from what the Owner actually granted
// them, and revoking/removing a PM's property assignment automatically
// shrinks their Agent-management scope with it.
// ---------------------------------------------------------------------------

// Property ids where this professional currently holds an Active Property
// Manager assignment -- i.e. their delegated scope. Nothing outside this
// list should ever be shown to them as a candidate for Agent assignment.
//
// Phase 3: teamId scopes this to ONE Team's delegated authority. This
// matters even though no professional in this prototype is a PM in two
// Teams at once -- it's what stops a PM's Manage Agents permission from
// ever silently spanning a Team it wasn't granted on, e.g. an independently
// managed property, which never has a teamId at all and so can never match
// (see the Phase 3 brief, Section 57 / Scenario I).
export function getManagedPropertyIdsFor(professionalId: string, teamId?: string): string[] {
  return getPropertyAssignments()
    .filter((a) => a.professionalId === professionalId && a.role === "property_manager" && a.status === "Active" && (teamId === undefined || a.teamId === teamId))
    .map((a) => a.propertyId);
}

// The Agent's Active assignment on any property within the given PM's
// managed scope, if any. Deliberately blind to the Agent's assignments
// OUTSIDE that scope -- a PM must never see (or be able to infer) where an
// Agent works on properties the PM doesn't manage.
export function getAgentAssignmentWithinScope(pmProfessionalId: string, agentProfessionalId: string, teamId?: string): PropertyAssignment | null {
  const managedIds = new Set(getManagedPropertyIdsFor(pmProfessionalId, teamId));
  return getActiveAssignmentsFor(agentProfessionalId).find((a) => a.role === "agent" && managedIds.has(a.propertyId)) ?? null;
}

// Properties within the PM's managed scope that this Agent is NOT already
// assigned to -- what "Assign Property" may offer. Empty means either the
// PM manages nothing, or the Agent already covers everything they manage.
export function getAssignablePropertyIdsFor(pmProfessionalId: string, agentProfessionalId: string, teamId?: string): string[] {
  const managedIds = getManagedPropertyIdsFor(pmProfessionalId, teamId);
  const alreadyAssigned = new Set(
    getActiveAssignmentsFor(agentProfessionalId)
      .filter((a) => a.role === "agent")
      .map((a) => a.propertyId),
  );
  return managedIds.filter((id) => !alreadyAssigned.has(id));
}

// Invitations THIS professional personally created -- a PM's own
// "Invitations" tab is scoped to invitations they sent, not every
// invitation on the team (that view is Owner-only, see the Team page).
export function getInvitationsCreatedBy(professionalId: string): TeamInvitation[] {
  return getTeamInvitations()
    .filter((i) => i.invitedByProfessionalId === professionalId)
    .sort((a, b) => b.ts - a.ts);
}

// ---------------------------------------------------------------------------
// Prototype-only identity resolution. The Partner dashboard has one generic
// role-based login, not a specific signed-in professional (see the
// "Assignment Without a Team" audit) -- "you" resolve to whichever
// registered professional of the given role has a pending invitation, else
// an established demo identity. Every Partner-side page that needs to know
// "who is the professional using this dashboard right now" calls this,
// rather than each re-implementing the same fallback chain.
// ---------------------------------------------------------------------------

// Exported (not just used internally) so the client-only hydration-safe
// wrapper in components/partner/use-demo-professional.ts can replicate the
// same hard default without duplicating it -- see that file's comment.
export const DEMO_AGENT_ID = "kevin-nshuti";
export const DEMO_PM_ID = "jean-mugisha";

// "Preview as" -- a discreet, prototype-only override so testing/demoing can
// reliably pick a SPECIFIC registered professional instead of relying only
// on the fallback chain below (which was never meant to distinguish more
// than one interesting person per role -- see the professional-dashboard
// audit). Not authentication, not account switching: just an explicit id in
// localStorage that wins over the fallback when present. Reuses TEAM_EVENT
// for reactivity, since every professional-aware page already subscribes to
// subscribeToTeam(forceUpdate) -- no separate subscription needed.
const PREVIEW_KEY = "hauxhunt-preview-professional-id";

export function getPreviewProfessionalId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PREVIEW_KEY);
  } catch {
    return null;
  }
}

// syncRole lets the caller (the "Preview as" control) also keep the
// existing agent/property_manager role state (use-partner-role.ts) in sync
// with whoever was just selected -- previewing a Property Manager while the
// dashboard still thinks you're an Agent is exactly the contradictory state
// this phase exists to avoid (Section 9). Kept as a callback rather than an
// import so this stays a plain data module, not a React one.
export function setPreviewProfessional(professionalId: string, syncRole?: (role: ProfessionalRole) => void) {
  if (typeof window === "undefined") return;
  const professional = getProfessional(professionalId);
  try {
    window.localStorage.setItem(PREVIEW_KEY, professionalId);
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  if (professional && syncRole) syncRole(professional.role);
  window.dispatchEvent(new Event(TEAM_EVENT));
}

export function clearPreviewProfessional() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREVIEW_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(TEAM_EVENT));
}

export function resolveDemoProfessional(role: ProfessionalRole): RegisteredProfessional | undefined {
  const previewId = getPreviewProfessionalId();
  if (previewId) {
    const preview = getProfessional(previewId);
    // Only honor the preview when its role actually matches what's being
    // asked for -- role routing (Section 9) keeps these in sync via
    // syncRole above, so a mismatch here is only ever transient.
    if (preview && preview.role === role) return preview;
  }
  const anyPending = getPendingInvitations().find((i) => i.role === role);
  const defaultId = role === "agent" ? DEMO_AGENT_ID : DEMO_PM_ID;
  return getProfessional(anyPending?.professionalId ?? defaultId);
}

// Cross-Role Lifecycle Synchronization phase (hydration fix) --
// resolveDemoProfessional is impure with respect to SSR: it reads
// localStorage (Preview As) and sessionStorage-backed team data (the "any
// pending invitation for this role" fallback), both of which the server
// can never see. The server always evaluates it against pure seed data;
// a client whose session has since diverged (e.g. a seeded pending
// invitation was accepted) resolves someone else entirely -- a hydration
// mismatch in whatever text renders that name, not just a stale badge.
// The hydration-safe wrapper (useDemoProfessional) lives in
// components/partner/use-demo-professional.ts instead of here -- this file
// has real Server Component consumers (e.g. owner-dashboard/account) that
// must never pull in a React hook / useSyncExternalStore.

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4).toString(36)}`;
}

// Sends an invitation. Does NOT create a membership and does NOT touch any
// property -- the two things this whole phase exists to keep separate.
//
// invitedByProfessionalId is set when a Property Manager sends this (Phase
// 2) rather than the Owner -- it does NOT change teamId: the invitation
// still always joins the OWNER's team. It's provenance only, so the Owner
// (and the invitee) can see who actually acted.
export function inviteProfessional(professionalId: string, role: ProfessionalRole, invitedBy = "You", invitedByProfessionalId?: string) {
  const invitations = getTeamInvitations();
  invitations.push({
    id: nextId("inv"),
    teamId: TEAM_ID,
    professionalId,
    role,
    status: "Pending",
    invitedBy,
    invitedByProfessionalId,
    invitedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    ts: Date.now(),
  });
  writeList(INVITATIONS_KEY, invitations);
}

export function cancelInvitation(invitationId: string) {
  const invitations = getTeamInvitations().map((i) => (i.id === invitationId ? { ...i, status: "Cancelled" as const } : i));
  writeList(INVITATIONS_KEY, invitations);
}

export function resendInvitation(invitationId: string) {
  const invitations = getTeamInvitations().map((i) =>
    i.id === invitationId ? { ...i, invitedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), ts: Date.now() } : i,
  );
  writeList(INVITATIONS_KEY, invitations);
}

// Accepting creates a Team Membership with ZERO properties. Property access
// is always a separate, later, Owner-initiated action.
export function acceptInvitation(invitationId: string) {
  const invitations = getTeamInvitations();
  const invitation = invitations.find((i) => i.id === invitationId);
  if (!invitation) return;
  writeList(
    INVITATIONS_KEY,
    invitations.map((i) => (i.id === invitationId ? { ...i, status: "Accepted" as const } : i)),
  );
  const memberships = getTeamMemberships();
  if (!memberships.some((m) => m.professionalId === invitation.professionalId && m.status === "Active")) {
    memberships.push({
      id: nextId("mem"),
      teamId: TEAM_ID,
      professionalId: invitation.professionalId,
      role: invitation.role,
      status: "Active",
      joinedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      canManageAgents: invitation.role === "property_manager" ? false : undefined,
    });
    writeList(MEMBERSHIPS_KEY, memberships);
  }
}

export function declineInvitation(invitationId: string) {
  const invitations = getTeamInvitations().map((i) => (i.id === invitationId ? { ...i, status: "Declined" as const } : i));
  writeList(INVITATIONS_KEY, invitations);
}

// assignedByProfessionalId is set when a Property Manager makes this
// assignment within their own delegated scope (Phase 2) rather than the
// Owner. Callers are responsible for only ever offering properties within
// that PM's scope -- this function itself does not re-check it (there is no
// production authorization layer here, per the phase boundary).
export function assignPropertyToMember(
  propertyId: string,
  professionalId: string,
  role: ProfessionalRole,
  responsibilities: string[],
  assignedBy = "You",
  assignedByProfessionalId?: string,
) {
  const assignments = getPropertyAssignments();
  const existingIndex = assignments.findIndex((a) => a.propertyId === propertyId && a.professionalId === professionalId);
  if (existingIndex >= 0) {
    assignments[existingIndex] = { ...assignments[existingIndex], responsibilities, status: "Active", assignedBy, assignedByProfessionalId };
  } else {
    assignments.push({ id: nextId("asn"), teamId: TEAM_ID, propertyId, professionalId, role, responsibilities, status: "Active", assignedBy, assignedByProfessionalId });
  }
  writeList(ASSIGNMENTS_KEY, assignments);
}

export function updateAssignmentResponsibilities(assignmentId: string, responsibilities: string[]) {
  const assignments = getPropertyAssignments().map((a) => (a.id === assignmentId ? { ...a, responsibilities } : a));
  writeList(ASSIGNMENTS_KEY, assignments);
}

// Removes access to ONE property. The member stays on the team.
export function removeAssignment(assignmentId: string) {
  const assignments = getPropertyAssignments().map((a) => (a.id === assignmentId ? { ...a, status: "Removed" as const } : a));
  writeList(ASSIGNMENTS_KEY, assignments);
}

// Phase 3: scoped to ONE Team -- removing/leaving Team A must never touch
// property access this professional holds through Team B or independently
// (Sections 32/36/37 of the Phase 3 brief).
function deactivateAllAssignmentsFor(professionalId: string, teamId: string) {
  const assignments = getPropertyAssignments().map((a) => (a.professionalId === professionalId && a.teamId === teamId && a.status === "Active" ? { ...a, status: "Removed" as const } : a));
  writeList(ASSIGNMENTS_KEY, assignments);
}

// Owner-initiated: removes the member from the team AND deactivates every
// property assignment they held ON THAT TEAM. Historical assignment records
// remain (status flips to Removed, the row isn't deleted). Any OTHER Team
// membership, or independent property authorization, this professional has
// is untouched.
export function removeTeamMember(membershipId: string) {
  const memberships = getTeamMemberships();
  const membership = memberships.find((m) => m.id === membershipId);
  if (!membership) return;
  writeList(
    MEMBERSHIPS_KEY,
    memberships.map((m) => (m.id === membershipId ? { ...m, status: "Removed" as const } : m)),
  );
  deactivateAllAssignmentsFor(membership.professionalId, membership.teamId);
}

// Member-initiated equivalent of removeTeamMember.
export function leaveTeam(membershipId: string) {
  const memberships = getTeamMemberships();
  const membership = memberships.find((m) => m.id === membershipId);
  if (!membership) return;
  writeList(
    MEMBERSHIPS_KEY,
    memberships.map((m) => (m.id === membershipId ? { ...m, status: "Left" as const } : m)),
  );
  deactivateAllAssignmentsFor(membership.professionalId, membership.teamId);
}

// The distinct, owner-granted, higher-level Team permission -- not a
// property responsibility. Full PM -> Agent invitation/assignment flow is
// out of scope for this phase; this only records the grant.
export function setCanManageAgents(membershipId: string, value: boolean) {
  const memberships = getTeamMemberships().map((m) => (m.id === membershipId ? { ...m, canManageAgents: value } : m));
  writeList(MEMBERSHIPS_KEY, memberships);
}
