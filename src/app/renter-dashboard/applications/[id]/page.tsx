"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  Circle,
  FileText,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Suspense } from "react";

import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { useTranslation } from "@/components/language/use-translation";
import { RENTER_APPLICATIONS, type ApplicationStatus } from "@/data/renter-applications";
import { OWNER } from "@/lib/owner-data";
import { getCurrentReviewerFor } from "@/lib/professional-work";

// `ApplicationStatus` (and the raw document/status strings below) stay the
// internal identifiers used for comparisons and styling -- these maps only
// resolve the translated display label, mirroring the `optionLabels`
// pattern used by the renter dashboard's `FilterSelect`.
const STATUS_LABEL_KEYS: Record<ApplicationStatus, string> = {
  Draft: "renterDashboard.applicationDetail.statusLabels.draft",
  Submitted: "renterDashboard.applicationDetail.statusLabels.submitted",
  "Under Review": "renterDashboard.applicationDetail.statusLabels.underReview",
  "Action Required": "renterDashboard.applicationDetail.statusLabels.actionRequired",
  "Decision Pending": "renterDashboard.applicationDetail.statusLabels.decisionPending",
  Approved: "renterDashboard.applicationDetail.statusLabels.approved",
  "Not Selected": "renterDashboard.applicationDetail.statusLabels.notSelected",
  Completed: "renterDashboard.applicationDetail.statusLabels.completed",
  Withdrawn: "renterDashboard.applicationDetail.statusLabels.withdrawn",
};

const DOCUMENT_LABEL_KEYS: Record<string, string> = {
  "Identity document": "renterDashboard.applicationDetail.documents.identityDocument",
  "Reference document": "renterDashboard.applicationDetail.documents.referenceDocument",
};

const DOCUMENT_STATUS_LABEL_KEYS: Record<string, string> = {
  Verified: "renterDashboard.applicationDetail.documents.statusVerified",
  Received: "renterDashboard.applicationDetail.documents.statusReceived",
  Selected: "renterDashboard.applicationDetail.documents.statusSelected",
  Requested: "renterDashboard.applicationDetail.documents.statusRequested",
  Pending: "renterDashboard.applicationDetail.documents.statusPending",
};

export default function ApplicationDetailPage() {
  return (
    <Suspense>
      <ApplicationDetailPageInner />
    </Suspense>
  );
}

