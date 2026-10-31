"use client";

import { useSyncExternalStore } from "react";
import type { RenterApplication } from "@/data/renter-applications";
import { RENTER_APPLICATIONS } from "@/data/renter-applications";
import { RENTER_RENTALS, type RenterRental } from "@/data/renter-rentals";
import houseImage from "@/assets/images/house1.jpg";
import { api } from "@/lib/api/client";
import type { Me } from "@/lib/api/session";
import {
  ACTIVE_RENTALS,
  MAINTENANCE_REQUESTS,
  type MaintenanceRequest,
} from "@/lib/maintenance-data";
import {
  OWNER_PARTICIPANT_ID,
  RENTER_PARTICIPANT_ID,
  setRemoteConversations,
  type Conversation,
  type Participant,
} from "@/lib/messages-data";
import {
  BASE_OWNER_PROPERTIES,
  OWNER,
  OWNER_APPLICATIONS,
  OWNER_PAYMENTS,
  OWNER_RENTALS,
  formatRwf,
  type OwnerApplication,
  type OwnerPayment,
  type OwnerPropertyFacts,
  type OwnerRental,
} from "@/lib/owner-data";
import {
  REGISTERED_PROFESSIONALS,
  TEAM_ID,
  setRemoteTeam,
  setPreviewProfessional,
  type PropertyAssignment,
  type RegisteredProfessional,
  type TeamInvitation,
  type TeamMembership,
} from "@/lib/team-data";

export const HYDRATED_EVENT = "rentup-hydrated";

type List<T> = { data: T[] };

type ApiRental = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  renterName: string;
  status: string;
  monthlyRent: number;
  securityDeposit: number;
  startDate: string;
  endDate: string;
  agreementStatus: string;
  depositStatus: string;
  paymentStatus: string;
  nextPaymentDate: string | null;
};

type ApiPayment = {
  id: string;
  rentalId: string;
  propertyId: string;
  renterName: string;
  kind: "setup" | "rent";
  periodMonth: string;
  amount: number;
  status: string;
  processing: boolean;
  dueDate: string;
  paidAt: string | null;
  methodType: string | null;
  methodLabel: string | null;
  reference: string;
};

type ApiApplication = {
  id: string;
  listingId: string;
  propertyId: string;
  status: string;
  form: { about?: { fullName?: string }; needs?: { moveIn?: string } };
  submittedAt: string | null;
  updatedAt: string;
  requiresOwnerApproval?: boolean;
  recommendation?: "approve" | "not_selected" | null;
};

type ApiProperty = {
  id: string;
  title: string;
  type: string;
  city: string | null;
  neighbourhood: string | null;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  amenities: string[];
};

type ApiListing = { propertyId?: string; status?: string; priceUsd: number };

type ApiMaintenance = Omit<
  MaintenanceRequest,
  | "property"
  | "status"
  | "urgency"
  | "submitted"
  | "completed"
  | "informationNeeded"
  | "resolution"
  | "scheduledVisit"
> & {
  rentalId: string;
  propertyTitle: string;
  status: string;
  urgency: string;
  informationNeeded: string | null;
  resolution: string | null;
  scheduledVisit: MaintenanceRequest["scheduledVisit"] | null;
  submittedAt: string;
  completedAt: string | null;
};

type ApiConversation = {
  id: string;
  contextType: Conversation["context"] extends infer C ? string | null : never;
  contextId: string | null;
  participant: {
    id: string;
    fullName: string;
    role: string;
    verified: boolean;
  };
  unreadCount: number;
};

type ApiMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

type ApiTeam = {
  id: string;
  memberships: (Omit<TeamMembership, "status" | "joinedAt"> & {
    status: string;
    joinedAt: string;
    professional: { id: string; fullName: string; role: string };
  })[];
  invitations: (Omit<TeamInvitation, "status" | "ts" | "invitedAt"> & {
    status: string;
    invitedAt?: string;
    createdAt?: string;
  })[];
  assignments: (Omit<PropertyAssignment, "status" | "assignedBy"> & {
    status: string;
  })[];
};

const titleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const longDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const monthName = (period: string) =>
  new Date(`${period}-01`).toLocaleDateString("en-GB", { month: "long" });

function replace<T>(target: T[], rows: T[]) {
  target.splice(0, target.length, ...rows);
}

function locationOf(property: ApiProperty) {
  return [property.neighbourhood, property.city].filter(Boolean).join(", ");
}

