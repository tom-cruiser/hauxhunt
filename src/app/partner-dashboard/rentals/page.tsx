"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useState } from "react";
import { X } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { getPropertyAccessDetail, resolveAnyPropertyTitle, subscribeToIndependentProperties } from "@/lib/professional-properties";
import { getMaintenanceForProperty, getRentalsFor, subscribeToPmWork } from "@/lib/pm-work";
import type { OwnerRental, RentalStatus } from "@/lib/owner-data";
import emptyIllustration from "@/assets/images/empty.png";

// Property Manager Dashboard phase -- Section 35-37. Rentals is a new
// top-level PM surface representing active and lifecycle-managed tenancies
// -- the exact same OwnerRental records the Owner dashboard already reads
// (via pm-work.ts's getRentalsFor, scoped to properties this PM manages AND
// holds "Manage active rentals" for). "Setup" maps to the existing
// RentalStatus "Upcoming" -- a relabeling for PM's mental model, not a new
// status.

type Tab = "All" | "Setup" | "Active" | "Ending Soon" | "Ended";
const TABS: Tab[] = ["All", "Setup", "Active", "Ending Soon", "Ended"];

function statusForTab(tab: Tab): RentalStatus | null {
  if (tab === "Setup") return "Upcoming";
  if (tab === "All") return null;
  return tab as RentalStatus;
}

export default function Page() {
  return (
    <Suspense>
      <PmRentalsPage />
    </Suspense>
  );
}

function PmRentalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const [tab, setTab] = useState<Tab>("All");
  const professional = useDemoProfessional("property_manager");

  if (!professional) {
    return (
      <DashboardShell initialSection="rentals">
        <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const propertyId = searchParams.get("propertyId");
  const openId = searchParams.get("open");
  const allRentals = getRentalsFor(professional.id);
  const scoped = propertyId ? allRentals.filter((r) => r.propertyId === propertyId) : allRentals;
  const wantedStatus = statusForTab(tab);
  const visible = wantedStatus ? scoped.filter((r) => r.status === wantedStatus) : scoped;

  function clearPropertyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("propertyId");
    const query = params.toString();
    router.replace(`/partner-dashboard/rentals${query ? `?${query}` : ""}`);
  }

  return (
    <DashboardShell initialSection="rentals">
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Rentals</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">Active and lifecycle-managed tenancies for the properties you manage.</p>
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
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${tab === t ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
              >
                {t} <span className="ml-1 opacity-60">{(statusForTab(t) ? scoped.filter((r) => r.status === statusForTab(t)) : scoped).length}</span>
              </button>
            ))}
          </div>

          {scoped.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
              <h3 className="font-bricolage mt-5 text-xl font-medium">{propertyId ? "No rentals for this property yet" : "No rentals yet"}</h3>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">
                {propertyId ? "Rentals for this property will appear here." : "Active rentals and rental setups for the properties you manage will appear here."}
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <h3 className="font-bricolage text-xl font-medium">No {tab.toLowerCase()} rentals</h3>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((rental) => (
                <RentalCard key={rental.id} rental={rental} professionalId={professional.id} highlighted={rental.id === openId} />
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function RentalCard({ rental, professionalId, highlighted }: { rental: OwnerRental; professionalId: string; highlighted: boolean }) {
  const card = getPropertyAccessDetail(professionalId, rental.propertyId);
  const maintenanceOpen = getMaintenanceForProperty(professionalId, rental.propertyId).filter((m) => m.status !== "Resolved" && m.status !== "Cancelled").length;

  return (
    <Link
      href={`/partner-dashboard/rentals/${rental.id}`}
      className={`block overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,0.09)] ${highlighted ? "ring-2 ring-black" : ""}`}
    >
      <div className="flex items-center gap-4 p-5">
        {card ? <Image src={card.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" /> : null}
        <div className="min-w-0">
          <p className="truncate font-medium">{resolveAnyPropertyTitle(rental.propertyId)}</p>
          <p className="text-carbon-500 truncate text-sm">{rental.renter}</p>
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
        <div>
          <dt className="text-carbon-400">Lease</dt>
          <dd className="text-carbon-900 mt-0.5 font-medium">{rental.start} – {rental.end}</dd>
        </div>
        <div>
          <dt className="text-carbon-400">Maintenance</dt>
          <dd className="text-carbon-900 mt-0.5 font-medium">{maintenanceOpen} open</dd>
        </div>
      </dl>
      <div className="flex items-center justify-between border-t border-black/8 px-5 py-3">
        <StatusPill status={rental.status} />
      </div>
    </Link>
  );
}