function ApplicationDetailPageInner() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const query = useSearchParams();
  const storedApplication = RENTER_APPLICATIONS.find((item) => item.id === id);
  const application = storedApplication ?? {
    id,
    propertyId: query.get("property") ?? "kacyiru-2br",
    title: query.get("title") ?? "Submitted property",
    location: query.get("location") ?? "",
    status: "Submitted" as const,
    date: t("renterDashboard.applicationDetail.fallback.date"),
    // Falls back to the real Kacyiru Residence property manager (matching
    // the default propertyId above) instead of a generic placeholder name,
    // so "Message" always opens a real, findable conversation.
    representative: "Jean Mugisha",
    role: "Verified Property Manager",
    progress: 42,
    message: t("renterDashboard.applicationDetail.fallback.message"),
  };
  const assignedReviewer = getCurrentReviewerFor(application.propertyId);
  const reviewer =
    assignedReviewer ??
    (application.role.includes("Property Manager")
      ? {
          name: application.representative,
          roleLabel: t(
            "renterDashboard.applicationDetail.reviewer.propertyManagerFallbackRole",
          ),
        }
      : { name: OWNER.name, roleLabel: OWNER.role });
  const reviewerVerified =
    Boolean(assignedReviewer) ||
    (reviewer.name === application.representative &&
      application.role.startsWith("Verified"));
  const [requestComplete, setRequestComplete] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] =
    useState("Reference document");
  const [preview, setPreview] = useState<{
    name: string;
    url?: string;
    type?: string;
    revokeOnClose?: boolean;
  } | null>(null);
  const [submittedDocuments, setSubmittedDocuments] = useState<
    Array<{ name: string; url?: string; type?: string }>
  >([]);
  const [submittedValues, setSubmittedValues] = useState<
    Record<string, string>
  >({});
  const [toast, setToast] = useState("");
  const actionRequired =
    application.status === "Action Required" && !requestComplete;
  const displayedStatus = requestComplete ? "Under Review" : application.status;
  const completedSteps =
    displayedStatus === "Approved" ||
    displayedStatus === "Completed" ||
    displayedStatus === "Not Selected" ||
    displayedStatus === "Withdrawn"
      ? 4
      : displayedStatus === "Decision Pending"
        ? 3
        : displayedStatus === "Under Review" ||
            displayedStatus === "Action Required"
          ? 2
          : 1;
  const steps = [
    t("renterDashboard.applicationDetail.progressSteps.applicationSubmitted"),
    t("renterDashboard.applicationDetail.progressSteps.documentsReceived"),
    actionRequired
      ? t("renterDashboard.applicationDetail.progressSteps.actionRequired")
      : t("renterDashboard.applicationDetail.progressSteps.underReview"),
    displayedStatus === "Decision Pending"
      ? t("renterDashboard.applicationDetail.progressSteps.decisionPending")
      : t("renterDashboard.applicationDetail.progressSteps.decision"),
  ];
  const documentRows = !storedApplication
    ? submittedDocuments.map(({ name }) => [name, "Received"])
    : application.status === "Action Required"
      ? [
          ["Identity document", "Verified"],
          [
            "Reference document",
            selectedDocument
              ? requestComplete
                ? "Received"
                : "Selected"
              : "Requested",
          ],
        ]
      : application.status === "Draft"
        ? []
        : [
            ["Identity document", "Verified"],
            ["Reference document", "Received"],
          ];
  useEffect(() => {
    return () => {
      if (preview?.url && preview.revokeOnClose)
        URL.revokeObjectURL(preview.url);
    };
  }, [preview]);
  useEffect(() => {
    if (storedApplication) return;
    const rawSubmission = sessionStorage.getItem(`hauxhunt-submission-${id}`);
    if (!rawSubmission) return;
    try {
      const submission = JSON.parse(rawSubmission) as {
        documents?: Array<{ name: string; url?: string; type?: string }>;
        values?: Record<string, string>;
      };
      const loadSubmission = window.setTimeout(() => {
        setSubmittedDocuments(
          (submission.documents ?? []).filter((document) =>
            ["Identity document", "Reference document"].includes(document.name),
          ),
        );
        setSubmittedValues(
          Object.fromEntries(
            Object.entries(submission.values ?? {}).filter(
              ([name]) => name !== "employer" && name !== "role",
            ),
          ),
        );
      }, 0);
      return () => window.clearTimeout(loadSubmission);
    } catch {
      return;
    }
  }, [id, storedApplication]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function documentDisplayName(name: string) {
    const key = DOCUMENT_LABEL_KEYS[name];
    return key ? t(key) : name;
  }

  function openDocument(name: string) {
    const submittedDocument = submittedDocuments.find(
      (document) => document.name === name,
    );
    if (submittedDocument?.url) {
      setPreview({
        name: submittedDocument.name,
        url: submittedDocument.url,
        type: submittedDocument.type,
      });
      return;
    }
    if (name === selectedDocumentType && selectedDocument) {
      setPreview({
        name: selectedDocument.name,
        url: URL.createObjectURL(selectedDocument),
        type: selectedDocument.type,
        revokeOnClose: true,
      });
      return;
    }
    setPreview({ name });
  }
  const previewDisplayName = preview ? documentDisplayName(preview.name) : "";
  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <section className="border-b border-black/10 bg-white px-5 py-8 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1200px]">
            <Link
              href="/renter-dashboard/applications"
              className="mb-6 inline-flex items-center gap-1 text-sm text-black/65 transition-colors hover:text-black"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              {t("renterDashboard.applicationDetail.backToApplications")}
            </Link>
            <div className="flex items-center justify-between gap-5">
              <h1 className="font-bricolage text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
                {t("renterDashboard.applicationDetail.heading", {
                  title: application.title,
                })}
              </h1>
              <span className="shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white">
                {t(STATUS_LABEL_KEYS[displayedStatus])}
              </span>
            </div>
            <p className="text-carbon-500 mt-2">{application.location}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span>
                {t("renterDashboard.applicationDetail.applicationIdLabel")}{" "}
                <strong>{application.id}</strong>
              </span>
              <span>{application.date}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/properties/${application.propertyId}?from=renter`}
                className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-transparent px-5 text-base font-medium transition-colors duration-150"
              >
                {t("renterDashboard.applicationDetail.viewProperty")}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </section>
        <div className="px-5 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-6 py-8 lg:grid-cols-[1fr_320px] lg:py-10">
            <div className="space-y-6">
              {actionRequired ? (
                <section className="border border-black bg-white p-6">
                  <h2 className="font-bricolage text-2xl font-medium">
                    {t("renterDashboard.applicationDetail.actionRequired.heading")}
                  </h2>
                  <p className="mt-3 text-sm">
                    {t("renterDashboard.applicationDetail.actionRequired.body", {
                      representative: application.representative,
                      documentType: documentDisplayName(
                        selectedDocumentType,
                      ).toLowerCase(),
                    })}
                  </p>
                  <div className="text-carbon-500 mt-3 flex gap-5 text-xs">
                    <span>
                      {t("renterDashboard.applicationDetail.actionRequired.requestedOn")}
                    </span>
                    <span>
                      {t("renterDashboard.applicationDetail.actionRequired.dueOn")}
                    </span>
                  </div>
                  {selectedDocument ? (
                    <div className="mt-5 flex items-center justify-between gap-4 border-y border-black/10 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05]">
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {selectedDocument.name}
                          </p>
                          <p className="text-carbon-500 mt-0.5 text-xs">
                            {(selectedDocument.size / 1024 / 1024).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDocument(null)}
                        aria-label={t(
                          "renterDashboard.applicationDetail.actionRequired.removeSelectedDocumentAria",
                        )}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-black/[0.05]"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <label
                      className={`${selectedDocument ? "border border-black/15 text-black" : "bg-black text-white"} flex h-10 cursor-pointer items-center rounded-full px-5 text-sm`}
                    >
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            setSelectedDocumentType("Reference document");
                            setSelectedDocument(file);
                            showToast(
                              t(
                                "renterDashboard.applicationDetail.toasts.readyToSubmit",
                                { fileName: file.name },
                              ),
                            );
                          }
                        }}
                      />
                      {selectedDocument
                        ? t(
                            "renterDashboard.applicationDetail.actionRequired.replaceDocument",
                          )
                        : t(
                            "renterDashboard.applicationDetail.actionRequired.uploadDocument",
                          )}
                    </label>
                    {selectedDocument ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRequestComplete(true);
                          showToast(
                            t(
                              "renterDashboard.applicationDetail.toasts.documentUploaded",
                            ),
                          );
                        }}
                        className="h-10 rounded-full bg-black px-5 text-sm text-white"
                      >
                        {t(
                          "renterDashboard.applicationDetail.actionRequired.submitDocument",
                        )}
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}
              <Section title={t("renterDashboard.applicationDetail.sections.progress")}>
                <div className="space-y-0">
                  {steps.map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex size-7 items-center justify-center rounded-full ${index < completedSteps ? "bg-black text-white" : "border border-black/20"}`}
                        >
                          {index < completedSteps ? (
                            <Check className="size-3.5" />
                          ) : (
                            <Circle className="size-2.5" />
                          )}
                        </span>
                        {index < steps.length - 1 ? (
                          <span className="h-9 w-px bg-black/15" />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{step}</p>
                        <p className="text-carbon-500 mt-0.5 text-xs">
                          {index < completedSteps
                            ? t(
                                "renterDashboard.applicationDetail.progressCaption.completeOn",
                              )
                            : index ===
                                Math.min(completedSteps, steps.length - 1)
                              ? t(
                                  "renterDashboard.applicationDetail.progressCaption.current",
                                )
                              : t(
                                  "renterDashboard.applicationDetail.progressCaption.pending",
                                )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
              <Section title={t("renterDashboard.applicationDetail.sections.summary")}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Summary
                    title={t("renterDashboard.applicationDetail.summary.applicant")}
                    rows={[
                      submittedValues.fullName || "Julien Mugisha",
                      submittedValues.email || "renter@gmail.com",
                      submittedValues.phone || "+250 788 000 000",
                      t(
                        "renterDashboard.applicationDetail.summary.primaryApplicant",
                      ),
                    ]}
                  />
                  <Summary
                    title={t(
                      "renterDashboard.applicationDetail.summary.rentalPreferences",
                    )}
                    rows={[
                      t("renterDashboard.applicationDetail.summary.moveInLabel", {
                        value:
                          submittedValues.moveIn ||
                          t(
                            "renterDashboard.applicationDetail.summary.moveInFallback",
                          ),
                      }),
                      t("renterDashboard.applicationDetail.summary.leaseLabel", {
                        value:
                          submittedValues.lease ||
                          t(
                            "renterDashboard.applicationDetail.summary.leaseFallback",
                          ),
                      }),
                      t(
                        "renterDashboard.applicationDetail.summary.occupantsCount",
                        { count: submittedValues.occupants || "2" },
                      ),
                      submittedValues.pets ||
                        t("renterDashboard.applicationDetail.summary.noPets"),
                    ]}
                  />
                  <Summary
                    title={t(
                      "renterDashboard.applicationDetail.summary.incomeAndRentPayment",
                    )}
                    rows={[
                      submittedValues.employment ||
                        t(
                          "renterDashboard.applicationDetail.summary.employedFallback",
                        ),
                      submittedValues.income ||
                        t(
                          "renterDashboard.applicationDetail.summary.incomeRangeProvided",
                        ),
                      submittedValues.incomeSource ||
                        t(
                          "renterDashboard.applicationDetail.summary.incomeSourceProvided",
                        ),
                      submittedValues.rentPayment ||
                        t(
                          "renterDashboard.applicationDetail.summary.paymentMethodProvided",
                        ),
                    ]}
                  />
                  <Summary
                    title={t(
                      "renterDashboard.applicationDetail.summary.coApplicant",
                    )}
                    rows={[
                      submittedValues.coApplicant ||
                        t(
                          "renterDashboard.applicationDetail.summary.noCoApplicant",
                        ),
                    ]}
                  />
                </div>
              </Section>
              <Section title={t("renterDashboard.applicationDetail.sections.documents")}>
                {documentRows.length ? (
                  <div className="divide-y divide-black/10">
                    {documentRows.map(([name, status]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <FileText className="size-4" />
                          {documentDisplayName(name)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-carbon-500 text-xs">
                            {t(DOCUMENT_STATUS_LABEL_KEYS[status])}
                          </span>
                          {status === "Pending" || status === "Requested" ? (
                            <label className="cursor-pointer text-xs underline underline-offset-4">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                className="sr-only"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) {
                                    setSelectedDocumentType(name);
                                    setSelectedDocument(file);
                                    showToast(
                                      t(
                                        "renterDashboard.applicationDetail.toasts.readyToSubmit",
                                        { fileName: file.name },
                                      ),
                                    );
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "smooth",
                                    });
                                  }
                                }}
                              />
                              {t("renterDashboard.applicationDetail.documents.upload")}
                            </label>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openDocument(name)}
                              className="text-xs underline underline-offset-4"
                            >
                              {t("renterDashboard.applicationDetail.documents.view")}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-y border-black/10 py-6 text-sm">
                    <p className="font-medium">
                      {t(
                        "renterDashboard.applicationDetail.documents.noneAvailableTitle",
                      )}
                    </p>
                    <p className="text-carbon-500 mt-1">
                      {t(
                        "renterDashboard.applicationDetail.documents.noneAvailableDescription",
                      )}
                    </p>
                  </div>
                )}
              </Section>
              <Section title={t("renterDashboard.applicationDetail.sections.activity")}>
                <div className="space-y-4 text-sm">
                  {[
                    ...(requestComplete
                      ? [
                          [
                            t("renterDashboard.applicationDetail.activity.today"),
                            t(
                              "renterDashboard.applicationDetail.activity.documentUploadedAndSubmitted",
                              {
                                documentName:
                                  selectedDocument?.name ??
                                  documentDisplayName("Reference document"),
                              },
                            ),
                          ],
                        ]
                      : []),
                    [
                      t("renterDashboard.applicationDetail.activity.dates.aug14"),
                      t(
                        "renterDashboard.applicationDetail.activity.additionalDocumentRequested",
                      ),
                    ],
                    [
                      t("renterDashboard.applicationDetail.activity.dates.aug12"),
                      t(
                        "renterDashboard.applicationDetail.activity.movedToUnderReview",
                      ),
                    ],
                    [
                      t("renterDashboard.applicationDetail.activity.dates.aug10"),
                      t(
                        "renterDashboard.applicationDetail.activity.applicationSubmitted",
                      ),
                    ],
                    [
                      t("renterDashboard.applicationDetail.activity.dates.aug10"),
                      t(
                        "renterDashboard.applicationDetail.activity.documentsUploaded",
                      ),
                    ],
                  ].map(([date, text]) => (
                    <div
                      key={`${date}-${text}`}
                      className="grid grid-cols-[60px_1fr] gap-4"
                    >
                      <strong>{date}</strong>
                      <span className="text-carbon-500">{text}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
            <aside className="h-fit bg-white p-6 shadow-[0_3px_12px_rgba(0,0,0,0.03)] lg:sticky lg:top-20">
              <h2 className="font-bricolage text-xl font-medium">
                {t("renterDashboard.applicationDetail.reviewer.heading")}
              </h2>
              <p className="mt-5 flex items-center gap-1.5 font-medium">
                <span>{reviewer.name}</span>
                {reviewerVerified ? (
                  <BadgeCheck className="size-4 shrink-0" />
                ) : null}
              </p>
              <p className="text-carbon-500 mt-1 text-sm">
                {reviewer.roleLabel}
              </p>
              <Link
                href={`/renter-dashboard/messages?host=${encodeURIComponent(reviewer.name)}&role=${encodeURIComponent(reviewer.roleLabel)}&verified=${reviewerVerified ? "1" : "0"}&ctx=application&property=${encodeURIComponent(application.title)}&propertyId=${encodeURIComponent(application.propertyId)}&status=${encodeURIComponent(application.status)}&refId=${encodeURIComponent(application.id)}`}
                className="mt-5 inline-flex h-10 items-center rounded-full bg-black px-5 text-sm text-white"
              >
                {t("renterDashboard.applicationDetail.reviewer.message")}
              </Link>
            </aside>
          </div>
        </div>
      </main>
      {preview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("renterDashboard.applicationDetail.preview.ariaLabel", {
            name: previewDisplayName,
          })}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
        >
          <div className="flex h-[min(760px,90svh)] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-carbon-500 text-xs">
                  {t(
                    "renterDashboard.applicationDetail.preview.documentPreviewLabel",
                  )}
                </p>
                <h2 className="truncate font-medium">{previewDisplayName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label={t(
                  "renterDashboard.applicationDetail.preview.closeAria",
                )}
                className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/[0.05]"
              >
                <X className="size-4" />
              </button>
            </header>
            {preview.url &&
            (preview.type?.startsWith("image/") ||
              /\.(png|jpe?g|webp|gif)$/i.test(preview.name)) ? (
              <div className="bg-carbon-50 relative min-h-0 flex-1 p-6">
                <Image
                  src={preview.url}
                  alt={previewDisplayName}
                  fill
                  unoptimized
                  className="object-contain p-6"
                />
              </div>
            ) : preview.url ? (
              <iframe
                src={preview.url}
                title={previewDisplayName}
                className="bg-carbon-50 min-h-0 flex-1"
              />
            ) : (
              <div className="bg-carbon-50 flex flex-1 flex-col items-center justify-center p-8 text-center">
                <FileText className="size-14 stroke-1" />
                <h3 className="font-bricolage mt-5 text-2xl font-medium">
                  {t(
                    "renterDashboard.applicationDetail.preview.unavailableTitle",
                  )}
                </h3>
                <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">
                  {t(
                    "renterDashboard.applicationDetail.preview.unavailableDescription",
                    { name: previewDisplayName },
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {toast ? (
        <div role="status" className="feedback-toast">
          {toast}
        </div>
      ) : null}
    </>
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
    <section className="bg-white p-6 shadow-[0_3px_12px_rgba(0,0,0,0.025)]">
      <h2 className="font-bricolage mb-5 text-2xl font-medium">{title}</h2>
      {children}
    </section>
  );
}
function Summary({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="text-carbon-500 mt-2 space-y-1 text-sm">
        {rows.map((row) => (
          <p key={row}>{row}</p>
        ))}
      </div>
    </div>
  );
}
