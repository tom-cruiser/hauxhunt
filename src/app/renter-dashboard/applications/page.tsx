"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  ChevronDown,
  MoreHorizontal,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Suspense } from "react";

import house1 from "@/assets/images/house1.jpg";
import house2 from "@/assets/images/house2.jpg";
import house3 from "@/assets/images/house3.jpg";
import house4 from "@/assets/images/house4.jpg";
import house5 from "@/assets/images/house5.jpg";
import house6 from "@/assets/images/house6.jpeg";
import cancelIllustration from "@/assets/images/cancel.png";
import deletingIllustration from "@/assets/images/deleting.png";
import emptyIllustration from "@/assets/images/empty.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import {
  RENTER_APPLICATIONS,
  type ApplicationStatus,
  type RenterApplication,
} from "@/data/renter-applications";
import { getOwnerApplications, subscribeToOwnerApplications, type OwnerApplication } from "@/lib/owner-data";

// Cross-Role Lifecycle Synchronization phase -- Section 8: renter-side
// application statuses now reflect the SAME shared Application Agent/PM/
// Owner see, for every application that has a real owner-data.ts
// counterpart (matched by id -- HH-APP-0241 etc. already share ids by
// convention). Drafts and renter-only historical entries with no shared
// counterpart are left exactly as they were; nothing here rebuilds the
// existing drafts/withdraw/delete UX.
function messageForSharedStatus(status: OwnerApplication["status"]): string {
  switch (status) {
    case "Submitted":
      return "Your application has been received.";
    case "Under Review":
      return "Your application is currently being reviewed.";
    case "Action Required":
      return "Additional information is needed to continue your application.";
    case "Decision Pending":
      return "Your review is complete. A decision is pending.";
    case "Approved":
      return "Congratulations — your application has been approved.";
    case "Not Selected":
      return "This application was not selected for this property.";
    default:
      return "";
  }
}

function withSharedStatus(base: RenterApplication[]): RenterApplication[] {
  const shared = getOwnerApplications();
  return base.map((item) => {
    // "Withdrawn" and "Draft" are renter-only states with no shared
    // Application equivalent -- never overwritten back from the shared
    // source once set locally.
    if (item.status === "Withdrawn" || item.status === "Draft") return item;
    const match = shared.find((a) => a.id === item.id);
    if (!match) return item;
    return {
      ...item,
      status: match.status,
      representative: match.handledBy,
      role: `Verified ${match.handledByRole}`,
      message: messageForSharedStatus(match.status),
    };
  });
}

type Tab = "active" | "drafts" | "past";
type StatusFilter = "all" | ApplicationStatus;
const STATUS_OPTIONS: StatusFilter[] = [
  "all",
  "Draft",
  "Submitted",
  "Under Review",
  "Action Required",
  "Decision Pending",
  "Approved",
  "Not Selected",
  "Withdrawn",
];
const IMAGES: Record<string, StaticImageData> = {
  "kacyiru-2br": house1,
  "nyarutarama-2br": house2,
  "remera-3br": house3,
  "kibagabaga-modern-family-home": house4,
  "nyarutarama-garden-penthouse": house5,
  "gisenyi-lakefront-residence": house6,
};
const tabFor = (status: RenterApplication["status"]): Tab =>
  status === "Draft"
    ? "drafts"
    : ["Not Selected", "Withdrawn"].includes(status)
      ? "past"
      : "active";

export default function ApplicationsPage() {
  return (
    <Suspense>
      <ApplicationsPageInner />
    </Suspense>
  );
}

function ApplicationsPageInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(() =>
    params.get("tab") === "drafts" ? "drafts" : "active",
  );
  const [applications, setApplications] = useState(() => withSharedStatus(RENTER_APPLICATIONS));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [propertySearch, setPropertySearch] = useState("");
  const [confirm, setConfirm] = useState<{
    type: "withdraw" | "delete";
    application: RenterApplication;
  } | null>(null);
  useEffect(() => subscribeToOwnerApplications(() => setApplications((current) => withSharedStatus(current))), []);
  useEffect(() => {
    const savedDrafts: RenterApplication[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith("hauxhunt-application-")) continue;
      try {
        const draft = JSON.parse(localStorage.getItem(key) ?? "") as {
          propertyId?: string;
          title?: string;
          location?: string;
          step?: number;
          savedAt?: string;
        };
        if (!draft.propertyId || !draft.title || !draft.location) continue;
        savedDrafts.push({
          id: `LOCAL-DRAFT-${draft.propertyId}`,
          propertyId: draft.propertyId,
          title: draft.title,
          location: draft.location,
          status: "Draft",
          date: `Saved ${draft.savedAt ? new Date(draft.savedAt).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" }) : "recently"}`,
          representative: "Property representative",
          role: "Application recipient",
          progress: Math.round((((draft.step ?? 0) + 1) / 7) * 100),
          message: "Continue where you left off.",
        });
      } catch {
        continue;
      }
    }
    if (!savedDrafts.length) return;
    const loadDrafts = window.setTimeout(() => {
      setApplications((current) => [
        ...current.filter(
          (item) =>
            item.status !== "Draft" ||
            !savedDrafts.some((draft) => draft.propertyId === item.propertyId),
        ),
        ...savedDrafts,
      ]);
    }, 0);
    return () => window.clearTimeout(loadDrafts);
  }, []);
  const normalizedSearch = propertySearch.trim().toLocaleLowerCase();
  const filtersActive = statusFilter !== "all" || normalizedSearch.length > 0;
  const shown = applications.filter(
    (item) =>
      (filtersActive || tabFor(item.status) === tab) &&
      (statusFilter === "all" || item.status === statusFilter) &&
      (!normalizedSearch ||
        item.title.toLocaleLowerCase().includes(normalizedSearch)),
  );
  const counts = {
    active: applications.filter((item) => tabFor(item.status) === "active")
      .length,
    drafts: applications.filter((item) => tabFor(item.status) === "drafts")
      .length,
    past: applications.filter((item) => tabFor(item.status) === "past").length,
  };

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <section className="bg-carbon-50 px-5 pt-9 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            <h1 className="dashboard-page-title">Applications</h1>
            <p className="text-carbon-500 mt-3 text-sm">
              Track your rental applications and see what needs your attention.
            </p>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <div className="flex gap-7">
                {(["active", "drafts", "past"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setTab(item);
                      setStatusFilter("all");
                      setPropertySearch("");
                    }}
                    className={`relative flex h-12 items-center gap-2 text-sm font-medium capitalize ${tab === item ? "text-black" : "text-black/45"}`}
                  >
                    {item}
                    <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs">
                      {counts[item]}
                    </span>
                    {tab === item ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="flex w-full gap-3 pb-2 md:w-auto">
                <label className="catalogue-location-filter flex min-w-0 flex-1 items-center gap-2 px-4 md:w-72 md:flex-none">
                  <span className="sr-only">Search by property name</span>
                  <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
                  <input
                    type="search"
                    value={propertySearch}
                    onChange={(event) => setPropertySearch(event.target.value)}
                    placeholder="Search by property name"
                    className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                  <VoiceInputButton onTranscript={setPropertySearch} />
                </label>
                <label className="relative block w-44 sm:w-52">
                  <span className="sr-only">Filter by application status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      const status = event.target.value as StatusFilter;
                      setStatusFilter(status);
                      if (status !== "all") setTab(tabFor(status));
                    }}
                    className="h-11 w-full appearance-none rounded-full border-0 bg-white pr-10 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status === "all" ? "All statuses" : status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="text-carbon-500 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
        <section className="px-5 py-10 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            {shown.length ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {shown.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onDelete={() => setConfirm({ type: "delete", application })}
                    onWithdraw={() =>
                      setConfirm({ type: "withdraw", application })
                    }
                  />
                ))}
              </div>
            ) : filtersActive ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <Image src={emptyIllustration} alt="" className="h-40 w-auto" />
                <h2 className="font-bricolage mt-5 text-2xl font-medium">
                  No matching applications
                </h2>
                <p className="text-carbon-500 mt-2 text-sm">
                  Try another property name or application status.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPropertySearch("");
                    setStatusFilter("all");
                  }}
                  className="mt-6 rounded-full border border-black/15 px-5 py-3 text-sm font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <Empty tab={tab} />
            )}
          </div>
        </section>
      </main>
      {confirm ? (
        <ConfirmDialog
          state={confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === "delete")
              localStorage.removeItem(
                `hauxhunt-application-${confirm.application.propertyId}`,
              );
            if (confirm.type === "delete")
              setApplications((items) =>
                items.filter((item) => item.id !== confirm.application.id),
              );
            else
              setApplications((items) =>
                items.map((item) =>
                  item.id === confirm.application.id
                    ? {
                        ...item,
                        status: "Withdrawn" as const,
                        message: "You withdrew this application.",
                      }
                    : item,
                ),
              );
            setConfirm(null);
          }}
        />
      ) : null}
    </>
  );
}

