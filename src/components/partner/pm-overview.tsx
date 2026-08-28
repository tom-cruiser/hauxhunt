"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer } from "react";
import { ArrowUpRight, Building2, ClipboardCheck, CreditCard, KeyRound, Wallet, Wrench } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { getPendingInvitationsFor, subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { getProfessionalPropertyCards, resolveAnyPropertyTitle, subscribeToIndependentProperties, type ProfessionalPropertyCard } from "@/lib/professional-properties";
import { getApplicationsFor, subscribeToProfessionalWork, type AgentApplicationView } from "@/lib/professional-work";
import { getMaintenanceFor, getPaymentsFor, getRentalsFor, subscribeToPmWork } from "@/lib/pm-work";
import { formatRwf, type OwnerPayment } from "@/lib/owner-data";
import type { MaintenanceRequest } from "@/lib/maintenance-data";
import emptyIllustration from "@/assets/images/empty.png";

// Property Manager Dashboard phase -- Section 7-11/89. The Overview a PM
// actually needs: what requires attention, what's happening across managed
// properties, rentals, payments, maintenance, and applications. No fake
// revenue, no CRM metrics -- every number here is a real, scoped count from
// professional-properties.ts / professional-work.ts / pm-work.ts.

const ACTIVE_APPLICATION_STATUSES = new Set(["Submitted", "Under Review", "Action Required", "Decision Pending"]);
const NEW_MAINTENANCE_STATUSES = new Set(["Submitted", "Under Review"]);

export function PmOverview() {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToProfessionalWork(forceUpdate), []);
  useEffect(() => subscribeToPmWork(forceUpdate), []);

  const professional = useDemoProfessional("property_manager");

  if (!professional) {
    return (
      <DashboardShell>
        <section className="px-5 pt-10 pb-24 sm:px-6 lg:px-10 xl:px-12">
          <p className="text-carbon-500 mx-auto max-w-180 text-sm">We couldn&apos;t determine your professional identity for this demo.</p>
        </section>
      </DashboardShell>
    );
  }

  const properties = getProfessionalPropertyCards(professional.id);
  const rentals = getRentalsFor(professional.id);
  const payments = getPaymentsFor(professional.id);
  const maintenance = getMaintenanceFor(professional.id);
  const applications = getApplicationsFor(professional.id);
  const pendingInvitations = getPendingInvitationsFor(professional.id);

  const activeRentals = rentals.filter((r) => r.status === "Active");
  // Rent Collected KPI (Finance phase) -- the "Rent collected" card's
  // destination is /partner-dashboard/finance, whose Payout history tab
  // shows this exact same `payments` array. Sums real Paid amounts only,
  // never an estimate -- same rule pm-overview.tsx already follows for
  // every other stat here.
  const rentCollected = payments.filter((p) => p.status === "Paid").reduce((sum, p) => sum + p.amountValue, 0);
  const paymentsDueOrOverdue = payments.filter((p) => p.status === "Due" || p.status === "Pending" || p.status === "Overdue");
  const overduePayments = payments.filter((p) => p.status === "Overdue");
  const openMaintenance = maintenance.filter((m) => m.status !== "Resolved" && m.status !== "Cancelled");
  const newMaintenance = maintenance.filter((m) => NEW_MAINTENANCE_STATUSES.has(m.status));
  const activeApplications = applications.filter((a) => ACTIVE_APPLICATION_STATUSES.has(a.status));
  const applicationsNeedingReview = applications.filter((a) => a.status === "Submitted" || a.status === "Under Review" || a.status === "Action Required");
  const attentionAuthorizations = properties.filter((p) => p.source === "INDEPENDENT_AUTHORIZATION" && (p.authorizationStatus === "Needs Attention" || p.authorizationStatus === "Rejected"));

  type AttentionItem = { key: string; text: string; href: string };
  const attentionItems: AttentionItem[] = [
    ...applicationsNeedingReview.map((a) => ({
      key: `app-${a.id}`,
      text: `${a.applicant}'s application for ${resolveAnyPropertyTitle(a.propertyId)} needs review.`,
      href: `/partner-dashboard/applications?open=${a.id}`,
    })),
    ...overduePayments.map((p) => ({
      key: `pay-${p.id}`,
      text: `${p.renter}'s payment for ${resolveAnyPropertyTitle(p.propertyId)} is overdue.`,
      href: `/partner-dashboard/finance?tab=payments&open=${p.id}`,
    })),
    ...newMaintenance.map((m) => ({
      key: `mnt-${m.id}`,
      text: `${m.title} at ${resolveAnyPropertyTitle(m.propertyId)} needs review.`,
      href: `/partner-dashboard/maintenance?open=${m.id}`,
    })),
    ...attentionAuthorizations.map((p) => ({
      key: `auth-${p.propertyId}`,
      text: `Your authorization for ${p.title} needs attention.`,
      href: `/partner-dashboard/properties/${p.propertyId}`,
    })),
    ...pendingInvitations.map((inv) => ({
      key: `inv-${inv.id}`,
      text: `You have a pending Team invitation.`,
      href: `/partner-dashboard/team`,
    })),
  ];

  const allCaughtUp = attentionItems.length === 0;

  return (
    <DashboardShell>
      <section className="px-5 pt-10 pb-24 sm:px-6 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="border-b border-black/10 pb-8">
            <h1 className="dashboard-page-title text-carbon-900">Welcome back, {professional.name.split(" ")[0]}</h1>
            <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">Here&apos;s what needs your attention across the properties you manage.</p>
          </header>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={Building2} label="Managed Properties" value={properties.length} />
            <StatCard icon={KeyRound} label="Active Rentals" value={activeRentals.length} />
            <StatCard icon={CreditCard} label="Payments Due / Overdue" value={paymentsDueOrOverdue.length} />
            <StatCard icon={Wrench} label="Open Maintenance" value={openMaintenance.length} />
            <StatCard icon={ClipboardCheck} label="Active Applications" value={activeApplications.length} />
            <StatCard
              icon={Wallet}
              label="Rent Collected"
              value={formatRwf(rentCollected)}
              href="/partner-dashboard/finance"
              ariaLabel="View rent collection payout history and billing schedules"
            />
          </div>

          {allCaughtUp ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-[1.75rem] bg-white px-6 py-16 text-center shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
              <Image src={emptyIllustration} alt="" className="h-28 w-auto object-contain" />
              <h2 className="font-bricolage text-carbon-900 mt-5 text-2xl font-medium">You&apos;re all caught up</h2>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">Important property and rental activity will appear here.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              <section className="rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                <SectionHeader title="Needs Your Attention" description="Items that need a decision or action from you." />
                <ul className="divide-y divide-black/8">
                  {attentionItems.map((item) => (
                    <li key={item.key}>
                      <Link href={item.href} className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-black/2 sm:p-6">
                        <span className="text-sm leading-6">{item.text}</span>
                        <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="grid gap-8 xl:grid-cols-2">
                <MaintenanceCard items={openMaintenance.slice(0, 3)} />
                <PaymentsCard items={payments.slice(0, 3)} />
              </div>

              <ApplicationsCard items={activeApplications.slice(0, 3)} />

              <section className="rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                <SectionHeader title="Managed Properties" description="Properties you manage, across every Team and Independent authorization." action="View all" actionHref="/partner-dashboard/properties" />
                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
                  {properties.slice(0, 4).map((property) => (
                    <PropertyMiniCard key={property.propertyId} card={property} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  ariaLabel,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
  /** Makes the card a real link -- e.g. Rent Collected's Finance destination. */
  href?: string;
  ariaLabel?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-5">
        <p className="text-carbon-500 text-sm">{label}</p>
        <span className="flex items-center">
          <Icon aria-hidden="true" className="size-5" />
          {href ? (
            <ArrowUpRight
              aria-hidden="true"
              className="ml-0.5 size-4 max-w-0 -translate-x-1 opacity-0 transition-[opacity,transform,max-width] duration-200 group-hover:max-w-4 group-hover:translate-x-0 group-hover:opacity-100"
            />
          ) : null}
        </span>
      </div>
      <p className="font-bricolage text-carbon-900 mt-5 text-4xl font-medium tracking-tight">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel ?? label}
        className="group rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(0,0,0,0.045)] transition-all duration-200 hover:border-black/20 hover:shadow-[0_16px_40px_rgba(0,0,0,0.09)]"
      >
        {body}
      </Link>
    );
  }

  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
      {body}
    </article>
  );
}

function SectionHeader({ title, description, action, actionHref }: { title: string; description: string; action?: string; actionHref?: string }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-black/10 p-5 sm:p-6">
      <div>
        <h2 className="font-bricolage text-carbon-900 text-xl font-medium">{title}</h2>
        <p className="text-carbon-500 mt-1 text-sm">{description}</p>
      </div>
      {action && actionHref ? (
        <Link href={actionHref} className="font-bricolage shrink-0 text-sm font-medium underline underline-offset-4">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

function MaintenanceCard({ items }: { items: MaintenanceRequest[] }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
      <SectionHeader title="Open Maintenance" description="Requests renters have filed for your properties." action="View all" actionHref="/partner-dashboard/maintenance" />
      {items.length === 0 ? (
        <p className="text-carbon-500 p-5 text-sm sm:p-6">No open maintenance requests.</p>
      ) : (
        <ul className="divide-y divide-black/8">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`/partner-dashboard/maintenance?open=${m.id}`} className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-black/2 sm:p-6">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.title}</p>
                  <p className="text-carbon-500 mt-1 truncate text-sm">{resolveAnyPropertyTitle(m.propertyId)}</p>
                </div>
                <StatusPill status={m.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PaymentsCard({ items }: { items: OwnerPayment[] }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
      <SectionHeader title="Recent Payments" description="Rent activity for the rentals you manage." action="View all" actionHref="/partner-dashboard/finance?tab=payments" />
      {items.length === 0 ? (
        <p className="text-carbon-500 p-5 text-sm sm:p-6">No payment activity yet.</p>
      ) : (
        <ul className="divide-y divide-black/8">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/partner-dashboard/payments?open=${p.id}`} className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-black/2 sm:p-6">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.renter}</p>
                  <p className="text-carbon-500 mt-1 truncate text-sm">{resolveAnyPropertyTitle(p.propertyId)} · {p.amount}</p>
                </div>
                <StatusPill status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ApplicationsCard({ items }: { items: AgentApplicationView[] }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
      <SectionHeader title="Applications" description="Applications awaiting review or decision." action="View all" actionHref="/partner-dashboard/applications" />
      {items.length === 0 ? (
        <p className="text-carbon-500 p-5 text-sm sm:p-6">No applications need attention right now.</p>
      ) : (
        <ul className="divide-y divide-black/8 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`/partner-dashboard/applications?open=${a.id}`} className="block p-5 transition-colors hover:bg-black/2 sm:p-6">
                <p className="truncate font-medium">{a.applicant}</p>
                <p className="text-carbon-500 mt-1 truncate text-sm">{resolveAnyPropertyTitle(a.propertyId)}</p>
                <div className="mt-3"><StatusPill status={a.status} /></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PropertyMiniCard({ card }: { card: ProfessionalPropertyCard }) {
  return (
    <Link href={`/partner-dashboard/properties/${card.propertyId}`} className="block rounded-2xl bg-black/3 p-4 transition-colors hover:bg-black/5">
      <div className="flex items-center gap-3">
        <Image src={card.image} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{card.title}</p>
          <p className="text-carbon-500 truncate text-xs">{card.location}</p>
        </div>
      </div>
    </Link>
  );
}
