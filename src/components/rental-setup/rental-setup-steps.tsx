"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { Check, ChevronRight, FileText } from "lucide-react";

import {
  attachRentalAgreement,
  saveRentalSetupDraft,
  type RentalSetupDraft,
} from "@/lib/pm-work";

// Owner Rental Setup Continuity phase -- extracted from the Property
// Manager Dashboard phase's rental setup wizard (partner-dashboard's
// rentals/setup/[applicationId]/page.tsx, since removed along with the
// rest of the partner-dashboard Rentals surface -- rental setup is
// Owner-only now), which mixed this reusable step UI with PM-only shell
// code (DashboardShell, useDemoProfessional, breadcrumb). The Owner
// performs the exact same domain task -- prepare rental terms, attach an
// agreement, confirm payment terms, review, send -- so these steps were
// pulled out verbatim (no visual or behavioral change) for the Owner
// dashboard's own rental-setup route to render inside its own shell.

export const RENTAL_SETUP_STEPS = [
  "Rental Details",
  "Agreement",
  "Payment Terms",
  "Review & Send",
];

export function Row({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex justify-between gap-5 border-b border-black/8 py-3 text-sm">
      <span className="text-carbon-500">{a}</span>
      <strong className="text-right">{b}</strong>
    </div>
  );
}

