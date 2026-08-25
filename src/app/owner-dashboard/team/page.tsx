"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import { BadgeCheck } from "lucide-react";

import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { InviteTeamMemberDialog } from "@/components/owner/invite-team-member-dialog";
import { AssignAgentDialog, type AssignableMember } from "@/components/owner/assign-agent-dialog";
import { AssignPropertyManagerDialog } from "@/components/owner/assign-property-manager-dialog";
import {
  REGISTERED_PROFESSIONALS,
  TEAM_ID,
  cancelInvitation,
  getActiveAssignmentsFor,
  getActiveMemberships,
  getProfessional,
  getTeamInvitations,
  resendInvitation,
  subscribeToTeam,
  type InvitationStatus,
  type ProfessionalRole,
  type TeamMembership,
} from "@/lib/team-data";
import { propertyTitle } from "@/lib/owner-data";

type MainTab = "all" | "agents" | "pms" | "invitations";
const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: "all", label: "All Members" },
  { key: "agents", label: "Agents" },
  { key: "pms", label: "Property Managers" },
  { key: "invitations", label: "Invitations" },
];

const INVITATION_SUBFILTERS: InvitationStatus[] = ["Pending", "Accepted", "Declined"];

export default function TeamPage() {
  // Re-render whenever team-data.ts mutates (invite/accept/assign/remove) --
  // a plain forceUpdate rather than useSyncExternalStore, since there's no
  // derived value to keep stable across renders, just a "something
  // changed, re-read the store" signal.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);
  const [tab, setTab] = useState<MainTab>("all");
  const [invitationFilter, setInvitationFilter] = useState<InvitationStatus>("Pending");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignMember, setAssignMember] = useState<{ member: AssignableMember; role: ProfessionalRole } | null>(null);

  const memberships = getActiveMemberships(TEAM_ID);
  const agents = memberships.filter((m) => m.role === "agent");
  const pms = memberships.filter((m) => m.role === "property_manager");
  const invitations = getTeamInvitations().filter((i) => i.teamId === TEAM_ID);
  const pendingCount = invitations.filter((i) => i.status === "Pending").length;

  function openAssign(membership: TeamMembership) {
    const professional = getProfessional(membership.professionalId);
    if (!professional) return;
    setAssignMember({ member: { professionalId: professional.id, name: professional.name, verified: professional.verified, avatar: professional.avatar }, role: membership.role });
  }

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[1360px]">
          <header className="flex flex-col gap-6 border-b border-black/10 pb-9 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="dashboard-page-title text-carbon-900">Team</h1>
              <p className="text-carbon-600 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
                Manage the people who help you market and manage your properties.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="font-bricolage inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 sm:self-auto"
            >
              <Plus aria-hidden="true" className="size-4" />
              Invite Team Member
            </button>
          </header>

          <div className="mt-7 grid gap-4 sm:grid-cols-4">
            <SummaryCard label="Team Members" value={memberships.length} />
            <SummaryCard label="Agents" value={agents.length} />
            <SummaryCard label="Property Managers" value={pms.length} />
            <SummaryCard label="Pending Invitations" value={pendingCount} />
          </div>

          <div className="mt-7 flex flex-wrap gap-1.5">
            {MAIN_TABS.map((t) => {
              const count = t.key === "all" ? memberships.length : t.key === "agents" ? agents.length : t.key === "pms" ? pms.length : invitations.length;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${tab === t.key ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
                >
                  {t.label} <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {tab === "all" ? (
            memberships.length === 0 ? (
              <EmptyState title="No team members yet" body="Invite Agents or Property Managers to help market and manage your properties." cta="Invite Team Member" onClick={() => setInviteOpen(true)} />
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {memberships.map((m) => (
                  <MemberCard key={m.id} membership={m} onAssign={() => openAssign(m)} />
                ))}
              </div>
            )
          ) : null}

          {tab === "agents" ? (
            agents.length === 0 ? (
              <EmptyState title="No Agents on your team" body="Invite a registered Agent to help with listings, enquiries and viewings." cta="Invite Agent" onClick={() => setInviteOpen(true)} />
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {agents.map((m) => (
                  <MemberCard key={m.id} membership={m} onAssign={() => openAssign(m)} />
                ))}
              </div>
            )
          ) : null}

          {tab === "pms" ? (
            pms.length === 0 ? (
              <EmptyState title="No Property Managers on your team" body="Invite a registered Property Manager to help manage your properties and renters." cta="Invite Property Manager" onClick={() => setInviteOpen(true)} />
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pms.map((m) => (
                  <MemberCard key={m.id} membership={m} onAssign={() => openAssign(m)} />
                ))}
              </div>
            )
          ) : null}

          {tab === "invitations" ? (
            <div className="mt-6">
              <div className="flex flex-wrap gap-1.5">
                {INVITATION_SUBFILTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInvitationFilter(s)}
                    aria-pressed={invitationFilter === s}
                    className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${invitationFilter === s ? "bg-black text-white" : "bg-black/4.5 text-black/55 hover:text-black"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {invitations.filter((i) => i.status === invitationFilter).length === 0 ? (
                <EmptyState
                  title={invitationFilter === "Pending" ? "No pending invitations" : `No ${invitationFilter.toLowerCase()} invitations`}
                  body="Invitations you've sent to Agents and Property Managers will appear here."
                />
              ) : (
                <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <div className="divide-y divide-black/8">
                    {invitations
                      .filter((i) => i.status === invitationFilter)
                      .map((invitation) => {
                        const professional = getProfessional(invitation.professionalId);
                        if (!professional) return null;
                        return (
                          <div key={invitation.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              {professional.avatar ? (
                                <span className="relative size-11 shrink-0 overflow-hidden rounded-full">
                                  <Image src={professional.avatar} alt="" fill className="object-cover" />
                                </span>
                              ) : (
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{professional.name.slice(0, 1)}</span>
                              )}
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 truncate font-medium">
                                  {professional.name}
                                  {professional.verified ? <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 fill-black text-white" /> : null}
                                </p>
                                <p className="text-carbon-500 text-sm">{invitation.role === "agent" ? "Agent" : "Property Manager"}</p>
                                <p className="text-carbon-400 text-xs">
                                  Invited {invitation.invitedAt} · Invited by {invitation.invitedBy}
                                  {invitation.invitedByProfessionalId ? " · Property Manager" : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <StatusPill status={invitation.status} />
                              {invitation.status === "Pending" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => resendInvitation(invitation.id)}
                                    className="font-bricolage inline-flex h-9 items-center gap-1.5 rounded-full border border-black/15 px-3.5 text-xs font-medium hover:border-black"
                                  >
                                    <RotateCcw aria-hidden="true" className="size-3.5" />
                                    Resend
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cancelInvitation(invitation.id)}
                                    className="font-bricolage text-carbon-500 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium hover:text-black"
                                  >
                                    <X aria-hidden="true" className="size-3.5" />
                                    Cancel
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <InviteTeamMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <AssignAgentDialog
        open={Boolean(assignMember && assignMember.role === "agent")}
        onClose={() => setAssignMember(null)}
        member={assignMember?.role === "agent" ? assignMember.member : null}
      />
      <AssignPropertyManagerDialog
        open={Boolean(assignMember && assignMember.role === "property_manager")}
        onClose={() => setAssignMember(null)}
        member={assignMember?.role === "property_manager" ? assignMember.member : null}
      />
    </OwnerDashboardShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <p className="text-carbon-500 text-sm">{label}</p>
      <p className="font-bricolage text-carbon-900 mt-3 text-3xl font-medium tracking-tight">{value}</p>
    </article>
  );
}

function MemberCard({ membership, onAssign }: { membership: TeamMembership; onAssign: () => void }) {
  const professional = REGISTERED_PROFESSIONALS.find((p) => p.id === membership.professionalId);
  if (!professional) return null;
  const assignments = getActiveAssignmentsFor(membership.professionalId, TEAM_ID);
  const roleLabel = membership.role === "agent" ? "Agent" : "Property Manager";

  return (
    <article className="rounded-2xl bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {professional.avatar ? (
            <span className="relative size-12 shrink-0 overflow-hidden rounded-full">
              <Image src={professional.avatar} alt="" fill className="object-cover" />
            </span>
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{professional.name.slice(0, 1)}</span>
          )}
          <div>
            <p className="flex items-center gap-1.5 font-medium">
              {professional.name}
              {professional.verified ? <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 fill-black text-white" /> : null}
            </p>
            <p className="text-carbon-500 text-xs">{professional.verified ? "Verified " : ""}{roleLabel}</p>
          </div>
        </div>
        <StatusPill status="Active" />
      </div>

      <p className="text-carbon-400 mt-4 text-xs">Joined {membership.joinedAt}</p>

      {membership.role === "property_manager" ? (
        <p className="text-carbon-500 mt-2 text-xs">
          Manage Agents: <span className="text-carbon-900 font-medium">{membership.canManageAgents ? "Allowed" : "Not allowed"}</span>
        </p>
      ) : null}

      <div className="mt-4 border-t border-black/8 pt-4">
        {assignments.length === 0 ? (
          <p className="text-carbon-500 text-sm">No properties assigned</p>
        ) : (
          <>
            <p className="text-carbon-400 text-xs">{assignments.length} Propert{assignments.length === 1 ? "y" : "ies"}</p>
            <ul className="mt-2 space-y-1">
              {assignments.map((a) => (
                <li key={a.id} className="truncate text-sm">
                  {propertyTitle(a.propertyId)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-black/8 pt-4">
        <Link href={`/owner-dashboard/team/${membership.id}`} className="font-bricolage inline-flex h-9 items-center rounded-full border border-black/15 px-4 text-xs font-medium hover:border-black">
          View Member
        </Link>
        <button type="button" onClick={onAssign} className="font-bricolage inline-flex h-9 items-center rounded-full border border-black/15 px-4 text-xs font-medium hover:border-black">
          Assign Property
        </button>
      </div>
    </article>
  );
}

function EmptyState({ title, body, cta, onClick }: { title: string; body: string; cta?: string; onClick?: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
      <h3 className="font-bricolage text-xl font-medium">{title}</h3>
      <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">{body}</p>
      {cta && onClick ? (
        <button type="button" onClick={onClick} className="font-bricolage mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white">
          <Plus aria-hidden="true" className="size-4" />
          {cta}
        </button>
      ) : null}
    </div>
  );
}
