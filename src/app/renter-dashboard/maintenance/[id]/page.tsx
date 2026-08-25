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
import {
  getMaintenanceRequest,
  subscribeToMaintenance,
  updateMaintenanceRequest,
  type MaintenanceRequest,
  type MaintenanceStatus,
} from "@/lib/maintenance-data";

type Dialog = "reschedule" | "information" | "reopen" | "cancel" | null;

export default function MaintenanceDetailPage() {
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
              Back to Maintenance
            </Link>

            <header className="flex flex-wrap items-start justify-between gap-5 border-b border-black/10 pb-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Status status={status} />
                  {request.urgency === "Urgent" ? (
                    <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-medium text-white">
                      Urgent
                    </span>
                  ) : null}
                </div>
                <h1 className="dashboard-page-title mt-4">{request.title}</h1>
                <p className="text-carbon-500 mt-2 text-sm">
                  {request.property} · {request.location}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-black/50">
                  <span>Request: {request.id}</span>
                  <span>Submitted: {request.submitted}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/renter-dashboard/messages?host=Jean%20Mugisha&role=Property%20Manager&verified=1&ctx=maintenance&title=${encodeURIComponent(request.title)}&property=${encodeURIComponent(request.property)}&propertyId=${encodeURIComponent(request.propertyId)}&status=${encodeURIComponent(request.status)}&refId=${encodeURIComponent(request.id)}`}
                  className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted inline-flex h-11 items-center justify-center rounded-full border bg-transparent px-5 text-base font-medium transition-colors duration-150"
                >
                  Message Property Manager
                </Link>
                {canCancel ? (
                  <button
                    onClick={() => setDialog("cancel")}
                    aria-label="More request actions"
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
                    Information Needed
                  </p>
                  <h2 className="font-bricolage mt-2 text-xl font-medium">
                    The property manager requested more details.
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
                    Message Manager
                  </Link>
                  <button
                    onClick={() => setDialog("information")}
                    className="h-10 rounded-full bg-white px-5 text-sm font-medium text-black"
                  >
                    Add Information
                  </button>
                </div>
              </section>
            ) : informationSent ? (
              <p className="mt-6 text-sm">
                <Check className="mr-2 inline size-4" />
                Information Sent
              </p>
            ) : null}

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.8fr]">
              <div className="space-y-6">
                <Card title="Issue Details">
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Meta label="Category" value={request.category} />
                    <Meta label="Location" value={request.area} />
                    <Meta label="Urgency" value={request.urgency} />
                  </div>
                  <p className="text-carbon-500 mt-6 border-t border-black/10 pt-5 text-sm leading-6">
                    {request.description}
                  </p>
                  <div className="mt-5 flex gap-3">
                    <Image
                      src={house1}
                      alt="Issue photo"
                      className="size-24 rounded-xl object-cover"
                    />
                    <Image
                      src={house2}
                      alt="Issue photo"
                      className="size-24 rounded-xl object-cover"
                    />
                  </div>
                </Card>

                {request.scheduledVisit ? (
                  <Card title="Scheduled Visit">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="flex gap-3">
                        <CalendarDays className="mt-0.5 size-5" />
                        <Meta
                          label="Date"
                          value={request.scheduledVisit.date}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Clock3 className="mt-0.5 size-5" />
                        <Meta
                          label="Time"
                          value={request.scheduledVisit.time}
                        />
                      </div>
                    </div>
                    <div className="mt-6 border-t border-black/10 pt-5">
                      <Meta
                        label="Maintenance contact"
                        value={`${request.scheduledVisit.contact} · ${request.scheduledVisit.role}`}
                      />
                      <p className="text-carbon-500 mt-2 text-xs">
                        Managed through Jean Mugisha · Property Manager
                      </p>
                    </div>
                    <div className="mt-6 flex flex-wrap justify-end gap-3">
                      <button
                        onClick={() => setDialog("reschedule")}
                        className="h-10 rounded-full bg-black px-5 text-sm text-white"
                      >
                        Request New Time
                      </button>
                    </div>
                  </Card>
                ) : null}

                {resolved ? (
                  <Card title={closed ? "Request Closed" : "Issue Resolved"}>
                    {closed ? (
                      <p className="text-sm">
                        <Check className="mr-2 inline size-4" />
                        You confirmed that this issue is fixed.
                      </p>
                    ) : (
                      <>
                        <Meta
                          label="Completed"
                          value={request.completed ?? "18 August 2026"}
                        />
                        <p className="text-carbon-500 mt-5 text-sm leading-6">
                          {request.resolution ??
                            "The maintenance work was completed."}
                        </p>
                        <h3 className="font-bricolage mt-7 text-lg font-medium">
                          Is the issue resolved?
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            onClick={() => {
                              setClosed(true);
                              showToast("Request closed");
                            }}
                            className="h-10 rounded-full bg-black px-5 text-sm text-white"
                          >
                            Yes, It&apos;s Fixed
                          </button>
                          <button
                            onClick={() => setDialog("reopen")}
                            className="h-10 rounded-full border border-black/15 px-5 text-sm"
                          >
                            Issue Still Exists
                          </button>
                        </div>
                      </>
                    )}
                  </Card>
                ) : null}

                <Card title="Updates">
                  <div className="space-y-5">
                    {updatesFor(status).map((update) => (
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
                <Card title="Status Timeline">
                  <Timeline status={status} />
                </Card>
                <Card title="Property Manager">
                  <p className="font-medium">Jean Mugisha</p>
                  <p className="text-carbon-500 mt-1 text-sm">
                    Kacyiru Residence
                  </p>
                  <p className="text-carbon-500 mt-3 text-xs">
                    Maintenance: {request.title}
                  </p>
                  <Link
                    href={`/renter-dashboard/messages?host=Jean%20Mugisha&role=Property%20Manager&verified=1&ctx=maintenance&title=${encodeURIComponent(request.title)}&property=${encodeURIComponent(request.property)}&propertyId=${encodeURIComponent(request.propertyId)}&status=${encodeURIComponent(request.status)}&refId=${encodeURIComponent(request.id)}`}
                    className="mt-5 inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm"
                  >
                    Open Messages
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
              showToast("Information sent");
            } else if (dialog === "reopen") {
              setStatus("Under Review");
              updateMaintenanceRequest(request.id, { status: "Under Review" });
              setClosed(false);
              showToast("Maintenance request reopened");
            } else if (dialog === "cancel") {
              setStatus("Cancelled");
              updateMaintenanceRequest(request.id, { status: "Cancelled" });
              showToast("Maintenance request cancelled");
            } else {
              showToast("New time requested");
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
              {stage}
            </p>
            <p className="mt-1 text-xs text-black/40">
              {index < current
                ? "Completed"
                : index === current
                  ? "Current"
                  : "Pending"}
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
  const [date, setDate] = useState("2026-08-19");
  const [window, setWindow] = useState("Morning");
  const title =
    type === "reschedule"
      ? "Request Another Time"
      : type === "information"
        ? "Add Information"
        : type === "reopen"
          ? "Reopen Maintenance Request?"
          : "Cancel Maintenance Request?";
  const action =
    type === "reschedule"
      ? "Request Change"
      : type === "information"
        ? "Send Information"
        : type === "reopen"
          ? "Reopen Request"
          : "Cancel Request";
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
            aria-label="Close dialog"
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
              ? `${request.title} will be marked as cancelled.`
              : type === "reschedule"
                ? `Current appointment: ${request.scheduledVisit?.date ?? "Not scheduled"} · ${request.scheduledVisit?.time ?? ""}`
                : type === "information"
                  ? (request.informationNeeded ?? "Add the requested details.")
                  : "Tell us what still needs attention."}
          </p>
          {type === "reschedule" ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm">Preferred date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-11 w-full rounded-xl bg-black/[0.035] px-4 text-sm outline-none"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm">Time window</span>
                <select
                  value={window}
                  onChange={(event) => setWindow(event.target.value)}
                  className="h-11 w-full rounded-xl bg-black/[0.035] px-4 text-sm outline-none"
                >
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                </select>
              </label>
            </div>
          ) : null}
          <label className="mt-5 block">
            <span className="mb-2 block text-sm">
              {type === "cancel"
                ? "Reason"
                : type === "reschedule"
                  ? "Reason for requesting another time"
                  : "Note"}
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder={
                type === "cancel"
                  ? "Issue fixed itself, no longer needed..."
                  : type === "reschedule"
                    ? "Explain why the current appointment no longer works..."
                    : "Add a helpful note"
              }
              className="w-full resize-none rounded-xl bg-black/[0.035] p-4 text-sm outline-none"
            />
          </label>
          {type === "information" || type === "reopen" ? (
            <label className="mt-4 flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/20 text-sm">
              Add Photos
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
              {type === "cancel" ? "Keep Request" : "Cancel"}
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

function updatesFor(status: MaintenanceStatus) {
  const updates = [
    { date: "16 Aug · 14:30", text: "Technician assigned." },
    { date: "15 Aug · 09:10", text: "Visit scheduled for 17 August." },
    { date: "14 Aug · 18:45", text: "Property manager reviewed the request." },
    { date: "14 Aug · 18:20", text: "Request submitted." },
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
  return (
    <span className="rounded-full bg-black/[0.07] px-2.5 py-1 text-[10px] font-medium">
      {status}
    </span>
  );
}
