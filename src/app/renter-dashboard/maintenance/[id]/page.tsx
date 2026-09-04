"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useEffect, useReducer, useState } from "react";

import cancelIllustration from "@/assets/images/cancel.png";
import house1 from "@/assets/images/house1.jpg";
import house2 from "@/assets/images/house2.jpg";
import scheduleIllustration from "@/assets/images/schedule.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { useTranslation } from "@/components/language/use-translation";
import {
  getMaintenanceRequest,
  subscribeToMaintenance,
  updateMaintenanceRequest,
  type MaintenanceRequest,
  type MaintenanceStatus,
} from "@/lib/maintenance-data";

type Dialog = "reschedule" | "information" | "reopen" | "cancel" | null;
type TFunc = (key: string, vars?: Record<string, string | number>) => string;

// Internal status/urgency values stay in English (compared with `===`
// elsewhere and stored on the shared MaintenanceRequest record) -- these
// helpers resolve them to a translated display label without touching the
// underlying value.
function statusLabel(t: TFunc, status: string) {
  const labels: Record<string, string> = {
    Submitted: t("renterDashboard.maintenanceDetail.status.submitted"),
    "Under Review": t("renterDashboard.maintenanceDetail.status.underReview"),
    Scheduled: t("renterDashboard.maintenanceDetail.status.scheduled"),
    "In Progress": t("renterDashboard.maintenanceDetail.status.inProgress"),
    "Waiting for Renter": t(
      "renterDashboard.maintenanceDetail.status.waitingForRenter",
    ),
    Resolved: t("renterDashboard.maintenanceDetail.status.resolved"),
    Cancelled: t("renterDashboard.maintenanceDetail.status.cancelled"),
  };
  return labels[status] ?? status;
}

function urgencyLabel(t: TFunc, urgency: string) {
  return urgency === "Urgent"
    ? t("renterDashboard.maintenanceDetail.urgency.urgent")
    : t("renterDashboard.maintenanceDetail.urgency.normal");
}

