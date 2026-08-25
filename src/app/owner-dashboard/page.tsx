"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Key,
  KeyRound,
  Plus,
  Wrench,
} from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import {
  OWNER,
  formatRwf,
  getOwnerApplications,
  getOwnerFinancialSummary,
  getOwnerPayments,
  getOwnerProperties,
  getOwnerRentals,
  managementSummaryFor,
  propertyTitle,
  subscribeToOwnerApplications,
  subscribeToOwnerPayments,
  subscribeToOwnerRentals,
  type OwnerApplication,
} from "@/lib/owner-data";
import { getMaintenanceRequests, subscribeToMaintenance } from "@/lib/maintenance-data";
import { subscribeToTeam } from "@/lib/team-data";
import {
  getRentalSetupManagerFor,
  ownerDecidesApplication,
} from "@/lib/professional-work";
import { getRentalSetupDraft, subscribeToRentalSetup } from "@/lib/pm-work";
import noDataIllustration from "@/assets/images/empty.png";

// Owner Overview phase (Phase 4) -- an orientation + decision surface, not
// a second Properties/Applications/Team page (Section 2). Every number and
// row here is derived from the exact same shared getters/canonical helpers
// Phases 1-3 already established -- managementSummaryFor (Phase 1),
// ownerDecidesApplication + getRentalSetupManagerFor (Phase 3, living in
// professional-work.ts), getOwnerProperties' now-derived occupancy
// (Phase 3). Nothing here re-implements any of that logic a second time.
const subscribeToHydration = () => () => {};

