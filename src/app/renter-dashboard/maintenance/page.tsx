"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  Check,
  ChevronDown,
  ClipboardX,
  MessageSquare,
  ClipboardList,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useReducer, useState, Suspense } from "react";

import emptyIllustration from "@/assets/images/empty.png";
import maintenanceIllustration from "@/assets/images/maintenance.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import {
  ACTIVE_RENTALS,
  ISSUE_CATEGORIES,
  PROPERTY_AREAS,
  createMaintenanceRequest,
  getMaintenanceRequests,
  subscribeToMaintenance,
  type MaintenanceRequest,
} from "@/lib/maintenance-data";
import { getActiveAssignmentsForProperty } from "@/lib/team-data";
import { pushProfessionalNotification } from "@/lib/professional-work";
import { pushOwnerNotification } from "@/lib/owner-notifications";
import { isPaidTier, useTier } from "@/hooks/use-tier";
import { UpgradeModal } from "@/components/tier/upgrade-modal";

// Cross-Role Lifecycle Synchronization phase -- Section 29/45: a new
// renter-submitted request notifies whichever PM holds "Handle
// maintenance" for that property (resolved from the real
// PropertyAssignment, not stored on the request itself), plus the Owner.
function notifyOnNewMaintenanceRequest(request: MaintenanceRequest) {
  const assignment = getActiveAssignmentsForProperty(request.propertyId).find(
    (a) =>
      a.role === "property_manager" &&
      a.responsibilities.includes("Handle maintenance"),
  );
  if (assignment) {
    pushProfessionalNotification({
      professionalId: assignment.professionalId,
      category: "maintenance",
      title: "New maintenance request",
      body: `${request.title} reported at ${request.property}.`,
      actionLabel: "View Request",
      actionHref: `/partner-dashboard/maintenance?open=${request.id}`,
    });
  }
  pushOwnerNotification({
    category: "maintenance",
    title: "Maintenance request submitted",
    body: `${request.title} reported at ${request.property}.`,
    actionLabel: "View Maintenance",
    actionHref: "/owner-dashboard/maintenance",
  });
}

type Tab = "open" | "resolved" | "all";
type ReportStep = "form" | "review" | "success";

const OPEN_STATUSES = [
  "Submitted",
  "Under Review",
  "Scheduled",
  "In Progress",
  "Waiting for Renter",
];

export default function MaintenancePage() {
  return (
    <Suspense>
      <MaintenancePageInner />
    </Suspense>
  );
}

