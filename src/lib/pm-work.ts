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
  createOwnerPayment,
  createOwnerRental,
  getOwnerPayments,
  getOwnerRentals,
  subscribeToOwnerPayments,
  subscribeToOwnerRentals,
  updateOwnerPayment,
  updateOwnerRental,
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
  resolveAnyPropertyTitle,
} from "@/lib/professional-properties";
import { pushProfessionalNotification } from "@/lib/professional-work";
import { pushOwnerNotification } from "@/lib/owner-notifications";
import { pushNotification as pushRenterNotification } from "@/lib/notifications";

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

export function canManageRentalSetupFor(
  professionalId: string,
  propertyId: string,
): boolean {
  return hasResponsibility(professionalId, propertyId, "Manage rental setup");
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

export function getRentalsForProperty(
  professionalId: string,
  propertyId: string,
): OwnerRental[] {
  return getRentalsFor(professionalId).filter(
    (r) => r.propertyId === propertyId,
  );
}

export function getRental(rentalId: string): OwnerRental | undefined {
  return getOwnerRentals().find((r) => r.id === rentalId);
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

export function getPaymentsForRental(
  professionalId: string,
  rentalId: string,
): OwnerPayment[] {
  return getPaymentsFor(professionalId).filter((p) => p.rentalId === rentalId);
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

export type RentalSetupDraft = {
  id: string;
  applicationId: string;
  propertyId: string;
  // Owner Rental Setup Continuity phase -- Section 3/4: professionalId
  // stays PM-only and is now optional (absent for an Owner-initiated
  // draft -- the Owner is not a RegisteredProfessional, so there is no id
  // to store). initiatedBy/initiatedByRole is the one generic, role-
  // agnostic identity every draft carries regardless of who created it --
  // read by the Owner/PM UI and by the renter's setup screen for
  // attribution, instead of a professional-only lookup.
  professionalId?: string;
  initiatedBy: string;
  initiatedByRole: string;
  renterName: string;
  status: RentalSetupStatus;
  // Rental Details
  monthlyRent: string;
  securityDeposit: string;
  startDate: string;
  endDate: string;
  paymentDueDay: string;
  // Agreement
  agreementAttached: boolean;
  // Result, once sent
  rentalId?: string;
};

const RENTAL_SETUP_KEY = "hauxhunt-rental-setup-drafts";
const PM_EVENT = "hauxhunt-pm-work-changed";

function setupPaymentTotal(monthlyRent: string, securityDeposit: string) {
  const currency = monthlyRent.match(/^[A-Z]{3}/)?.[0] ?? "RWF";
  const monthlyValue = Number(monthlyRent.replace(/[^0-9]/g, "")) || 0;
  const depositValue = Number(securityDeposit.replace(/[^0-9]/g, "")) || 0;
  return {
    label: `${currency} ${(monthlyValue + depositValue).toLocaleString("en-US")}`,
    value: monthlyValue + depositValue,
  };
}

function readDrafts(): RentalSetupDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(RENTAL_SETUP_KEY);
    const parsed = raw ? (JSON.parse(raw) as RentalSetupDraft[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: RentalSetupDraft[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RENTAL_SETUP_KEY, JSON.stringify(drafts));
  } catch {
    // Storage full/unavailable -- change still applies for this render via the dispatched event below.
  }
  window.dispatchEvent(new Event(PM_EVENT));
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
  return readDrafts().find((d) => d.applicationId === applicationId);
}

// Starts (or resumes) a draft, prefilled from the Application/Property --
// Section 30: "Do not ask for known data again."
export function startRentalSetup(input: {
  applicationId: string;
  propertyId: string;
  renterName: string;
  monthlyRent: string;
  moveIn: string;
  initiatedBy: string;
  initiatedByRole: string;
  professionalId?: string;
}): RentalSetupDraft {
  const existing = getRentalSetupDraft(input.applicationId);
  if (existing) return existing;
  const draft: RentalSetupDraft = {
    id: `setup-${input.applicationId}`,
    applicationId: input.applicationId,
    propertyId: input.propertyId,
    professionalId: input.professionalId,
    initiatedBy: input.initiatedBy,
    initiatedByRole: input.initiatedByRole,
    renterName: input.renterName,
    status: "Draft",
    monthlyRent: input.monthlyRent,
    securityDeposit: input.monthlyRent.replace(/\s*\/\s*month\s*$/i, ""),
    startDate: input.moveIn,
    endDate: "",
    paymentDueDay: "1st of every month",
    agreementAttached: false,
  };
  writeDrafts([...readDrafts(), draft]);
  return draft;
}

export function saveRentalSetupDraft(
  applicationId: string,
  patch: Partial<RentalSetupDraft>,
) {
  writeDrafts(
    readDrafts().map((d) =>
      d.applicationId === applicationId ? { ...d, ...patch } : d,
    ),
  );
}

// The one place a new Rental (and its first Payment) comes into existence --
// Section 33: "Send Rental Setup." Owner and PM read the identical record
// afterward via getOwnerRentals()/getOwnerPayments().
export function sendRentalSetup(
  applicationId: string,
  propertyTitle: string,
): string | null {
  const draft = getRentalSetupDraft(applicationId);
  if (!draft) return null;
  if (draft.rentalId) return draft.rentalId;

  const rentalId = `HH-RENT-${Date.now().toString(36).toUpperCase()}`;
  const totalDue = setupPaymentTotal(draft.monthlyRent, draft.securityDeposit);
  const rental: OwnerRental = {
    id: rentalId,
    propertyId: draft.propertyId,
    renter: draft.renterName,
    status: "Upcoming",
    rent: draft.monthlyRent,
    start: draft.startDate,
    end: draft.endDate || "—",
    agreementStatus: "Awaiting Renter Signature",
    depositStatus: "Pending",
    paymentStatus: "Pending",
    note: `Rental setup sent for ${propertyTitle}. Awaiting renter review and signature.`,
  };
  createOwnerRental(rental);

  createOwnerPayment({
    id: `HH-PAY-${Date.now().toString(36).toUpperCase()}`,
    propertyId: draft.propertyId,
    rentalId,
    renter: draft.renterName,
    purpose: "Rental Setup — Deposit & First Month",
    amount: totalDue.label,
    amountValue: totalDue.value,
    status: "Pending",
    date: "Requested once the agreement is signed",
    method: "—",
    reference: `HH-PAY-${rentalId}`,
    managedBy: null,
  });

  writeDrafts(
    readDrafts().map((d) =>
      d.applicationId === applicationId
        ? { ...d, status: "Sent to Renter", rentalId }
        : d,
    ),
  );

  // Section 45: "PM sends Rental Setup -> Renter: Rental setup ready."
  pushRenterNotification({
    category: "rental-setup",
    title: "Rental setup ready",
    body: `Your rental setup for ${propertyTitle} is ready to review.`,
    actionLabel: "Review Setup",
    actionHref: `/renter-dashboard/rental-setup/${applicationId}`,
  });

  return rentalId;
}

// Cross-Role Lifecycle Synchronization phase -- Section 10/12: the renter
// reaches this same draft either by applicationId (from Applications, before
// a rentalId exists) or by rentalId (from My Rentals, after it does) -- one
// shared record, looked up either way, never two.
export function getRentalSetupByAnyId(
  id: string,
): RentalSetupDraft | undefined {
  return readDrafts().find((d) => d.applicationId === id || d.rentalId === id);
}

// Section 16: the renter accepting/signing updates the SAME Rental record
// PM and Owner already read -- never a second, renter-only rental.
export function completeRentalSetup(applicationId: string) {
  const draft = getRentalSetupDraft(applicationId);
  if (!draft || !draft.rentalId) return;
  const startsInFuture = new Date(draft.startDate).getTime() > Date.now();
  updateOwnerRental(draft.rentalId, {
    status: startsInFuture ? "Upcoming" : "Active",
    agreementStatus: "Signed",
    depositStatus: "Paid",
    paymentStatus: "Paid",
    note: startsInFuture
      ? `Setup complete and paid. Move-in is scheduled for ${draft.startDate}.`
      : "Rental setup complete and initial payment received.",
  });
  writeDrafts(
    readDrafts().map((d) =>
      d.applicationId === applicationId ? { ...d, status: "Completed" } : d,
    ),
  );

  // Section 45: "Renter completes Rental Setup -> PM: ... -> Owner: ..."
  const propertyTitle = resolveAnyPropertyTitle(draft.propertyId);
  // Owner Rental Setup Continuity phase -- an Owner-initiated draft has no
  // professionalId (the Owner isn't a RegisteredProfessional), so there is
  // no professional inbox to notify here. The Owner is still notified
  // below, unconditionally, exactly as before.
  if (draft.professionalId) {
    pushProfessionalNotification({
      professionalId: draft.professionalId,
      category: "rental",
      title: "Rental setup completed",
      body: `${draft.renterName} completed rental setup for ${propertyTitle}. The rental is now active.`,
      actionLabel: "View Rental",
      actionHref: `/partner-dashboard/rentals/${draft.rentalId}`,
    });
  }
  pushOwnerNotification({
    category: "rental-setup",
    title: "Rental setup completed",
    body: `${draft.renterName} completed rental setup for ${propertyTitle}. The rental is now active.`,
    actionLabel: "View Rental",
    actionHref: `/owner-dashboard/rentals?open=${draft.rentalId}`,
  });
}

// Section 16 (decline path): recorded on the same draft/rental so PM/Owner
// see it too, rather than a renter-only local dismissal.
export function declineRentalSetup(applicationId: string) {
  const draft = getRentalSetupDraft(applicationId);
  if (draft?.rentalId)
    updateOwnerRental(draft.rentalId, {
      status: "Ended",
      note: "The renter declined this rental setup invitation.",
    });
  writeDrafts(
    readDrafts().map((d) =>
      d.applicationId === applicationId ? { ...d, status: "Cancelled" } : d,
    ),
  );
}

// Section 20-23: marks the Rental Setup's initial deposit-and-first-month
// Payment "Paid" -- the SAME OwnerPayment record PM/Owner see, and updates
// the Rental's own depositStatus alongside it. A mock action; no gateway.
export function markInitialSetupPaymentPaid(rentalId: string) {
  const payment = getOwnerPayments().find(
    (p) =>
      p.rentalId === rentalId &&
      p.purpose === "Rental Setup — Deposit & First Month",
  );
  if (payment)
    updateOwnerPayment(payment.id, { status: "Paid", date: "Just now" });
  updateOwnerRental(rentalId, { depositStatus: "Paid" });

  // Section 45: "Renter pays -> PM: Payment received -> Owner: Payment received."
  const draft = readDrafts().find((d) => d.rentalId === rentalId);
  if (draft) {
    const propertyTitle = resolveAnyPropertyTitle(draft.propertyId);
    if (draft.professionalId) {
      pushProfessionalNotification({
        professionalId: draft.professionalId,
        category: "payment",
        title: "Payment received",
        body: `${draft.renterName} paid the deposit and first month's rent for ${propertyTitle}.`,
        actionLabel: "View Payment",
        actionHref: `/partner-dashboard/payments?propertyId=${encodeURIComponent(draft.propertyId)}`,
      });
    }
    pushOwnerNotification({
      category: "payment",
      title: "Payment received",
      body: `${draft.renterName} paid the deposit and first month's rent for ${propertyTitle}.`,
      actionLabel: "View Payments",
      actionHref: "/owner-dashboard/payments",
    });
  }
}
