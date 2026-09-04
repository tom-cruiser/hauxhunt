"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPinned,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import house1 from "@/assets/images/house1.jpg";
import house2 from "@/assets/images/house2.jpg";
import house3 from "@/assets/images/house3.jpg";
import house4 from "@/assets/images/house4.jpg";
import house5 from "@/assets/images/house5.jpg";
import house6 from "@/assets/images/house6.jpeg";
import emptyIllustration from "@/assets/images/empty.png";
import julienProfile from "@/assets/images/julien.jpg";
import alineProfile from "@/assets/images/flatmate-aline.png";
import sarahProfile from "@/assets/images/flatmate-grace.png";
import scheduleIllustration from "@/assets/images/schedule.png";
import cancelIllustration from "@/assets/images/cancel.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import { useViewingRequests } from "@/hooks/use-viewing-requests";
import { useTranslation } from "@/components/language/use-translation";

type Tab = "upcoming" | "pending" | "past";
type ViewingStatus =
  | "Confirmed"
  | "Awaiting Confirmation"
  | "New Time Suggested"
  | "Reschedule Requested"
  | "Completed"
  | "Cancelled"
  | "Viewing unavailable"
  | "Not interested";
type Viewing = {
  id: string;
  propertyId: string;
  /** Literal display text — always present. Real (non-mock) viewings built
   * from a saved request only ever have this, since their title comes from
   * the property the renter actually requested. */
  title: string;
  /** Present on the seeded demo viewings only: a dictionary key that takes
   * priority over `title` for display, so demo copy is translatable while
   * `title` still carries the plain-English fallback used for search
   * matching and outgoing links. */
  titleKey?: string;
  location: string;
  date: string;
  time: string;
  status: ViewingStatus;
  tab: Tab;
  host: string;
  roleKey: string;
  image: StaticImageData;
  suggestedTime?: string;
  cancelledBy?: string;
  note?: string;
  noteKey?: string;
};
type StatusFilter = "all" | ViewingStatus;
const STATUS_OPTIONS: StatusFilter[] = [
  "all",
  "Confirmed",
  "Awaiting Confirmation",
  "New Time Suggested",
  "Reschedule Requested",
  "Completed",
  "Cancelled",
  "Viewing unavailable",
  "Not interested",
];
// Internal status/tab values stay in English (compared with `===`, used to
// filter, and passed as URL params) — these maps resolve each one to its
// translated display label instead of deriving it by parsing the value.
const STATUS_LABEL_KEYS: Record<ViewingStatus, string> = {
  Confirmed: "renterDashboard.visits.status.confirmed",
  "Awaiting Confirmation": "renterDashboard.visits.status.awaitingConfirmation",
  "New Time Suggested": "renterDashboard.visits.status.newTimeSuggested",
  "Reschedule Requested": "renterDashboard.visits.status.rescheduleRequested",
  Completed: "renterDashboard.visits.status.completed",
  Cancelled: "renterDashboard.visits.status.cancelled",
  "Viewing unavailable": "renterDashboard.visits.status.viewingUnavailable",
  "Not interested": "renterDashboard.visits.status.notInterested",
};
const TAB_LABEL_KEYS: Record<Tab, string> = {
  upcoming: "renterDashboard.visits.tabs.upcoming",
  pending: "renterDashboard.visits.tabs.pending",
  past: "renterDashboard.visits.tabs.past",
};
const ROLES = {
  propertyManager: "renterDashboard.visits.roles.propertyManager",
  verifiedAgent: "renterDashboard.visits.roles.verifiedAgent",
  agent: "renterDashboard.visits.roles.agent",
};
/** Resolves a viewing's title for display: the seeded demo viewings carry a
 * `titleKey` that wins, real viewings fall back to their plain-text title. */
function viewingTitle(viewing: Viewing, t: (key: string) => string) {
  return viewing.titleKey ? t(viewing.titleKey) : viewing.title;
}
const tabForStatus = (status: ViewingStatus): Tab =>
  status === "Confirmed"
    ? "upcoming"
    : [
          "Awaiting Confirmation",
          "New Time Suggested",
          "Reschedule Requested",
        ].includes(status)
      ? "pending"
      : "past";

