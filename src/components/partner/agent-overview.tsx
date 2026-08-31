"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer } from "react";
import { ArrowUpRight, Bell, Building2, CalendarClock, ClipboardCheck, FileText, Inbox, MessageSquare, Plus } from "lucide-react";

import { DashboardShell } from "@/components/partner/dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { VerificationProgressCard } from "@/components/partner/verification-progress-card";
import { ListingPerformanceCard } from "@/components/partner/listing-performance-card";
import { QuickLinksPanel } from "@/components/partner/quick-links-panel";
import { subscribeToTeam } from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";
import { getProfessionalPropertyCards, resolveAnyPropertyTitle, subscribeToIndependentProperties, type ProfessionalPropertyCard } from "@/lib/professional-properties";
import {
  getApplicationsFor,
  getConversationsFor,
  getEnquiriesFor,
  getProfessionalUnreadCount,
  getViewingsFor,
  subscribeToProfessionalWork,
  type AgentApplicationView,
  type Viewing,
} from "@/lib/professional-work";
import emptyIllustration from "@/assets/images/empty.png";

// Agent Dashboard Redesign phase -- a real, professional-scoped Overview.
// Every number and every row here is read from professional-properties.ts /
// team-data.ts / professional-work.ts for whoever useDemoProfessional
// resolves to (live-updated by Preview As, since every store this reads
// dispatches the same subscribeToTeam / subscribeToIndependentProperties /
// subscribeToProfessionalWork events). No Commission Pipeline, no fictional
// listings, no static "USD 6,420" figures.
//
// Overview Redesign phase -- the layout now mirrors Joseph's earlier
// prototype overview (2-column grid, a persistent right sidebar with
// verification progress / listing performance / quick links) while keeping
// every number this file already computed real. The sidebar is always
// visible, and "Active Properties" always renders, matching that prototype's
// always-populated sections -- only the operational alert sections
// (attention / viewings / applications) fall back to a friendly empty note
// when there is genuinely nothing there.

const UPCOMING_VIEWING_STATUSES = new Set(["Confirmed", "Awaiting Confirmation", "New Time Suggested", "Reschedule Requested"]);
const ACTIVE_APPLICATION_STATUSES = new Set(["Submitted", "Under Review", "Action Required", "Decision Pending"]);

