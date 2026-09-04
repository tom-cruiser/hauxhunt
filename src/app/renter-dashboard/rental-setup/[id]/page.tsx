"use client";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import agreedIllustration from "@/assets/images/agreed.png";
import managerAvatar from "@/assets/images/julien.jpg";
import emptyIllustration from "@/assets/images/empty.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { useTranslation } from "@/components/language/use-translation";
import { RENTER_APPLICATIONS } from "@/data/renter-applications";
import { DEMO_LISTINGS } from "@/data/hero-search-demo";
import {
  resolveAnyPropertyLocation,
  resolveAnyPropertyTitle,
} from "@/lib/professional-properties";
import { getPaymentsForRentalId } from "@/lib/owner-data";
import {
  completeRentalSetup,
  declineRentalSetup,
  getRentalSetupByAnyId,
  markInitialSetupPaymentPaid,
  saveRentalSetupDraft,
  sendRentalSetup,
  startRentalSetup,
  subscribeToPmWork,
  type RentalSetupDraft,
} from "@/lib/pm-work";

// Cross-Role Lifecycle Synchronization phase -- Section 12-19. Previously a
// fully hardcoded, single-scenario ("Nyarutarama Garden Apartment") page
// that didn't even read its own [id] param. Now resolves a REAL, shared
// Rental Setup (pm-work.ts's RentalSetupDraft, the exact record PM's
// "Send Rental Setup" produced) by either applicationId or rentalId --
// same identity, viewed from the renter's side. The step UI/visual design
// is otherwise preserved exactly as it was.

// Step labels are display-only (the wizard only ever compares the numeric
// `step` index, never these strings), so they're resolved via `t()` from
// this key list rather than kept as literal English text.
const STEP_KEYS = [
  "renterDashboard.rentalSetup.steps.rentalDetails",
  "renterDashboard.rentalSetup.steps.rentalAgreement",
  "renterDashboard.rentalSetup.steps.payments",
  "renterDashboard.rentalSetup.steps.moveIn",
  "renterDashboard.rentalSetup.steps.complete",
] as const;
type Modal =
  "question" | "agreement" | "sign" | "payment" | "receipt" | "decline" | null;
const subscribeToHydration = () => () => {};

