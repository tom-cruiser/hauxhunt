"use client";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  FileText,
  X,
} from "lucide-react";
import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import house1 from "@/assets/images/house1.jpg";
import house2 from "@/assets/images/house2.jpg";
import house3 from "@/assets/images/house3.jpg";
import house4 from "@/assets/images/house4.jpg";
import managerAvatar from "@/assets/images/julien.jpg";
import alineAvatar from "@/assets/images/flatmate-aline.png";
import sarahAvatar from "@/assets/images/flatmate-grace.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { useTranslation } from "@/components/language/use-translation";
import { RENTER_RENTALS } from "@/data/renter-rentals";
import { withSharedRentals } from "@/app/renter-dashboard/rentals/page";
import {
  getOwnerProperty,
  RENTER_DEMO_NAME,
  subscribeToOwnerRentals,
} from "@/lib/owner-data";
import { pushOwnerNotification } from "@/lib/owner-notifications";
import { subscribeToPmWork } from "@/lib/pm-work";
import {
  getAuthorizationForProperty,
  getIndependentProperty,
} from "@/lib/professional-properties";
import { pushProfessionalNotification } from "@/lib/professional-work";
import { getProfessional } from "@/lib/team-data";
const images = [house1, house2, house3, house4];
const subscribeToHydration = () => () => {};

// Anti-pattern refactor -- `DocumentPreview` used to be keyed off the
// translatable display label itself ("Move-in report" etc.), both to look
// up its description AND to branch its layout. Once that label is
// translated, comparing it against an English literal breaks. `DocumentId`
// is a stable, never-translated internal identifier; the label/description
// are resolved separately via `t()`.
type DocumentId =
  | "rentalAgreement"
  | "moveInReport"
  | "depositReceipt"
  | "paymentReceipts";
const DOCUMENT_META: Record<
  DocumentId,
  { labelKey: string; descriptionKey?: string }
> = {
  rentalAgreement: {
    labelKey: "renterDashboard.rentalDetail.documents.rentalAgreement",
  },
  moveInReport: {
    labelKey: "renterDashboard.rentalDetail.documents.moveInReport",
    descriptionKey:
      "renterDashboard.rentalDetail.documents.moveInReportDescription",
  },
  depositReceipt: {
    labelKey: "renterDashboard.rentalDetail.documents.depositReceipt",
    descriptionKey:
      "renterDashboard.rentalDetail.documents.depositReceiptDescription",
  },
  paymentReceipts: {
    labelKey: "renterDashboard.rentalDetail.documents.paymentReceipts",
    descriptionKey:
      "renterDashboard.rentalDetail.documents.paymentReceiptsDescription",
  },
};