function toProperty(
  property: ApiProperty,
  listing: ApiListing | undefined,
): OwnerPropertyFacts {
  return {
    id: property.id,
    title: property.title,
    location: locationOf(property),
    type: titleCase(property.type),
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    size: property.areaM2,
    amenities: property.amenities,
    image: houseImage,
    rent: listing ? `USD ${listing.priceUsd} / month` : null,
    listingStatus: listing?.status
      ? (titleCase(listing.status) as OwnerPropertyFacts["listingStatus"])
      : "Not Listed",
  };
}

function toRental(rental: ApiRental): OwnerRental {
  return {
    id: rental.id,
    propertyId: rental.propertyId,
    renter: rental.renterName,
    status: titleCase(rental.status) as OwnerRental["status"],
    rent: `${formatRwf(rental.monthlyRent)} / month`,
    start: longDate(rental.startDate),
    end: longDate(rental.endDate),
    agreementStatus: titleCase(rental.agreementStatus),
    depositStatus: titleCase(rental.depositStatus),
    paymentStatus: titleCase(rental.paymentStatus) as OwnerRental["paymentStatus"],
    note: rental.nextPaymentDate
      ? `Next rent payment due ${longDate(rental.nextPaymentDate)}.`
      : "",
  };
}

function toRenterRental(rental: ApiRental, manager: string): RenterRental {
  return {
    id: rental.id,
    propertyId: rental.propertyId,
    title: rental.propertyTitle,
    location: rental.propertyLocation,
    status: titleCase(rental.status) as RenterRental["status"],
    beds: 0,
    baths: 0,
    furnishing: "",
    rent: formatRwf(rental.monthlyRent),
    nextPayment: longDate(rental.nextPaymentDate),
    start: longDate(rental.startDate),
    end: longDate(rental.endDate),
    manager,
    role: "Verified Property Manager",
    image: 0,
    note: "",
  };
}

function toPayment(payment: ApiPayment): OwnerPayment {
  const label =
    payment.kind === "setup"
      ? "Deposit and first month"
      : `${monthName(payment.periodMonth)} Rent`;
  return {
    id: payment.id,
    propertyId: payment.propertyId,
    rentalId: payment.rentalId,
    renter: payment.renterName,
    purpose: label,
    amount: formatRwf(payment.amount),
    amountValue: payment.amount,
    status: titleCase(
      payment.processing ? "pending" : payment.status,
    ) as OwnerPayment["status"],
    date: longDate(payment.paidAt ?? payment.dueDate),
    method: payment.methodLabel ?? titleCase(payment.methodType ?? ""),
    reference: payment.reference,
    managedBy: null,
  };
}

function toOwnerApplication(application: ApiApplication): OwnerApplication {
  return {
    id: application.id,
    propertyId: application.propertyId,
    applicant: application.form.about?.fullName ?? "Applicant",
    status: titleCase(application.status) as OwnerApplication["status"],
    submitted: longDate(application.submittedAt),
    handledBy: "",
    handledByRole: "",
    proposedRent: "",
    moveIn: longDate(application.form.needs?.moveIn),
    requiresOwnerApproval: application.requiresOwnerApproval ?? false,
    note: "",
    recommendation: application.recommendation
      ? application.recommendation === "approve"
        ? "Approve"
        : "Not Selected"
      : undefined,
  };
}

const APPLICATION_PROGRESS: Record<string, number> = {
  draft: 15,
  submitted: 35,
  under_review: 60,
  action_required: 60,
  decision_pending: 80,
  approved: 90,
  not_selected: 100,
  completed: 100,
  withdrawn: 100,
};

function toRenterApplication(
  application: ApiApplication,
  rentals: ApiRental[],
): RenterApplication {
  const rental = rentals.find(
    (item) => item.propertyId === application.propertyId,
  );
  return {
    id: application.id,
    propertyId: application.propertyId,
    title: rental?.propertyTitle ?? "Your application",
    location: rental?.propertyLocation ?? "",
    status: titleCase(application.status) as RenterApplication["status"],
    date: application.submittedAt
      ? `Submitted ${longDate(application.submittedAt)}`
      : `Updated ${longDate(application.updatedAt)}`,
    representative: "",
    role: "",
    progress: APPLICATION_PROGRESS[application.status] ?? 35,
    message: "",
  };
}