export default function MaintenanceDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  // Cross-Role Lifecycle Synchronization phase -- reads the SAME canonical
  // record PM's Maintenance detail reads, live (Section 26/30).
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToMaintenance(forceUpdate), []);
  const fallback: MaintenanceRequest = {
    id: params.id,
    title: "Leaking kitchen tap",
    property: "Kacyiru Residence",
    propertyId: "kacyiru-2br",
    location: "Kacyiru, Kigali",
    category: "Plumbing",
    area: "Kitchen",
    urgency: "Normal",
    status: "Submitted",
    submitted: "16 August 2026",
    description:
      "The kitchen tap has been leaking continuously since yesterday.",
    latestUpdate: "Request received by the property manager",
    reportedBy: "You",
    managedBy: null,
  };
  const request = getMaintenanceRequest(params.id) ?? fallback;
  const [status, setStatus] = useState<MaintenanceStatus>(request.status);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [closed, setClosed] = useState(false);
  const [informationSent, setInformationSent] = useState(false);
  const [scheduleNote, setScheduleNote] = useState("");
  const [toast, setToast] = useState("");

  const canCancel = [
    "Submitted",
    "Under Review",
    "Waiting for Renter",
  ].includes(status);
  const resolved = status === "Resolved";

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <div className="bg-carbon-50 px-5 pt-8 pb-12 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1200px]">
            <Link
              href="/renter-dashboard/maintenance"
              className="mb-6 inline-flex items-center gap-1 text-sm text-black/65 transition-colors hover:text-black"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              {t("renterDashboard.maintenanceDetail.backLink")}
            </Link>

            <header className="flex flex-wrap items-start justify-between gap-5 border-b border-black/10 pb-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Status status={status} />
                  {request.urgency === "Urgent" ? (
                    <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-medium text-white">
                      {t("renterDashboard.maintenanceDetail.urgency.urgent")}
                    </span>
                  ) : null}
                </div>
                <h1 className="dashboard-page-title mt-4">{request.title}</h1>
                <p className="text-carbon-500 mt-2 text-sm">
                  {request.property} · {request.location}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-black/50">
                  <span>
                    {t("renterDashboard.maintenanceDetail.requestIdPrefix", {
                      id: request.id,
                    })}
                  </span>
                  <span>
                    {t("renterDashboard.maintenanceDetail.submittedPrefix", {
                      date: request.submitted,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/renter-dashboard/messages?host=Jean%20Mugisha&role=Property%20Manager&verified=1&ctx=maintenance&title=${encodeURIComponent(request.title)}&property=${encodeURIComponent(request.property)}&propertyId=${encodeURIComponent(request.propertyId)}&status=${encodeURIComponent(request.status)}&refId=${encodeURIComponent(request.id)}`}
                  className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border bg-transparent px-5 text-base font-medium transition-colors duration-150"
                >
                  {t("renterDashboard.maintenanceDetail.messagePropertyManagerLink")}
                </Link>
                {canCancel ? (
                  <button
                    onClick={() => setDialog("cancel")}
                    aria-label={t("renterDashboard.maintenanceDetail.moreActionsAria")}
                    className="flex size-11 items-center justify-center rounded-full border border-black/15"
                  >
                    <MoreHorizontal className="size-5" />
                  </button>
                ) : null}
              </div>
            </header>

            {request.informationNeeded && !informationSent ? (
              <section className="mt-6 rounded-2xl bg-black p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div>
                  <p className="text-xs font-medium text-white/55">
                    {t("renterDashboard.maintenanceDetail.informationNeeded.badge")}
                  </p>
                  <h2 className="font-bricolage mt-2 text-xl font-medium">
                    {t("renterDashboard.maintenanceDetail.informationNeeded.heading")}
                  </h2>
                  <p className="mt-2 text-sm text-white/65">
                    {request.informationNeeded}
                  </p>
                </div>
                <div className="mt-5 flex shrink-0 gap-3 sm:mt-0">
                  <Link
                    href={`/renter-dashboard/messages?host=Jean%20Mugisha&role=Property%20Manager&verified=1&ctx=maintenance&title=${encodeURIComponent(request.title)}&property=${encodeURIComponent(request.property)}&propertyId=${encodeURIComponent(request.propertyId)}&status=${encodeURIComponent(request.status)}&refId=${encodeURIComponent(request.id)}`}
                    className="h-10 rounded-full border border-white/25 px-4 py-2.5 text-sm"
                  >
                    {t(
                      "renterDashboard.maintenanceDetail.informationNeeded.messageManagerLink",
                    )}
                  </Link>
                  <button
                    onClick={() => setDialog("information")}
                    className="h-10 rounded-full bg-white px-5 text-sm font-medium text-black"
                  >
                    {t(
                      "renterDashboard.maintenanceDetail.informationNeeded.addInformationButton",
                    )}
                  </button>
                </div>
              </section>
            ) : informationSent ? (
              <p className="mt-6 text-sm">
                <Check className="mr-2 inline size-4" />
                {t("renterDashboard.maintenanceDetail.informationNeeded.sentLabel")}
              </p>
            ) : null}

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.8fr]">
              <div className="space-y-6">
                <Card title={t("renterDashboard.maintenanceDetail.cards.issueDetailsTitle")}>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Meta
                      label={t("renterDashboard.maintenanceDetail.fields.category")}
                      value={request.category}
                    />
                    <Meta
                      label={t("hero.search.location")}
                      value={request.area}
                    />
                    <Meta
                      label={t("renterDashboard.maintenanceDetail.fields.urgency")}
                      value={urgencyLabel(t, request.urgency)}
                    />
                  </div>
                  <p className="text-carbon-500 mt-6 border-t border-black/10 pt-5 text-sm leading-6">
                    {request.description}
                  </p>
                  <div className="mt-5 flex gap-3">
                    <Image
                      src={house1}
                      alt={t("renterDashboard.maintenanceDetail.fields.issuePhotoAlt")}
                      className="size-24 rounded-xl object-cover"
                    />
                    <Image
                      src={house2}
                      alt={t("renterDashboard.maintenanceDetail.fields.issuePhotoAlt")}
                      className="size-24 rounded-xl object-cover"
                    />
                  </div>
                </Card>

                {request.scheduledVisit ? (
                  <Card title={t("renterDashboard.maintenanceDetail.cards.scheduledVisitTitle")}>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="flex gap-3">
                        <CalendarDays className="mt-0.5 size-5" />
                        <Meta
                          label={t("renterDashboard.maintenanceDetail.fields.date")}
                          value={request.scheduledVisit.date}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Clock3 className="mt-0.5 size-5" />
                        <Meta
                          label={t("renterDashboard.maintenanceDetail.fields.time")}
                          value={request.scheduledVisit.time}
                        />
                      </div>
                    </div>
                    <div className="mt-6 border-t border-black/10 pt-5">
                      <Meta
                        label={t(
                          "renterDashboard.maintenanceDetail.fields.maintenanceContact",
                        )}
                        value={`${request.scheduledVisit.contact} · ${request.scheduledVisit.role}`}
                      />
                      <p className="text-carbon-500 mt-2 text-xs">
                        {t("renterDashboard.maintenanceDetail.managedThrough", {
                          name: "Jean Mugisha",
                          role: "Property Manager",
                        })}
                      </p>
                    </div>
                    <div className="mt-6 flex flex-wrap justify-end gap-3">
                      <button
                        onClick={() => setDialog("reschedule")}
                        className="h-10 rounded-full bg-black px-5 text-sm text-white"
                      >
                        {t("renterDashboard.maintenanceDetail.requestNewTimeButton")}
                      </button>
                    </div>
                  </Card>
                ) : null}

                {resolved ? (
                  <Card
                    title={
                      closed
                        ? t("renterDashboard.maintenanceDetail.cards.requestClosedTitle")
                        : t("renterDashboard.maintenanceDetail.cards.issueResolvedTitle")
                    }
                  >
                    {closed ? (
                      <p className="text-sm">
                        <Check className="mr-2 inline size-4" />
                        {t(
                          "renterDashboard.maintenanceDetail.resolved.confirmedFixedMessage",
                        )}
                      </p>
                    ) : (
                      <>
                        <Meta
                          label={t("renterDashboard.maintenanceDetail.fields.completed")}
                          value={request.completed ?? "18 August 2026"}
                        />
                        <p className="text-carbon-500 mt-5 text-sm leading-6">
                          {request.resolution ??
                            t(
                              "renterDashboard.maintenanceDetail.resolved.defaultResolutionText",
                            )}
                        </p>
                        <h3 className="font-bricolage mt-7 text-lg font-medium">
                          {t("renterDashboard.maintenanceDetail.resolved.confirmQuestion")}
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            onClick={() => {
                              setClosed(true);
                              showToast(
                                t("renterDashboard.maintenanceDetail.toasts.requestClosed"),
                              );
                            }}
                            className="h-10 rounded-full bg-black px-5 text-sm text-white"
                          >
                            {t(
                              "renterDashboard.maintenanceDetail.resolved.confirmFixedButton",
                            )}
                          </button>
                          <button
                            onClick={() => setDialog("reopen")}
                            className="h-10 rounded-full border border-black/15 px-5 text-sm"
                          >
                            {t(
                              "renterDashboard.maintenanceDetail.resolved.stillExistsButton",
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </Card>
                ) : null}

                <Card title={t("renterDashboard.maintenanceDetail.cards.updatesTitle")}>
                  <div className="space-y-5">
                    {updatesFor(t, status).map((update) => (
                      <div
                        key={update.text}
                        className="grid gap-1 border-b border-black/10 pb-5 last:border-0 last:pb-0 sm:grid-cols-[130px_1fr]"
                      >
                        <span className="text-xs text-black/45">
                          {update.date}
                        </span>
                        <p className="text-sm">{update.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <aside className="space-y-6">
                <Card title={t("renterDashboard.maintenanceDetail.cards.statusTimelineTitle")}>
                  <Timeline status={status} />
                </Card>
                <Card title={t("renterDashboard.maintenanceDetail.cards.propertyManagerTitle")}>
                  <p className="font-medium">Jean Mugisha</p>
                  <p className="text-carbon-500 mt-1 text-sm">
                    Kacyiru Residence
                  </p>
                  <p className="text-carbon-500 mt-3 text-xs">
                    {t("renterDashboard.maintenanceDetail.maintenanceLabelPrefix", {
                      title: request.title,
                    })}
                  </p>
                  <Link
                    href={`/renter-dashboard/messages?host=Jean%20Mugisha&role=Property%20Manager&verified=1&ctx=maintenance&title=${encodeURIComponent(request.title)}&property=${encodeURIComponent(request.property)}&propertyId=${encodeURIComponent(request.propertyId)}&status=${encodeURIComponent(request.status)}&refId=${encodeURIComponent(request.id)}`}
                    className="mt-5 inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm"
                  >
                    {t("renterDashboard.maintenanceDetail.openMessagesLink")}
                  </Link>
                </Card>
              </aside>
            </div>
          </div>
        </div>
      </main>

      {dialog ? (
        <MaintenanceDialog
          type={dialog}
          request={request}
          close={() => setDialog(null)}
          note={scheduleNote}
          setNote={setScheduleNote}
          confirm={() => {
            if (dialog === "information") {
              setInformationSent(true);
              showToast(t("renterDashboard.maintenanceDetail.toasts.informationSent"));
            } else if (dialog === "reopen") {
              setStatus("Under Review");
              updateMaintenanceRequest(request.id, { status: "Under Review" });
              setClosed(false);
              showToast(
                t("renterDashboard.maintenanceDetail.toasts.requestReopened"),
              );
            } else if (dialog === "cancel") {
              setStatus("Cancelled");
              updateMaintenanceRequest(request.id, { status: "Cancelled" });
              showToast(
                t("renterDashboard.maintenanceDetail.toasts.requestCancelled"),
              );
            } else {
              showToast(
                t("renterDashboard.maintenanceDetail.toasts.newTimeRequested"),
              );
            }
            setDialog(null);
          }}
        />
      ) : null}
      {toast ? <div className="feedback-toast">{toast}</div> : null}
    </>
  );
}

function Timeline({ status }: { status: MaintenanceStatus }) {
  const { t } = useTranslation();
  const stages = [
    "Submitted",
    "Under Review",
    "Scheduled",
    "In Progress",
    "Resolved",
  ];
  const current =
    status === "Waiting for Renter" ? 1 : Math.max(0, stages.indexOf(status));
  return (
    <div>
      {stages.map((stage, index) => (
        <div key={stage} className="grid grid-cols-[24px_1fr] gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`flex size-6 items-center justify-center rounded-full ${index <= current ? "bg-black text-white" : "border border-black/20"}`}
            >
              {index < current ? <Check className="size-3" /> : index + 1}
            </span>
            {index < stages.length - 1 ? (
              <span className="h-10 w-px bg-black/15" />
            ) : null}
          </div>
          <div>
            <p
              className={`text-sm ${index === current ? "font-medium" : "text-black/55"}`}
            >
              {statusLabel(t, stage)}
            </p>
            <p className="mt-1 text-xs text-black/40">
              {index < current
                ? t("renterDashboard.maintenanceDetail.fields.completed")
                : index === current
                  ? t("renterDashboard.maintenanceDetail.timeline.current")
                  : t("renterDashboard.maintenanceDetail.timeline.pending")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MaintenanceDialog({
  type,
  request,
  close,
  note,
  setNote,
  confirm,
}: {
  type: NonNullable<Dialog>;
  request: MaintenanceRequest;
  close: () => void;
  note: string;
  setNote: (value: string) => void;
  confirm: () => void;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState("2026-08-19");
  const [window, setWindow] = useState("Morning");
  const title =
    type === "reschedule"
      ? t("renterDashboard.maintenanceDetail.dialog.titles.reschedule")
      : type === "information"
        ? t(
            "renterDashboard.maintenanceDetail.informationNeeded.addInformationButton",
          )
        : type === "reopen"
          ? t("renterDashboard.maintenanceDetail.dialog.titles.reopen")
          : t("renterDashboard.maintenanceDetail.dialog.titles.cancel");
  const action =
    type === "reschedule"
      ? t("renterDashboard.maintenanceDetail.dialog.actions.reschedule")
      : type === "information"
        ? t("renterDashboard.maintenanceDetail.dialog.actions.information")
        : type === "reopen"
          ? t("renterDashboard.maintenanceDetail.dialog.actions.reopen")
          : t("renterDashboard.maintenanceDetail.dialog.actions.cancel");
  const timeWindowLabels: Record<string, string> = {
    Morning: t("renterDashboard.maintenanceDetail.dialog.timeWindows.morning"),
    Afternoon: t(
      "renterDashboard.maintenanceDetail.dialog.timeWindows.afternoon",
    ),
    Evening: t("renterDashboard.maintenanceDetail.dialog.timeWindows.evening"),
  };
  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-xl overflow-hidden bg-white shadow-2xl"
      >
        <div className="relative flex min-h-44 items-center justify-center bg-black/[0.05] p-5">
          <button
            onClick={close}
            aria-label={t("renterDashboard.maintenanceDetail.dialog.closeAria")}
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20"
          >
            <X className="size-4" />
          </button>
          <Image
            src={type === "cancel" ? cancelIllustration : scheduleIllustration}
            alt=""
            className="h-36 w-auto object-contain"
          />
        </div>
        <div className="p-6 sm:p-8">
          <h2 className="font-bricolage text-2xl font-medium">{title}</h2>
          <p className="text-carbon-500 mt-3 text-sm">
            {type === "cancel"
              ? t("renterDashboard.maintenanceDetail.dialog.cancelDescription", {
                  title: request.title,
                })
              : type === "reschedule"
                ? t(
                    "renterDashboard.maintenanceDetail.dialog.currentAppointment",
                    {
                      date:
                        request.scheduledVisit?.date ??
                        t("renterDashboard.maintenanceDetail.dialog.notScheduled"),
                      time: request.scheduledVisit?.time ?? "",
                    },
                  )
                : type === "information"
                  ? (request.informationNeeded ??
                    t("renterDashboard.maintenanceDetail.dialog.addInfoDefaultText"))
                  : t("renterDashboard.maintenanceDetail.dialog.reopenPrompt")}
          </p>
          {type === "reschedule" ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm">
                  {t("renterDashboard.maintenanceDetail.dialog.preferredDateLabel")}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-11 w-full rounded-xl bg-black/[0.035] px-4 text-sm outline-none"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm">
                  {t("renterDashboard.maintenanceDetail.dialog.timeWindowLabel")}
                </span>
                <select
                  value={window}
                  onChange={(event) => setWindow(event.target.value)}
                  className="h-11 w-full rounded-xl bg-black/[0.035] px-4 text-sm outline-none"
                >
                  {["Morning", "Afternoon", "Evening"].map((option) => (
                    <option key={option} value={option}>
                      {timeWindowLabels[option]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          <label className="mt-5 block">
            <span className="mb-2 block text-sm">
              {type === "cancel"
                ? t("renterDashboard.maintenanceDetail.dialog.reasonLabel")
                : type === "reschedule"
                  ? t(
                      "renterDashboard.maintenanceDetail.dialog.reasonForRescheduleLabel",
                    )
                  : t("renterDashboard.maintenanceDetail.dialog.noteLabel")}
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder={
                type === "cancel"
                  ? t(
                      "renterDashboard.maintenanceDetail.dialog.cancelReasonPlaceholder",
                    )
                  : type === "reschedule"
                    ? t(
                        "renterDashboard.maintenanceDetail.dialog.rescheduleReasonPlaceholder",
                      )
                    : t("renterDashboard.maintenanceDetail.dialog.notePlaceholder")
              }
              className="w-full resize-none rounded-xl bg-black/[0.035] p-4 text-sm outline-none"
            />
          </label>
          {type === "information" || type === "reopen" ? (
            <label className="mt-4 flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/20 text-sm">
              {t("renterDashboard.maintenanceDetail.dialog.addPhotosLabel")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
              />
            </label>
          ) : null}
          <div className="mt-7 flex justify-end gap-3">
            <button
              onClick={close}
              className="h-11 rounded-full border border-black/15 px-5 text-sm"
            >
              {type === "cancel"
                ? t("renterDashboard.maintenanceDetail.dialog.keepRequestButton")
                : t("renterDashboard.maintenanceDetail.dialog.cancelButton")}
            </button>
            <button
              onClick={confirm}
              className="h-11 rounded-full bg-black px-6 text-sm text-white"
            >
              {action}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function updatesFor(t: TFunc, status: MaintenanceStatus) {
  const updates = [
    {
      date: "16 Aug · 14:30",
      text: t("renterDashboard.maintenanceDetail.updates.technicianAssigned"),
    },
    {
      date: "15 Aug · 09:10",
      text: t("renterDashboard.maintenanceDetail.updates.visitScheduled"),
    },
    {
      date: "14 Aug · 18:45",
      text: t("renterDashboard.maintenanceDetail.updates.reviewedRequest"),
    },
    {
      date: "14 Aug · 18:20",
      text: t("renterDashboard.maintenanceDetail.updates.requestSubmitted"),
    },
  ];
  return status === "Submitted" ? updates.slice(-1) : updates;
}
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/80 bg-white/70 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-white/70 backdrop-blur-xl sm:p-7">
      <h2 className="font-bricolage text-xl font-medium">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-black/45">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
function Status({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className="rounded-full bg-black/[0.07] px-2.5 py-1 text-[10px] font-medium">
      {statusLabel(t, status)}
    </span>
  );
}
