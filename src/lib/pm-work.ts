// Property Manager operational work -- Rentals, Payments, Maintenance, and
// Rental Setup. Property Manager Dashboard phase.
//
// Philosophy (same as professional-work.ts, extended, never forked):
//   - Rentals/Payments come from owner-data.ts's real OWNER_RENTALS/
//     OWNER_PAYMENTS (Section 68/69) -- never a PM_RENTALS/PM_PAYMENTS
//     dataset. A Rental/Payment is the exact same record whether read by
//     Owner or PM.
//   - Maintenance comes from maintenance-data.ts's MAINTENANCE_REQUESTS --
//     the same renter-filed records, not owner-data.ts's older, narrower
//     OWNER_MAINTENANCE (kept untouched, still read by the Owner dashboard's
//     existing Maintenance page -- Section 81, do not break Owner).
//   - Applications reuse professional-work.ts's getApplicationsFor/
//     recommendApplicationDecision/decideApplication as-is -- they are
//     already role-agnostic (gated on the "Review applications" /
//     "Assist with applications" responsibility string, not on role).
//   - Every read is scoped to properties this professional actually has
//     access to (getProfessionalPropertyCards), same as the Agent side.
//   - Cross-Role Lifecycle Synchronization phase (Section 33-40): a
//     Verified Independent authorization grants the SAME PM responsibility
//     scope a Team assignment would -- Rentals/Payments/Maintenance/
//     Applications/Rental Setup all become reachable for a verified
//     independent PM. No Team is fabricated, and the off-platform Owner
//     stays external metadata, never a registered account.

import {
  DATA_CHANGED_EVENT,
  api,
  reportWriteFailure,
  uploadFile,
} from "@/lib/api/client";
import {
  formatMoney,
  getOwnerPayments,
  getOwnerRentals,
  subscribeToOwnerPayments,
  subscribeToOwnerRentals,
  type OwnerPayment,
  type OwnerRental,
} from "@/lib/owner-data";
import {
  getMaintenanceRequests,
  subscribeToMaintenance,
  type MaintenanceRequest,
} from "@/lib/maintenance-data";
import { getActiveAssignmentsFor } from "@/lib/team-data";
import {
  getPropertyAccessDetail,
  getProfessionalPropertyCards,
} from "@/lib/professional-properties";

function accessiblePropertyIds(professionalId: string): Set<string> {
  return new Set(
    getProfessionalPropertyCards(professionalId).map((c) => c.propertyId),
  );
}

// Cross-Role Lifecycle Synchronization phase -- Section 33/34: a PM's
// operational scope on a Team-assigned property comes from their granted
// PropertyAssignment.responsibilities (unchanged). For an INDEPENDENT
// property, there is no PropertyAssignment at all -- Verified authorization
// IS the full professional management scope already established by the
// prototype (the same rule Foundation Cleanup already applies to Listing
// management), so it grants every PM responsibility here rather than
// leaving Rentals/Payments/Maintenance/Applications permanently
// unreachable for a verified independent PM. Never a new permission model.
function hasResponsibility(
  professionalId: string,
  propertyId: string,
  responsibility: string,
): boolean {
  const assignment = getActiveAssignmentsFor(professionalId).find(
    (a) => a.propertyId === propertyId,
  );
  if (assignment) return assignment.responsibilities.includes(responsibility);
  const card = getPropertyAccessDetail(professionalId, propertyId);
  return (
    card?.source === "INDEPENDENT_AUTHORIZATION" &&
    card.authorizationStatus === "Verified"
  );
}

export function canManageRentalsFor(
  professionalId: string,
  propertyId: string,
): boolean {
  return hasResponsibility(professionalId, propertyId, "Manage active rentals");
}

export function canTrackPaymentsFor(
  professionalId: string,
  propertyId: string,
): boolean {
  return hasResponsibility(professionalId, propertyId, "Track rent payments");
}

export function canHandleMaintenanceFor(
  professionalId: string,
  propertyId: string,
): boolean {
  return hasResponsibility(professionalId, propertyId, "Handle maintenance");
}

export function canManageEnquiriesFor(
  professionalId: string,
  propertyId: string,
): boolean {
  return hasResponsibility(
    professionalId,
    propertyId,
    "Manage enquiries & viewings",
  );
}

export function canReviewApplicationsFor(
  professionalId: string,
  propertyId: string,
): boolean {
  return hasResponsibility(professionalId, propertyId, "Review applications");
}

// ---------------------------------------------------------------------------
// Rentals
// ---------------------------------------------------------------------------

export function getRentalsFor(professionalId: string): OwnerRental[] {
  const ids = accessiblePropertyIds(professionalId);
  return getOwnerRentals().filter(
    (r) =>
      ids.has(r.propertyId) &&
      canManageRentalsFor(professionalId, r.propertyId),
  );
}