const INITIAL_VIEWINGS: Viewing[] = [
  {
    id: "confirmed-kacyiru",
    propertyId: "kacyiru-2br",
    title: "Kacyiru Residence",
    titleKey: "renterDashboard.visits.listings.kacyiruResidence",
    location: "Kacyiru, Kigali",
    date: "Saturday, 22 August",
    time: "10:30 AM",
    status: "Confirmed",
    tab: "upcoming",
    host: "Jean Mugisha",
    roleKey: ROLES.propertyManager,
    image: house1,
    note: "Ask about parking and whether utilities are included.",
    noteKey: "renterDashboard.visits.notes.parkingUtilities",
  },
  {
    id: "confirmed-nyarutarama",
    propertyId: "nyarutarama-2br",
    title: "Nyarutarama Garden Apartment",
    titleKey: "renterDashboard.visits.listings.nyarutaramaGardenApartment",
    location: "Nyarutarama, Kigali",
    date: "Wednesday, 26 August",
    time: "3:30 PM",
    status: "Confirmed",
    tab: "upcoming",
    host: "Aline Uwase",
    roleKey: ROLES.verifiedAgent,
    image: house2,
  },
  {
    id: "pending-kimihurura",
    propertyId: "remera-3br",
    title: "Modern Apartment in Kimihurura",
    titleKey: "renterDashboard.visits.listings.modernApartmentKimihurura",
    location: "Kimihurura, Kigali",
    date: "Monday, 24 August",
    time: "2:00 PM",
    status: "Awaiting Confirmation",
    tab: "pending",
    host: "Sarah Uwase",
    roleKey: ROLES.verifiedAgent,
    image: house3,
  },
  {
    id: "suggested-kacyiru",
    propertyId: "kibagabaga-modern-family-home",
    title: "Kacyiru Heights",
    titleKey: "renterDashboard.visits.listings.kacyiruHeights",
    location: "Kacyiru, Kigali",
    date: "Tuesday, 25 August",
    time: "11:00 AM",
    suggestedTime: "2:30 PM",
    status: "New Time Suggested",
    tab: "pending",
    host: "Jean Mugisha",
    roleKey: ROLES.propertyManager,
    image: house4,
  },
  {
    id: "completed-kibagabaga",
    propertyId: "kibagabaga-modern-family-home",
    title: "Kibagabaga Apartment",
    titleKey: "renterDashboard.visits.listings.kibagabagaApartment",
    location: "Kibagabaga, Kigali",
    date: "12 August 2026",
    time: "11:00 AM",
    status: "Completed",
    tab: "past",
    host: "Julien Mugisha",
    roleKey: ROLES.propertyManager,
    image: house5,
  },
  {
    id: "cancelled-nyarutarama",
    propertyId: "nyarutarama-garden-penthouse",
    title: "Nyarutarama Family Home",
    titleKey: "renterDashboard.visits.listings.nyarutaramaFamilyHome",
    location: "Nyarutarama, Kigali",
    date: "9 August 2026",
    time: "3:00 PM",
    status: "Cancelled",
    tab: "past",
    host: "Aline Uwase",
    roleKey: ROLES.agent,
    image: house6,
    cancelledBy: "Cancelled by you",
  },
  {
    id: "declined-kimihurura",
    propertyId: "remera-3br",
    title: "Kimihurura Loft",
    titleKey: "renterDashboard.visits.listings.kimihururaLoft",
    location: "Kimihurura, Kigali",
    date: "7 August 2026",
    time: "1:00 PM",
    status: "Viewing unavailable",
    tab: "past",
    host: "Sarah Uwase",
    roleKey: ROLES.agent,
    image: house3,
  },
];

type Dialog = {
  type: "details" | "reschedule" | "cancel" | "not-interested";
  viewing: Viewing;
} | null;