function toMaintenance(item: ApiMaintenance): MaintenanceRequest {
  return {
    ...item,
    property: item.propertyTitle,
    urgency: titleCase(item.urgency) as MaintenanceRequest["urgency"],
    status: titleCase(item.status) as MaintenanceRequest["status"],
    submitted: longDate(item.submittedAt),
    completed: item.completedAt ? longDate(item.completedAt) : undefined,
    informationNeeded: item.informationNeeded ?? undefined,
    resolution: item.resolution ?? undefined,
    scheduledVisit: item.scheduledVisit ?? undefined,
  };
}

function hydrateTeam(team: ApiTeam | null, me: Me) {
  const professionals = new Map<string, RegisteredProfessional>();
  if (me.role === "agent" || me.role === "property_manager") {
    professionals.set(me.id, {
      id: me.id,
      name: me.fullName,
      role: me.role,
      verified: me.verificationStatus === "verified",
      location: "",
      email: me.email,
    });
  }
  for (const { professional } of team?.memberships ?? []) {
    professionals.set(professional.id, {
      id: professional.id,
      name: professional.fullName,
      role: professional.role as RegisteredProfessional["role"],
      verified: true,
      location: "",
      email: "",
    });
  }
  replace(REGISTERED_PROFESSIONALS, [...professionals.values()]);
  setRemoteTeam({
    memberships: (team?.memberships ?? []).map((membership) => ({
      id: membership.id,
      teamId: TEAM_ID,
      professionalId: membership.professionalId,
      role: membership.role,
      status: titleCase(membership.status) as TeamMembership["status"],
      joinedAt: longDate(membership.joinedAt),
      canManageAgents: membership.canManageAgents,
    })),
    invitations: (team?.invitations ?? []).map((invitation) => ({
      ...invitation,
      teamId: TEAM_ID,
      status: titleCase(invitation.status) as TeamInvitation["status"],
      invitedBy: "You",
      invitedAt: longDate(invitation.invitedAt ?? invitation.createdAt),
      ts: Date.parse(invitation.invitedAt ?? invitation.createdAt ?? ""),
    })),
    assignments: (team?.assignments ?? []).map((assignment) => ({
      ...assignment,
      teamId: TEAM_ID,
      status: titleCase(assignment.status) as PropertyAssignment["status"],
      assignedBy: "You",
    })),
  });
  if (me.role === "agent" || me.role === "property_manager") {
    setPreviewProfessional(me.id);
  }
}

const PARTICIPANT_ROLES: Record<string, Participant["role"]> = {
  owner: "Property Owner",
  property_manager: "Property Manager",
  agent: "Agent",
  renter: "Renter",
};

// Pages address the signed-in user by a fixed participant id, so the API's id
// for them is swapped for that id here. Everyone else keeps their real id.
function selfParticipantId(me: Me) {
  if (me.role === "owner") return OWNER_PARTICIPANT_ID;
  if (me.role === "renter") return RENTER_PARTICIPANT_ID;
  return me.id;
}

async function hydrateConversations(me: Me) {
  const { data } = await api<List<ApiConversation>>("/me/conversations", {
    query: { pageSize: 50 },
  });
  const self = selfParticipantId(me);
  const conversations = await Promise.all(
    data.map(async (conversation) => {
      const { data: messages } = await api<List<ApiMessage>>(
        `/conversations/${conversation.id}/messages`,
        { query: { limit: 50 } },
      );
      const ordered = messages
        .map((message) => ({
          id: message.id,
          senderId: message.senderId === me.id ? self : message.senderId,
          text: message.text,
          ts: Date.parse(message.createdAt),
        }))
        .sort((a, b) => a.ts - b.ts);
      const firstUnread = ordered.length - conversation.unreadCount;
      const lastRead =
        firstUnread > 0 ? ordered[firstUnread - 1].ts : conversation.unreadCount ? 0 : Date.now();
      const other: Participant = {
        id: conversation.participant.id,
        name: conversation.participant.fullName,
        role: PARTICIPANT_ROLES[conversation.participant.role] ?? "Renter",
        verified: conversation.participant.verified,
      };
      return {
        other,
        conversation: {
          id: conversation.id,
          participantIds: [self, other.id] as [string, string],
          context: conversation.contextType
            ? {
                type: conversation.contextType as NonNullable<
                  Conversation["context"]
                >["type"],
                propertyId: conversation.contextId ?? undefined,
                label: titleCase(conversation.contextType),
              }
            : undefined,
          messages: ordered,
          lastReadTs: { [self]: lastRead },
        },
      };
    }),
  );
  setRemoteConversations(
    conversations.map((item) => item.conversation),
    conversations.map((item) => item.other),
  );
}