// One subscription for every PM-relevant data source (Rentals, Payments,
// Maintenance, Rental Setup drafts) -- callers don't need to know which
// underlying store changed, only that something did.
export function subscribeToPmWork(callback: () => void) {
  const unsubs = [
    subscribeToOwnerRentals(callback),
    subscribeToOwnerPayments(callback),
    subscribeToMaintenance(callback),
    subscribeToRentalSetup(callback),
  ];
  return () => unsubs.forEach((unsub) => unsub());
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function getPaymentsFor(professionalId: string): OwnerPayment[] {
  const ids = accessiblePropertyIds(professionalId);
  return getOwnerPayments().filter(
    (p) =>
      ids.has(p.propertyId) &&
      canTrackPaymentsFor(professionalId, p.propertyId),
  );
}

export function getPaymentsForProperty(
  professionalId: string,
  propertyId: string,
): OwnerPayment[] {
  return getPaymentsFor(professionalId).filter(
    (p) => p.propertyId === propertyId,
  );
}

// ---------------------------------------------------------------------------
// Maintenance -- reads maintenance-data.ts directly (no propertyId access
// filter baked into that file the way professional-properties.ts is for
// Enquiries/Applications), so it's applied here instead.
// ---------------------------------------------------------------------------

export function getMaintenanceFor(
  professionalId: string,
): MaintenanceRequest[] {
  const ids = accessiblePropertyIds(professionalId);
  return getMaintenanceRequests().filter(
    (m) =>
      ids.has(m.propertyId) &&
      canHandleMaintenanceFor(professionalId, m.propertyId),
  );
}

export function getMaintenanceForProperty(
  professionalId: string,
  propertyId: string,
): MaintenanceRequest[] {
  return getMaintenanceFor(professionalId).filter(
    (m) => m.propertyId === propertyId,
  );
}

export { subscribeToMaintenance };
export { subscribeToOwnerPayments };

// ---------------------------------------------------------------------------
// Rental Setup -- Approved Application -> Rental Details -> Agreement ->
// Payment Terms -> Review & Send -> a real OwnerRental + OwnerPayment
// (Section 27-34). One draft per applicationId; sending it is the one and
// only place a Rental comes into existence.
// ---------------------------------------------------------------------------

export type RentalSetupStatus =
  "Draft" | "Sent to Renter" | "Completed" | "Cancelled";

export type ApiRentalSetup = {
  id: string;
  applicationId: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  renterName: string;
  initiatedBy: string;
  initiatedByRole: string;
  status: "draft" | "sent_to_renter" | "completed" | "cancelled";
  monthlyRent: number;
  securityDeposit: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  paymentDueDay: number;
  agreementAttached: boolean;
  agreementFileName: string | null;
  signedAt: string | null;
  rentalId: string | null;
  setupPayment: {
    id: string;
    status: string;
    reference: string;
    chargeStartedAt: string | null;
  } | null;
};

export type RentalSetupTerms = {
  monthlyRent: number;
  securityDeposit: number;
  startDate: string;
  endDate: string;
  paymentDueDay: number;
};

export type RentalSetupDraft = {
  id: string;
  applicationId: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  initiatedBy: string;
  initiatedByRole: string;
  renterName: string;
  status: RentalSetupStatus;
  currency: string;
  // Formatted for display. `terms` holds the values the API stores.
  monthlyRent: string;
  securityDeposit: string;
  totalDue: string;
  startDate: string;
  endDate: string;
  paymentDueDay: string;
  terms: RentalSetupTerms;
  agreementAttached: boolean;
  agreementFileName: string | null;
  signedAt: string | null;
  rentalId?: string;
  setupPayment: ApiRentalSetup["setupPayment"];
};

const PM_EVENT = "hauxhunt-pm-work-changed";

const SETUP_STATUSES: Record<ApiRentalSetup["status"], RentalSetupStatus> = {
  draft: "Draft",
  sent_to_renter: "Sent to Renter",
  completed: "Completed",
  cancelled: "Cancelled",
};

const SETUP_ROLES: Record<string, string> = {
  owner: "Property Owner",
  property_manager: "Property Manager",
  agent: "Agent",
};

function setupDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
}

function ordinal(day: number) {
  if (day % 10 === 1 && day !== 11) return `${day}st`;
  if (day % 10 === 2 && day !== 12) return `${day}nd`;
  if (day % 10 === 3 && day !== 13) return `${day}rd`;
  return `${day}th`;
}