export function AgentOverview() {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  useEffect(() => subscribeToIndependentProperties(forceUpdate), []);
  useEffect(() => subscribeToProfessionalWork(forceUpdate), []);

  const professional = useDemoProfessional("agent");

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
  const enquiries = getEnquiriesFor(professional.id);
  const viewings = getViewingsFor(professional.id);
  const applications = getApplicationsFor(professional.id);
  const conversations = getConversationsFor(professional.id);

  const newEnquiries = enquiries.filter((e) => e.status === "New");
  const upcomingViewings = viewings.filter((v) => UPCOMING_VIEWING_STATUSES.has(v.status));
  const activeApplications = applications.filter((a) => ACTIVE_APPLICATION_STATUSES.has(a.status));
  const attentionAuthorizations = properties.filter((p) => p.source === "INDEPENDENT_AUTHORIZATION" && (p.authorizationStatus === "Needs Attention" || p.authorizationStatus === "Rejected"));
  const awaitingConfirmation = viewings.filter((v) => v.status === "Awaiting Confirmation");
  const actionRequiredApplications = applications.filter((a) => a.status === "Action Required");
  const draftListings = properties.filter((p) => p.listing?.status === "Draft").length;
  const unreadMessages = conversations.filter((c) => c.unread).length;
  const unreadNotifications = getProfessionalUnreadCount(professional.id);

  const attentionItems = [
    newEnquiries.length > 0 ? { key: "enquiries", text: `${newEnquiries.length} new ${newEnquiries.length === 1 ? "enquiry" : "enquiries"} awaiting reply`, href: "/partner-dashboard/enquiries" } : null,
    awaitingConfirmation.length > 0 ? { key: "viewings", text: `${awaitingConfirmation.length} viewing ${awaitingConfirmation.length === 1 ? "request" : "requests"} awaiting confirmation`, href: "/partner-dashboard/enquiries?view=calendar" } : null,
    actionRequiredApplications.length > 0 ? { key: "applications", text: `${actionRequiredApplications.length} application${actionRequiredApplications.length === 1 ? "" : "s"} requires information`, href: "/partner-dashboard/applications" } : null,
    ...attentionAuthorizations.map((p) => ({ key: `auth-${p.propertyId}`, text: `Authorization needs attention — ${p.title}`, href: `/partner-dashboard/properties/${p.propertyId}` })),
  ].filter((item): item is { key: string; text: string; href: string } => item !== null);

  const allCaughtUp = attentionItems.length === 0 && upcomingViewings.length === 0 && activeApplications.length === 0;

  return (
    <DashboardShell>
      <section className="px-5 pt-10 pb-24 sm:px-6 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-340">
          <header className="flex flex-col gap-8 border-b border-black/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="dashboard-page-title text-carbon-900">Welcome back, {professional.name.split(" ")[0]}</h1>
              <p className="text-carbon-600 mt-5 max-w-2xl text-lg leading-7">The properties you represent, and what needs your attention today.</p>
            </div>
            <Link
              href="/partner-dashboard/properties/new"
              className="font-bricolage inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 lg:self-auto"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add property
            </Link>
          </header>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Building2} label="Active Properties" value={properties.length} href="/partner-dashboard/properties" ariaLabel="View active properties" />
            <StatCard icon={Inbox} label="New Enquiries" value={newEnquiries.length} href="/partner-dashboard/enquiries" ariaLabel="View new enquiries" />
            <StatCard icon={CalendarClock} label="Upcoming Viewings" value={upcomingViewings.length} href="/partner-dashboard/enquiries?view=calendar" ariaLabel="View upcoming viewings" />
            <StatCard icon={ClipboardCheck} label="Active Applications" value={activeApplications.length} href="/partner-dashboard/applications" ariaLabel="View active applications" />
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
            <div className="space-y-8">
              {allCaughtUp ? (
                <div className="flex flex-col items-center rounded-[1.75rem] border border-black/10 bg-white px-6 py-10 text-center shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                  <Image src={emptyIllustration} alt="" className="h-20 w-auto object-contain" />
                  <h2 className="font-bricolage text-carbon-900 mt-4 text-xl font-medium">You&apos;re all caught up</h2>
                  <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">New enquiries, viewings and application activity will appear here.</p>
                </div>
              ) : (
                <>
                  {attentionItems.length > 0 ? (
                    <section className="rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                      <div className="border-b border-black/10 p-5 sm:p-6">
                        <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-tight">Needs Your Attention</h2>
                      </div>
                      <div className="divide-y divide-black/8">
                        {attentionItems.map((item) => (
                          <Link key={item.key} href={item.href} className="flex items-center justify-between gap-4 p-5 text-sm font-medium transition-colors hover:bg-black/2 sm:p-6">
                            {item.text}
                            <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {upcomingViewings.length > 0 ? (
                    <section className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                      <SectionHeader title="Upcoming Viewings" description="Confirmed and pending property visits." actionHref="/partner-dashboard/enquiries?view=calendar" />
                      <div className="divide-y divide-black/10">
                        {upcomingViewings.slice(0, 3).map((viewing) => (
                          <ViewingRow key={viewing.id} viewing={viewing} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {activeApplications.length > 0 ? (
                    <section className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                      <SectionHeader title="Active Applications" description="Applications you're currently assisting with." actionHref="/partner-dashboard/applications" />
                      <div className="divide-y divide-black/10">
                        {activeApplications.slice(0, 3).map((application) => (
                          <ApplicationRow key={application.id} application={application} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              )}

              <section className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                <SectionHeader title="Active Properties" description="Properties you currently represent." actionHref="/partner-dashboard/properties" />
                {properties.length === 0 ? (
                  <p className="text-carbon-500 p-6 text-sm">No properties yet.</p>
                ) : (
                  <div className="divide-y divide-black/10">
                    {properties.slice(0, 4).map((property) => (
                      <PropertyRow key={property.propertyId} property={property} enquiryCount={enquiries.filter((e) => e.propertyId === property.propertyId).length} viewingCount={viewings.filter((v) => v.propertyId === property.propertyId).length} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-8">
              <VerificationProgressCard />

              <ListingPerformanceCard properties={properties} />

              <QuickLinksPanel
                items={[
                  { icon: MessageSquare, label: "Unread messages", value: unreadMessages, href: "/partner-dashboard/messages" },
                  { icon: FileText, label: "Draft listings", value: draftListings, href: "/partner-dashboard/listings" },
                  { icon: Bell, label: "Unread notifications", value: unreadNotifications, href: "/partner-dashboard/notifications" },
                ]}
              />

              <section className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_16px_45px_rgba(0,0,0,0.055)]">
                <div className="flex items-start justify-between gap-5">
                  <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-tight">Recent Messages</h2>
                  <MessageSquare aria-hidden="true" className="size-5" />
                </div>
                {conversations.length === 0 ? (
                  <p className="text-carbon-500 mt-4 text-sm">No conversations yet.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {conversations.slice(0, 3).map((c) => (
                      <Link key={c.id} href={`/partner-dashboard/messages?open=${c.id}`} className="flex items-center gap-3 rounded-2xl bg-black/2.5 p-3 transition-colors hover:bg-black/5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-xs font-medium text-white">{c.personName.slice(0, 1)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{c.personName}</span>
                            {c.unread ? <span className="size-1.5 shrink-0 rounded-full bg-black" /> : null}
                          </span>
                          <span className="text-carbon-500 block truncate text-xs">{c.messages[c.messages.length - 1]?.text}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
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
  value: number;
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

function SectionHeader({ title, description, actionHref }: { title: string; description: string; actionHref: string }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-black/10 p-5 sm:p-6">
      <div>
        <h2 className="font-bricolage text-carbon-900 text-xl font-medium tracking-tight">{title}</h2>
        <p className="text-carbon-500 mt-1 text-sm">{description}</p>
      </div>
      <Link href={actionHref} className="font-bricolage shrink-0 text-sm font-medium underline underline-offset-4">
        View all
      </Link>
    </div>
  );
}

function ViewingRow({ viewing }: { viewing: Viewing }) {
  return (
    <Link href={`/partner-dashboard/enquiries?view=calendar&open=${viewing.id}`} className="flex flex-col gap-3 p-5 transition-colors hover:bg-black/2 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <p className="truncate font-medium">{resolveAnyPropertyTitle(viewing.propertyId)}</p>
        <p className="text-carbon-500 mt-1 text-sm">{viewing.renterName}</p>
        <p className="text-carbon-400 mt-0.5 text-xs">{viewing.date} · {viewing.time}</p>
      </div>
      <StatusPill status={viewing.status} />
    </Link>
  );
}

function ApplicationRow({ application }: { application: AgentApplicationView }) {
  return (
    <Link href={`/partner-dashboard/applications?open=${application.id}`} className="flex flex-col gap-3 p-5 transition-colors hover:bg-black/2 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <p className="truncate font-medium">{application.applicant}</p>
        <p className="text-carbon-500 mt-1 text-sm">{resolveAnyPropertyTitle(application.propertyId)}</p>
        <p className="text-carbon-400 mt-0.5 text-xs">Handled by You</p>
      </div>
      <StatusPill status={application.status} />
    </Link>
  );
}

function PropertyRow({ property, enquiryCount, viewingCount }: { property: ProfessionalPropertyCard; enquiryCount: number; viewingCount: number }) {
  const sourceLabel = property.source === "TEAM_ASSIGNMENT" ? property.teamName : property.role === "agent" ? "Independent Representation" : "Independent Management";
  return (
    <Link href={`/partner-dashboard/properties/${property.propertyId}`} className="flex items-center gap-4 p-5 transition-colors hover:bg-black/2 sm:p-6">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-xl">
        <Image src={property.image} alt="" fill className="object-cover" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{property.title}</p>
        <p className="text-carbon-500 mt-1 truncate text-sm">{sourceLabel}</p>
        {enquiryCount > 0 || viewingCount > 0 ? (
          <p className="text-carbon-400 mt-0.5 text-xs">
            {enquiryCount} {enquiryCount === 1 ? "enquiry" : "enquiries"} · {viewingCount} {viewingCount === 1 ? "viewing" : "viewings"}
          </p>
        ) : null}
      </div>
      <StatusPill status={property.listing?.status ?? "Not Listed"} tone="outline" />
    </Link>
  );
}
