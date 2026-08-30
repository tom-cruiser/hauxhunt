"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useReducer, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { OWNER, getOwnerApplication, propertyLocation, propertyTitle, subscribeToOwnerApplications } from "@/lib/owner-data";
import { getRentalSetupManagerFor } from "@/lib/professional-work";
import { getRentalSetupDraft, sendRentalSetup, startRentalSetup, subscribeToPmWork } from "@/lib/pm-work";
import { AgreementStep, PaymentTermsStep, RENTAL_SETUP_STEPS as STEPS, RentalDetailsStep, ReviewStep } from "@/components/rental-setup/rental-setup-steps";

// Owner Rental Setup Continuity phase -- the Owner's entry point onto the
// Rental Setup wizard. This used to be shared with a parallel PM-side
// wizard (partner-dashboard/rentals/setup/[applicationId]/page.tsx), which
// was removed along with the rest of the partner-dashboard Rentals surface
// -- rental setup is Owner-only now, but the shared RentalSetupDraft, step
// components (rental-setup-steps.tsx), and sendRentalSetup() (producing the
// one real OwnerRental + OwnerPayment Owner/Renter read afterward) are kept
// exactly as they were, since a Renter still completes their half of the
// same draft from renter-dashboard/rental-setup/[id]/page.tsx.
//
// getRentalSetupManagerFor(application.propertyId) always returns null now
// (no PM/Agent can hold this task any more), so this page is reachable for
// any Approved application; the `manager` gate below is kept for shape
// parity with owner-dashboard/applications/page.tsx's RentalSetupSection
// rather than deleted outright.

export default function OwnerRentalSetupPage() {
  const params = useParams<{ applicationId: string }>();
  const router = useRouter();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToOwnerApplications(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const [step, setStep] = useState(0);
  const application = getOwnerApplication(params.applicationId);

  if (!application) {
    return (
      <OwnerDashboardShell>
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t find this application.</p>
        </section>
      </OwnerDashboardShell>
    );
  }

  const manager = getRentalSetupManagerFor(application.propertyId);

  if (application.status !== "Approved" || manager) {
    return (
      <OwnerDashboardShell>
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <div className="mx-auto max-w-180 rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
            <h3 className="font-bricolage text-xl font-medium">Rental setup isn&apos;t available</h3>
            <p className="text-carbon-500 mt-2 text-sm leading-6">
              {application.status !== "Approved"
                ? "This application hasn't been approved yet."
                : `This property's rental setup is handled by ${manager?.name} · ${manager?.roleLabel}.`}
            </p>
            <Link href={`/owner-dashboard/applications?open=${application.id}`} className="font-bricolage mt-6 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white">
              Back to Applications
            </Link>
          </div>
        </section>
      </OwnerDashboardShell>
    );
  }

  const draft =
    getRentalSetupDraft(application.id) ??
    startRentalSetup({
      applicationId: application.id,
      propertyId: application.propertyId,
      initiatedBy: OWNER.name,
      initiatedByRole: OWNER.role,
      renterName: application.applicant,
      monthlyRent: application.proposedRent,
      moveIn: application.moveIn,
    });

  if (draft.status === "Sent to Renter" || draft.status === "Completed") {
    return (
      <OwnerDashboardShell>
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <div className="mx-auto max-w-180 rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
            <h3 className="font-bricolage text-xl font-medium">Rental setup already sent</h3>
            <p className="text-carbon-500 mt-2 text-sm leading-6">This rental setup was already sent to {draft.renterName}.</p>
            <Link
              href={draft.rentalId ? `/owner-dashboard/rentals?open=${draft.rentalId}` : `/owner-dashboard/applications?open=${application.id}`}
              className="font-bricolage mt-6 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white"
            >
              {draft.rentalId ? "View Rental" : "Back to Applications"}
            </Link>
          </div>
        </section>
      </OwnerDashboardShell>
    );
  }

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-260">
          <Link href={`/owner-dashboard/applications?open=${application.id}`} className="text-carbon-500 inline-flex items-center gap-1 text-sm font-medium hover:text-black">
            <ChevronLeft className="size-4" />
            Applications
          </Link>

          <header className="mt-4 border-b border-black/10 pb-8">
            <h1 className="font-bricolage text-carbon-900 text-2xl font-medium">Rental Setup</h1>
            <p className="text-carbon-500 mt-2 text-sm">
              {propertyTitle(application.propertyId)} · {application.applicant}
            </p>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="h-fit rounded-[1.5rem] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-medium">Step {step + 1} of {STEPS.length}</p>
              <div className="mt-3 h-1 rounded-full bg-black/10">
                <div className="h-full rounded-full bg-black transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
              </div>
              <nav className="mt-4 space-y-1">
                {STEPS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => i <= step && setStep(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${i === step ? "bg-black text-white" : "text-black/55"}`}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">
                      {i < step ? <Check className="size-3" /> : i + 1}
                    </span>
                    {s}
                  </button>
                ))}
              </nav>
            </aside>

            <section className="rounded-[1.5rem] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:p-8">
              {step === 0 ? (
                <RentalDetailsStep
                  draft={draft}
                  propertyTitle={propertyTitle(application.propertyId)}
                  propertyLocation={propertyLocation(application.propertyId)}
                  next={() => setStep(1)}
                />
              ) : null}
              {step === 1 ? <AgreementStep draft={draft} back={() => setStep(0)} next={() => setStep(2)} /> : null}
              {step === 2 ? <PaymentTermsStep draft={draft} back={() => setStep(1)} next={() => setStep(3)} /> : null}
              {step === 3 ? (
                <ReviewStep
                  draft={draft}
                  propertyTitle={propertyTitle(application.propertyId)}
                  back={() => setStep(2)}
                  onSend={() => {
                    const rentalId = sendRentalSetup(application.id, propertyTitle(application.propertyId));
                    if (rentalId) router.push(`/owner-dashboard/rentals?open=${rentalId}`);
                  }}
                />
              ) : null}
            </section>
          </div>
        </div>
      </section>
    </OwnerDashboardShell>
  );
}