export default function MyViewingsPage() {
  const { t } = useTranslation();
  const requests = useViewingRequests();
  const requestedViewings = useMemo<Viewing[]>(
    () =>
      requests.map((request) => ({
        ...request,
        status: "Awaiting Confirmation",
        tab: "pending",
        host: "Julien Mugisha",
        roleKey: ROLES.propertyManager,
        image: house1,
      })),
    [requests],
  );
  const [viewings, setViewings] = useState(INITIAL_VIEWINGS);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [propertySearch, setPropertySearch] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const allViewings = [...requestedViewings, ...viewings];

  useEffect(() => {
    const openId = new URLSearchParams(window.location.search).get("open");
    if (!openId) return;
    const target = INITIAL_VIEWINGS.find((v) => v.id === openId);
    if (target) setDialog({ type: "details", viewing: target });
  }, []);
  const normalizedSearch = propertySearch.trim().toLocaleLowerCase();
  const filtersActive = statusFilter !== "all" || normalizedSearch.length > 0;
  const shown = allViewings.filter(
    (viewing) =>
      (filtersActive || viewing.tab === tab) &&
      (statusFilter === "all" || viewing.status === statusFilter) &&
      (!normalizedSearch ||
        viewingTitle(viewing, t).toLocaleLowerCase().includes(normalizedSearch)),
  );
  const counts = {
    upcoming: allViewings.filter((item) => item.tab === "upcoming").length,
    pending: allViewings.filter((item) => item.tab === "pending").length,
    past: allViewings.filter((item) => item.tab === "past").length,
  };

  function updateViewing(id: string, updates: Partial<Viewing>) {
    setViewings((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <section className="bg-carbon-50 px-5 pt-9 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            <h1 className="dashboard-page-title">{t("renterDashboard.visits.heading")}</h1>
            <p className="text-carbon-500 mt-3 max-w-2xl text-sm leading-6">
              {t("renterDashboard.visits.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <div className="flex gap-7 overflow-x-auto">
                {(["upcoming", "pending", "past"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setTab(item);
                      setStatusFilter("all");
                      setPropertySearch("");
                    }}
                    className={`relative flex h-12 items-center gap-2 text-sm font-medium capitalize ${tab === item ? "text-black" : "text-black/45"}`}
                  >
                    {t(TAB_LABEL_KEYS[item])}
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
                  <span className="sr-only">{t("renterDashboard.visits.searchByPropertyName")}</span>
                  <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
                  <input
                    type="search"
                    value={propertySearch}
                    onChange={(event) => setPropertySearch(event.target.value)}
                    placeholder={t("renterDashboard.visits.searchByPropertyName")}
                    className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                  <VoiceInputButton onTranscript={setPropertySearch} />
                </label>
                <label className="relative block w-44 sm:w-56">
                  <span className="sr-only">{t("renterDashboard.visits.statusFilterAria")}</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      const status = event.target.value as StatusFilter;
                      setStatusFilter(status);
                      if (status !== "all") setTab(tabForStatus(status));
                    }}
                    className="h-11 w-full appearance-none rounded-full border-0 bg-white pr-10 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status === "all"
                          ? t("renterDashboard.visits.allStatuses")
                          : t(STATUS_LABEL_KEYS[status])}
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
        <section className="px-5 pt-5 pb-9 sm:px-6 lg:px-11 lg:pb-12 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            {shown.length ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {shown.map((viewing) => (
                  <ViewingCard
                    key={viewing.id}
                    viewing={viewing}
                    onDetails={() => setDialog({ type: "details", viewing })}
                    onReschedule={() =>
                      setDialog({ type: "reschedule", viewing })
                    }
                    onCancel={() => setDialog({ type: "cancel", viewing })}
                    onNotInterested={() =>
                      setDialog({ type: "not-interested", viewing })
                    }
                    onAccept={() =>
                      updateViewing(viewing.id, {
                        status: "Confirmed",
                        tab: "upcoming",
                        time: viewing.suggestedTime ?? viewing.time,
                      })
                    }
                  />
                ))}
              </div>
            ) : filtersActive ? (
              <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
                <Image
                  src={emptyIllustration}
                  alt=""
                  className="h-40 w-auto object-contain"
                />
                <h2 className="font-bricolage mt-5 text-2xl font-medium">
                  {t("renterDashboard.visits.noMatching.title")}
                </h2>
                <p className="text-carbon-500 mt-2 text-sm">
                  {t("renterDashboard.visits.noMatching.description")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPropertySearch("");
                    setStatusFilter("all");
                  }}
                  className="mt-6 rounded-full border border-black/15 px-5 py-3 text-sm font-medium"
                >
                  {t("renterDashboard.visits.noMatching.clearFilters")}
                </button>
              </div>
            ) : (
              <EmptyState tab={tab} />
            )}
          </div>
        </section>
      </main>
      {dialog ? (
        <ViewingDialog
          dialog={dialog}
          onClose={() => setDialog(null)}
          onUpdate={(updates) => {
            updateViewing(dialog.viewing.id, updates);
            setDialog(null);
          }}
        />
      ) : null}
    </>
  );
}