export default function OwnerOverviewPage() {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToOwnerApplications(forceUpdate), []);
  useEffect(() => subscribeToOwnerRentals(forceUpdate), []);
  useEffect(() => subscribeToOwnerPayments(forceUpdate), []);
  useEffect(() => subscribeToMaintenance(forceUpdate), []);
  useEffect(() => subscribeToRentalSetup(forceUpdate), []);

  if (!hydrated) {
    return (
      <OwnerDashboardShell>
        <section className="min-h-svh px-5 pt-10 pb-24 sm:px-6 lg:px-10 xl:px-12">
          <div className="mx-auto max-w-[1360px]">
            <div className="h-10 w-64 animate-pulse rounded-lg bg-black/[0.06]" />
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          </div>
        </section>
      </OwnerDashboardShell>
    );
  }

  const properties = getOwnerProperties();

  // Section 51: zero properties gets its own focused view -- Add Property
  // first, not an empty KPI strip and empty sections underneath it.
  if (properties.length === 0) {
    return (
      <OwnerDashboardShell>
        <section className="px-5 pt-10 pb-24 sm:px-6 lg:px-10 xl:px-12">
          <div className="mx-auto max-w-[1360px]">
            <header className="border-b border-black/10 pb-10">
              <h1 className="dashboard-page-title text-carbon-900">Welcome, {OWNER.name.split(" ")[0]}</h1>
              <p className="text-carbon-600 mt-7 max-w-3xl text-lg leading-7">Add your first property to get started.</p>
            </header>
            <section className="mt-8 flex min-h-[420px] flex-col items-center justify-center rounded-[1.75rem] bg-white px-6 py-14 text-center shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
              <Image src={noDataIllustration} alt="" className="h-40 w-auto object-contain" />
              <h3 className="font-bricolage text-carbon-900 mt-5 text-2xl font-medium">No properties yet</h3>
              <p className="text-carbon-500 mt-2 max-w-md text-sm leading-6">
                Add your first property to create a listing, manage applications, and start renting through HauxHunt.
              </p>
              <Link href="/owner-dashboard/properties/new" className="font-bricolage mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white">
                <Plus aria-hidden="true" className="size-4" />
                Add Property
              </Link>
            </section>
          </div>
        </section>
      </OwnerDashboardShell>
    );
  }

  const occupied = properties.filter((p) => p.occupancy === "Occupied").length;
  const vacant = properties.filter((p) => p.occupancy === "Vacant").length;

  const rentalsAll = getOwnerRentals();
  const activeRentals = rentalsAll.filter((r) => r.status === "Active" || r.status === "Ending Soon").length;
  const upcomingRentals = rentalsAll.filter((r) => r.status === "Upcoming").length;

  const financial = getOwnerFinancialSummary();

  const maintenanceAll = getMaintenanceRequests();
  const maintenanceOpen = maintenanceAll.filter((m) => m.status !== "Resolved" && m.status !== "Cancelled");
  const urgentMaintenance = maintenanceOpen.filter((m) => m.urgency === "Urgent");

  // Section 12: decision authority alone isn't enough -- an application
  // still gathering information (Action Required means the applicant, not
  // the Owner, needs to act next) doesn't belong here yet.
  // ownerDecidesApplication is the one canonical authority rule (Phase 3);
  // this only adds "and the current stage actually needs me right now".
  const applicationsAll = getOwnerApplications();
  const decisionRequired = applicationsAll.filter(
    (a) => a.status !== "Approved" && a.status !== "Not Selected" && a.status !== "Action Required" && ownerDecidesApplication(a),
  );

  const overduePayments = getOwnerPayments().filter((p) => p.status === "Overdue");

  // Section 14: an Approved application with no PM responsible for setup,
  // and either no draft yet or a draft still sitting unset. Reuses Phase
  // 2.5's exact draft/manager resolution -- never a second setup-tracking
  // concept.
  const rentalSetupAttention = applicationsAll
    .filter((a) => a.status === "Approved" && getRentalSetupManagerFor(a.propertyId) === null)
    .map((a) => ({ application: a, draft: getRentalSetupDraft(a.id) }))
    .filter(({ draft }) => !draft || draft.status === "Draft");

  const attentionCount = decisionRequired.length + overduePayments.length + urgentMaintenance.length + rentalSetupAttention.length;

  const remeraApplication = applicationsAll.find((application) => application.id === "HH-APP-0250");
  const kacyiruApplication = applicationsAll.find((application) => application.id === "HH-APP-0241");
  const kacyiru = properties.find((property) => property.id === "kacyiru-2br");
  const modernFamilyHome = properties.find((property) => property.id === "kibagabaga-modern-family-home");
  const teamActivity = [
    remeraApplication?.recommendedBy
      ? {
          actor: remeraApplication.recommendedBy,
          action: `recommended approval for ${remeraApplication.applicant}'s application at ${propertyTitle(remeraApplication.propertyId)}.`,
          context: "Agent · Recommend only",
          href: `/owner-dashboard/applications?open=${remeraApplication.id}`,
        }
      : null,
    kacyiruApplication && kacyiru?.propertyManager
      ? {
          actor: kacyiru.propertyManager.name,
          action: `is reviewing ${kacyiruApplication.applicant}'s application for ${kacyiru.title}.`,
          context: "Property Manager · Review applications",
          href: `/owner-dashboard/applications?open=${kacyiruApplication.id}`,
        }
      : null,
    modernFamilyHome?.agent
      ? {
          actor: modernFamilyHome.agent.name,
          action: `published the listing for ${modernFamilyHome.title}.`,
          context: "Agent · Manage listing",
          href: `/owner-dashboard/properties/${modernFamilyHome.id}?tab=listing`,
        }
      : null,
    kacyiru?.propertyManager
      ? {
          actor: "You",
          action: `assigned ${kacyiru.propertyManager.name} to manage ${kacyiru.title}.`,
          context: "Property Owner · Team management",
          href: `/owner-dashboard/properties/${kacyiru.id}?tab=management`,
        }
      : null,
  ].filter((activity): activity is NonNullable<typeof activity> => activity !== null);
  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-10 pb-24 sm:px-6 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="flex flex-col gap-8 border-b border-black/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="dashboard-page-title text-carbon-900">Welcome back, {OWNER.name.split(" ")[0]}</h1>
              <p className="text-carbon-600 mt-7 max-w-3xl text-lg leading-7">
                What you own, who manages it, and what needs your attention right now.
              </p>
            </div>
            <Link
              href="/owner-dashboard/properties/new"
              className="font-bricolage inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 lg:self-auto"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add Property
            </Link>
          </header>

          {/* KPI strip -- four cards, none redundant with another (Section 6) */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Building2} label="Properties" value={String(properties.length)} change={`${occupied} occupied · ${vacant} vacant`} />
            <StatCard icon={Key} label="Active rentals" value={String(activeRentals)} change={`${upcomingRentals} upcoming`} />
            <StatCard icon={CreditCard} label="Rent received" value={formatRwf(financial.received)} change={financial.overdueCount > 0 ? `${financial.overdueCount} overdue` : "None overdue"} />
            <StatCard
              icon={ClipboardCheck}
              label="Needs your attention"
              value={String(attentionCount)}
              change={attentionCount > 0 ? "Review below" : "All caught up"}
            />
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
            <div className="space-y-8">
              {/* Needs Your Attention -------------------------------------------------- */}
              <section className="relative rounded-[1.75rem] bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                <div className="flex items-start justify-between gap-5 border-b border-black/10 p-5 sm:p-6">
                  <div>
                    <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-[-0.025em]">Needs Your Attention</h2>
                    <p className="text-carbon-500 mt-1 text-sm">
                      {attentionCount > 0 ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} need your attention.` : "There's nothing requiring your attention right now."}
                    </p>
                  </div>
                </div>
                {attentionCount > 0 ? (
                  <div className="divide-y divide-black/10">
                    {decisionRequired.map((a) => (
                      <AttentionRow
                        key={`app-${a.id}`}
                        icon={ClipboardCheck}
                        headline="Application needs your decision"
                        context={`${propertyTitle(a.propertyId)} · ${a.applicant}`}
                        cta="Review Application"
                        href={`/owner-dashboard/applications?open=${a.id}`}
                      />
                    ))}
                    {overduePayments.map((p) => (
                      <AttentionRow
                        key={`pay-${p.id}`}
                        icon={CreditCard}
                        headline="Payment overdue"
                        context={`${propertyTitle(p.propertyId)} · ${p.purpose}`}
                        cta="View Payment"
                        href={`/owner-dashboard/payments?open=${p.id}`}
                      />
                    ))}
                    {urgentMaintenance.map((m) => (
                      <AttentionRow
                        key={`maint-${m.id}`}
                        icon={Wrench}
                        headline="Urgent maintenance issue"
                        context={`${propertyTitle(m.propertyId)} · ${m.title}`}
                        cta="View Request"
                        href={`/owner-dashboard/maintenance?open=${m.id}`}
                      />
                    ))}
                    {rentalSetupAttention.map(({ application, draft }: { application: OwnerApplication; draft: ReturnType<typeof getRentalSetupDraft> }) => (
                      <AttentionRow
                        key={`setup-${application.id}`}
                        icon={KeyRound}
                        headline={draft ? "Rental setup in progress" : "Rental setup needed"}
                        context={`${propertyTitle(application.propertyId)} · ${application.applicant}`}
                        cta={draft ? "Continue Rental Setup" : "Start Rental Setup"}
                        href={`/owner-dashboard/applications/${application.id}/rental-setup`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                    <CheckCircle2 className="size-8 text-black/25" />
                    <p className="text-carbon-500 text-sm">You&apos;re all caught up.</p>
                  </div>
                )}
              </section>

              {/* Property Portfolio ------------------------------------------------------ */}
              <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                <div className="flex items-start justify-between gap-5 border-b border-black/10 p-5 sm:p-6">
                  <div>
                    <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-[-0.025em]">Property Portfolio</h2>
                    <p className="text-carbon-500 mt-1 text-sm">Who&apos;s managing, marketing, and renting each property.</p>
                  </div>
                  <Link href="/owner-dashboard/properties" className="font-bricolage shrink-0 text-sm font-medium underline underline-offset-4">
                    View all properties
                  </Link>
                </div>
                <div className="divide-y divide-black/10">
                  {properties.slice(0, 4).map((property) => {
                    const rental = rentalsAll.find((r) => r.propertyId === property.id && (r.status === "Active" || r.status === "Ending Soon"));
                    return (
                      <Link
                        key={property.id}
                        href={`/owner-dashboard/properties/${property.id}`}
                        className="grid gap-4 p-5 transition-colors hover:bg-black/2 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <Image src={property.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                          <div className="min-w-0">
                            <h3 className="font-bricolage text-carbon-900 truncate font-medium">{property.title}</h3>
                            <p className="text-carbon-500 mt-1 text-sm">{property.location}</p>
                            <p className="text-carbon-400 mt-1 text-xs">
                              {managementSummaryFor(property)}
                              {rental ? ` · Renter: ${rental.renter}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <StatusPill status={property.occupancy} />
                          {rental ? <StatusPill status={rental.paymentStatus} /> : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="space-y-8">
              <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                <div className="flex items-start justify-between gap-5">
                  <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-[-0.025em]">Delegation</h2>
                  <Link href="/owner-dashboard/team" aria-label="View Team" className="text-black/60 hover:text-black">
                    <ArrowUpRight aria-hidden="true" className="size-5" />
                  </Link>
                </div>
                <p className="text-carbon-500 mt-1 text-sm">How your portfolio is managed today.</p>
                <div className="mt-5 divide-y divide-black/8 border-y border-black/8">
                  {properties.map((property) => (
                    <Link
                      key={property.id}
                      href={`/owner-dashboard/properties/${property.id}`}
                      className="block py-3.5 transition-colors hover:bg-black/[0.025]"
                    >
                      <span className="text-carbon-800 block text-sm font-medium break-words">
                        {property.title}
                      </span>
                      <span className="text-carbon-500 mt-1 block text-xs leading-5 break-words">
                        {managementSummaryFor(property)}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
              <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-[-0.025em]">Team Activity</h2>
                    <p className="text-carbon-500 mt-1 text-sm">Recent work by you and your team.</p>
                  </div>
                  <Link href="/owner-dashboard/notifications" aria-label="View all activity" className="text-black/60 hover:text-black">
                    <ArrowUpRight aria-hidden="true" className="size-5" />
                  </Link>
                </div>
                <div className="mt-5 divide-y divide-black/8 border-y border-black/8">
                  {teamActivity.map((activity) => (
                    <Link key={`${activity.actor}-${activity.action}`} href={activity.href} className="block py-3.5 transition-colors hover:bg-black/[0.025]">
                      <p className="text-carbon-800 text-sm leading-5">
                        <strong>{activity.actor}</strong> {activity.action}
                      </p>
                      <p className="text-carbon-500 mt-1 text-xs leading-5">{activity.context}</p>
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </OwnerDashboardShell>
  );
}

type TrafficMetric =
  | "Views"
  | "Saved to favourites"
  | "Viewing requests"
  | "Signed rentals";

export function OwnerTrafficTrend() {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const metric: TrafficMetric = "Views";
  const totals: Record<TrafficMetric, number> = {
    Views: 3_000,
    "Saved to favourites": 780,
    "Viewing requests": 400,
    "Signed rentals": 100,
  };
  const weights: Record<TrafficMetric, number[]> = {
    Views: [7, 8, 7, 9, 8, 10, 9, 11, 10, 11, 12, 13],
    "Saved to favourites": [6, 7, 6, 8, 7, 9, 8, 10, 9, 10, 11, 12],
    "Viewing requests": [5, 6, 5, 7, 6, 8, 7, 9, 8, 9, 10, 11],
    "Signed rentals": [3, 4, 4, 5, 4, 6, 5, 7, 6, 7, 8, 9],
  };
  const seriesByMetric = Object.fromEntries(
    (Object.keys(totals) as TrafficMetric[]).map((item) => {
      const weightTotal = weights[item].reduce((sum, value) => sum + value, 0);
      const values = weights[item].map((value) =>
        Math.round((totals[item] * value) / weightTotal),
      );
      values[values.length - 1] +=
        totals[item] - values.reduce((sum, value) => sum + value, 0);
      return [item, values];
    }),
  ) as Record<TrafficMetric, number[]>;
  const series = seriesByMetric[metric];
  const chartMaximum = Math.ceil(Math.max(...series) / 50) * 50 || 1;
  const points = series.map((value, index) => ({
    x: (index / (series.length - 1)) * 800,
    y: 210 - (value / chartMaximum) * 170,
  }));
  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const yAxisValues = Array.from({ length: 5 }, (_, index) =>
    Math.round(chartMaximum - (chartMaximum * index) / 4),
  );
  const axisLabels = ["1 Aug", "7 Aug", "13 Aug", "19 Aug", "24 Aug"];
  const pointDates = [
    "Saturday 1, Aug 2026",
    "Monday 3, Aug 2026",
    "Wednesday 5, Aug 2026",
    "Friday 7, Aug 2026",
    "Sunday 9, Aug 2026",
    "Tuesday 11, Aug 2026",
    "Thursday 13, Aug 2026",
    "Saturday 15, Aug 2026",
    "Monday 17, Aug 2026",
    "Wednesday 19, Aug 2026",
    "Saturday 22, Aug 2026",
    "Monday 24, Aug 2026",
  ];
  const hoveredRatio = hoveredPoint === null ? 0 : hoveredPoint / (series.length - 1);
  const hoveredLeft = `calc(${hoveredRatio * 100}% + ${(1 - hoveredRatio) * 3}rem)`;

  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-[-0.025em]">Property Traffic</h2>
          <p className="text-carbon-500 mt-1 text-sm">Performance trend across all published properties this month.</p>
        </div>
        <Link href="/owner-dashboard/performance" className="text-xs font-medium underline underline-offset-4">View Performance</Link>
      </div>
      <div
        className="relative mt-7 h-64 overflow-hidden"
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const plotWidth = Math.max(bounds.width - 48, 1);
          const position = event.clientX - bounds.left - 48;
          if (position < 0) {
            setHoveredPoint(null);
            return;
          }
          setHoveredPoint(
            Math.round(
              (Math.min(position, plotWidth) / plotWidth) *
                (series.length - 1),
            ),
          );
        }}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <div className="absolute inset-y-0 left-0 z-10 flex w-10 flex-col justify-between bg-white/75 text-right text-[0.62rem] text-black/35">
          {yAxisValues.map((value, index) => <span key={`${value}-${index}`}>{value.toLocaleString()}</span>)}
        </div>
        <div className="absolute inset-y-0 right-0 left-12 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, index) => <span key={index} className="block border-t border-black/[0.055]" />)}
        </div>
        <svg viewBox="0 0 800 240" preserveAspectRatio="none" className="relative z-10 ml-12 h-full w-[calc(100%-3rem)] overflow-visible">
          <defs>
            <linearGradient id="ownerTrafficArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="black" stopOpacity="0.14" />
              <stop offset="100%" stopColor="black" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${linePath} L800 240 L0 240 Z`} fill="url(#ownerTrafficArea)" />
          <path d={linePath} fill="none" stroke="black" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </svg>
        {hoveredPoint !== null ? (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-20 w-px bg-black/20"
              style={{ left: hoveredLeft }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-30 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-black shadow-md"
              style={{
                left: hoveredLeft,
                top: `${(points[hoveredPoint].y / 240) * 100}%`,
              }}
            />
            <div
              className={`pointer-events-none absolute top-3 z-40 w-64 border border-black/10 bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.16)] ${hoveredPoint < 3 ? "translate-x-0" : hoveredPoint > 8 ? "-translate-x-full" : "-translate-x-1/2"}`}
              style={{ left: hoveredLeft }}
            >
              <p className="text-carbon-500 text-sm font-medium">{pointDates[hoveredPoint]}</p>
              <div className="mt-4 space-y-3">
                {(Object.keys(totals) as TrafficMetric[]).map((item) => (
                  <p key={item} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-carbon-500">{item === "Saved to favourites" ? "Saves" : item}</span>
                    <strong className="font-medium tabular-nums">{seriesByMetric[item][hoveredPoint].toLocaleString()}</strong>
                  </p>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
      <div className="ml-12 flex justify-between text-[0.62rem] text-black/35">
        {axisLabels.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-black/8 pt-5">
        <div>
          <p className="text-carbon-400 text-xs">View to request</p>
          <p className="font-bricolage mt-1 text-2xl font-medium">13.3%</p>
        </div>
        <div>
          <p className="text-carbon-400 text-xs">Request to signed</p>
          <p className="font-bricolage mt-1 text-2xl font-medium">25%</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  change: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-carbon-500 truncate text-xs">{label}</p>
        <Icon aria-hidden="true" className="size-4 shrink-0" />
      </div>
      <p className="font-bricolage text-carbon-900 mt-3 truncate text-2xl font-medium tracking-tight">{value}</p>
      <p className="text-carbon-500 mt-1 truncate text-xs">{change}</p>
    </article>
  );
}

function AttentionRow({
  icon: Icon,
  headline,
  context,
  cta,
  href,
}: {
  icon: typeof Wrench;
  headline: string;
  context: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center text-black">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="font-bricolage text-carbon-900 font-medium">{headline}</p>
          <p className="text-carbon-500 mt-0.5 text-sm">{context}</p>
        </div>
      </div>
      <Link
        href={href}
        className="font-bricolage inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium transition-colors hover:border-black hover:bg-black hover:text-white"
      >
        {cta}
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