function ApplicationCard({
  application,
  onDelete,
  onWithdraw,
}: {
  application: RenterApplication;
  onDelete: () => void;
  onWithdraw: () => void;
}) {
  const primary =
    application.status === "Draft"
      ? "Continue Application"
      : application.status === "Action Required"
        ? "Complete Request"
        : application.status === "Approved"
          ? "Start Rental Setup"
          : application.status === "Not Selected"
            ? "View Similar Homes"
            : "View Application";
  const primaryHref =
    application.status === "Draft"
      ? `/renter-dashboard/applications/new?property=${application.propertyId}&draft=${application.id}`
      : application.status === "Not Selected"
        ? "/renter-dashboard/properties"
        : application.status === "Approved"
          ? `/renter-dashboard/rental-setup/${application.id}`
          : `/renter-dashboard/applications/${application.id}`;
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white/70 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-white/70 backdrop-blur-xl sm:grid sm:grid-cols-[190px_1fr] ${application.status === "Action Required" ? "border-black/30" : "border-white/80"}`}
    >
      <Image
        src={IMAGES[application.propertyId] ?? house1}
        alt={application.title}
        className="h-44 w-full object-cover sm:h-full"
      />
      <div className="flex min-w-0 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-carbon-500 text-sm">{application.location}</p>
            <h2 className="font-bricolage mt-1 text-xl font-medium">
              {application.title}
            </h2>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${application.status === "Action Required" ? "bg-black text-white" : "bg-black/[0.06]"}`}
          >
            {application.status}
          </span>
        </div>
        <p className="text-carbon-500 mt-2 text-xs">{application.date}</p>
        <p className="mt-4 text-sm">{application.message}</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs">
            <span>
              {application.status === "Draft"
                ? `${application.progress}% complete`
                : "Application progress"}
            </span>
            <span>{application.progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-black"
              style={{ width: `${application.progress}%` }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-black/55">
          <BadgeCheck className="size-4" />
          {application.representative} · {application.role}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          <Link
            href={primaryHref}
            className="inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white"
          >
            {primary}
          </Link>
          <Link
            href={`/renter-dashboard/messages?host=${encodeURIComponent(application.representative)}&role=${encodeURIComponent(application.role.replace(/^Verified /, ""))}&verified=${application.role.startsWith("Verified") ? "1" : "0"}&ctx=application&property=${encodeURIComponent(application.title)}&propertyId=${encodeURIComponent(application.propertyId)}&status=${encodeURIComponent(application.status)}&refId=${encodeURIComponent(application.id)}`}
            className="inline-flex h-10 items-center rounded-full border border-black/15 px-4 text-sm"
          >
            Message
          </Link>
          <Link
            href={`/properties/${application.propertyId}?from=renter`}
            className="inline-flex h-10 items-center px-2 text-sm"
          >
            View Listing
          </Link>
          {application.status === "Draft" ? (
            <button
              onClick={onDelete}
              aria-label="Delete draft"
              className="ml-auto flex size-9 items-center justify-center text-red-600"
            >
              <Trash2 className="size-4" />
            </button>
          ) : tabFor(application.status) === "active" ? (
            <button
              onClick={onWithdraw}
              aria-label="Withdraw application"
              className="ml-auto flex size-9 items-center justify-center"
            >
              <MoreHorizontal className="size-5" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Empty({ tab }: { tab: Tab }) {
  const copy =
    tab === "active"
      ? [
          "Nothing under review right now",
          "Applications you're actively tracking will appear here.",
        ]
      : tab === "drafts"
        ? [
            "No application drafts",
            "Applications you start and save for later will appear here.",
          ]
        : [
            "No past applications",
            "Completed, withdrawn, or unsuccessful applications will appear here.",
          ];
  return (
    <div className="flex min-h-[450px] flex-col items-center justify-center text-center">
      <Image src={emptyIllustration} alt="" className="h-40 w-auto" />
      <h2 className="font-bricolage mt-5 text-2xl font-medium">{copy[0]}</h2>
      <p className="text-carbon-500 mt-2 text-sm">{copy[1]}</p>
      <Link
        href="/renter-dashboard/properties"
        className="mt-6 rounded-full bg-black px-5 py-3 text-sm text-white"
      >
        Browse Listings
      </Link>
    </div>
  );
}
function ConfirmDialog({
  state,
  onClose,
  onConfirm,
}: {
  state: { type: "withdraw" | "delete"; application: RenterApplication };
  onClose: () => void;
  onConfirm: () => void;
}) {
  const withdraw = state.type === "withdraw";
  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/30 p-5"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-lg overflow-hidden bg-white shadow-2xl"
      >
        <div className="relative flex min-h-44 items-center justify-center bg-black/[0.05] p-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 hover:border-black/40 hover:text-black"
          >
            <X className="size-5" />
          </button>
          <Image
            src={withdraw ? cancelIllustration : deletingIllustration}
            alt={
              withdraw
                ? "Withdraw application illustration"
                : "Delete draft illustration"
            }
            className="h-36 w-auto object-contain"
          />
        </div>
        <div className="px-7 pt-7">
          <h2 className="font-bricolage text-2xl font-medium">
            {withdraw ? "Withdraw application?" : "Delete draft?"}
          </h2>
        </div>
        <p className="text-carbon-500 mt-4 px-7 text-sm leading-6">
          {withdraw
            ? `Your application for ${state.application.title} will no longer be considered.`
            : "Your progress on this application will be removed."}
        </p>
        <div className="mt-7 flex justify-end gap-3 px-7 pb-7">
          <button
            onClick={onClose}
            className="h-11 rounded-full border border-black/15 px-5 text-sm"
          >
            {withdraw ? "Keep Application" : "Keep Draft"}
          </button>
          <button
            onClick={onConfirm}
            className="h-11 rounded-full bg-red-600 px-6 text-sm font-medium text-white"
          >
            {withdraw ? "Withdraw" : "Delete Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
