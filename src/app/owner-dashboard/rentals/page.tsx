"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { MessageSquare } from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { RENTER_DEMO_NAME, getOwnerPayments, getOwnerProperty, getOwnerRentals, subscribeToOwnerPayments, subscribeToOwnerRentals, type RentalStatus } from "@/lib/owner-data";
import { getMaintenanceRequests, subscribeToMaintenance } from "@/lib/maintenance-data";
import { OWNER_PARTICIPANT_ID, RENTER_PARTICIPANT_ID, getOrCreateConversation } from "@/lib/messages-data";

const TABS: RentalStatus[] = ["Active", "Upcoming", "Ending Soon", "Ended"];

export default function OwnerRentalsPage() {
  return (
    <Suspense>
      <OwnerRentalsPageInner />
    </Suspense>
  );
}

function OwnerRentalsPageInner() {
  const searchParams = useSearchParams();
  // Property Manager Dashboard phase -- Rental Setup (PM side) creates a
  // real OwnerRental/OwnerPayment via owner-data.ts's own override/creation
  // store, so the Owner needs to read through the live getters (like
  // Applications already does) to see it, not the frozen base arrays.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToOwnerRentals(forceUpdate), []);
  useEffect(() => subscribeToOwnerPayments(forceUpdate), []);
  useEffect(() => subscribeToMaintenance(forceUpdate), []);

  const rentalsAll = getOwnerRentals();
  const openParam = searchParams.get("open");
  const openRental = openParam ? rentalsAll.find((r) => r.id === openParam) : null;
  const [tab, setTab] = useState<RentalStatus>(openRental?.status ?? "Active");
  const [selectedId, setSelectedId] = useState<string | null>(openParam);

  const rentals = rentalsAll.filter((r) => r.status === tab);
  const selected = rentalsAll.find((r) => r.id === selectedId) ?? null;

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Rentals</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Every active relationship between one of your properties and a renter.
            </p>
          </header>

          <div className="mt-6 flex gap-1.5">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTab(item);
                  setSelectedId(null);
                }}
                aria-pressed={tab === item}
                className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${tab === item ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
              >
                {item} <span className="ml-1 opacity-60">{rentalsAll.filter((r) => r.status === item).length}</span>
              </button>
            ))}
          </div>

          {rentals.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <h3 className="font-bricolage text-xl font-medium">No {tab.toLowerCase()} rentals</h3>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">You don&apos;t have any {tab.toLowerCase()} rentals yet.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {rentals.map((rental) => {
                const property = getOwnerProperty(rental.propertyId);
                if (!property) return null;
                return (
                  <button
                    key={rental.id}
                    type="button"
                    onClick={() => setSelectedId(rental.id)}
                    className="overflow-hidden rounded-2xl bg-white text-left shadow-[0_14px_38px_rgba(0,0,0,0.055)] transition-shadow hover:shadow-[0_18px_50px_rgba(0,0,0,0.09)]"
                  >
                    <div className="relative flex items-center gap-4 p-5">
                      <Image src={property.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <p className="font-bricolage truncate font-medium">{property.title}</p>
                        <p className="text-carbon-500 mt-1 truncate text-sm">{rental.renter}</p>
                      </div>
                    </div>
                    <dl className="text-carbon-500 grid grid-cols-2 gap-3 border-t border-black/8 px-5 py-4 text-xs">
                      <div>
                        <dt className="text-carbon-400">Rent</dt>
                        <dd className="text-carbon-900 mt-0.5 font-medium">{rental.rent}</dd>
                      </div>
                      <div>
                        <dt className="text-carbon-400">Payment</dt>
                        <dd className="mt-0.5"><StatusPill status={rental.paymentStatus} /></dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
          )}

          {selected ? <RentalDetail rentalId={selected.id} onClose={() => setSelectedId(null)} /> : null}
        </div>
      </section>
    </OwnerDashboardShell>
  );
}

function RentalDetail({ rentalId, onClose }: { rentalId: string; onClose: () => void }) {
  const rental = getOwnerRentals().find((r) => r.id === rentalId);
  if (!rental) return null;
  const property = getOwnerProperty(rental.propertyId);
  const payments = getOwnerPayments().filter((p) => p.rentalId === rental.id);
  const maintenance = getMaintenanceRequests().filter((m) => m.propertyId === rental.propertyId);

  return (
    <div className="fixed inset-0 z-190 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-5">
          <div>
            <p className="text-carbon-400 text-xs">{rental.id}</p>
            <h2 className="font-bricolage mt-1 text-2xl font-medium">{property?.title}</h2>
            <p className="text-carbon-500 mt-1 text-sm">{property?.location}</p>
          </div>
          <StatusPill status={rental.status} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-carbon-400 text-xs">Renter</dt>
            <dd className="mt-1 font-medium">{rental.renter}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Property Manager</dt>
            <dd className="mt-1 font-medium">{property?.propertyManager?.name ?? "You"}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Monthly rent</dt>
            <dd className="mt-1 font-medium">{rental.rent}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Start</dt>
            <dd className="mt-1 font-medium">{rental.start}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">End</dt>
            <dd className="mt-1 font-medium">{rental.end}</dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Payment status</dt>
            <dd className="mt-1"><StatusPill status={rental.paymentStatus} /></dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Agreement</dt>
            <dd className="mt-1"><StatusPill status={rental.agreementStatus} /></dd>
          </div>
          <div>
            <dt className="text-carbon-400 text-xs">Deposit</dt>
            <dd className="mt-1"><StatusPill status={rental.depositStatus} /></dd>
          </div>
        </dl>

        <p className="text-carbon-500 mt-5 border-t border-black/8 pt-4 text-sm">{rental.note}</p>

        {payments.length > 0 ? (
          <div className="mt-6 border-t border-black/10 pt-5">
            <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Payments</p>
            <ul className="mt-3 divide-y divide-black/8">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{p.purpose}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{p.amount}</span>
                    <StatusPill status={p.status} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {maintenance.length > 0 ? (
          <div className="mt-6 border-t border-black/10 pt-5">
            <p className="text-carbon-400 text-xs font-medium tracking-wider uppercase">Maintenance summary</p>
            <ul className="mt-3 divide-y divide-black/8">
              {maintenance.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="truncate">{m.title}</span>
                  <StatusPill status={m.status} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-5">
          {(() => {
            // Messages Synchronization phase -- resolves a real
            // participant/conversation instead of matching by name
            // (Section 37/38: this must open the SAME conversation as
            // Property Detail's Rental tab). PM assigned -> message them;
            // self-managed -> message the renter directly, since there's
            // no PM to reach instead.
            const target = property?.propertyManager
              ? { id: property.propertyManager.professionalId, name: property.propertyManager.name }
              : rental.renter === RENTER_DEMO_NAME
                ? { id: RENTER_PARTICIPANT_ID, name: rental.renter }
                : null;
            if (!target) return null;
            const conversation = getOrCreateConversation(OWNER_PARTICIPANT_ID, target.id, {
              type: "rental",
              propertyId: rental.propertyId,
              rentalId: rental.id,
              label: "Rental",
            });
            if (!conversation) return null;
            return (
              <Link
                href={`/owner-dashboard/messages?open=${conversation.id}`}
                className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
              >
                <MessageSquare aria-hidden="true" className="size-4" />
                Message {target.name}
              </Link>
            );
          })()}
          <button type="button" onClick={onClose} className="font-bricolage inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