function clearDemoOverrides() {
  for (const key of Object.keys(window.sessionStorage)) {
    if (
      key.startsWith("hauxhunt-") &&
      key !== "hauxhunt-authenticated-role" &&
      key !== "hauxhunt-tier" &&
      !key.includes("flatmate")
    ) {
      window.sessionStorage.removeItem(key);
    }
  }
}

let ready = false;
let currentUser: Me | null = null;

/** Reloads every store after a write. */
export function refreshStores() {
  return currentUser ? hydrateStores(currentUser) : Promise.resolve();
}

/** Loads this user's records into the stores every dashboard reads from. */
export async function hydrateStores(me: Me) {
  if (me.role === "admin") return;
  currentUser = me;
  const isRenter = me.role === "renter";
  const isOwner = me.role === "owner";
  const [rentals, payments, maintenance, applications, properties, listings, team] =
    await Promise.all([
      api<List<ApiRental>>("/me/rentals", { query: { pageSize: 100 } }),
      api<List<ApiPayment>>("/me/payments", { query: { pageSize: 100 } }),
      api<List<ApiMaintenance>>("/me/maintenance-requests", {
        query: { pageSize: 100 },
      }),
      api<List<ApiApplication>>(
        isRenter ? "/me/applications" : "/partner/applications",
      ),
      isRenter
        ? Promise.resolve({ data: [] as ApiProperty[] })
        : api<List<ApiProperty>>("/me/properties", { query: { pageSize: 100 } }),
      isRenter
        ? Promise.resolve({ data: [] as ApiListing[] })
        : api<List<ApiListing>>("/me/listings", { query: { pageSize: 100 } }),
      isOwner ? api<ApiTeam>("/owner/team") : Promise.resolve(null),
    ]);

  clearDemoOverrides();
  if (isOwner) OWNER.name = me.fullName;

  replace(OWNER_RENTALS, rentals.data.map(toRental));
  replace(OWNER_PAYMENTS, payments.data.map(toPayment));
  replace(MAINTENANCE_REQUESTS, maintenance.data.map(toMaintenance));
  replace(
    ACTIVE_RENTALS,
    rentals.data
      .filter((rental) => rental.status === "active")
      .map((rental) => ({
        id: rental.id,
        propertyId: rental.propertyId,
        title: rental.propertyTitle,
        location: rental.propertyLocation,
      })),
  );
  replace(
    BASE_OWNER_PROPERTIES,
    properties.data.map((property) =>
      toProperty(
        property,
        listings.data.find((listing) => listing.propertyId === property.id),
      ),
    ),
  );
  if (isRenter) {
    // Renters have no property records, but pages still look titles up by id.
    replace(
      BASE_OWNER_PROPERTIES,
      rentals.data.map((rental) => ({
        id: rental.propertyId,
        title: rental.propertyTitle,
        location: rental.propertyLocation,
        type: "",
        bedrooms: 0,
        bathrooms: 0,
        size: 0,
        amenities: [],
        image: houseImage,
        rent: null,
        listingStatus: "Live" as const,
      })),
    );
    replace(
      RENTER_RENTALS,
      rentals.data.map((rental) => toRenterRental(rental, "")),
    );
    replace(
      RENTER_APPLICATIONS,
      applications.data.map((application) =>
        toRenterApplication(application, rentals.data),
      ),
    );
  } else {
    replace(OWNER_APPLICATIONS, applications.data.map(toOwnerApplication));
  }
  hydrateTeam(team, me);
  await hydrateConversations(me);

  ready = true;
  window.dispatchEvent(new Event(HYDRATED_EVENT));
  window.dispatchEvent(new Event("storage"));
}

function subscribeReady(callback: () => void) {
  window.addEventListener(HYDRATED_EVENT, callback);
  return () => window.removeEventListener(HYDRATED_EVENT, callback);
}

/** False until real records have loaded, so detail pages don't show a 404 first. */
export function useStoresReady() {
  return useSyncExternalStore(
    subscribeReady,
    () => ready,
    () => false,
  );
}
