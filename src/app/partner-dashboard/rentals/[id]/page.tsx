"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useReducer } from "react";
import { ChevronLeft, FileText, MessageSquare } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { getPropertyAccessDetail, resolveAnyPropertyLocation, resolveAnyPropertyTitle, subscribeToIndependentProperties } from "@/lib/professional-properties";
import { getMaintenanceForProperty, getPaymentsForRental, getRental, subscribeToPmWork } from "@/lib/pm-work";
import { subscribeToProfessionalWork } from "@/lib/professional-work";
import { RENTER_DEMO_NAME } from "@/lib/owner-data";
import { RENTER_PARTICIPANT_ID, getOrCreateConversation } from "@/lib/messages-data";

// Property Manager Dashboard phase -- Section 38-41. Rental Detail is the
// PM's tenancy operations workspace -- distinct from Property Detail
// (Section 38: "do not duplicate full Property Detail"). Sections: Overview,
// Agreement, Payments, Maintenance, Activity. Every figure here is read
// straight from the SAME OwnerRental/OwnerPayment/MaintenanceRequest records
// Owner already sees -- never a second PM-only rental dataset.

export default function RentalDetailPage() {
  const params = useParams<{ id: string }>();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);
  useEffect(() => subscribeToProfessionalWork(forceUpdate), []);

  const professional = useDemoProfessional("property_manager");
  const rental = getRental(params.id);
  const card = professional && rental ? getPropertyAccessDetail(professional.id, rental.propertyId) : null;

  if (!professional || !rental || !card) return notFound();

  const payments = getPaymentsForRental(professional.id, rental.id);
  const maintenance = getMaintenanceForProperty(professional.id, rental.propertyId);

  const activity = [
    { text: `Rental created for ${rental.renter}.`, note: rental.note },
    ...payments.map((p) => ({ text: `${p.purpose} — ${p.status}`, note: p.date })),
    ...maintenance.map((m) => ({ text: `Maintenance: ${m.title} — ${m.status}`, note: m.submitted })),
  ];

  return (
    <DashboardShell initialSection="rentals">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-300">
          <Link href="/partner-dashboard/rentals" className="text-carbon-500 inline-flex items-center gap-1 text-sm font-medium hover:text-black">
            <ChevronLeft className="size-4" />
            Rentals
          </Link>

          <header className="mt-4 flex flex-col gap-6 border-b border-black/10 pb-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
                <Image src={card.image} alt="" fill className="object-cover" />
              </span>
              <div>
                <h1 className="font-bricolage text-carbon-900 text-2xl font-medium">{resolveAnyPropertyTitle(rental.propertyId)}</h1>
                <p className="text-carbon-500 mt-2 text-sm">{resolveAnyPropertyLocation(rental.propertyId)}</p>
                <p className="text-carbon-500 mt-1 text-sm">Renter: <span className="text-carbon-900 font-medium">{rental.renter}</span></p>
              </div>
            </div>
            <StatusPill status={rental.status} />
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <div className="space-y-6">
              <OverviewSection rental={rental} paymentsCount={payments.length} maintenanceOpen={maintenance.filter((m) => m.status !== "Resolved" && m.status !== "Cancelled").length} />
              <AgreementSection rental={rental} />
              <PaymentsSection payments={payments} rentalId={rental.id} propertyId={rental.propertyId} />
              <MaintenanceSection maintenance={maintenance} propertyId={rental.propertyId} />
              <ActivitySection items={activity} />
            </div>
            <aside>
              <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
                <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Contacts</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-carbon-400 text-xs">Renter</dt>
                    <dd className="mt-1 font-medium">{rental.renter}</dd>
                  </div>
                  <div>
                    <dt className="text-carbon-400 text-xs">Property Owner</dt>
                    <dd className="mt-1 font-medium">{card.source === "TEAM_ASSIGNMENT" ? card.propertyOwnerName : card.ownerName}</dd>
                  </div>
                </dl>
                {rental.renter === RENTER_DEMO_NAME
                  ? (() => {
                      // Messages Synchronization phase -- Section 28/81:
                      // resolves the real shared conversation with the
                      // renter instead of a name-matched link.
                      const conversation = getOrCreateConversation(professional.id, RENTER_PARTICIPANT_ID, {
                        type: "rental",
                        propertyId: rental.propertyId,
                        rentalId: rental.id,
                        label: "Rental",
                      });
                      if (!conversation) return null;
                      return (
                        <Link
                          href={`/partner-dashboard/messages?open=${conversation.id}`}
                          className="font-bricolage mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium hover:border-black"
                        >
                          <MessageSquare aria-hidden="true" className="size-4" />
                          Message {rental.renter}
                        </Link>
                      );
                    })()
                  : null}
              </section>
            </aside>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

function OverviewSection({ rental, paymentsCount, maintenanceOpen }: { rental: ReturnType<typeof getRental>; paymentsCount: number; maintenanceOpen: number }) {
  if (!rental) return null;
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Overview</h2>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-carbon-400 text-xs">Monthly rent</dt>
          <dd className="mt-1 font-medium">{rental.rent}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Lease start</dt>
          <dd className="mt-1 font-medium">{rental.start}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Lease end</dt>
          <dd className="mt-1 font-medium">{rental.end}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Payment status</dt>
          <dd className="mt-1"><StatusPill status={rental.paymentStatus} /></dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Payments on record</dt>
          <dd className="mt-1 font-medium">{paymentsCount}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Open maintenance</dt>
          <dd className="mt-1 font-medium">{maintenanceOpen}</dd>
        </div>
      </dl>
      <p className="text-carbon-500 mt-5 border-t border-black/8 pt-4 text-sm leading-6">{rental.note}</p>
    </section>
  );
}