export function StepFooter({
  back,
  next,
  nextLabel,
  disabled,
}: {
  back?: () => void;
  next: () => void;
  nextLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-black/10 pt-5">
      {back ? (
        <button type="button" onClick={back} className="text-sm underline">
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={next}
        className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        {nextLabel}
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function RentalDetailsStep({
  draft,
  propertyTitle,
  propertyLocation,
  next,
}: {
  draft: RentalSetupDraft;
  propertyTitle: string;
  propertyLocation: string;
  next: () => void;
}) {
  const [rent, setRent] = useState(String(draft.terms.monthlyRent));
  const [deposit, setDeposit] = useState(String(draft.terms.securityDeposit));
  const [start, setStart] = useState(draft.terms.startDate);
  const [end, setEnd] = useState(draft.terms.endDate);
  const complete =
    Number.isInteger(Number(rent)) &&
    Number(rent) >= 1 &&
    deposit !== "" &&
    Number.isInteger(Number(deposit)) &&
    Number(deposit) >= 0 &&
    start !== "" &&
    (end === "" || end > start);

  return (
    <div>
      <h2 className="font-bricolage text-xl font-medium">Rental Details</h2>
      <p className="text-carbon-500 mt-2 text-sm leading-6">
        Prefilled from the approved application and property. Adjust anything
        before sending.
      </p>
      <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
        <Row a="Property" b={propertyTitle} />
        <Row a="Location" b={propertyLocation} />
        <Row a="Renter" b={draft.renterName} />
        <Row a="Payment due day" b={draft.paymentDueDay} />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-carbon-600 text-xs font-medium">
            Monthly rent ({draft.currency})
          </span>
          <input
            type="number"
            min={1}
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl bg-black/3 px-4 text-sm outline-none"
          />
        </label>
        <label className="block">
          <span className="text-carbon-600 text-xs font-medium">
            Security deposit ({draft.currency})
          </span>
          <input
            type="number"
            min={0}
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl bg-black/3 px-4 text-sm outline-none"
          />
        </label>
        <label className="block">
          <span className="text-carbon-600 text-xs font-medium">
            Rental start
          </span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl bg-black/3 px-4 text-sm outline-none"
          />
        </label>
        <label className="block">
          <span className="text-carbon-600 text-xs font-medium">
            Rental end
          </span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl bg-black/3 px-4 text-sm outline-none"
          />
        </label>
      </div>
      <StepFooter
        disabled={!complete}
        next={async () => {
          const saved = await saveRentalSetupDraft(draft.id, {
            monthlyRent: Number(rent),
            securityDeposit: Number(deposit),
            startDate: start,
            endDate: end,
          });
          if (saved) next();
        }}
        nextLabel="Continue to Agreement"
      />
    </div>
  );
}

export function AgreementStep({
  draft,
  back,
  next,
}: {
  draft: RentalSetupDraft;
  back: () => void;
  next: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function attach(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    await attachRentalAgreement(draft.id, file);
    setUploading(false);
  }

  return (
    <div>
      <h2 className="font-bricolage text-xl font-medium">Agreement</h2>
      <p className="text-carbon-500 mt-2 text-sm leading-6">
        Attach the rental agreement document. The renter reviews and signs it
        once setup is sent.
      </p>
      <div className="mt-6 rounded-2xl bg-black/3 p-5">
        <p className="flex items-center gap-2 font-medium">
          <FileText aria-hidden="true" className="size-5" />
          {draft.agreementAttached
            ? `${draft.agreementFileName} attached`
            : "No agreement attached yet"}
        </p>
        <label className="font-bricolage mt-4 inline-flex h-10 cursor-pointer items-center rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black">
          {uploading
            ? "Uploading…"
            : draft.agreementAttached
              ? "Replace document"
              : "Attach Agreement"}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            disabled={uploading}
            onChange={attach}
            className="sr-only"
          />
        </label>
      </div>
      <div className="mt-6 grid gap-4 border-t border-black/8 pt-5 sm:grid-cols-2">
        <div>
          <p className="text-carbon-400 text-xs">Renter signature</p>
          <p className="mt-1 font-medium">Awaiting signature</p>
        </div>
        <div>
          <p className="text-carbon-400 text-xs">Property representative</p>
          <p className="mt-1 font-medium">You · will sign on send</p>
        </div>
      </div>
      <StepFooter
        back={back}
        disabled={!draft.agreementAttached || uploading}
        next={next}
        nextLabel="Continue to Payment Terms"
      />
    </div>
  );
}

export function PaymentTermsStep({
  draft,
  back,
  next,
}: {
  draft: RentalSetupDraft;
  back: () => void;
  next: () => void;
}) {
  const [dueDay, setDueDay] = useState(String(draft.terms.paymentDueDay));
  const day = Number(dueDay);
  return (
    <div>
      <h2 className="font-bricolage text-xl font-medium">Payment Terms</h2>
      <p className="text-carbon-500 mt-2 text-sm leading-6">
        The renter&apos;s rental obligation -- not a payment method. Payment
        methods are the renter&apos;s own, set on their side.
      </p>
      <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
        <Row a="Monthly rent" b={draft.monthlyRent} />
        <Row a="Security deposit" b={draft.securityDeposit} />
        <Row
          a="Initial payment due"
          b={`${draft.securityDeposit} + first month's rent`}
        />
      </div>
      <label className="mt-6 block max-w-xs">
        <span className="text-carbon-600 text-xs font-medium">
          Payment due day (1–28)
        </span>
        <input
          type="number"
          min={1}
          max={28}
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl bg-black/3 px-4 text-sm outline-none"
        />
      </label>
      <StepFooter
        back={back}
        disabled={!Number.isInteger(day) || day < 1 || day > 28}
        next={async () => {
          const saved = await saveRentalSetupDraft(draft.id, {
            paymentDueDay: day,
          });
          if (saved) next();
        }}
        nextLabel="Continue to Review"
      />
    </div>
  );
}

export function ReviewStep({
  draft,
  propertyTitle,
  back,
  onSend,
}: {
  draft: RentalSetupDraft;
  propertyTitle: string;
  back: () => void;
  onSend: () => void;
}) {
  return (
    <div>
      <h2 className="font-bricolage text-xl font-medium">Review &amp; Send</h2>
      <p className="text-carbon-500 mt-2 text-sm leading-6">
        Confirm the details below before sending this rental setup to{" "}
        {draft.renterName}.
      </p>
      <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
        <Row a="Property" b={propertyTitle} />
        <Row a="Renter" b={draft.renterName} />
        <Row a="Monthly rent" b={draft.monthlyRent} />
        <Row a="Security deposit" b={draft.securityDeposit} />
        <Row a="Rental start" b={draft.startDate} />
        <Row a="Rental end" b={draft.endDate || "Not set"} />
        <Row a="Payment due day" b={draft.paymentDueDay} />
        <Row
          a="Agreement"
          b={draft.agreementFileName ?? "Not attached"}
        />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-5">
        <button type="button" onClick={back} className="text-sm underline">
          Back
        </button>
        <button
          type="button"
          onClick={onSend}
          className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white"
        >
          <Check aria-hidden="true" className="size-4" />
          Send Rental Setup
        </button>
      </div>
    </div>
  );
}