export default function RentalSetupPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const [step, setStep] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  const [read, setRead] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signedAt, setSignedAt] = useState("");
  const [paid, setPaid] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [signature, setSignature] = useState("");
  const [declined, setDeclined] = useState(false);

  const draft = hydrated ? getRentalSetupByAnyId(params.id) : undefined;
  const approvedApplication = RENTER_APPLICATIONS.find(
    (application) =>
      application.id === params.id && application.status === "Approved",
  );

  useEffect(() => {
    if (!hydrated || draft || !approvedApplication) return;

    const listing = DEMO_LISTINGS.find(
      (item) => item.id === approvedApplication.propertyId,
    );
    // The currency-amount branch (listing found) is left untranslated,
    // matching the app-wide rule that currency amounts/codes stay as-is;
    // only the plain-text fallback below is translated.
    const monthlyRent = listing
      ? `${listing.currency} ${listing.price.toLocaleString()} / month`
      : t("renterDashboard.rentalSetup.rentToBeConfirmed");

    startRentalSetup({
      applicationId: approvedApplication.id,
      propertyId: approvedApplication.propertyId,
      renterName: "Julien Mugisha",
      monthlyRent,
      // Note: this demo move-in/end date stay in English -- they flow into
      // `draft.startDate` which `new Date(...)` parses elsewhere (e.g.
      // rentals/page.tsx's `startsInFuture` check) to decide Upcoming vs.
      // Active status; a translated date string would fail that parse.
      moveIn: "1 September 2026",
      initiatedBy: approvedApplication.representative,
      initiatedByRole: approvedApplication.role.replace(/^Verified\s+/i, ""),
    });
    saveRentalSetupDraft(approvedApplication.id, {
      endDate: "31 August 2027",
      agreementAttached: true,
    });
    sendRentalSetup(approvedApplication.id, approvedApplication.title);
  }, [approvedApplication, draft, hydrated, t]);

  function save(next = step) {
    setStep(next);
  }

  if (declined)
    return (
      <State
        title={t("renterDashboard.rentalSetup.declined.title")}
        text={
          draft
            ? t("renterDashboard.rentalSetup.declined.textWithProperty", {
                property: resolveAnyPropertyTitle(draft.propertyId),
              })
            : t("renterDashboard.rentalSetup.declined.text")
        }
        href="/renter-dashboard/applications"
        action={t("renterDashboard.rentalSetup.declined.viewApplication")}
      />
    );

  if (!draft && approvedApplication) {
    return (
      <>
        <RenterCatalogueTopBar />
        <main className="bg-carbon-50 flex min-h-svh items-center justify-center px-5 pt-16 text-center">
          <p className="text-carbon-500 text-sm">
            {t("renterDashboard.rentalSetup.preparing")}
          </p>
        </main>
      </>
    );
  }

  if (!draft || draft.status === "Draft") {
    return (
      <>
        <RenterCatalogueTopBar />
        <main className="bg-carbon-50 flex min-h-svh flex-col items-center justify-center px-5 pt-16 text-center">
          <Image
            src={emptyIllustration}
            alt=""
            className="h-40 w-auto object-contain"
          />
          <h1 className="font-bricolage mt-5 text-3xl font-medium">
            {t("renterDashboard.rentalSetup.notReady.title")}
          </h1>
          <p className="text-carbon-500 mt-3 max-w-md text-sm leading-6">
            {t("renterDashboard.rentalSetup.notReady.description")}
          </p>
          <Link
            href="/renter-dashboard/applications"
            className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm text-white"
          >
            {t("renterDashboard.rentalSetup.notReady.backToApplications")}
          </Link>
        </main>
      </>
    );
  }

  const propertyTitle =
    approvedApplication?.title ?? resolveAnyPropertyTitle(draft.propertyId);
  const propertyLocation =
    approvedApplication?.location ??
    resolveAnyPropertyLocation(draft.propertyId);
  // Owner Rental Setup Continuity phase -- previously resolved via
  // getProfessional(draft.professionalId), which only exists for a
  // PM-initiated draft and also hardcoded "Property Manager" as the
  // fallback role label. initiatedBy/initiatedByRole is the one generic
  // identity every draft carries regardless of who sent it (Property
  // Manager or Property Owner), so this now works for both without a
  // professional lookup at all.
  const managerName = draft.initiatedBy;
  const managerRoleLabel = draft.initiatedByRole;
  const payments = draft.rentalId ? getPaymentsForRentalId(draft.rentalId) : [];
  const setupPayment = payments.find(
    (p) => p.purpose === "Rental Setup — Deposit & First Month",
  );
  const isCompleted = draft.status === "Completed";
  const stepLabels = STEP_KEYS.map((key) => t(key));

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <header className="border-b border-black/10 bg-white px-5 py-7 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1120px]">
            <Link
              href="/renter-dashboard/applications"
              className="inline-flex items-center gap-1 text-sm text-black/60"
            >
              <ChevronLeft className="size-4" />
              {t("renterDashboard.nav.groups.findHome.applications")}
            </Link>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
              <div>
                <h1 className="font-bricolage text-3xl font-medium">
                  {propertyTitle}
                </h1>
                <p className="text-carbon-500 mt-1">{propertyLocation}</p>
              </div>
              <span className="rounded-full bg-black px-3 py-1.5 text-xs text-white">
                {step === 4 || isCompleted
                  ? t("renterDashboard.rentalSetup.statusBadge.readyForMoveIn")
                  : t("renterDashboard.rentalSetup.statusBadge.inProgress")}
              </span>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Image
                src={managerAvatar}
                alt={managerName}
                className="size-9 rounded-full object-cover"
              />
              <p className="text-sm">
                <span className="text-carbon-500">
                  {t("renterDashboard.rentalSetup.invitedBy")}{" "}
                </span>
                <strong>{managerName}</strong> ·{" "}
                {t("renterDashboard.rentalSetup.verifiedRoleLabel", {
                  role: managerRoleLabel,
                })}
              </p>
              {!isCompleted ? (
                <button
                  type="button"
                  onClick={() => setModal("decline")}
                  className="ml-auto text-xs text-black/55 underline underline-offset-4"
                >
                  {t("renterDashboard.rentalSetup.declineInvitation")}
                </button>
              ) : null}
            </div>
          </div>
        </header>
        <div className="px-5 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto grid w-full max-w-[1120px] gap-6 py-8 lg:grid-cols-[240px_1fr]">
            <aside className="h-fit bg-white p-5">
              <p className="text-sm font-medium">
                {t("renterDashboard.rentalSetup.requirementsProgress", {
                  completed: Math.min(step, 4),
                })}
              </p>
              <div className="mt-4 h-1 bg-black/10">
                <div
                  className="h-full bg-black"
                  style={{ width: `${step * 25}%` }}
                />
              </div>
              <nav className="mt-5 space-y-1">
                {stepLabels.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => i <= step && setStep(i)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${i === step ? "bg-black text-white" : "text-black/55"}`}
                  >
                    <span className="flex size-5 items-center justify-center rounded-full border border-current text-[10px]">
                      {i < step ? <Check className="size-3" /> : i + 1}
                    </span>
                    {s}
                  </button>
                ))}
              </nav>
            </aside>
            <section className="bg-white p-6 shadow-[0_3px_14px_rgba(0,0,0,.03)] sm:p-8">
              {step === 0 ? (
                <Details
                  draft={draft}
                  propertyTitle={propertyTitle}
                  managerName={managerName}
                  reviewed={reviewed}
                  setReviewed={setReviewed}
                  question={() => setModal("question")}
                  next={() => save(1)}
                />
              ) : null}
              {step === 1 ? (
                <Agreement
                  draft={draft}
                  propertyTitle={propertyTitle}
                  managerName={managerName}
                  read={read}
                  understood={understood}
                  setRead={setRead}
                  setUnderstood={setUnderstood}
                  signed={signed}
                  signedAt={signedAt}
                  preview={() => setModal("agreement")}
                  sign={() => setModal("sign")}
                  next={() => save(2)}
                />
              ) : null}
              {step === 2 ? (
                <Payments
                  draft={draft}
                  setupPayment={setupPayment}
                  paid={paid || setupPayment?.status === "Paid"}
                  pay={() => setModal("payment")}
                  receipt={() => setModal("receipt")}
                  next={() => save(3)}
                />
              ) : null}
              {step === 3 ? (
                <MoveIn
                  draft={draft}
                  managerName={managerName}
                  next={() => save(4)}
                />
              ) : null}
              {step === 4 ? (
                <Complete
                  draft={draft}
                  propertyTitle={propertyTitle}
                  managerName={managerName}
                  onComplete={() => {
                    if (draft.rentalId)
                      completeRentalSetup(draft.applicationId);
                  }}
                />
              ) : null}
            </section>
          </div>
        </div>
      </main>
      {modal ? (
        <SetupModal
          type={modal}
          draft={draft}
          propertyTitle={propertyTitle}
          managerName={managerName}
          setupPayment={setupPayment}
          close={() => setModal(null)}
          signature={signature}
          setSignature={setSignature}
          confirm={() => {
            if (modal === "sign") {
              const signatureDate = new Date().toISOString();
              setSigned(true);
              setSignedAt(signatureDate);
            }
            if (modal === "payment") {
              setPaid(true);
              if (draft.rentalId) markInitialSetupPaymentPaid(draft.rentalId);
            }
            if (modal === "decline") {
              declineRentalSetup(draft.applicationId);
              setDeclined(true);
            }
            setModal(null);
          }}
        />
      ) : null}
    </>
  );
}
const Row = ({ a, b }: { a: string; b: string }) => (
  <div className="flex justify-between gap-5 border-b border-black/10 py-3 text-sm">
    <span className="text-carbon-500">{a}</span>
    <strong className="text-right">{b}</strong>
  </div>
);
function formatSignedDate(
  value: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (!value) return t("renterDashboard.rentalSetup.dateUnavailable");
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
function oneTimeAmount(value: string) {
  return value.replace(/\s*\/\s*month\s*$/i, "");
}
function setupPaymentTotal(draft: RentalSetupDraft) {
  const currency = draft.monthlyRent.match(/^[A-Z]{3}/)?.[0] ?? "RWF";
  const monthlyValue = Number(draft.monthlyRent.replace(/[^0-9]/g, "")) || 0;
  const depositValue =
    Number(draft.securityDeposit.replace(/[^0-9]/g, "")) || 0;
  return `${currency} ${(monthlyValue + depositValue).toLocaleString("en-US")}`;
}
function Details({
  draft,
  propertyTitle,
  managerName,
  reviewed,
  setReviewed,
  question,
  next,
}: {
  draft: RentalSetupDraft;
  propertyTitle: string;
  managerName: string;
  reviewed: boolean;
  setReviewed: (v: boolean) => void;
  question: () => void;
  next: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="font-bricolage text-3xl font-medium">
        {t("renterDashboard.rentalSetup.steps.rentalDetails")}
      </h2>
      <p className="text-carbon-500 mt-2 text-sm">
        {t("renterDashboard.rentalSetup.details.subtitle")}
      </p>
      <div className="mt-6 grid gap-x-7 sm:grid-cols-2">
        <Row a={t("renterDashboard.rentalSetup.details.rows.property")} b={propertyTitle} />
        <Row
          a={t("renterDashboard.rentalSetup.details.rows.monthlyRent")}
          b={draft.monthlyRent}
        />
        <Row
          a={t("renterDashboard.rentalSetup.details.rows.securityDeposit")}
          b={oneTimeAmount(draft.securityDeposit)}
        />
        <Row
          a={t("renterDashboard.rentalSetup.details.rows.rentalStart")}
          b={draft.startDate}
        />
        <Row
          a={t("renterDashboard.rentalSetup.details.rows.rentalEnd")}
          b={draft.endDate || t("renterDashboard.rentalSetup.toBeConfirmed")}
        />
        <Row
          a={t("renterDashboard.rentalSetup.details.rows.paymentFrequency")}
          b={t("renterDashboard.rentalSetup.details.rows.monthly")}
        />
        <Row
          a={t("renterDashboard.rentalSetup.details.rows.rentDue")}
          b={draft.paymentDueDay}
        />
        <Row
          a={t("renterDashboard.rentalSetup.details.rows.managedBy")}
          b={managerName}
        />
      </div>
      <div className="mt-6 flex gap-3">
        <Link
          href={`/properties/${draft.propertyId}?from=renter`}
          className="rounded-full border border-black/15 px-4 py-2.5 text-sm"
        >
          {t("renterDashboard.rentalSetup.viewProperty")}
        </Link>
        <Link
          href={`/renter-dashboard/messages?host=${encodeURIComponent(managerName)}&ctx=rental-setup&propertyId=${encodeURIComponent(draft.propertyId)}`}
          className="rounded-full border border-black/15 px-4 py-2.5 text-sm"
        >
          {t("renterDashboard.rentalSetup.messageManager")}
        </Link>
      </div>
      <label className="mt-7 flex gap-3 text-sm">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
          className="size-4 accent-black"
        />
        {t("renterDashboard.rentalSetup.details.reviewedCheckbox")}
      </label>
      <Footer
        back={question}
        backLabel={t("renterDashboard.rentalSetup.details.questionLink")}
        next={next}
        disabled={!reviewed}
        nextLabel={t("renterDashboard.rentalSetup.details.continueToAgreement")}
      />
    </>
  );
}
function Agreement({
  draft,
  propertyTitle,
  managerName,
  read,
  understood,
  setRead,
  setUnderstood,
  signed,
  signedAt,
  preview,
  sign,
  next,
}: {
  draft: RentalSetupDraft;
  propertyTitle: string;
  managerName: string;
  read: boolean;
  understood: boolean;
  setRead: (v: boolean) => void;
  setUnderstood: (v: boolean) => void;
  signed: boolean;
  signedAt: string;
  preview: () => void;
  sign: () => void;
  next: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="font-bricolage text-3xl font-medium">
        {t("renterDashboard.rentalSetup.steps.rentalAgreement")}
      </h2>
      <p className="text-carbon-500 mt-2 text-sm">
        {t("renterDashboard.rentalSetup.agreement.subtitle")}
      </p>
      <div className="mt-6 border border-black/10 p-5">
        <p className="flex items-center gap-2 font-medium">
          <FileText className="size-5" />
          {t("renterDashboard.rentalSetup.agreement.documentTitle", {
            property: propertyTitle,
          })}
        </p>
        <p className="text-carbon-500 mt-3 text-sm leading-6">
          {managerName}
          <br />
          {draft.startDate} –{" "}
          {draft.endDate ||
            t("renterDashboard.rentalSetup.agreement.endDateToBeConfirmed")}
        </p>
        <button onClick={preview} className="mt-4 text-sm underline">
          {t("renterDashboard.rentalSetup.agreement.viewFull")}
        </button>
      </div>
      <h3 className="font-bricolage mt-7 text-xl font-medium">
        {t("renterDashboard.rentalSetup.agreement.keyTerms")}
      </h3>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <Row
          a={t("renterDashboard.rentalSetup.agreement.rows.monthlyRent")}
          b={draft.monthlyRent}
        />
        <Row
          a={t("renterDashboard.rentalSetup.agreement.rows.deposit")}
          b={oneTimeAmount(draft.securityDeposit)}
        />
        <Row
          a={t("renterDashboard.rentalSetup.agreement.rows.noticePeriod")}
          b={t("renterDashboard.rentalSetup.agreement.rows.thirtyDays")}
        />
        <Row
          a={t("renterDashboard.rentalSetup.agreement.rows.rentDue")}
          b={draft.paymentDueDay}
        />
      </div>
      {!signed ? (
        <div className="mt-6 space-y-3">
          <label className="flex gap-3 text-sm">
            <input
              type="checkbox"
              checked={read}
              onChange={(e) => setRead(e.target.checked)}
              className="size-4 accent-black"
            />
            {t("renterDashboard.rentalSetup.agreement.readCheckbox")}
          </label>
          <label className="flex gap-3 text-sm">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="size-4 accent-black"
            />
            {t("renterDashboard.rentalSetup.agreement.understoodCheckbox")}
          </label>
          <button
            disabled={!read || !understood}
            onClick={sign}
            className="mt-3 h-11 rounded-full bg-black px-5 text-sm text-white disabled:opacity-30"
          >
            {t("renterDashboard.rentalSetup.agreement.signButton")}
          </button>
        </div>
      ) : (
        <p className="mt-6 flex items-center gap-2 text-sm font-medium">
          <Check className="size-5" />
          {t("renterDashboard.rentalSetup.agreement.signedLabel", {
            date: formatSignedDate(signedAt, t),
          })}
        </p>
      )}
      <Footer
        next={next}
        disabled={!signed}
        nextLabel={t("renterDashboard.rentalSetup.agreement.continueToPayments")}
      />
    </>
  );
}
function Payments({
  draft,
  setupPayment,
  paid,
  pay,
  receipt,
  next,
}: {
  draft: RentalSetupDraft;
  setupPayment: ReturnType<typeof getPaymentsForRentalId>[number] | undefined;
  paid: boolean;
  pay: () => void;
  receipt: () => void;
  next: () => void;
}) {
  const { t } = useTranslation();
  const totalDue = setupPaymentTotal(draft);
  const paidLabel = t("renterDashboard.rentalSetup.payments.status.paid");
  const pendingLabel = t("renterDashboard.rentalSetup.payments.status.pending");
  return (
    <>
      <h2 className="font-bricolage text-3xl font-medium">
        {t("renterDashboard.rentalSetup.payments.title")}
      </h2>
      <div className="mt-6">
        <Row
          a={t("renterDashboard.rentalSetup.details.rows.securityDeposit")}
          b={
            paid
              ? paidLabel
              : `${oneTimeAmount(draft.securityDeposit)} · ${pendingLabel}`
          }
        />
        <Row
          a={t("renterDashboard.rentalSetup.payments.rows.firstMonthsRent")}
          b={paid ? paidLabel : `${draft.monthlyRent} · ${pendingLabel}`}
        />
        <Row
          a={t("renterDashboard.rentalSetup.payments.rows.totalDueNow")}
          b={paid ? "0" : totalDue}
        />
      </div>
      {paid ? (
        <div className="mt-6">
          <p className="flex items-center gap-2 font-medium">
            <Check className="size-5" />
            {t("renterDashboard.rentalSetup.payments.successful")}
          </p>
          <p className="text-carbon-500 mt-2 text-sm">
            {t("renterDashboard.rentalSetup.payments.reference", {
              reference: setupPayment?.reference ?? "—",
            })}
          </p>
          <button onClick={receipt} className="mt-3 text-sm underline">
            {t("renterDashboard.rentalSetup.payments.viewReceipt")}
          </button>
        </div>
      ) : (
        <button
          onClick={pay}
          className="mt-6 h-11 rounded-full bg-black px-5 text-sm text-white"
        >
          {t("renterDashboard.rentalSetup.payments.payButton")}
        </button>
      )}
      <Footer
        next={next}
        disabled={!paid}
        nextLabel={t("renterDashboard.rentalSetup.payments.continueToMoveIn")}
      />
    </>
  );
}
function MoveIn({
  draft,
  managerName,
  next,
}: {
  draft: RentalSetupDraft;
  managerName: string;
  next: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="font-bricolage text-3xl font-medium">
        {t("renterDashboard.rentalSetup.moveIn.title")}
      </h2>
      <div className="mt-6">
        <Row
          a={t("renterDashboard.rentalSetup.moveIn.rows.moveInDate")}
          b={draft.startDate}
        />
        <Row
          a={t("renterDashboard.rentalSetup.moveIn.rows.keyHandover")}
          b={t("renterDashboard.rentalSetup.moveIn.keyHandoverTime")}
        />
        <Row
          a={t("renterDashboard.rentalSetup.moveIn.rows.contact")}
          b={managerName}
        />
        <Row
          a={t("renterDashboard.rentalSetup.moveIn.rows.moveInInspection")}
          b={t("renterDashboard.rentalSetup.moveIn.notStarted")}
        />
      </div>
      <h3 className="font-bricolage mt-7 text-xl font-medium">
        {t("renterDashboard.rentalSetup.moveIn.instructions")}
      </h3>
      <ul className="text-carbon-500 mt-3 list-disc space-y-2 pl-5 text-sm">
        <li>{t("renterDashboard.rentalSetup.moveIn.instructionsList.bringId")}</li>
        <li>
          {t("renterDashboard.rentalSetup.moveIn.instructionsList.meetManager", {
            manager: managerName,
          })}
        </li>
        <li>
          {t("renterDashboard.rentalSetup.moveIn.instructionsList.completeInspection")}
        </li>
      </ul>
      <div className="mt-7 space-y-2">
        {[
          t("renterDashboard.rentalSetup.moveIn.checklist.rentalDetailsConfirmed"),
          t("renterDashboard.rentalSetup.moveIn.checklist.rentalAgreementSigned"),
          t("renterDashboard.rentalSetup.moveIn.checklist.requiredPaymentCompleted"),
          t("renterDashboard.rentalSetup.moveIn.checklist.moveInInspectionPending"),
          t("renterDashboard.rentalSetup.moveIn.checklist.keysPending"),
        ].map((x, i) => (
          <p key={x} className="flex gap-2 text-sm">
            <Check className={`size-4 ${i < 3 ? "" : "text-black/25"}`} />
            {x}
          </p>
        ))}
      </div>
      <Footer next={next} nextLabel={t("renterDashboard.rentalSetup.moveIn.completeSetup")} />
    </>
  );
}
function Complete({
  draft,
  propertyTitle,
  managerName,
  onComplete,
}: {
  draft: RentalSetupDraft;
  propertyTitle: string;
  managerName: string;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="py-8 text-center">
      <Image
        src={agreedIllustration}
        alt={t("renterDashboard.rentalSetup.complete.imageAlt")}
        className="mx-auto h-40 w-auto object-contain"
        priority
      />
      <h2 className="font-bricolage mt-5 text-3xl font-medium">
        {t("renterDashboard.rentalSetup.complete.title")}
      </h2>
      <p className="text-carbon-500 mt-3">
        {t("renterDashboard.rentalSetup.complete.description", {
          property: propertyTitle,
          startDate: draft.startDate,
        })}
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Link
          href={`/renter-dashboard/messages?host=${encodeURIComponent(managerName)}&ctx=rental-setup&propertyId=${encodeURIComponent(draft.propertyId)}`}
          className="rounded-full border border-black/15 px-5 py-3 text-sm"
        >
          {t("renterDashboard.rentalSetup.messageManager")}
        </Link>
        <Link
          href="/renter-dashboard/rentals"
          className="rounded-full bg-black px-5 py-3 text-sm text-white"
        >
          {t("renterDashboard.rentalSetup.complete.goToMyRentals")}
        </Link>
      </div>
    </div>
  );
}
function Footer({
  back,
  backLabel,
  next,
  disabled,
  nextLabel,
}: {
  back?: () => void;
  backLabel?: string;
  next: () => void;
  disabled?: boolean;
  nextLabel: string;
}) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-black/10 pt-5">
      {back ? (
        <button onClick={back} className="text-sm underline">
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      <button
        disabled={disabled}
        onClick={next}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm text-white disabled:opacity-30"
      >
        {nextLabel}
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
function SetupModal({
  type,
  draft,
  propertyTitle,
  managerName,
  setupPayment,
  close,
  signature,
  setSignature,
  confirm,
}: {
  type: Exclude<Modal, null>;
  draft: RentalSetupDraft;
  propertyTitle: string;
  managerName: string;
  setupPayment: ReturnType<typeof getPaymentsForRentalId>[number] | undefined;
  close: () => void;
  signature: string;
  setSignature: (v: string) => void;
  confirm: () => void;
}) {
  const { t } = useTranslation();
  const title = {
    question: t("renterDashboard.rentalSetup.modal.questionTitle"),
    agreement: t("renterDashboard.rentalSetup.agreement.documentTitle", {
      property: propertyTitle,
    }),
    sign: t("renterDashboard.rentalSetup.modal.signTitle"),
    payment: t("renterDashboard.rentalSetup.modal.paymentTitle"),
    receipt: t("renterDashboard.rentalSetup.modal.receiptTitle"),
    decline: t("renterDashboard.rentalSetup.modal.declineTitle"),
  }[type];
  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-5"
      onMouseDown={close}
    >
      <div
        role="dialog"
        onMouseDown={(e) => e.stopPropagation()}
        className={`relative max-h-[90svh] w-full overflow-y-auto bg-white p-7 shadow-2xl ${type === "agreement" ? "max-w-3xl" : "max-w-lg"}`}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full"
        >
          <X className="size-4" />
        </button>
        <h2 className="font-bricolage text-2xl font-medium">{title}</h2>
        {type === "agreement" ? (
          <AgreementDocument
            draft={draft}
            propertyTitle={propertyTitle}
            managerName={managerName}
          />
        ) : (
          <p className="text-carbon-500 mt-3 text-sm leading-6">
            {type === "question"
              ? t("renterDashboard.rentalSetup.modal.questionBody")
              : type === "payment"
                ? t("renterDashboard.rentalSetup.modal.paymentBody", {
                    amount: setupPaymentTotal(draft),
                  })
                : type === "receipt"
                  ? t("renterDashboard.rentalSetup.modal.receiptBody", {
                      amount: setupPaymentTotal(draft),
                      reference: setupPayment?.reference ?? "—",
                    })
                  : t("renterDashboard.rentalSetup.modal.typeYourName")}
          </p>
        )}
        {type === "sign" ? (
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={draft.renterName}
            className="mt-5 h-11 w-full border-b border-black/20 outline-none"
          />
        ) : null}
        {["sign", "payment", "decline"].includes(type) ? (
          <button
            disabled={type === "sign" && !signature.trim()}
            onClick={confirm}
            className="mt-6 h-11 rounded-full bg-black px-5 text-sm text-white disabled:opacity-30"
          >
            {type === "sign"
              ? t("renterDashboard.rentalSetup.modal.confirmSign")
              : type === "payment"
                ? t("renterDashboard.rentalSetup.modal.confirmMockPayment")
                : t("renterDashboard.rentalSetup.declineInvitation")}
          </button>
        ) : (
          <button
            onClick={close}
            className="mt-6 h-11 rounded-full bg-black px-5 text-sm text-white"
          >
            {t("common.close")}
          </button>
        )}
      </div>
    </div>
  );
}
function AgreementDocument({
  draft,
  propertyTitle,
  managerName,
}: {
  draft: RentalSetupDraft;
  propertyTitle: string;
  managerName: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-5 bg-black/[0.035] p-4 sm:p-6">
      <div className="mx-auto max-w-2xl bg-white px-6 py-8 shadow-sm sm:px-10">
        <div className="border-b border-black/15 pb-5 text-center">
          <p className="text-carbon-500 text-xs tracking-[0.12em] uppercase">
            {t("renterDashboard.rentalSetup.agreementDocument.uploadedBy", {
              manager: managerName,
            })}
          </p>
          <h3 className="font-bricolage mt-3 text-2xl font-medium">
            {t("renterDashboard.rentalSetup.agreementDocument.title")}
          </h3>
          <p className="text-carbon-500 mt-2 text-sm">
            {propertyTitle} · {resolveAnyPropertyLocation(draft.propertyId)}
          </p>
        </div>
        <div className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-carbon-500 text-xs">
              {t("renterDashboard.rentalSetup.agreementDocument.fields.renter")}
            </p>
            <p className="mt-1 font-medium">{draft.renterName}</p>
          </div>
          <div>
            <p className="text-carbon-500 text-xs">
              {t(
                "renterDashboard.rentalSetup.agreementDocument.fields.propertyRepresentative",
              )}
            </p>
            <p className="mt-1 font-medium">{managerName}</p>
          </div>
          <div>
            <p className="text-carbon-500 text-xs">
              {t("renterDashboard.rentalSetup.agreementDocument.fields.rentalPeriod")}
            </p>
            <p className="mt-1 font-medium">
              {draft.startDate} –{" "}
              {draft.endDate || t("renterDashboard.rentalSetup.toBeConfirmed")}
            </p>
          </div>
          <div>
            <p className="text-carbon-500 text-xs">
              {t("renterDashboard.rentalSetup.agreement.rows.monthlyRent")}
            </p>
            <p className="mt-1 font-medium">{draft.monthlyRent}</p>
          </div>
        </div>
        <div className="mt-7 space-y-6 text-sm leading-6">
          <section>
            <h4 className="font-medium">
              {t("renterDashboard.rentalSetup.agreementDocument.sections.rentalTerm")}
            </h4>
            <p className="text-carbon-600 mt-2">
              {draft.endDate
                ? t(
                    "renterDashboard.rentalSetup.agreementDocument.sections.rentalTermWithEnd",
                    { start: draft.startDate, end: draft.endDate },
                  )
                : t(
                    "renterDashboard.rentalSetup.agreementDocument.sections.rentalTermOpenEnd",
                    { start: draft.startDate },
                  )}
            </p>
          </section>
          <section>
            <h4 className="font-medium">
              {t("renterDashboard.rentalSetup.agreementDocument.sections.rentAndDeposit")}
            </h4>
            <p className="text-carbon-600 mt-2">
              {t(
                "renterDashboard.rentalSetup.agreementDocument.sections.rentAndDepositBody",
                {
                  rent: draft.monthlyRent,
                  dueDay: draft.paymentDueDay.toLowerCase(),
                  deposit: oneTimeAmount(draft.securityDeposit),
                },
              )}
            </p>
          </section>
          <section>
            <h4 className="font-medium">
              {t("renterDashboard.rentalSetup.agreementDocument.sections.careOfProperty")}
            </h4>
            <p className="text-carbon-600 mt-2">
              {t(
                "renterDashboard.rentalSetup.agreementDocument.sections.careOfPropertyBody",
              )}
            </p>
          </section>
          <section>
            <h4 className="font-medium">
              {t("renterDashboard.rentalSetup.agreementDocument.sections.notice")}
            </h4>
            <p className="text-carbon-600 mt-2">
              {t("renterDashboard.rentalSetup.agreementDocument.sections.noticeBody")}
            </p>
          </section>
        </div>
        <div className="mt-8 grid gap-6 border-t border-black/15 pt-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-carbon-500 text-xs">
              {t("renterDashboard.rentalSetup.agreementDocument.fields.renterSignature")}
            </p>
            <p className="mt-3 border-b border-black/30 pb-2">
              {t("renterDashboard.rentalSetup.agreementDocument.awaitingSignature")}
            </p>
          </div>
          <div>
            <p className="text-carbon-500 text-xs">
              {t(
                "renterDashboard.rentalSetup.agreementDocument.fields.propertyRepresentativeSignature",
              )}
            </p>
            <p className="mt-3 border-b border-black/30 pb-2">
              {t("renterDashboard.rentalSetup.agreementDocument.representativeSigned", {
                manager: managerName,
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
function State({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 flex min-h-svh items-center justify-center px-5 pt-16">
        <div className="bg-white p-8 text-center">
          <h1 className="font-bricolage text-3xl font-medium">{title}</h1>
          <p className="text-carbon-500 mt-3">{text}</p>
          <Link
            href={href}
            className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm text-white"
          >
            {action}
          </Link>
        </div>
      </main>
    </>
  );
}
