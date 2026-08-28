import { getPaymentsFor } from "@/lib/pm-work";
import { formatRwf } from "@/lib/owner-data";

/**
 * The Payouts system -- where a Property Manager sends the rent HauxHunt
 * has collected on their behalf. Genuinely new to the app (there was no
 * multi-destination payout concept before this), built the same way as
 * every other data module here: sessionStorage-backed, scoped per
 * professional, with the property manager's own real Paid `OwnerPayment`
 * total (pm-work.ts's `getPaymentsFor`) as the ledger balance -- never a
 * fabricated number.
 *
 * Security note (deliberate, not an oversight): a Visa card destination
 * asks for a full 16-digit PAN in the add-destination form because the
 * product spec calls for that field, but nothing in this app has a
 * PCI-compliant vault to hold one -- there is no backend at all. The full
 * number is validated client-side (`validateCardNumber`) and then
 * immediately discarded; only the brand and last 4 digits are ever kept in
 * `CardDestination`/sessionStorage, the same way a real integration would
 * only ever retain a token from its payment processor, never the PAN
 * itself. Never widen `CardDestination` to store the full number.
 */

// ---------------------------------------------------------------------------
// Destinations
// ---------------------------------------------------------------------------

export type PayoutDestinationType = "mobile_money" | "local_bank" | "swift" | "card";

export type MobileMoneyDestination = {
  id: string;
  type: "mobile_money";
  label: string;
  network: "MTN" | "Airtel";
  phoneNumber: string;
  createdAt: number;
};

export type LocalBankDestination = {
  id: string;
  type: "local_bank";
  label: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt: number;
};

export type SwiftDestination = {
  id: string;
  type: "swift";
  label: string;
  bankName: string;
  branchAddress: string;
  beneficiaryAccountName: string;
  accountNumberOrIban: string;
  swiftBic: string;
  intermediaryBankName?: string;
  intermediarySwiftBic?: string;
  createdAt: number;
};

export type CardDestination = {
  id: string;
  type: "card";
  label: string;
  cardholderName: string;
  /** Never the full PAN -- see the module doc comment. */
  cardLast4: string;
  expiryMonth: string;
  expiryYear: string;
  billingAddress: string;
  createdAt: number;
};

export type PayoutDestination = MobileMoneyDestination | LocalBankDestination | SwiftDestination | CardDestination;

// Plain `Omit` over a union collapses to the union's common keys only
// (`type`/`label`/`createdAt` here) instead of omitting per-member -- this
// distributes it, so `NewPayoutDestination` keeps each variant's own fields
// minus `id`/`createdAt`.
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type NewPayoutDestination = DistributiveOmit<PayoutDestination, "id" | "createdAt">;

export const LOCAL_BANKS = ["Bank of Kigali", "Equity Bank Rwanda", "I&M Bank Rwanda", "Access Bank Rwanda", "Ecobank Rwanda", "Cogebanque"] as const;

export const DESTINATION_TYPE_LABEL: Record<PayoutDestinationType, string> = {
  mobile_money: "Mobile Money",
  local_bank: "Local Bank Account",
  swift: "Domiciliary Bank / SWIFT",
  card: "Visa Card",
};

function destinationsKey(professionalId: string) {
  return `hauxhunt-payout-destinations-${professionalId}`;
}
function requestsKey(professionalId: string) {
  return `hauxhunt-payout-requests-${professionalId}`;
}

const PAYOUTS_EVENT = "hauxhunt-payouts-changed";