export default function RentalDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  // Cross-Role Lifecycle Synchronization phase -- Section 19: resolves from
  // the SAME shared rentals list as My Rentals, not a second static lookup.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  useEffect(() => subscribeToOwnerRentals(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);
  const sharedRentals = hydrated
    ? withSharedRentals(RENTER_RENTALS, t)
    : RENTER_RENTALS;
  const r = sharedRentals.find((x) => x.id === id) ?? sharedRentals[0];
  const rentAmount = r.rent.replace(/\s*\/\s*month\s*$/i, "");
  const ended = r.status === "Ended";
  const endingSoon = r.status === "Ending Soon";
  const statusBadgeLabels: Record<typeof r.status, string> = {
    Active: t("renterDashboard.rentalDetail.statusBadge.active"),
    Upcoming: t("renterDashboard.rentalDetail.statusBadge.upcoming"),
    Ended: t("renterDashboard.rentalDetail.statusBadge.ended"),
    "Ending Soon": t("renterDashboard.rentalDetail.statusBadge.endingSoon"),
  };
  const DOCUMENTS: { id: DocumentId; status: "Signed" | "Pending" | "Available" }[] = [
    { id: "rentalAgreement", status: "Signed" },
    { id: "moveInReport", status: r.status === "Upcoming" ? "Pending" : "Available" },
    { id: "depositReceipt", status: "Available" },
    { id: "paymentReceipts", status: "Available" },
  ];
  const documentStatusLabels: Record<string, string> = {
    Signed: t("renterDashboard.rentalDetail.documents.statusSigned"),
    Pending: t("renterDashboard.rentalDetail.documents.statusPending"),
    Available: t("renterDashboard.rentalDetail.documents.statusAvailable"),
  };
  const [viewedDocument, setViewedDocument] = useState<DocumentId | null>(
    null,
  );
  const [renewalRequested, setRenewalRequested] = useState(false);
  const [renewalToast, setRenewalToast] = useState(false);
  const property = getOwnerProperty(r.propertyId);
  const independentAuthorization = getIndependentProperty(r.propertyId)
    ? getAuthorizationForProperty(r.propertyId)
    : undefined;
  const independentManager = independentAuthorization
    ? getProfessional(independentAuthorization.professionalId)
    : undefined;
  const renewalRecipient =
    property?.propertyManager?.name ??
    independentManager?.name ??
    t("renterDashboard.rentalDetail.propertyOwnerFallback");

  function requestRenewal() {
    const notification = {
      title: "Rental renewal requested",
      body: `${RENTER_DEMO_NAME} requested a renewal for ${r.title}. The current agreement ends on ${r.end}.`,
    };

    // Rentals was removed as a partner-dashboard surface, so a PM/Agent has
    // no page left to send this notification's action to -- they still get
    // told (informational, no CTA) since they represent the property, but
    // only the Owner dashboard can actually act on a renewal request now.
    // Note: this notification surfaces on the Owner/PM dashboards, which are
    // not part of this i18n rollout (they don't call useTranslation), so it
    // deliberately stays in English regardless of the renter's language.
    if (property?.propertyManager) {
      pushProfessionalNotification({
        ...notification,
        professionalId: property.propertyManager.professionalId,
        category: "rental",
      });
    } else if (independentAuthorization && independentManager) {
      pushProfessionalNotification({
        ...notification,
        professionalId: independentAuthorization.professionalId,
        category: "rental",
      });
    }
    pushOwnerNotification({
      ...notification,
      actionLabel: "View Rental",
      category: "rental",
      actionHref: `/owner-dashboard/rentals?open=${encodeURIComponent(r.id)}`,
    });

    setRenewalRequested(true);
    setRenewalToast(true);
    window.setTimeout(() => setRenewalToast(false), 3500);
  }
  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <header className="bg-white px-5 py-8 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1200px]">
            <Link
              href="/renter-dashboard/rentals"
              className="inline-flex items-center gap-1 text-sm text-black/60"
            >
              <ChevronLeft className="size-4" />
              {t("renterDashboard.nav.groups.myHome.myRentals")}
            </Link>
            <div className="mt-5 grid gap-5 sm:grid-cols-[150px_1fr]">
              <Image
                src={images[r.image]}
                alt={r.title}
                className="h-32 w-full object-cover"
              />
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-bricolage text-3xl font-medium">
                      {r.title}
                    </h1>
                    <p className="text-carbon-500 mt-1">{r.location}</p>
                  </div>
                  <span className="rounded-full bg-black px-3 py-1.5 text-xs text-white">
                    {statusBadgeLabels[r.status]}
                  </span>
                </div>
                <div className="mt-5 flex gap-3">
                  <Link
                    href={`/renter-dashboard/messages?host=${encodeURIComponent(r.manager)}&role=${encodeURIComponent(r.role.replace(/^Verified /, ""))}&verified=${r.role.startsWith("Verified") ? "1" : "0"}&ctx=active-rental&property=${encodeURIComponent(r.title)}&propertyId=${encodeURIComponent(r.propertyId)}&status=${encodeURIComponent(r.status)}&detail=${encodeURIComponent(`${rentAmount} / month`)}&refId=${encodeURIComponent(r.id)}`}
                    className="inline-flex h-10 items-center rounded-full bg-black px-4 text-sm text-white"
                  >
                    {t("renterDashboard.rentalDetail.messageManager")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="px-5 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-6 py-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <Section title={t("renterDashboard.rentalDetail.sections.overview")}>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                  {[
                    [t("renterDashboard.rentalDetail.overview.monthlyRent"), rentAmount],
                    [
                      t("renterDashboard.rentalDetail.overview.nextPayment"),
                      endingSoon
                        ? t("renterDashboard.rentalDetail.pendingRenewal")
                        : r.nextPayment,
                    ],
                    [t("renterDashboard.rentalDetail.overview.rentalStart"), r.start],
                    [t("renterDashboard.rentalDetail.overview.rentalEnd"), r.end],
                    [t("renterDashboard.rentalDetail.overview.deposit"), rentAmount],
                    [t("renterDashboard.rentalDetail.overview.occupants"), "2"],
                  ].map(([a, b]) => (
                    <div key={a}>
                      <p className="text-carbon-500 text-xs">{a}</p>
                      <p className="mt-1 font-medium">{b}</p>
                    </div>
                  ))}
                </div>
              </Section>
              {endingSoon ? (
                <section className="verification-glass relative overflow-hidden rounded-[1.75rem] p-6 text-white sm:p-7">
                  <div className="relative z-10">
                    <p className="text-xs font-medium tracking-[0.12em] text-white/50 uppercase">
                      {t("renterDashboard.rentalDetail.endingSoon.eyebrow")}
                    </p>
                    <h2 className="font-bricolage mt-3 text-2xl font-medium tracking-[-0.035em]">
                      {t("renterDashboard.rentalDetail.endingSoon.title")}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                      {t("renterDashboard.rentalDetail.endingSoon.description", {
                        end: r.end,
                        title: r.title,
                      })}
                    </p>
                    <div className="mt-6 grid gap-4 border-y border-white/15 py-5 text-sm sm:grid-cols-2">
                      <DataPoint
                        label={t(
                          "renterDashboard.rentalDetail.endingSoon.currentAgreementEnds",
                        )}
                        value={r.end}
                      />
                      <DataPoint
                        label={t(
                          "renterDashboard.rentalDetail.endingSoon.septemberPaymentLabel",
                        )}
                        value={t(
                          "renterDashboard.rentalDetail.endingSoon.enabledAfterRenewal",
                        )}
                      />
                    </div>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={requestRenewal}
                        disabled={renewalRequested}
                        className="h-11 rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-default disabled:opacity-65"
                      >
                        {renewalRequested
                          ? t("renterDashboard.rentalDetail.endingSoon.renewalRequested")
                          : t("renterDashboard.rentalDetail.endingSoon.requestRenewal")}
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}
              <Section title={t("renterDashboard.rentalDetail.sections.timeline")}>
                <div className="grid gap-3 sm:grid-cols-5">
                  {[
                    t("renterDashboard.rentalDetail.timeline.steps.applicationApproved"),
                    t("renterDashboard.rentalDetail.timeline.steps.rentalConfirmed"),
                    t("renterDashboard.rentalDetail.timeline.steps.moveIn"),
                    t("renterDashboard.rentalDetail.timeline.steps.activeRental"),
                    t("renterDashboard.rentalDetail.timeline.steps.leaseEnd"),
                  ].map((x, i) => (
                    <div key={x} className="flex gap-2 sm:block">
                      <span
                        className={`flex size-6 items-center justify-center rounded-full ${i < (ended ? 5 : r.status === "Upcoming" ? 2 : 4) ? "bg-black text-white" : "border border-black/20"}`}
                      >
                        {i < (ended ? 5 : r.status === "Upcoming" ? 2 : 4) ? (
                          <Check className="size-3" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <p className="mt-2 text-xs">{x}</p>
                    </div>
                  ))}
                </div>
              </Section>
              {r.status === "Upcoming" ? (
                <Section title={t("renterDashboard.rentalDetail.sections.moveIn")}>
                  <p className="text-sm">
                    <strong>{t("renterDashboard.rentalDetail.moveIn.dateLabel")}</strong>{" "}
                    {r.start}
                  </p>
                  <p className="text-carbon-500 mt-2 text-sm">
                    {t("renterDashboard.rentalDetail.moveIn.contactInstructions", {
                      manager: r.manager,
                    })}
                  </p>
                  <div className="mt-5 space-y-2">
                    {[
                      t("renterDashboard.rentalDetail.moveIn.checklist.agreementReviewed"),
                      t("renterDashboard.rentalDetail.moveIn.checklist.depositPaid"),
                      t("renterDashboard.rentalDetail.moveIn.checklist.firstRentPaid"),
                      t("renterDashboard.rentalDetail.moveIn.checklist.inspectionPending"),
                      t("renterDashboard.rentalDetail.moveIn.checklist.keysPending"),
                    ].map((x, i) => (
                      <p key={x} className="flex items-center gap-2 text-sm">
                        <Check
                          className={`size-4 ${i < 3 ? "text-black" : "text-black/25"}`}
                        />
                        {x}
                      </p>
                    ))}
                  </div>
                </Section>
              ) : null}
              <div className="grid gap-6 sm:grid-cols-2">
                <Section title={t("renterDashboard.rentalDetail.sections.payments")}>
                  <p className="font-medium">
                    {t("renterDashboard.rentalDetail.rentPerMonth", {
                      amount: rentAmount,
                    })}
                  </p>
                  <p className="text-carbon-500 mt-2 text-sm">
                    {endingSoon
                      ? t("renterDashboard.rentalDetail.payments.noPaymentDue")
                      : t("renterDashboard.rentalDetail.payments.nextDue", {
                          date: r.nextPayment,
                        })}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href="/renter-dashboard/payments"
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium transition-colors hover:border-black/35 hover:bg-black/[0.04]"
                    >
                      {t("renterDashboard.rentalDetail.payments.viewAll")}
                    </Link>
                    {!ended && !endingSoon ? (
                      <Link
                        href={`/renter-dashboard/payments?pay=${encodeURIComponent(r.id)}`}
                        className="inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white transition-opacity hover:opacity-75"
                      >
                        {t("renterDashboard.rentalDetail.payments.makePayment")}
                      </Link>
                    ) : null}
                  </div>
                </Section>
                <Section title={t("renterDashboard.rentalDetail.sections.maintenance")}>
                  <p className="font-medium">
                    {ended
                      ? t("renterDashboard.rentalDetail.maintenance.noOpenRequests")
                      : t("renterDashboard.rentalDetail.maintenance.oneOpenRequest")}
                  </p>
                  <p className="text-carbon-500 mt-2 text-sm">
                    {ended
                      ? t("renterDashboard.rentalDetail.maintenance.historyAvailable")
                      : t("renterDashboard.rentalDetail.maintenance.exampleIssue")}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={
                        ended
                          ? "/renter-dashboard/maintenance"
                          : "/renter-dashboard/maintenance/HH-MNT-1042"
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium transition-colors hover:border-black/35 hover:bg-black/[0.04]"
                    >
                      {t("renterDashboard.rentalDetail.maintenance.viewMaintenance")}
                    </Link>
                    {!ended ? (
                      <Link
                        href="/renter-dashboard/maintenance?report=1"
                        className="inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white transition-opacity hover:opacity-75"
                      >
                        {t("renterDashboard.rentalDetail.maintenance.reportIssue")}
                      </Link>
                    ) : null}
                  </div>
                </Section>
              </div>
              <Section title={t("renterDashboard.rentalDetail.sections.documents")}>
                <div className="divide-y divide-black/10">
                  {DOCUMENTS.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="size-4" />
                        {t(DOCUMENT_META[doc.id].labelKey)}
                      </span>
                      <span>
                        <span className="text-carbon-500 mr-4 text-xs">
                          {documentStatusLabels[doc.status]}
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewedDocument(doc.id)}
                          className="underline underline-offset-4"
                        >
                          {t("renterDashboard.rentalDetail.documents.view")}
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
              <Section title={t("renterDashboard.rentalDetail.sections.recentActivity")}>
                <div className="space-y-4 text-sm">
                  {[
                    {
                      date: t("renterDashboard.rentalDetail.activity.items.agreementAdded.date"),
                      description: t(
                        "renterDashboard.rentalDetail.activity.items.agreementAdded.description",
                      ),
                    },
                    {
                      date: t("renterDashboard.rentalDetail.activity.items.depositReceived.date"),
                      description: t(
                        "renterDashboard.rentalDetail.activity.items.depositReceived.description",
                      ),
                    },
                    {
                      date: t(
                        "renterDashboard.rentalDetail.activity.items.applicationApproved.date",
                      ),
                      description: t(
                        "renterDashboard.rentalDetail.activity.items.applicationApproved.description",
                      ),
                    },
                    {
                      date: t("renterDashboard.rentalDetail.activity.items.viewingCompleted.date"),
                      description: t(
                        "renterDashboard.rentalDetail.activity.items.viewingCompleted.description",
                      ),
                    },
                  ].map(({ date, description }) => (
                    <div key={date + description} className="grid grid-cols-[60px_1fr]">
                      <strong>{date}</strong>
                      <span className="text-carbon-500">{description}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
            <aside className="h-fit space-y-6 lg:sticky lg:top-20">
              <Section title={t("renterDashboard.rentalDetail.sections.managedBy")}>
                <div className="flex items-center gap-3">
                  <Image
                    src={
                      r.manager === "Aline Uwase"
                        ? alineAvatar
                        : r.manager === "Sarah Uwase"
                          ? sarahAvatar
                          : managerAvatar
                    }
                    alt=""
                    className="size-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="flex items-center gap-1.5 font-medium">
                      <span>{r.manager}</span>
                      <BadgeCheck className="size-4 shrink-0" />
                    </p>
                    <p className="text-carbon-500 mt-1 text-sm">
                      {r.role.replace(/^Verified\s+/i, "")}
                    </p>
                  </div>
                </div>
              </Section>
              <Section title={t("renterDashboard.rentalDetail.sections.property")}>
                <p className="text-sm">
                  {r.beds
                    ? t("renterDashboard.rentalDetail.property.bedroomsCount", {
                        count: r.beds,
                      })
                    : t("renterDashboard.rentalDetail.property.bedroomsPending")}
                  {r.baths
                    ? ` · ${t("renterDashboard.rentalDetail.property.bathroomsCount", { count: r.baths })}`
                    : ""}
                </p>
                <p className="text-carbon-500 mt-2 text-sm">
                  {r.furnishing} ·{" "}
                  {t("renterDashboard.rentalDetail.property.residentialHome")}
                </p>
                <Link
                  href={`/properties/${r.propertyId}?from=renter`}
                  className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-transparent px-5 text-base font-medium transition-colors duration-150"
                >
                  {t("renterDashboard.rentalDetail.property.viewFullProperty")}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </Section>
            </aside>
          </div>
        </div>
      </main>
      {renewalToast ? (
        <div role="status" className="feedback-toast">
          {t("renterDashboard.rentalDetail.renewalToast", {
            recipient: renewalRecipient,
          })}
        </div>
      ) : null}
      {viewedDocument ? (
        <DocumentPreview
          documentId={viewedDocument}
          rental={r}
          onClose={() => setViewedDocument(null)}
        />
      ) : null}
    </>
  );
}

function DocumentPreview({
  documentId,
  rental,
  onClose,
}: {
  documentId: DocumentId;
  rental: (typeof RENTER_RENTALS)[number];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const meta = DOCUMENT_META[documentId];
  const label = t(meta.labelKey);
  const statusSigned = t("renterDashboard.rentalDetail.documents.statusSigned");
  const statusPending = t("renterDashboard.rentalDetail.documents.statusPending");
  const statusAvailable = t("renterDashboard.rentalDetail.documents.statusAvailable");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("renterDashboard.rentalDetail.documents.viewAriaLabel", {
        name: label,
      })}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90svh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-carbon-500 text-xs">
              {t("renterDashboard.rentalDetail.documents.previewLabel")}
            </p>
            <h2 className="font-bricolage text-xl font-medium">{label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("renterDashboard.rentalDetail.documents.closePreviewAria")}
            className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05]"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="bg-carbon-50 overflow-y-auto p-4 sm:p-7">
          <article className="mx-auto max-w-2xl bg-white px-6 py-8 shadow-sm sm:px-10">
            <div className="border-b border-black/15 pb-5 text-center">
              <FileText className="mx-auto size-7" />
              <h3 className="font-bricolage mt-3 text-2xl font-medium">
                {label}
              </h3>
              <p className="text-carbon-500 mt-2 text-sm">
                {rental.title} · {rental.location}
              </p>
            </div>
            {documentId === "rentalAgreement" ? (
              <div className="mt-7 space-y-6 text-sm leading-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <DocumentField
                    label={t("renterDashboard.rentalDetail.documents.propertyManagerLabel")}
                    value={rental.manager}
                  />
                  <DocumentField
                    label={t("renterDashboard.rentalDetail.documents.rentalPeriodLabel")}
                    value={`${rental.start} – ${rental.end}`}
                  />
                  <DocumentField
                    label={t("renterDashboard.rentalDetail.documents.monthlyRentLabel")}
                    value={rental.rent}
                  />
                  <DocumentField
                    label={t("renterDashboard.rentalDetail.documents.statusLabel")}
                    value={statusSigned}
                  />
                </div>
                <section>
                  <h4 className="font-medium">
                    {t("renterDashboard.rentalDetail.documents.rentalTerms")}
                  </h4>
                  <p className="text-carbon-600 mt-2">
                    {t("renterDashboard.rentalDetail.documents.rentalTermsBody")}
                  </p>
                </section>
                <div className="grid gap-6 border-t border-black/15 pt-6 sm:grid-cols-2">
                  <DocumentField
                    label={t("renterDashboard.rentalDetail.documents.renterSignatureLabel")}
                    value={statusSigned}
                  />
                  <DocumentField
                    label={t(
                      "renterDashboard.rentalDetail.documents.propertyRepresentativeLabel",
                    )}
                    value={`${rental.manager} · ${statusSigned}`}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-7 text-sm">
                <p className="text-carbon-600 leading-6">
                  {meta.descriptionKey ? t(meta.descriptionKey) : ""}
                </p>
                <div className="mt-6 grid gap-5 border-t border-black/10 pt-6 sm:grid-cols-2">
                  <DocumentField
                    label={t("renterDashboard.rentalDetail.documents.rentalLabel")}
                    value={rental.title}
                  />
                  <DocumentField
                    label={t("renterDashboard.rentalDetail.documents.documentStatusLabel")}
                    value={
                      documentId === "moveInReport" && rental.status === "Upcoming"
                        ? statusPending
                        : statusAvailable
                    }
                  />
                  <DocumentField
                    label={t("renterDashboard.rentalDetail.documents.rentalIdLabel")}
                    value={rental.id}
                  />
                  <DocumentField
                    label={t("renterDashboard.rentalDetail.documents.managedByLabel")}
                    value={rental.manager}
                  />
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

function DocumentField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-carbon-500 text-xs">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-[0_3px_12px_rgba(0,0,0,.025)]">
      <h2 className="font-bricolage mb-5 text-xl font-medium">{title}</h2>
      {children}
    </section>
  );
}