function AgreementSection({ rental }: { rental: NonNullable<ReturnType<typeof getRental>> }) {
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Agreement</h2>
        <StatusPill status={rental.agreementStatus} />
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-black/3 p-4">
        <FileText aria-hidden="true" className="size-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{resolveAnyPropertyTitle(rental.propertyId)} Rental Agreement</p>
          <p className="text-carbon-500 text-xs">{rental.start} – {rental.end}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-carbon-400 text-xs">Deposit</dt>
          <dd className="mt-1"><StatusPill status={rental.depositStatus} /></dd>
        </div>
      </dl>
    </section>
  );
}

function PaymentsSection({ payments, rentalId, propertyId }: { payments: ReturnType<typeof getPaymentsForRental>; rentalId: string; propertyId: string }) {
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Payments</h2>
        <Link href={`/partner-dashboard/payments?propertyId=${encodeURIComponent(propertyId)}`} className="text-sm font-medium underline underline-offset-4">
          View all
        </Link>
      </div>
      {payments.length === 0 ? (
        <p className="text-carbon-500 mt-3 text-sm">No payment activity for this rental yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/8">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="truncate">{p.purpose}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="font-medium">{p.amount}</span>
                <StatusPill status={p.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-carbon-400 mt-3 text-xs">Rental ID {rentalId}</p>
    </section>
  );
}

function MaintenanceSection({ maintenance, propertyId }: { maintenance: ReturnType<typeof getMaintenanceForProperty>; propertyId: string }) {
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Maintenance</h2>
        <Link href={`/partner-dashboard/maintenance?propertyId=${encodeURIComponent(propertyId)}`} className="text-sm font-medium underline underline-offset-4">
          View all
        </Link>
      </div>
      {maintenance.length === 0 ? (
        <p className="text-carbon-500 mt-3 text-sm">No maintenance requests for this property.</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/8">
          {maintenance.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="truncate">{m.title}</span>
              <StatusPill status={m.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivitySection({ items }: { items: { text: string; note?: string }[] }) {
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-6">
      <h2 className="font-bricolage text-carbon-900 text-lg font-medium">Activity</h2>
      <ul className="mt-4 space-y-4 border-l border-black/10 pl-4">
        {items.map((item, i) => (
          <li key={i} className="relative text-sm">
            <span className="absolute top-1.5 -left-[19px] size-2 rounded-full bg-black" aria-hidden="true" />
            <p>{item.text}</p>
            {item.note ? <p className="text-carbon-400 mt-0.5 text-xs">{item.note}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
