"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import Image from "next/image";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { resolveAnyPropertyTitle, subscribeToIndependentProperties } from "@/lib/professional-properties";
import { getPaymentsFor, subscribeToPmWork } from "@/lib/pm-work";
import { RENTER_DEMO_NAME, updateOwnerPayment, type OwnerPayment } from "@/lib/owner-data";
import { RENTER_PARTICIPANT_ID, getOrCreateConversation } from "@/lib/messages-data";
import emptyIllustration from "@/assets/images/empty.png";

// Property Manager Dashboard phase -- Section 42-47. Payments is
// MONITORING, not accounting: who has paid, who hasn't, what's due soon.
// Reuses owner-data.ts's real OwnerPayment records (pm-work.ts's
// getPaymentsFor, scoped to properties this PM has "Track rent payments"
// for) -- the same record the Owner dashboard already shows. Marking a
// payment "Paid" here is a mock action (Section 79 -- no real payment
// processing), but it's the same updateOwnerPayment the Owner's own
// override store uses, so both sides see the identical result.

type Filter = "All" | "Due" | "Overdue" | "Paid";
const FILTERS: Filter[] = ["All", "Due", "Overdue", "Paid"];

export default function Page() {
  return (
    <Suspense>
      <PmPaymentsPage />
    </Suspense>
  );
}

function PmPaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("open"));
  const professional = useDemoProfessional("property_manager");

  if (!professional) {
    return (
      <DashboardShell initialSection="payments">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const propertyId = searchParams.get("propertyId");
  const all = getPaymentsFor(professional.id);
  const scoped = propertyId ? all.filter((p) => p.propertyId === propertyId) : all;
  const visible =
    filter === "All"
      ? scoped
      : filter === "Due"
        ? scoped.filter((p) => p.status === "Due" || p.status === "Pending")
        : scoped.filter((p) => p.status === filter);

  const selected = scoped.find((p) => p.id === selectedId) ?? null;

  function clearPropertyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("propertyId");
    const query = params.toString();
    router.replace(`/partner-dashboard/payments${query ? `?${query}` : ""}`);
  }

  return (
    <DashboardShell initialSection="payments">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Payments</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">Rent activity for the rentals you manage. This is monitoring, not accounting -- HauxHunt does not process payments.</p>
            {propertyId ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/4.5 py-1.5 pr-1.5 pl-4 text-sm font-medium">
                <span>{resolveAnyPropertyTitle(propertyId)}</span>
                <button type="button" onClick={clearPropertyFilter} aria-label="Clear property filter" className="flex size-6 items-center justify-center rounded-full bg-black/10 hover:bg-black/20">
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            ) : null}
          </header>

          <div className="mt-7 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${filter === f ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
              >
                {f}
              </button>
            ))}
          </div>

          {scoped.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
              <h3 className="font-bricolage mt-5 text-xl font-medium">{propertyId ? "No payment activity for this property yet" : "No payment activity yet"}</h3>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">
                {propertyId ? "Payment activity for this property will appear here." : "Rent payment activity for your managed rentals will appear here."}
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <h3 className="font-bricolage text-xl font-medium">No payments match this filter</h3>
            </div>
          ) : (
            <div className="mt-6 grid overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
              <div className="divide-y divide-black/8 border-b border-black/10 lg:max-h-[70vh] lg:overflow-y-auto lg:border-r lg:border-b-0">
                {visible.map((payment) => (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => setSelectedId(payment.id)}
                    className={`block w-full p-5 text-left transition-colors ${selected?.id === payment.id ? "bg-black/4.5" : "hover:bg-black/2"}`}
                  >
                    <p className="truncate font-medium">{payment.renter}</p>
                    <p className="text-carbon-500 mt-1 truncate text-sm">{resolveAnyPropertyTitle(payment.propertyId)} · {payment.purpose}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-bricolage font-medium">{payment.amount}</span>
                      <StatusPill status={payment.status} />
                    </div>
                    <p className="text-carbon-400 mt-1 text-xs">{payment.date}</p>
                  </button>
                ))}
              </div>
              <div className="min-w-0 p-6 sm:p-8">{selected ? <PaymentDetail payment={selected} professionalId={professional.id} /> : <p className="text-carbon-500 text-sm">Select a payment to view details.</p>}</div>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
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
              // Messages Synchronization phase -- Section 28: resolves the
              // real shared conversation with the renter instead of a
              // name-matched link.
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
