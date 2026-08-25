"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useReducer, useState } from "react";
import { X } from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { formatRwf, getOwnerPayments, propertyTitle, subscribeToOwnerPayments, type OwnerPayment, type PaymentStatus } from "@/lib/owner-data";
import { isPaidTier, useTier } from "@/hooks/use-tier";
import { LockedFeature } from "@/components/tier/locked-feature";

const COLLECTIBLE_STATUSES: PaymentStatus[] = ["Pending", "Overdue", "Due"];

const FILTERS: Array<PaymentStatus | "All"> = ["All", "Paid", "Pending", "Overdue", "Due", "Failed"];

export default function OwnerPaymentsPage() {
  return (
    <Suspense>
      <OwnerPaymentsPageInner />
    </Suspense>
  );
}

function OwnerPaymentsPageInner() {
  const searchParams = useSearchParams();
  // Property Manager Dashboard phase -- Rental Setup (PM side) can create a
  // real OwnerPayment; read through the live getter (like Applications
  // already does) so the Owner sees it too.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToOwnerPayments(forceUpdate), []);

  const allPayments = getOwnerPayments();
  const propertyFilter = searchParams.get("property");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("open"));

  const base = propertyFilter ? allPayments.filter((p) => p.propertyId === propertyFilter) : allPayments;
  const rows = filter === "All" ? base : base.filter((p) => p.status === filter);

  const summary = useMemo(() => {
    const received = allPayments.filter((p) => p.status === "Paid").reduce((sum, p) => sum + p.amountValue, 0);
    const outstanding = allPayments.filter((p) => p.status === "Pending" || p.status === "Overdue" || p.status === "Due").reduce((sum, p) => sum + p.amountValue, 0);
    return { received, outstanding, expected: received + outstanding };
  }, [allPayments]);

  const selected = allPayments.find((p) => p.id === selectedId) ?? null;

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Payments</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Rent activity across your portfolio. This does not include HauxHunt account billing.
            </p>
          </header>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Expected this month" value={formatRwf(summary.expected)} />
            <SummaryCard label="Received" value={formatRwf(summary.received)} />
            <SummaryCard label="Outstanding" value={formatRwf(summary.outstanding)} />
          </div>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
                className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${filter === item ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="divide-y divide-black/8">
              {rows.map((payment) => (
                <button
                  key={payment.id}
                  type="button"
                  onClick={() => setSelectedId(payment.id)}
                  className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-black/2 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div>
                    <p className="font-medium">{payment.purpose}</p>
                    <p className="text-carbon-500 mt-1 text-sm">{payment.renter} · {propertyTitle(payment.propertyId)}</p>
                    <p className="text-carbon-400 mt-0.5 text-xs">{payment.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bricolage text-lg font-medium">{payment.amount}</span>
                    <StatusPill status={payment.status} />
                  </div>
                </button>
              ))}
              {rows.length === 0 ? <p className="text-carbon-500 p-8 text-center text-sm">No payments match this filter.</p> : null}
            </div>
          </div>
        </div>
      </section>

      {selected ? <PaymentDetail payment={selected} onClose={() => setSelectedId(null)} /> : null}
    </OwnerDashboardShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[1.5rem] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <p className="text-carbon-500 text-sm">{label}</p>
      <p className="font-bricolage text-carbon-900 mt-4 text-2xl font-medium tracking-[-0.03em]">{value}</p>
    </article>
  );
}

function PaymentDetail({ payment, onClose }: { payment: OwnerPayment; onClose: () => void }) {
  const tier = useTier();
  const [collected, setCollected] = useState(false);
  const isCollectible = COLLECTIBLE_STATUSES.includes(payment.status);
  const rows: [string, string][] = [
    ["Renter", payment.renter],
    ["Property", propertyTitle(payment.propertyId)],
    ["Rental", payment.rentalId],
    ["Amount", payment.amount],
    ["Purpose", payment.purpose],
    ["Payment date", payment.date],
    ["Payment method", payment.method],
    ["Reference", payment.reference],
    ["Managed by", payment.managedBy ?? "You"],
  ];

  return (
    <div className="fixed inset-0 z-190 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-carbon-400 text-xs">Receipt · {payment.reference}</p>
            <p className="font-bricolage mt-2 text-3xl font-medium">{payment.amount}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={payment.status} />
            <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full hover:bg-black/5">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <dl className="mt-6 divide-y divide-black/8 border-y border-black/8">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[120px_1fr] gap-4 py-3 text-sm">
              <dt className="text-carbon-500">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {isCollectible ? (
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-carbon-500 text-xs">In-app rent collection</p>
            {isPaidTier(tier) ? (
              collected ? (
                <span className="text-carbon-600 text-sm font-medium">
                  Collection request sent to {payment.renter}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setCollected(true)}
                  className="font-bricolage h-10 rounded-full bg-black px-5 text-sm font-medium text-white"
                >
                  Collect rent
                </button>
              )
            ) : (
              <LockedFeature feature="owner.rentCollection" variant="button" label="Collect rent" />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
