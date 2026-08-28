/**
 * Tenant (applicant) rental history -- previous tenancies, on-time payment
 * reliability, and past landlord feedback, shown on paid-tier's "View
 * Tenant History" (see `TenantHistoryDrawer`). Adapted from the Joseph
 * checkout's `tenant-history-demo.ts`/`Tenanthistory.md`, keyed against
 * this app's real applicant names -- `OWNER_APPLICATIONS` and
 * `SEED_INDEPENDENT_APPLICATIONS` only ever use three (Julien Mugisha,
 * Divine Keza, Eric Niyonzima; see owner-data.ts / professional-work.ts) --
 * rather than a disconnected cast of names nothing else in the app uses.
 *
 * There is no applicantId anywhere on an application record (just a display
 * name), so entries are keyed by a normalized slug of that name. An
 * applicant with no entry here is a first-time renter with no rental
 * record -- `TenantHistoryDrawer` renders an empty state for them rather
 * than a zeroed-out one.
 */

export type TenantStay = {
  propertyTitle: string;
  location: string;
  durationMonths: number;
  /** 1-5. */
  landlordRating: number;
  landlordComment: string;
};

export type TenantHistoryRecord = {
  applicantName: string;
  totalMonthsRented: number;
  propertiesRented: number;
  /** 0-100. */
  onTimePaymentRate: number;
  stays: TenantStay[];
};

function keyFor(applicantName: string): string {
  return applicantName.trim().toLowerCase().replace(/\s+/g, "-");
}

const TENANT_HISTORY: Record<string, TenantHistoryRecord> = {
  "julien-mugisha": {
    applicantName: "Julien Mugisha",
    totalMonthsRented: 30,
    propertiesRented: 2,
    onTimePaymentRate: 93,
    stays: [
      {
        propertyTitle: "Sunset Court Apartments",
        location: "Nyamirambo, Kigali",
        durationMonths: 18,
        landlordRating: 5,
        landlordComment: "Always paid on time and kept the apartment spotless. Would rent to him again without hesitation.",
      },
      {
        propertyTitle: "Kimisagara Residences",
        location: "Kimisagara, Kigali",
        durationMonths: 12,
        landlordRating: 4,
        landlordComment: "Reliable tenant. One late payment during the whole stay, but he always let us know in advance.",
      },
    ],
  },
  "divine-keza": {
    applicantName: "Divine Keza",
    totalMonthsRented: 14,
    propertiesRented: 1,
    onTimePaymentRate: 78,
    stays: [
      {
        propertyTitle: "Remera Court",
        location: "Remera, Kigali",
        durationMonths: 14,
        landlordRating: 3,
        landlordComment: "Payments were often a few days late, though rent was always paid in full eventually.",
      },
    ],
  },
  "eric-niyonzima": {
    applicantName: "Eric Niyonzima",
    totalMonthsRented: 0,
    propertiesRented: 0,
    onTimePaymentRate: 0,
    stays: [],
  },
};

export function getTenantHistory(applicantName: string): TenantHistoryRecord | undefined {
  const record = TENANT_HISTORY[keyFor(applicantName)];
  return record && record.stays.length > 0 ? record : undefined;
}