function ViewingCard({
  viewing,
  onDetails,
  onReschedule,
  onCancel,
  onNotInterested,
  onAccept,
}: {
  viewing: Viewing;
  onDetails: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onNotInterested: () => void;
  onAccept: () => void;
}) {
  const { t } = useTranslation();
  const displayTitle = viewingTitle(viewing, t);
  const messageHref = `/renter-dashboard/messages?host=${encodeURIComponent(viewing.host)}&role=Property%20Manager&ctx=viewing&property=${encodeURIComponent(displayTitle)}&propertyId=${encodeURIComponent(viewing.propertyId)}&status=${encodeURIComponent(viewing.status)}&detail=${encodeURIComponent(`${viewing.date} · ${viewing.time}`)}&refId=${encodeURIComponent(viewing.id)}`;
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/70 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-white/70 backdrop-blur-xl sm:grid sm:grid-cols-[210px_1fr]">
      <Image
        src={viewing.image}
        alt={displayTitle}
        className="h-40 w-full object-cover sm:h-full"
      />
      <div className="flex min-w-0 flex-col p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:pr-40">
          <div>
            <p className="text-carbon-500 text-sm">{viewing.location}</p>
            <h2 className="font-bricolage mt-1 text-2xl font-medium tracking-[-0.03em]">
              {displayTitle}
            </h2>
          </div>
          <Status label={viewing.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="size-4" />
            {viewing.date}
          </p>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clock3 className="size-4" />
            {viewing.time}
          </p>
        </div>
        {viewing.status === "New Time Suggested" ? (
          <div className="mt-3 rounded-2xl bg-black/[0.045] p-3 text-sm">
            <p className="text-carbon-500">{t("renterDashboard.visits.card.newTimeSuggestedLabel")}</p>
            <p className="mt-1 font-medium">
              {viewing.date} · {viewing.suggestedTime}
            </p>
          </div>
        ) : null}
        {viewing.status === "Awaiting Confirmation" ? (
          <p className="text-carbon-500 mt-3 text-sm">
            {t("renterDashboard.visits.card.awaitingConfirmationNotice")}
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-3">
          <Image
            src={viewing.host === "Aline Uwase" ? alineProfile : viewing.host === "Sarah Uwase" ? sarahProfile : julienProfile}
            alt=""
            className="size-9 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-medium">{viewing.host}</p>
            <p className="text-carbon-500 flex items-center gap-1 text-xs">
              <BadgeCheck className="size-3.5" />
              {t(viewing.roleKey)}
            </p>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {viewing.status === "Confirmed" ? (
            <>
              <button
                onClick={onDetails}
                className="h-10 rounded-full bg-black px-4 text-sm font-medium text-white"
              >
                {t("renterDashboard.visits.card.actions.viewDetails")}
              </button>
              <ActionLink href={messageHref} label={t("renterDashboard.visits.card.actions.message")} />
              <a
                href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(viewing.location)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-sm"
              >
                <MapPinned className="size-4" />
                {t("renterDashboard.visits.card.actions.getDirections")}
              </a>
              <button
                onClick={onReschedule}
                className="h-10 rounded-full border border-black/15 px-4 text-sm"
              >
                {t("renterDashboard.visits.card.actions.reschedule")}
              </button>
              <button
                onClick={onCancel}
                className="h-10 px-2 text-sm text-red-600"
              >
                {t("renterDashboard.visits.card.actions.cancelViewing")}
              </button>
            </>
          ) : null}
          {viewing.status === "Awaiting Confirmation" ||
          viewing.status === "Reschedule Requested" ? (
            <>
              <ActionLink
                href={`/properties/${viewing.propertyId}?from=renter`}
                label={t("renterDashboard.visits.card.actions.viewListing")}
              />
              <ActionLink href={messageHref} label={t("renterDashboard.visits.card.actions.message")} />
              <button
                onClick={onReschedule}
                className="h-10 rounded-full border border-black/15 px-4 text-sm"
              >
                {t("renterDashboard.visits.card.actions.changeRequestedTime")}
              </button>
              <button
                onClick={onCancel}
                className="h-10 px-2 text-sm text-red-600"
              >
                {t("renterDashboard.visits.card.actions.cancelRequest")}
              </button>
            </>
          ) : null}
          {viewing.status === "New Time Suggested" ? (
            <>
              <button
                onClick={onAccept}
                className="h-10 rounded-full bg-black px-4 text-sm text-white"
              >
                {t("renterDashboard.visits.card.actions.acceptNewTime")}
              </button>
              <button
                onClick={onReschedule}
                className="h-10 rounded-full border border-black/15 px-4 text-sm"
              >
                {t("renterDashboard.visits.card.actions.suggestAnotherTime")}
              </button>
              <ActionLink href={messageHref} label={t("renterDashboard.visits.card.actions.message")} />
            </>
          ) : null}
          {viewing.status === "Completed" ? (
            <>
              <ActionLink
                href={`/renter-dashboard/applications/new?property=${viewing.propertyId}`}
                label={t("renterDashboard.visits.card.actions.applyNow")}
                primary
              />
              <ActionLink
                href={`/properties/${viewing.propertyId}?from=renter`}
                label={t("renterDashboard.visits.card.actions.viewListing")}
              />
              <button onClick={onNotInterested} className="h-10 px-3 text-sm">
                {t("renterDashboard.visits.card.actions.notInterested")}
              </button>
            </>
          ) : null}
          {viewing.status === "Cancelled" ||
          viewing.status === "Viewing unavailable" ||
          viewing.status === "Not interested" ? (
            <>
              <ActionLink
                href={`/properties/${viewing.propertyId}?from=renter`}
                label={t("renterDashboard.visits.card.actions.viewListing")}
              />
              {viewing.status === "Viewing unavailable" ? (
                <button
                  onClick={onReschedule}
                  className="h-10 rounded-full border border-black/15 px-4 text-sm"
                >
                  {t("renterDashboard.visits.card.actions.requestAnotherTime")}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Status({ label }: { label: ViewingStatus }) {
  const { t } = useTranslation();
  const dark = label === "Confirmed" || label === "Completed";
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap sm:absolute sm:top-4 sm:right-4 ${dark ? "bg-black text-white" : "bg-black/[0.06] text-black"}`}
    >
      {t(STATUS_LABEL_KEYS[label])}
    </span>
  );
}
function ActionLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm ${primary ? "border-black bg-black text-white" : "border-black/15"}`}
    >
      {label}
    </Link>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const { t } = useTranslation();
  const copy =
    tab === "upcoming"
      ? [
          t("renterDashboard.visits.emptyState.upcoming.title"),
          t("renterDashboard.visits.emptyState.upcoming.description"),
          t("renterDashboard.visits.emptyState.upcoming.action"),
        ]
      : tab === "pending"
        ? [
            t("renterDashboard.visits.emptyState.pending.title"),
            t("renterDashboard.visits.emptyState.pending.description"),
            "",
          ]
        : [
            t("renterDashboard.visits.emptyState.past.title"),
            t("renterDashboard.visits.emptyState.past.description"),
            t("renterDashboard.visits.emptyState.past.action"),
          ];
  return (
    <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
      <Image src={emptyIllustration} alt="" className="h-40 w-auto" />
      <h2 className="font-bricolage mt-5 text-2xl font-medium">{copy[0]}</h2>
      <p className="text-carbon-500 mt-2 text-sm">{copy[1]}</p>
      {copy[2] ? (
        <Link
          href="/renter-dashboard/properties"
          className="mt-6 rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
        >
          {copy[2]}
        </Link>
      ) : null}
    </div>
  );
}

function ViewingDialog({
  dialog,
  onClose,
  onUpdate,
}: {
  dialog: NonNullable<Dialog>;
  onClose: () => void;
  onUpdate: (updates: Partial<Viewing>) => void;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState("2026-08-28");
  const [time, setTime] = useState("10:30 AM");
  const [note, setNote] = useState(
    dialog.viewing.noteKey ? t(dialog.viewing.noteKey) : (dialog.viewing.note ?? ""),
  );
  const [reason, setReason] = useState("");
  const NOT_INTERESTED_REASONS = [
    { value: "Too expensive", labelKey: "renterDashboard.visits.dialog.reasons.tooExpensive" },
    { value: "Location", labelKey: "renterDashboard.overview.filters.location" },
    { value: "Property condition", labelKey: "renterDashboard.visits.dialog.reasons.propertyCondition" },
    { value: "Size/layout", labelKey: "renterDashboard.visits.dialog.reasons.sizeLayout" },
    { value: "Found another property", labelKey: "renterDashboard.visits.dialog.reasons.foundAnotherProperty" },
    { value: "Other", labelKey: "renterDashboard.visits.dialog.reasons.other" },
  ];
  const titles = {
    details: t("renterDashboard.visits.dialog.detailsTitle"),
    reschedule: t("renterDashboard.visits.dialog.rescheduleTitle"),
    cancel: t("renterDashboard.visits.dialog.cancelTitle"),
    "not-interested": t("renterDashboard.visits.dialog.notInterestedTitle"),
  };
  if (dialog.type === "reschedule") {
    return (
      <RescheduleDialog
        viewing={dialog.viewing}
        date={date}
        time={time}
        onDateChange={setDate}
        onTimeChange={setTime}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    );
  }
  if (dialog.type === "cancel") {
    return (
      <CancelViewingDialog
        viewing={dialog.viewing}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    );
  }
  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/35 p-5"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl sm:p-9"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between gap-4">
          <div>
            <h2 className="font-bricolage text-3xl font-medium">
              {titles[dialog.type]}
            </h2>
            <p className="text-carbon-500 mt-2 text-sm">
              {viewingTitle(dialog.viewing, t)} · {dialog.viewing.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full border border-black/15"
          >
            <X className="size-4" />
          </button>
        </div>
        {dialog.type === "details" ? (
          <div className="mt-7 space-y-5">
            <Image
              src={dialog.viewing.image}
              alt=""
              className="h-48 w-full rounded-2xl object-cover"
            />
            <section>
              <h3 className="text-sm font-medium">{t("renterDashboard.visits.dialog.viewingSectionTitle")}</h3>
              <p className="text-carbon-500 mt-2 text-sm">
                {t(STATUS_LABEL_KEYS[dialog.viewing.status])} · {dialog.viewing.date} ·{" "}
                {dialog.viewing.time}
              </p>
            </section>
            <section className="flex items-center gap-3">
              <Image
                src={dialog.viewing.host === "Aline Uwase" ? alineProfile : dialog.viewing.host === "Sarah Uwase" ? sarahProfile : julienProfile}
                alt=""
                className="size-11 rounded-full object-cover"
              />
              <div>
                <p className="font-medium">{dialog.viewing.host}</p>
                <p className="text-carbon-500 text-sm">
                  {t(dialog.viewing.roleKey)} · {t("renterDashboard.visits.card.verified")}
                </p>
              </div>
            </section>
            <label>
              <span className="mb-2 block text-sm font-medium">{t("renterDashboard.visits.dialog.notesLabel")}</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-24 w-full rounded-2xl border border-black/15 p-4 text-sm"
              />
            </label>
            <div className="flex gap-3">
              <ActionLink
                href={`/properties/${dialog.viewing.propertyId}?from=renter`}
                label={t("renterDashboard.visits.dialog.viewFullListing")}
                primary
              />
              <button
                onClick={() => onUpdate({ note })}
                className="h-10 rounded-full border border-black/15 px-4 text-sm"
              >
                {t("renterDashboard.visits.dialog.saveNote")}
              </button>
            </div>
          </div>
        ) : null}
        {dialog.type === "not-interested" ? (
          <div className="mt-7">
            <p className="text-carbon-500 text-sm">
              {t("renterDashboard.visits.dialog.notInterestedDescription")}
            </p>
            <span className="relative mt-5 block">
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="h-11 w-full appearance-none rounded-full border border-black/15 pr-11 pl-4 text-sm"
              >
                <option value="">{t("renterDashboard.visits.dialog.noReason")}</option>
                {NOT_INTERESTED_REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-black/55" />
            </span>
            <DialogActions
              onClose={onClose}
              action={t("renterDashboard.visits.dialog.markNotInterested")}
              onAction={() => onUpdate({ status: "Not interested" })}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CancelViewingDialog({
  viewing,
  onClose,
  onUpdate,
}: {
  viewing: Viewing;
  onClose: () => void;
  onUpdate: (updates: Partial<Viewing>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/25 p-5"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-viewing-title"
        className="grid w-full max-w-xl overflow-hidden bg-white text-left shadow-[0_30px_90px_rgba(0,0,0,0.28)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative flex min-h-48 items-center justify-center bg-black/[0.06] p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("renterDashboard.visits.dialog.closeCancelDialogAria")}
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 hover:border-black/40 hover:text-black"
          >
            <X className="size-5" />
          </button>
          <Image
            src={cancelIllustration}
            alt={t("renterDashboard.visits.dialog.cancelledIllustrationAlt")}
            className="h-40 w-auto object-contain"
          />
        </div>
        <div className="p-6 sm:p-8">
          <h2
            id="cancel-viewing-title"
            className="font-bricolage text-2xl font-medium"
          >
            {t("renterDashboard.visits.dialog.cancelTitle")}
          </h2>
          <p className="text-carbon-500 mt-2 text-sm">
            {viewingTitle(viewing, t)} · {viewing.date} · {viewing.time}
          </p>
          <p className="text-carbon-600 mt-5 text-sm leading-6">
            {t("renterDashboard.visits.dialog.cancelNotice")}
          </p>
          <DialogActions
            onClose={onClose}
            action={t("renterDashboard.visits.card.actions.cancelViewing")}
            destructive
            onAction={() =>
              onUpdate({
                status: "Cancelled",
                tab: "past",
                cancelledBy: "Cancelled by you",
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function RescheduleDialog({
  viewing,
  date,
  time,
  onDateChange,
  onTimeChange,
  onClose,
  onUpdate,
}: {
  viewing: Viewing;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onClose: () => void;
  onUpdate: (updates: Partial<Viewing>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/25 p-5"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-viewing-title"
        className="grid max-h-[92svh] w-full max-w-xl overflow-y-auto bg-white text-left shadow-[0_30px_90px_rgba(0,0,0,0.28)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative flex min-h-48 items-center justify-center bg-black/[0.06] p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("renterDashboard.visits.dialog.closeRescheduleDialogAria")}
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 hover:border-black/40 hover:text-black"
          >
            <X className="size-5" />
          </button>
          <Image
            src={scheduleIllustration}
            alt={t("renterDashboard.visits.dialog.scheduleIllustrationAlt")}
            className="h-40 w-auto object-contain"
          />
        </div>
        <div className="p-6 sm:p-8">
          <h2
            id="reschedule-viewing-title"
            className="font-bricolage text-2xl font-medium"
          >
            {t("renterDashboard.visits.dialog.rescheduleTitle")}
          </h2>
          <p className="text-carbon-500 mt-2 text-sm">
            {viewingTitle(viewing, t)} · {viewing.location}
          </p>
          <p className="mt-5 bg-black/[0.045] p-4 text-sm">
            {t("renterDashboard.visits.dialog.currentSlot", {
              date: viewing.date,
              time: viewing.time,
            })}
          </p>
          <input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="mt-5 h-11 w-full rounded-2xl border border-black/15 px-4"
          />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {["09:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"].map((slot) => (
              <button
                key={slot}
                onClick={() => onTimeChange(slot)}
                className={`h-10 rounded-full border text-sm ${time === slot ? "bg-black text-white" : "border-black/15"}`}
              >
                {slot}
              </button>
            ))}
          </div>
          <p className="text-carbon-500 mt-4 text-sm">
            {t("renterDashboard.visits.dialog.rescheduleNotice")}
          </p>
          <DialogActions
            onClose={onClose}
            action={t("renterDashboard.visits.dialog.requestNewTime")}
            onAction={() =>
              onUpdate({
                date,
                time,
                status: "Reschedule Requested",
                tab: "pending",
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function DialogActions({
  onClose,
  action,
  onAction,
  destructive = false,
}: {
  onClose: () => void;
  action: string;
  onAction: () => void;
  destructive?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-7 flex justify-end gap-3">
      <button
        onClick={onClose}
        className="h-11 rounded-full border border-black/15 px-5 text-sm"
      >
        {t("renterDashboard.visits.dialog.cancel")}
      </button>
      <button
        onClick={onAction}
        className={`h-11 rounded-full px-6 text-sm font-medium text-white ${destructive ? "bg-red-600" : "bg-black"}`}
      >
        {action}
      </button>
    </div>
  );
}
