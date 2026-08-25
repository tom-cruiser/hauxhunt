"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useReducer, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { resolveAnyPropertyLocation, resolveAnyPropertyTitle, subscribeToIndependentProperties } from "@/lib/professional-properties";
import { getApplication, subscribeToProfessionalWork } from "@/lib/professional-work";
import { canManageRentalSetupFor, getRentalSetupDraft, sendRentalSetup, startRentalSetup, subscribeToPmWork } from "@/lib/pm-work";
import { AgreementStep, PaymentTermsStep, RENTAL_SETUP_STEPS as STEPS, RentalDetailsStep, ReviewStep } from "@/components/rental-setup/rental-setup-steps";

// Property Manager Dashboard phase -- Section 27-34. Rental Setup: the
// hand-off from an Approved Application into an actual OwnerRental. A
// clear, small stepper (Rental Details -> Agreement -> Payment Terms ->
// Review & Send), NOT a legal contract-generation engine -- reuses the
// renter-side rental-setup screen's shape/vocabulary (steps, "who signs")
// without duplicating its (hardcoded, single-scenario) implementation.
// Sending creates the ONE real Rental + Payment record (via pm-work.ts's
// sendRentalSetup, which writes through owner-data.ts) that Owner and PM
// both then read identically.
//
// Owner Rental Setup Continuity phase -- the four step components (and
// STEPS) were extracted verbatim to
// components/rental-setup/rental-setup-steps.tsx so the Owner dashboard's
// own Rental Setup route can render the identical steps. This page's own
// shell, gating, breadcrumb, and "step X of Y" chrome are unchanged; only
// the startRentalSetup() call below gained the two new required fields
// (initiatedBy/initiatedByRole) every draft now carries.

export default function RentalSetupPage() {
  const params = useParams<{ applicationId: string }>();
  const router = useRouter();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToProfessionalWork(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const [step, setStep] = useState(0);
  const professional = useDemoProfessional("property_manager");
  const application = getApplication(params.applicationId);

  if (!professional || !application) {
    return (
      <DashboardShell initialSection="applications">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t find this application.</p>
        </section>
      </DashboardShell>
    );
  }

  if (application.status !== "Approved" || !canManageRentalSetupFor(professional.id, application.propertyId)) {
    return (
      <DashboardShell initialSection="applications">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <div className="mx-auto max-w-180 rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
            <h3 className="font-bricolage text-xl font-medium">Rental setup isn&apos;t available</h3>
            <p className="text-carbon-500 mt-2 text-sm leading-6">
              {application.status !== "Approved" ? "This application hasn't been approved yet." : "You don't have rental setup responsibility for this property."}
            </p>
            <Link href="/partner-dashboard/applications" className="font-bricolage mt-6 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white">
              Back to Applications
            </Link>
          </div>
        </section>
      </DashboardShell>
    );
  }

  const draft =
    getRentalSetupDraft(application.id) ??
    startRentalSetup({
      applicationId: application.id,
      propertyId: application.propertyId,
      professionalId: professional.id,
      initiatedBy: professional.name,
      initiatedByRole: "Property Manager",
      renterName: application.applicant,
      monthlyRent: application.proposedRent,
      moveIn: application.moveIn,
    });

  if (draft.status === "Sent to Renter" || draft.status === "Completed") {
    return (
      <DashboardShell initialSection="applications">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <div className="mx-auto max-w-180 rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
            <h3 className="font-bricolage text-xl font-medium">Rental setup already sent</h3>
            <p className="text-carbon-500 mt-2 text-sm leading-6">This rental setup was already sent to {draft.renterName}.</p>
            <Link href={`/partner-dashboard/rentals${draft.rentalId ? `/${draft.rentalId}` : ""}`} className="font-bricolage mt-6 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white">
              View Rental
            </Link>
          </div>
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell initialSection="applications">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-260">
          <Link href="/partner-dashboard/applications" className="text-carbon-500 inline-flex items-center gap-1 text-sm font-medium hover:text-black">
            <ChevronLeft className="size-4" />
            Applications
          </Link>

          <header className="mt-4 border-b border-black/10 pb-8">
            <h1 className="font-bricolage text-carbon-900 text-2xl font-medium">Rental Setup</h1>
            <p className="text-carbon-500 mt-2 text-sm">
              {resolveAnyPropertyTitle(application.propertyId)} · {application.applicant}
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
                  propertyTitle={resolveAnyPropertyTitle(application.propertyId)}
                  propertyLocation={resolveAnyPropertyLocation(application.propertyId)}
                  next={() => setStep(1)}
                />
              ) : null}
              {step === 1 ? <AgreementStep draft={draft} back={() => setStep(0)} next={() => setStep(2)} /> : null}
              {step === 2 ? <PaymentTermsStep draft={draft} back={() => setStep(1)} next={() => setStep(3)} /> : null}
              {step === 3 ? (
                <ReviewStep
                  draft={draft}
                  propertyTitle={resolveAnyPropertyTitle(application.propertyId)}
                  back={() => setStep(2)}
                  onSend={() => {
                    const rentalId = sendRentalSetup(application.id, resolveAnyPropertyTitle(application.propertyId));
                    if (rentalId) router.push(`/partner-dashboard/rentals/${rentalId}`);
                  }}
                />
              ) : null}
            </section>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