function readList(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeList(key: string, list: unknown[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage full/unavailable -- the change still applies for this render.
  }
  window.dispatchEvent(new Event(PAYOUTS_EVENT));
}

export function subscribeToPayouts(callback: () => void) {
  window.addEventListener(PAYOUTS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PAYOUTS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Demo seed -- Jean Mugisha (the demo PM, see team-data.ts's DEMO_PM_ID)
// already has two real destinations on file, and one prior payout of each
// lifecycle status, so the Payouts tab has something to show on first load
// rather than three empty states. Every other professional starts with none.
const DEMO_PM_ID = "jean-mugisha";

function seedDestinationsFor(professionalId: string): PayoutDestination[] {
  if (professionalId !== DEMO_PM_ID) return [];
  return [
    {
      id: "payout-dest-1",
      type: "mobile_money",
      label: "MTN •••• 6789",
      network: "MTN",
      phoneNumber: "0788 456 789",
      createdAt: Date.parse("2026-08-10"),
    },
    {
      id: "payout-dest-2",
      type: "local_bank",
      label: "Bank of Kigali •••1042",
      bankName: "Bank of Kigali",
      accountNumber: "00040 001234 1042",
      accountName: "Jean Mugisha",
      createdAt: Date.parse("2026-08-12"),
    },
  ];
}

export function getDestinationsFor(professionalId: string): PayoutDestination[] {
  const stored = readList(destinationsKey(professionalId)) as PayoutDestination[] | null;
  return stored ?? seedDestinationsFor(professionalId);
}

export function getDestination(professionalId: string, destinationId: string): PayoutDestination | undefined {
  return getDestinationsFor(professionalId).find((d) => d.id === destinationId);
}

export function addDestination(professionalId: string, destination: NewPayoutDestination) {
  const next: PayoutDestination = { ...destination, id: `payout-dest-${Date.now().toString(36)}`, createdAt: Date.now() };
  writeList(destinationsKey(professionalId), [...getDestinationsFor(professionalId), next]);
  return next;
}

export function removeDestination(professionalId: string, destinationId: string) {
  writeList(
    destinationsKey(professionalId),
    getDestinationsFor(professionalId).filter((d) => d.id !== destinationId),
  );
}

// ---------------------------------------------------------------------------
// Fees -- a simple, clearly-labelled schedule. Real rates would come from
// whichever payment/payout processor HauxHunt integrates; this is the
// stand-in every other money feature in this app already uses ("a mock
// action; no gateway" -- pm-work.ts, owner-dashboard/payments/page.tsx).
// ---------------------------------------------------------------------------

export type FeeQuote = { feeValue: number; fee: string; netValue: number; net: string; label: string };

const FEE_RULES: Record<PayoutDestinationType, { label: string; compute: (amountValue: number) => number }> = {
  mobile_money: { label: "Mobile money transfer fee (1%, capped at RWF 1,000)", compute: (v) => Math.min(1000, Math.round(v * 0.01)) },
  local_bank: { label: "Local bank transfer fee (flat)", compute: () => 1000 },
  swift: { label: "International SWIFT transfer fee (flat)", compute: () => 15000 },
  card: { label: "Card payout fee (2.5%)", compute: (v) => Math.round(v * 0.025) },
};

export function quoteFee(type: PayoutDestinationType, amountValue: number): FeeQuote {
  const rule = FEE_RULES[type];
  const feeValue = amountValue > 0 ? rule.compute(amountValue) : 0;
  const netValue = Math.max(0, amountValue - feeValue);
  return { feeValue, fee: formatRwf(feeValue), netValue, net: formatRwf(netValue), label: rule.label };
}

// ---------------------------------------------------------------------------
// Payout requests -- the lifecycle table.
// ---------------------------------------------------------------------------

export type PayoutRequestStatus = "Requested" | "Processing" | "Successful" | "Failed";

export type PayoutRequest = {
  id: string;
  destinationId: string;
  amountValue: number;
  amount: string;
  feeValue: number;
  fee: string;
  netValue: number;
  net: string;
  status: PayoutRequestStatus;
  requestedAt: number;
  /** Only set for `Failed` -- what the partner needs to fix before retrying. */
  failureReason?: string;
};

function seedRequestsFor(professionalId: string): PayoutRequest[] {
  if (professionalId !== DEMO_PM_ID) return [];
  const successfulAmount = 400_000;
  const successfulFee = quoteFee("mobile_money", successfulAmount);
  const failedAmount = 250_000;
  const failedFee = quoteFee("local_bank", failedAmount);
  return [
    {
      id: "payout-req-1",
      destinationId: "payout-dest-1",
      amountValue: successfulAmount,
      amount: formatRwf(successfulAmount),
      feeValue: successfulFee.feeValue,
      fee: successfulFee.fee,
      netValue: successfulFee.netValue,
      net: successfulFee.net,
      status: "Successful",
      requestedAt: Date.parse("2026-08-15"),
    },
    {
      id: "payout-req-2",
      destinationId: "payout-dest-2",
      amountValue: failedAmount,
      amount: formatRwf(failedAmount),
      feeValue: failedFee.feeValue,
      fee: failedFee.fee,
      netValue: failedFee.netValue,
      net: failedFee.net,
      status: "Failed",
      requestedAt: Date.parse("2026-08-20"),
      failureReason: "The receiving bank rejected the transfer -- the account number on this destination could not be verified. Update the destination's details and try again.",
    },
  ];
}

export function getPayoutRequestsFor(professionalId: string): PayoutRequest[] {
  const stored = readList(requestsKey(professionalId)) as PayoutRequest[] | null;
  return (stored ?? seedRequestsFor(professionalId)).slice().sort((a, b) => b.requestedAt - a.requestedAt);
}

/** The partner's real available balance: rent actually collected (Paid
 * OwnerPayment records this professional can see -- pm-work.ts's
 * `getPaymentsFor`) minus every payout that isn't Failed. A Failed payout
 * never touched the balance's destination, so it returns the full amount
 * to what's available -- exactly like a reversed real transfer would. */
export function getAvailableBalance(professionalId: string): number {
  const collected = getPaymentsFor(professionalId)
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + p.amountValue, 0);
  const held = getPayoutRequestsFor(professionalId)
    .filter((r) => r.status !== "Failed")
    .reduce((sum, r) => sum + r.amountValue, 0);
  return Math.max(0, collected - held);
}

export function requestPayout(professionalId: string, destinationId: string, amountValue: number): PayoutRequest | { error: string } {
  const balance = getAvailableBalance(professionalId);
  if (amountValue <= 0) return { error: "Enter an amount greater than zero." };
  if (amountValue > balance) return { error: "This amount is more than your available balance." };
  const destination = getDestination(professionalId, destinationId);
  if (!destination) return { error: "Select a payout destination." };

  const quote = quoteFee(destination.type, amountValue);
  const request: PayoutRequest = {
    id: `payout-req-${Date.now().toString(36)}`,
    destinationId,
    amountValue,
    amount: formatRwf(amountValue),
    feeValue: quote.feeValue,
    fee: quote.fee,
    netValue: quote.netValue,
    net: quote.net,
    status: "Requested",
    requestedAt: Date.now(),
  };
  writeList(requestsKey(professionalId), [...getPayoutRequestsFor(professionalId), request]);
  return request;
}

// ---------------------------------------------------------------------------
// One-time code -- the "security/authorization step" the spec asks for.
// There's no SMS/email gateway anywhere in this app (confirmed alongside
// every other "mock action" module here), so the code is generated and
// shown directly in the confirmation modal rather than faked as having been
// "sent" somewhere the partner can't actually see -- same honesty rule as
// `PlanToggleCard`'s "This is a demo toggle" copy.
// ---------------------------------------------------------------------------

export function generateDemoOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------------------------------------------------------------------------
// Validation -- frontend rules for each destination type's fields.
// ---------------------------------------------------------------------------

export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 12;
}

export function isValidLocalAccountNumber(value: string): boolean {
  const digits = value.replace(/\s/g, "");
  return /^[0-9]{6,20}$/.test(digits);
}

/** 8 or 11 characters: 4-letter bank code, 2-letter country code, 2
 * alphanumeric location code, optional 3-character branch code. */
export function isValidSwiftBic(value: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value.trim().toUpperCase());
}

export function isValidIbanOrAccountNumber(value: string): boolean {
  const compact = value.replace(/\s/g, "");
  return /^[A-Z0-9]{5,34}$/i.test(compact);
}

/** Luhn checksum + length -- the standard client-side card-number check;
 * it confirms the number is well-formed, never whether the card is real. */
export function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\s/g, "");
  if (!/^[0-9]{16}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function isValidExpiry(month: string, year: string): boolean {
  if (!/^(0[1-9]|1[0-2])$/.test(month) || !/^[0-9]{2}$/.test(year)) return false;
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  const y = Number(year);
  const m = Number(month);
  return y > currentYear || (y === currentYear && m >= currentMonth);
}

export function maskCardNumber(last4: string): string {
  return `•••• •••• •••• ${last4}`;
}
