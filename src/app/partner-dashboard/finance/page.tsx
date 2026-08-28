"use client";

import { useEffect, useReducer, useState } from "react";
import { Wallet } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { LockedPanel } from "@/components/tier/locked-feature";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { subscribeToTeam } from "@/lib/team-data";
import { resolveAnyPropertyTitle, subscribeToIndependentProperties } from "@/lib/professional-properties";
import { getPaymentsFor, getRentalsFor, subscribeToPmWork } from "@/lib/pm-work";
import { isPaidTier, useTier } from "@/hooks/use-tier";
import type { OwnerPayment, OwnerRental } from "@/lib/owner-data";

// Property Manager Dashboard phase -- the "Rent Collected" KPI card's
// destination (pm-overview.tsx). Reuses the exact same OwnerPayment/
// OwnerRental records the Payments and Rentals pages already read
// (pm-work.ts) -- there is no separate finance dataset. Free-tier PMs see
// the tabs but not the tables, behind the same `LockedPanel` used for every
// other full-section paywall in this app; paid PMs see the real thing.

const TABS = ["Payout history", "Active billing schedules"] as const;
type FinanceTab = (typeof TABS)[number];

export default function FinancePage() {
  const [tab, setTab] = useState<FinanceTab>("Payout history");
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const tier = useTier();
  const professional = useDemoProfessional("property_manager");

  if (!professional) {
    return (
      <DashboardShell initialSection="finance">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const payments = getPaymentsFor(professional.id);
  const activeRentals = getRentalsFor(professional.id).filter((r) => r.status === "Active");

  return (
    <DashboardShell initialSection="finance">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1120px]">
          <header className="border-b border-black/10 pb-8">
            <span className="flex size-12 items-center justify-center rounded-full bg-black text-white">
              <Wallet aria-hidden="true" className="size-5" />
            </span>
            <h1 className="dashboard-page-title text-carbon-900 mt-6">Rent & Finance</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Track in-app rent collection, active billing schedules, and past payouts for the properties you manage.
            </p>
          </header>

          <div className="mt-8 flex h-11 w-fit items-center rounded-full bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            {TABS.map((tabOption) => (
              <button
                key={tabOption}
                type="button"
                onClick={() => setTab(tabOption)}
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
            {!isPaidTier(tier) ? (
              <LockedPanel feature="agent.rentCollection" />
            ) : tab === "Payout history" ? (
              <PayoutHistoryTable payments={payments} />
            ) : (
              <BillingSchedulesTable rentals={activeRentals} />
            )}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

function PayoutHistoryTable({ payments }: { payments: OwnerPayment[] }) {
  if (payments.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
        <p className="text-carbon-500 text-sm">No rent payments recorded yet for the properties you manage.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[1.5rem] bg-white shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="text-carbon-500 border-b border-black/8 text-xs">
            <th scope="col" className="px-6 py-4 font-medium">
              Date
            </th>
            <th scope="col" className="px-6 py-4 font-medium">
              Property
            </th>
            <th scope="col" className="px-6 py-4 font-medium">
              Tenant
            </th>
            <th scope="col" className="px-6 py-4 font-medium">
              Amount
            </th>
            <th scope="col" className="px-6 py-4 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/8">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="text-carbon-500 px-6 py-4 whitespace-nowrap">{payment.date}</td>
              <td className="text-carbon-900 px-6 py-4 font-medium">{resolveAnyPropertyTitle(payment.propertyId)}</td>
              <td className="text-carbon-600 px-6 py-4">{payment.renter}</td>
              <td className="text-carbon-900 px-6 py-4 font-medium whitespace-nowrap">{payment.amount}</td>
              <td className="px-6 py-4">
                <StatusPill status={payment.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
              Collection status
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
