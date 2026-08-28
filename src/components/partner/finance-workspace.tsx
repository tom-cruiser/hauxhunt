"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { CalendarClock, MessageSquare, Wallet, X } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { LockedPanel } from "@/components/tier/locked-feature";
import { PayoutsPanel } from "@/components/partner/payouts-panel";
import { isPaidTier, useTier } from "@/hooks/use-tier";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { resolveAnyPropertyTitle, subscribeToIndependentProperties } from "@/lib/professional-properties";
import { getPaymentsFor, getRentalsFor, subscribeToPmWork } from "@/lib/pm-work";
import { RENTER_DEMO_NAME, updateOwnerPayment, type OwnerPayment, type OwnerRental } from "@/lib/owner-data";
import { RENTER_PARTICIPANT_ID, getOrCreateConversation } from "@/lib/messages-data";
import emptyIllustration from "@/assets/images/empty.png";

// Finance Consolidation phase -- Payments (rent-payment monitoring) and
// Finance (payout history + billing schedules, added the phase before this
// one) were two separate top-level PM pages both fundamentally about "money
// for the properties I manage," and Finance's own "Payout history" tab
// read the exact same `getPaymentsFor` records Payments already displayed
// -- a real duplication, not just a naming coincidence. They're merged here
// into one workspace with three tabs (Payments / Billing Schedules /
// Payouts); `/partner-dashboard/payments` itself becomes a redirect shim
// (see that route file) so the several existing `?open=`/`?propertyId=`
// deep links elsewhere in the app (pm-overview.tsx, professional-work.ts's
// notifications, property/rental detail pages) keep working untouched.

const TABS = ["Payments", "Billing Schedules", "Payouts"] as const;
type FinanceTab = (typeof TABS)[number];

const TAB_FOR_PARAM: Record<string, FinanceTab> = {
  payments: "Payments",
  "billing-schedules": "Billing Schedules",
  payouts: "Payouts",
};
const PARAM_FOR_TAB: Record<FinanceTab, string> = {
  Payments: "payments",
  "Billing Schedules": "billing-schedules",
  Payouts: "payouts",
};

type PaymentFilter = "All" | "Due" | "Overdue" | "Paid";
const PAYMENT_FILTERS: PaymentFilter[] = ["All", "Due", "Overdue", "Paid"];

export function FinanceWorkspace() {
  return (
    <Suspense>
      <FinanceWorkspaceInner />
    </Suspense>
  );
}

function FinanceWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const [tab, setTab] = useState<FinanceTab>(TAB_FOR_PARAM[searchParams.get("tab") ?? ""] ?? "Payments");
  const [filter, setFilter] = useState<PaymentFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("open"));
  const professional = useDemoProfessional("property_manager");
  const tier = useTier();

  if (!professional) {
    return (
      <DashboardShell initialSection="finance">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const propertyId = searchParams.get("propertyId");
  const allPayments = getPaymentsFor(professional.id);
  const scopedPayments = propertyId ? allPayments.filter((p) => p.propertyId === propertyId) : allPayments;
  const visiblePayments =
    filter === "All"
      ? scopedPayments
      : filter === "Due"
        ? scopedPayments.filter((p) => p.status === "Due" || p.status === "Pending")
        : scopedPayments.filter((p) => p.status === filter);
  const selectedPayment = scopedPayments.find((p) => p.id === selectedId) ?? null;

  const activeRentals = getRentalsFor(professional.id).filter((r) => r.status === "Active");

  function selectTab(next: FinanceTab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", PARAM_FOR_TAB[next]);
    router.replace(`/partner-dashboard/finance?${params.toString()}`);
  }

  function clearPropertyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("propertyId");
    const query = params.toString();
    router.replace(`/partner-dashboard/finance${query ? `?${query}` : ""}`);
  }

  return (
    <DashboardShell initialSection="finance">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="border-b border-black/10 pb-8">
            <span className="flex size-12 items-center justify-center rounded-full bg-black text-white">
              <Wallet aria-hidden="true" className="size-5" />
            </span>
            <h1 className="dashboard-page-title text-carbon-900 mt-6">Finance</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Rent activity, billing schedules, and payouts for the properties you manage. Payments here is monitoring, not accounting -- HauxHunt does not process tenant payments.
            </p>
            {propertyId && tab === "Payments" ? <PropertyFilterChip propertyId={propertyId} onClear={clearPropertyFilter} /> : null}
          </header>

          <div className="mt-8 flex h-11 w-fit items-center rounded-full bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            {TABS.map((tabOption) => (
              <button
                key={tabOption}
                type="button"
                onClick={() => selectTab(tabOption)}
                aria-pressed={tab === tabOption}
                className={`h-9 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === tabOption ? "bg-black text-white" : "text-black/55 hover:text-black"
                }`}
              >
                {tabOption}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {tab === "Payments" ? (
              <PaymentsTab
                payments={visiblePayments}
                allCount={scopedPayments.length}
                filter={filter}
                onFilterChange={setFilter}
                selected={selectedPayment}
                onSelect={setSelectedId}
                professionalId={professional.id}
                propertyScoped={Boolean(propertyId)}
              />
            ) : tab === "Billing Schedules" ? (
              // Billing Schedules and Payouts are the paid "in-app rent
              // collection" feature (agent.rentCollection) -- Payments
              // above stays free, exactly as it already was as its own
              // page before this merge; nothing free became paywalled by
              // combining the two.
              isPaidTier(tier) ? (
                <BillingSchedulesTable rentals={activeRentals} />
              ) : (
                <LockedPanel feature="agent.rentCollection" />
              )
            ) : isPaidTier(tier) ? (
              <PayoutsPanel professionalId={professional.id} />
            ) : (
              <LockedPanel feature="agent.rentCollection" />
            )}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

function PropertyFilterChip({ propertyId, onClear }: { propertyId: string; onClear: () => void }) {
  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/4.5 py-1.5 pr-1.5 pl-4 text-sm font-medium">
      <span>{resolveAnyPropertyTitle(propertyId)}</span>
      <button type="button" onClick={onClear} aria-label="Clear property filter" className="flex size-6 items-center justify-center rounded-full bg-black/10 hover:bg-black/20">
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

function PaymentsTab({
  payments,
  allCount,
  filter,
  onFilterChange,
  selected,
  onSelect,
  professionalId,
  propertyScoped,
}: {
  payments: OwnerPayment[];
  allCount: number;
  filter: PaymentFilter;
  onFilterChange: (filter: PaymentFilter) => void;
  selected: OwnerPayment | null;
  onSelect: (id: string) => void;
  professionalId: string;
  propertyScoped: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {PAYMENT_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            aria-pressed={filter === f}
            className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${filter === f ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {allCount === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
          <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
          <h3 className="font-bricolage mt-5 text-xl font-medium">{propertyScoped ? "No payment activity for this property yet" : "No payment activity yet"}</h3>
          <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">
            {propertyScoped ? "Payment activity for this property will appear here." : "Rent payment activity for your managed rentals will appear here."}
          </p>
        </div>
      ) : payments.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
          <h3 className="font-bricolage text-xl font-medium">No payments match this filter</h3>
        </div>
      ) : (
        <div className="mt-6 grid overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
          <div className="divide-y divide-black/8 border-b border-black/10 lg:max-h-[70vh] lg:overflow-y-auto lg:border-r lg:border-b-0">
            {payments.map((payment) => (
              <button
                key={payment.id}
                type="button"
                onClick={() => onSelect(payment.id)}
                className={`block w-full p-5 text-left transition-colors ${selected?.id === payment.id ? "bg-black/4.5" : "hover:bg-black/2"}`}
              >
                <p className="truncate font-medium">{payment.renter}</p>
                <p className="text-carbon-500 mt-1 truncate text-sm">
                  {resolveAnyPropertyTitle(payment.propertyId)} · {payment.purpose}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-bricolage font-medium">{payment.amount}</span>
                  <StatusPill status={payment.status} />
                </div>
                <p className="text-carbon-400 mt-1 text-xs">{payment.date}</p>
              </button>
            ))}
          </div>
          <div className="min-w-0 p-6 sm:p-8">{selected ? <PaymentDetail payment={selected} professionalId={professionalId} /> : <p className="text-carbon-500 text-sm">Select a payment to view details.</p>}</div>
        </div>
      )}
    </div>
  );
}

function PaymentDetail({ payment, professionalId }: { payment: OwnerPayment; professionalId: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <h2 className="font-bricolage text-xl font-medium">{payment.amount}</h2>
          <p className="text-carbon-500 mt-1 text-sm">{payment.purpose}</p>
        </div>
        <StatusPill status={payment.status} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-carbon-400 text-xs">Renter</dt>
          <dd className="mt-1 font-medium">{payment.renter}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Property</dt>
          <dd className="mt-1 font-medium">{resolveAnyPropertyTitle(payment.propertyId)}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Date</dt>
          <dd className="mt-1 font-medium">{payment.date}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Method</dt>
          <dd className="mt-1 font-medium">{payment.method}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Reference</dt>
          <dd className="mt-1 font-medium">{payment.reference}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Rental</dt>
          <dd className="mt-1 font-medium">{payment.rentalId}</dd>
        </div>
      </dl>

      {payment.status === "Overdue" ? (
        <div className="mt-6 rounded-2xl bg-black/3 p-4">
          <p className="font-medium">Overdue</p>
          <p className="text-carbon-600 mt-1.5 text-sm leading-6">{payment.date}</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {payment.renter === RENTER_DEMO_NAME
          ? (() => {
              const conversation = getOrCreateConversation(professionalId, RENTER_PARTICIPANT_ID, {
                type: "rental",
                propertyId: payment.propertyId,
                rentalId: payment.rentalId,
                label: "Payment",
              });
              if (!conversation) return null;
              return (
                <a
                  href={`/partner-dashboard/messages?open=${conversation.id}`}
                  className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
                >
                  <MessageSquare aria-hidden="true" className="size-4" />
                  Message {payment.renter}
                </a>
              );
            })()
          : null}
        {payment.status !== "Paid" ? (
          <button
            type="button"
            onClick={() => updateOwnerPayment(payment.id, { status: "Paid", date: "Just now" })}
            className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"
          >
            Mark as Paid
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BillingSchedulesTable({ rentals }: { rentals: OwnerRental[] }) {
  if (rentals.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
        <p className="text-carbon-500 text-sm">No active rentals yet -- billing schedules appear once a rental starts.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[1.5rem] bg-white shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="text-carbon-500 border-b border-black/8 text-xs">
            <th scope="col" className="px-6 py-4 font-medium">
              Tenant
            </th>
            <th scope="col" className="px-6 py-4 font-medium">
              Property
            </th>
            <th scope="col" className="px-6 py-4 font-medium">
              Monthly rent
            </th>
            <th scope="col" className="px-6 py-4 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock aria-hidden="true" className="size-3.5" />
                Collection status
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/8">
          {rentals.map((rental) => (
            <tr key={rental.id}>
              <td className="text-carbon-900 px-6 py-4 font-medium">{rental.renter}</td>
              <td className="text-carbon-600 px-6 py-4">{resolveAnyPropertyTitle(rental.propertyId)}</td>
              <td className="text-carbon-900 px-6 py-4 font-medium whitespace-nowrap">{rental.rent}</td>
              <td className="px-6 py-4">
                <StatusPill status={rental.paymentStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