function MaintenancePageInner() {
  const searchParams = useSearchParams();
  const demoState = searchParams.get("state");
  const hasActiveRental = demoState !== "no-rental";
  // Cross-Role Lifecycle Synchronization phase -- reads the SAME canonical
  // MaintenanceRequest store PM's Maintenance page reads (Section 26/29),
  // instead of a one-time local snapshot, so a PM status change is visible
  // here live.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToMaintenance(forceUpdate), []);
  const requests = demoState === "empty" ? [] : getMaintenanceRequests();
  const [tab, setTab] = useState<Tab>("all");
  const [rentalFilter, setRentalFilter] = useState("all");
  const [wantsReportOpen, setWantsReportOpen] = useState(
    searchParams.get("report") === "1",
  );
  const [toast, setToast] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const tier = useTier();
  // Tenant tier gate: in-app maintenance requests are Paid-only
  // (access-control.ts). Derived rather than gating the `useState`
  // initializer above, so a genuinely paid tenant following a `?report=1`
  // deep link still opens the dialog once `useTier()` resolves
  // post-hydration (see the identical pattern in renter-map-catalogue.tsx).
  const reportOpen = wantsReportOpen && isPaidTier(tier);

  function handleReportClick() {
    if (!isPaidTier(tier)) {
      setUpgradeOpen(true);
      return;
    }
    setWantsReportOpen(true);
  }

  const shownRequests = requests.filter(
    (request) =>
      (tab === "all" ||
        (tab === "open" && OPEN_STATUSES.includes(request.status)) ||
        (tab === "resolved" &&
          ["Resolved", "Cancelled"].includes(request.status))) &&
      (rentalFilter === "all" || request.propertyId === rentalFilter),
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <section className="bg-carbon-50 px-5 pt-9 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h1 className="dashboard-page-title">Maintenance</h1>
                <p className="text-carbon-500 mt-3 text-sm leading-6">
                  Report and track maintenance issues for your HauxHunt rentals.
                </p>
              </div>
              {hasActiveRental ? (
                <button
                  type="button"
                  onClick={handleReportClick}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
                >
                  <Plus className="size-4" /> Report an Issue
                </button>
              ) : null}
            </div>

            {hasActiveRental && requests.length ? (
              <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
                <div className="flex gap-7">
                  {(["all", "open", "resolved"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTab(item)}
                      className={`relative h-12 text-sm font-medium capitalize ${tab === item ? "text-black" : "text-black/45"}`}
                    >
                      {item}
                      {tab === item ? (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />
                      ) : null}
                    </button>
                  ))}
                </div>
                {ACTIVE_RENTALS.length > 1 ? (
                  <label className="relative mb-2 block w-56 shrink-0">
                    <span className="sr-only">Filter by rental</span>
                    <select
                      value={rentalFilter}
                      onChange={(event) => setRentalFilter(event.target.value)}
                      className="h-11 w-full appearance-none rounded-full border-0 bg-white pr-10 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0"
                    >
                      <option value="all">All Rentals</option>
                      {ACTIVE_RENTALS.map((rental) => (
                        <option key={rental.id} value={rental.propertyId}>
                          {rental.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2"
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="bg-carbon-50 px-5 pt-5 pb-12 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            {!hasActiveRental ? (
              <EmptyState
                title="No Active Rental"
                description="Maintenance requests are available once you have an active HauxHunt rental."
                primary={{
                  label: "View My Rentals",
                  href: "/renter-dashboard/rentals",
                }}
                secondary={{
                  label: "Find a Home",
                  href: "/renter-dashboard/properties",
                }}
              />
            ) : !requests.length ? (
              <MaintenanceEmptyState onReport={handleReportClick} />
            ) : shownRequests.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {shownRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <Image src={emptyIllustration} alt="" className="h-40 w-auto" />
                <h2 className="font-bricolage mt-5 text-2xl font-medium">
                  No {tab} requests
                </h2>
                <p className="text-carbon-500 mt-2 text-sm">
                  Requests for this rental will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {reportOpen ? (
        <ReportIssueDialog
          close={() => setWantsReportOpen(false)}
          submit={(request) => {
            createMaintenanceRequest(request);
            notifyOnNewMaintenanceRequest(request);
            setTab("open");
          }}
          showToast={showToast}
        />
      ) : null}
      {toast ? <div className="feedback-toast">{toast}</div> : null}
      <UpgradeModal
        feature="tenant.maintenanceRequests"
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}

function RequestCard({ request }: { request: MaintenanceRequest }) {
  const quiet = ["Resolved", "Cancelled"].includes(request.status);
  return (
    <article
      className={`maintenance-card rounded-2xl border border-transparent p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-white/70 backdrop-blur-xl ${quiet ? "bg-white/55" : "bg-white/70"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-bricolage truncate text-lg font-medium">
            {request.title}
          </h2>
          <p className="text-carbon-500 mt-1 truncate text-sm">
            {request.property}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {request.urgency === "Urgent" ? (
            <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-medium text-white">
              Urgent
            </span>
          ) : null}
          <Status status={request.status} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-3 text-sm">
        <Meta label="Category" value={request.category} />
        <Meta
          label={request.completed ? "Completed" : "Submitted"}
          value={request.completed ?? request.submitted}
        />
      </div>
      <div className="mt-3 rounded-xl bg-black/[0.07] p-3 text-black">
        <p className="text-xs font-medium text-black/50">Latest update</p>
        <p className="mt-1 text-sm">{request.latestUpdate}</p>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {!quiet ? (
          <Link
            href={`/renter-dashboard/messages?host=${encodeURIComponent(request.scheduledVisit?.contact ?? "Jean Mugisha")}&role=${encodeURIComponent(request.scheduledVisit?.role ?? "Property Manager")}&verified=${request.scheduledVisit ? "0" : "1"}&ctx=maintenance&title=${encodeURIComponent(request.title)}&property=${encodeURIComponent(request.property)}&propertyId=${encodeURIComponent(request.propertyId)}&status=${encodeURIComponent(request.status)}&refId=${encodeURIComponent(request.id)}${request.scheduledVisit ? `&detail=${encodeURIComponent(`${request.scheduledVisit.date} · ${request.scheduledVisit.time}`)}` : ""}`}
            className="inline-flex h-9 items-center rounded-full border border-black/15 px-3.5 text-sm"
          >
            Message
          </Link>
        ) : null}
        <Link
          href={`/renter-dashboard/maintenance/${request.id}`}
          className="inline-flex h-9 items-center rounded-full bg-black px-4 text-sm font-medium text-white"
        >
          {quiet ? "View Details" : "View"}
        </Link>
      </div>
    </article>
  );
}

function ReportIssueDialog({
  close,
  submit,
  showToast,
}: {
  close: () => void;
  submit: (request: MaintenanceRequest) => void;
  showToast: (message: string) => void;
}) {
  const [step, setStep] = useState<ReportStep>("form");
  const [rentalId, setRentalId] = useState(ACTIVE_RENTALS[0].id);
  const [category, setCategory] = useState("Plumbing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("Kitchen");
  const [urgency, setUrgency] = useState<"Normal" | "Urgent">("Normal");
  const [access, setAccess] = useState("Contact me first");
  const [availability, setAvailability] = useState("Morning");
  const [contact, setContact] = useState("HauxHunt Messages");
  const [photos, setPhotos] = useState<string[]>([]);
  const rental = ACTIVE_RENTALS.find((item) => item.id === rentalId)!;
  const ready = title.trim() && description.trim();
  const requestId = "HH-MNT-1054";

  function submitRequest() {
    submit({
      id: requestId,
      title: title.trim(),
      property: rental.title,
      propertyId: rental.propertyId,
      location: rental.location,
      category,
      area,
      urgency,
      status: "Submitted",
      submitted: "16 August 2026",
      description: description.trim(),
      latestUpdate: "Request received by the property manager",
      reportedBy: "You",
      managedBy: null,
    });
    setStep("success");
    showToast("Maintenance request submitted");
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-maintenance-title"
        className="max-h-[92svh] w-full max-w-3xl overflow-y-auto bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs text-black/45">
              {step === "form"
                ? "Issue details"
                : step === "review"
                  ? "Review"
                  : "Submitted"}
            </p>
            <h2
              id="report-maintenance-title"
              className="font-bricolage mt-1 text-2xl font-medium"
            >
              {step === "success"
                ? "Maintenance Request Submitted"
                : "Report a Maintenance Issue"}
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Close dialog"
            className="flex size-9 items-center justify-center rounded-full hover:bg-black/[0.05]"
          >
            <X className="size-4" />
          </button>
        </header>

        {step === "success" ? (
          <div className="p-6 text-center sm:p-10">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-black text-white">
              <Check className="size-6" />
            </span>
            <p className="text-carbon-500 mt-5">
              Your request has been sent to the property manager.
            </p>
            <h3 className="font-bricolage mt-5 text-2xl font-medium">
              {title}
            </h3>
            <p className="text-carbon-500 mt-1 text-sm">{rental.title}</p>
            <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-4 rounded-2xl bg-black/[0.035] p-5 text-left">
              <Meta label="Request ID" value={requestId} />
              <Meta label="Status" value="Submitted" />
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                onClick={close}
                className="h-11 rounded-full border border-black/15 px-5 text-sm"
              >
                Back to Maintenance
              </button>
              <Link
                href={`/renter-dashboard/maintenance/${requestId}`}
                className="inline-flex h-11 items-center rounded-full bg-black px-6 text-sm text-white"
              >
                View Request
              </Link>
            </div>
          </div>
        ) : step === "review" ? (
          <div className="p-6 sm:p-8">
            <div className="grid gap-5 rounded-2xl bg-black/[0.03] p-6 sm:grid-cols-2">
              <Meta label="Property" value={rental.title} />
              <Meta label="Category" value={category} />
              <Meta label="Issue" value={title} />
              <Meta label="Urgency" value={urgency} />
              <Meta label="Photos" value={`${photos.length} attached`} />
              <Meta label="Property access" value={access} />
              <Meta label="Preferred visit" value={availability} />
              <Meta label="Contact" value={contact} />
            </div>
            <p className="text-carbon-500 mt-6 text-sm leading-6">
              {description}
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="h-11 rounded-full border border-black/15 px-5 text-sm"
              >
                Back
              </button>
              <button
                onClick={submitRequest}
                className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white"
              >
                Submit Request
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-7 p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                label="Rental"
                value={rentalId}
                onChange={setRentalId}
                options={ACTIVE_RENTALS.map((item) => ({
                  value: item.id,
                  label: `${item.title} · ${item.location}`,
                }))}
              />
              <Select
                label="Issue Category"
                value={category}
                onChange={setCategory}
                options={ISSUE_CATEGORIES.map((item) => ({
                  value: item,
                  label: item,
                }))}
              />
              <Field
                label="Issue Title"
                value={title}
                onChange={setTitle}
                placeholder="Leaking kitchen tap"
              />
              <Select
                label="Where is the issue?"
                value={area}
                onChange={setArea}
                options={PROPERTY_AREAS.map((item) => ({
                  value: item,
                  label: item,
                }))}
              />
            </div>
            <label>
              <span className="mb-2 block text-sm font-medium">
                Describe the problem
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="The kitchen tap has been leaking continuously since yesterday..."
                rows={4}
                className="w-full resize-none rounded-xl bg-black/[0.035] p-4 text-sm outline-none"
              />
            </label>
            <ChoiceSection
              title="Urgency"
              value={urgency}
              setValue={(value) => setUrgency(value as "Normal" | "Urgent")}
              options={["Normal", "Urgent"]}
            />
            {urgency === "Urgent" ? (
              <p className="rounded-xl bg-black/[0.04] p-4 text-xs leading-5">
                For immediate danger, contact local emergency services or your
                property manager directly. HauxHunt does not provide emergency
                response.
              </p>
            ) : null}
            <div>
              <p className="text-sm font-medium">Add Photos</p>
              <p className="text-carbon-500 mt-1 text-xs">
                Photos can help the property manager understand the issue
                faster.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {photos.map((photo) => (
                  <span
                    key={photo}
                    className="relative size-20 overflow-hidden rounded-xl"
                  >
                    <Image
                      src={photo}
                      alt="Issue preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(photo);
                        setPhotos((items) =>
                          items.filter((item) => item !== photo),
                        );
                      }}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black text-white"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <label className="flex size-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-black/25 text-xs">
                  <Camera className="mb-2 size-5" />
                  Add
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) =>
                      setPhotos((items) => [
                        ...items,
                        ...Array.from(event.target.files ?? []).map((file) =>
                          URL.createObjectURL(file),
                        ),
                      ])
                    }
                  />
                </label>
              </div>
            </div>
            <ChoiceSection
              title="Can someone enter if you're not home?"
              value={access}
              setValue={setAccess}
              options={["Yes", "No", "Contact me first"]}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <ChoiceSection
                title="Preferred Visit Time"
                value={availability}
                setValue={setAvailability}
                options={["Morning", "Afternoon", "Evening"]}
              />
              <ChoiceSection
                title="Preferred contact method"
                value={contact}
                setValue={setContact}
                options={["HauxHunt Messages", "Phone", "Email"]}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={close}
                className="h-11 rounded-full border border-black/15 px-5 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={!ready}
                onClick={() => setStep("review")}
                className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white disabled:opacity-30"
              >
                Review Request
              </button>
            </div>
          </div>
        )}
      </section>
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
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-black/45">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="contact-field-control h-11 w-full rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border-0 bg-black/[0.035] px-4 pr-10 text-sm outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="text-carbon-500 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2" />
      </span>
    </label>
  );
}
function ChoiceSection({
  title,
  value,
  setValue,
  options,
}: {
  title: string;
  value: string;
  setValue: (value: string) => void;
  options: string[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{title}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setValue(option)}
            className={`h-10 rounded-full px-4 text-sm ${value === option ? "bg-black text-white" : "bg-black/[0.045]"}`}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function MaintenanceEmptyState({ onReport }: { onReport: () => void }) {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
      <Image src={maintenanceIllustration} alt="" className="h-36 w-auto" />
      <h2 className="font-bricolage mt-6 text-2xl font-medium">
        Get Maintenance Help Fast
      </h2>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-6 text-left">
        <div className="flex items-start gap-4">
          <ClipboardX className="mt-0.5 size-6 shrink-0 text-black" />
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Create and Send Repair Requests
            </p>
            <p className="text-carbon-500 mt-0.5 text-sm">
              Send your landlord requests for maintenance as soon as issues
              arise.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <MessageSquare className="mt-0.5 size-6 shrink-0 text-black" />
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Clear Communication
            </p>
            <p className="text-carbon-500 mt-0.5 text-sm">
              Get quick feedback on maintenance requests without having to play
              the waiting game.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <ClipboardList className="mt-0.5 size-6 shrink-0 text-black" />
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Track Progress
            </p>
            <p className="text-carbon-500 mt-0.5 text-sm">
              Get updates about your repair progress from start to finish.
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={onReport}
        className="mt-10 inline-flex h-11 items-center rounded-full bg-black px-8 text-sm font-medium text-white"
      >
        Start a Request
      </button>
    </div>
  );
}

function EmptyState({
  title,
  description,
  primary,
  secondary,
}: {
  title: string;
  description: string;
  primary: { label: string; href?: string; action?: () => void };
  secondary: { label: string; href: string };
}) {
  const primaryClass =
    "inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white";
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
      <Image src={emptyIllustration} alt="" className="h-44 w-auto" />
      <h2 className="font-bricolage mt-6 text-2xl font-medium">{title}</h2>
      <p className="text-carbon-500 mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {primary.href ? (
          <Link href={primary.href} className={primaryClass}>
            {primary.label}
          </Link>
        ) : (
          <button onClick={primary.action} className={primaryClass}>
            {primary.label}
          </button>
        )}
        <Link
          href={secondary.href}
          className="inline-flex h-11 items-center rounded-full border border-black/15 px-5 text-sm"
        >
          {secondary.label}
        </Link>
      </div>
    </div>
  );
}