function toDraft(setup: ApiRentalSetup): RentalSetupDraft {
  const { currency, monthlyRent, securityDeposit, paymentDueDay } = setup;
  return {
    id: setup.id,
    applicationId: setup.applicationId,
    propertyId: setup.propertyId,
    propertyTitle: setup.propertyTitle,
    propertyLocation: setup.propertyLocation,
    initiatedBy: setup.initiatedBy,
    initiatedByRole:
      SETUP_ROLES[setup.initiatedByRole] ?? setup.initiatedByRole,
    renterName: setup.renterName,
    status: SETUP_STATUSES[setup.status],
    currency,
    monthlyRent: `${formatMoney(currency, monthlyRent)} / month`,
    securityDeposit: formatMoney(currency, securityDeposit),
    totalDue: formatMoney(currency, monthlyRent + securityDeposit),
    startDate: setupDate(setup.startDate),
    endDate: setupDate(setup.endDate),
    paymentDueDay: `${ordinal(paymentDueDay)} of every month`,
    terms: {
      monthlyRent,
      securityDeposit,
      startDate: setup.startDate?.slice(0, 10) ?? "",
      endDate: setup.endDate?.slice(0, 10) ?? "",
      paymentDueDay,
    },
    agreementAttached: setup.agreementAttached,
    agreementFileName: setup.agreementFileName,
    signedAt: setup.signedAt,
    rentalId: setup.rentalId ?? undefined,
    setupPayment: setup.setupPayment,
  };
}

let rentalSetups: RentalSetupDraft[] = [];

export function setRemoteRentalSetups(setups: ApiRentalSetup[]) {
  rentalSetups = setups.map(toDraft);
  window.dispatchEvent(new Event(PM_EVENT));
}

function keepRentalSetup(setup: ApiRentalSetup) {
  const draft = toDraft(setup);
  rentalSetups = [...rentalSetups.filter((d) => d.id !== draft.id), draft];
  window.dispatchEvent(new Event(PM_EVENT));
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  return draft;
}

// Each step waits on its own result before moving on, so these resolve to the
// saved setup, or to null once the failure has been shown.
async function writeRentalSetup(path: string, body?: unknown, method = "POST") {
  try {
    return keepRentalSetup(
      await api<ApiRentalSetup>(path, { method, body }),
    );
  } catch (error) {
    reportWriteFailure(error);
    return null;
  }
}

export function subscribeToRentalSetup(callback: () => void) {
  window.addEventListener(PM_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PM_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getRentalSetupDraft(
  applicationId: string,
): RentalSetupDraft | undefined {
  return rentalSetups.find((d) => d.applicationId === applicationId);
}

// The renter reaches the same setup by application id (from Applications) or
// by rental id (from My Rentals).
export function getRentalSetupByAnyId(
  id: string,
): RentalSetupDraft | undefined {
  return rentalSetups.find(
    (d) => d.id === id || d.applicationId === id || d.rentalId === id,
  );
}

const starting = new Set<string>();

/** Starts the setup, prefilled by the API from the application and listing. */
export async function startRentalSetup(applicationId: string) {
  if (starting.has(applicationId)) return null;
  starting.add(applicationId);
  try {
    return await writeRentalSetup(`/applications/${applicationId}/rental-setup`);
  } finally {
    starting.delete(applicationId);
  }
}

export function saveRentalSetupDraft(
  id: string,
  { endDate, startDate, ...terms }: Partial<RentalSetupTerms>,
) {
  return writeRentalSetup(
    `/rental-setups/${id}`,
    {
      ...terms,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    "PATCH",
  );
}

export async function attachRentalAgreement(id: string, file: File) {
  try {
    const key = await uploadFile(`/rental-setups/${id}/agreement/upload-url`, file);
    return await writeRentalSetup(`/rental-setups/${id}/agreement`, {
      key,
      fileName: file.name,
    });
  } catch (error) {
    reportWriteFailure(error);
    return null;
  }
}

export async function rentalAgreementUrl(id: string) {
  const { url } = await api<{ url: string }>(
    `/rental-setups/${id}/agreement/url`,
  );
  return url;
}

/** Creates the rental and its first payment on the API. */
export function sendRentalSetup(id: string) {
  return writeRentalSetup(`/rental-setups/${id}/send`);
}

export function signRentalSetup(id: string, signature: string) {
  return writeRentalSetup(`/rental-setups/${id}/sign`, { signature });
}

export async function payRentalSetup(draft: RentalSetupDraft) {
  if (!draft.setupPayment) return null;
  try {
    await api(`/payments/${draft.setupPayment.id}/pay`, {
      method: "POST",
      body: { method: "mobile_money" },
    });
    return keepRentalSetup(
      await api<ApiRentalSetup>(`/rental-setups/${draft.id}`),
    );
  } catch (error) {
    reportWriteFailure(error);
    return null;
  }
}

export function completeRentalSetup(id: string) {
  return writeRentalSetup(`/rental-setups/${id}/complete`);
}

export function declineRentalSetup(id: string) {
  return writeRentalSetup(`/rental-setups/${id}/decline`);
}
