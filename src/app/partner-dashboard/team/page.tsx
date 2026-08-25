"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { BadgeCheck, Check, Plus, RotateCcw, X } from "lucide-react";

import applicationReceivedIllustration from "@/assets/images/application-received.png";
import noTeamIllustration from "@/assets/images/no-team.png";
import cancelIllustration from "@/assets/images/cancel.png";
import leaveIllustration from "@/assets/images/leave.png";
import { DashboardShell } from "@/components/partner/dashboard-shell";
import { usePartnerRole } from "@/components/partner/use-partner-role";
import { AssignAgentDialog, type AssignableMember } from "@/components/owner/assign-agent-dialog";
import { InviteTeamMemberDialog } from "@/components/owner/invite-team-member-dialog";
import { ManageAssignmentDialog, RemoveFromPropertyDialog } from "@/app/owner-dashboard/team/[memberId]/page";
import { OWNER } from "@/lib/owner-data";
import { pushOwnerNotification } from "@/lib/owner-notifications";
import { resolveAnyPropertyTitle } from "@/lib/professional-properties";
import {
  acceptInvitation,
  cancelInvitation,
  declineInvitation,
  getActiveAssignmentsFor,
  getActiveMemberships,
  getActiveMembershipsFor,
  getAgentAssignmentWithinScope,
  getAssignablePropertyIdsFor,
  getInvitationsCreatedBy,
  getManagedPropertyIdsFor,
  getPendingInvitationsFor,
  getProfessional,
  getTeamById,
  leaveTeam,
  resendInvitation,
  subscribeToTeam,
  type InvitationStatus,
  type PropertyAssignment,
  type RegisteredProfessional,
  type TeamActor,
  type TeamInvitation,
  type TeamMembership,
} from "@/lib/team-data";
import { useDemoProfessional } from "@/components/partner/use-demo-professional";

// A lightweight Teams surface for the Agent/PM side, Phase 1. The Partner
// dashboard's login is one generic "Alex Partner" / "Alex Agent" identity,
// not a specific named person (see the "Assignment Without a Team" audit) --
// so for this prototype, "you" resolve to whichever registered professional
// of the current role has a pending invitation, falling back to an
// already-active member (Jean Mugisha for Property Manager, Kevin Nshuti
// for Agent) so there's always something meaningful to show.
//
// Phase 2 extended this page with PmAgentManagementSection: a Property
// Manager with canManageAgents may invite Agents to a Team and assign them
// within their own delegated scope on THAT Team specifically.
//
// Phase 3: a professional is not owned by a Team and is not limited to one.
// This page is now "My Teams" -- every Active membership the resolved
// professional holds, plural, each with its own card (and its own
// PmAgentManagementSection, scoped to that membership's teamId). Zero
// memberships is a fully valid, non-broken state: independent property work
// (professional-properties.ts) never depends on Team membership at all --
// see /partner-dashboard/properties.

export default function PartnerTeamPage() {
  const partnerRole = usePartnerRole();
  const professionalRole = partnerRole === "agent" ? "agent" : "property_manager";
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);

  const [respondedInvitationIds, setRespondedInvitationIds] = useState<string[]>([]);
  const [declinedInvitation, setDeclinedInvitation] = useState<TeamInvitation | null>(null);

  // "You" resolve to whichever registered professional of the current role
  // has ANY pending invitation, else the established demo identity for that
  // role -- same Phase 1 mechanism, just no longer assuming there's only
  // ever one invitation or one membership once resolved.
  const professional = useDemoProfessional(professionalRole);

  const pendingInvitations = professional ? getPendingInvitationsFor(professional.id).filter((i) => !respondedInvitationIds.includes(i.id)) : [];
  const activeMemberships = professional ? getActiveMembershipsFor(professional.id) : [];

  if (declinedInvitation) {
    return (
      <DashboardShell initialSection="team">
        <TeamShellContent>
          <div className="flex flex-col items-center py-10 text-center">
            <Image src={cancelIllustration} alt="" className="h-28 w-auto object-contain" />
            <h1 className="font-bricolage mt-5 text-2xl font-medium">Invitation Declined</h1>
            <p className="text-carbon-600 mt-3 max-w-sm text-sm leading-6">
              You declined the invitation to join {getTeamById(declinedInvitation.teamId)?.name ?? "that team"}.
            </p>
            <button type="button" onClick={() => setDeclinedInvitation(null)} className="font-bricolage mt-6 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white">
              Back to Teams
            </button>
          </div>
        </TeamShellContent>
      </DashboardShell>
    );
  }

  if (!professional) {
    return (
      <DashboardShell initialSection="team">
        <TeamShellContent>
          <ZeroTeamsState />
        </TeamShellContent>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell initialSection="team">
      <TeamShellContent>
        {pendingInvitations.length > 0 ? (
          <div className="mb-8 space-y-4">
            {pendingInvitations.map((invitation) => (
              <PendingInvitationCard
                key={invitation.id}
                invitation={invitation}
                professional={professional}
                onAccept={() => setRespondedInvitationIds((ids) => [...ids, invitation.id])}
                onDecline={() => {
                  setRespondedInvitationIds((ids) => [...ids, invitation.id]);
                  setDeclinedInvitation(invitation);
                }}
              />
            ))}
          </div>
        ) : null}

        {activeMemberships.length === 0 && pendingInvitations.length === 0 ? (
          <ZeroTeamsState />
        ) : activeMemberships.length === 0 ? null : (
          <div className="space-y-6">
            {activeMemberships.length > 1 ? <h2 className="font-bricolage text-xl font-medium">My Teams</h2> : null}
            {activeMemberships.map((membership) => (
              <TeamMembershipCard key={membership.id} membership={membership} professional={professional} />
            ))}
          </div>
        )}
      </TeamShellContent>
    </DashboardShell>
  );
}

function TeamShellContent({ children }: { children: React.ReactNode }) {
  return (
    <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
      <div className="mx-auto max-w-180">
        <header className="border-b border-black/10 pb-8">
          <h1 className="dashboard-page-title text-carbon-900">My Teams</h1>
          <p className="text-carbon-600 mt-5 text-base leading-7">The property teams you belong to, and what you currently have access to through each.</p>
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

// Zero Teams is a fully valid account state (Section 34) -- a professional
// who only ever does independent work should never see this as broken or
// incomplete.
function ZeroTeamsState() {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Image src={noTeamIllustration} alt="" className="h-28 w-auto object-contain" />
      <h1 className="font-bricolage mt-5 text-2xl font-medium">You&apos;re not currently part of a property team</h1>
      <p className="text-carbon-500 mt-3 max-w-sm text-sm leading-6">
        You can still represent properties you&apos;re independently authorized to work on.
      </p>
      <Link href="/partner-dashboard/properties" className="font-bricolage mt-6 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white">
        View My Properties
      </Link>
    </div>
  );
}

function PendingInvitationCard({
  invitation,
  professional,
  onAccept,
  onDecline,
}: {
  invitation: TeamInvitation;
  professional: RegisteredProfessional;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const inviter = invitation.invitedByProfessionalId ? getProfessional(invitation.invitedByProfessionalId) : null;
  const roleLabel = invitation.role === "agent" ? "Agent" : "Property Manager";
  const team = getTeamById(invitation.teamId);
  const teamName = team?.name ?? "a property team";
  const ownerName = team?.ownerName ?? OWNER.name;

  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white p-7">
      <p className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Team Invitation</p>
      <h1 className="font-bricolage mt-2 text-2xl font-medium">{teamName}</h1>
      {inviter ? (
        <p className="text-carbon-600 mt-4 text-sm leading-6">
          {inviter.name}, a Property Manager on this team, invited you to join as {invitation.role === "agent" ? "an" : "a"} {roleLabel}.
        </p>
      ) : (
        <p className="text-carbon-600 mt-4 text-sm leading-6">
          {ownerName} has invited you to join their property team as {invitation.role === "agent" ? "an" : "a"} {roleLabel}.
        </p>
      )}
      <dl className="mt-6 grid gap-4 border-y border-black/10 py-5 sm:grid-cols-2">
        <div>
          <dt className="text-carbon-400 text-xs">Team Owner</dt>
          <dd className="mt-1 font-medium">{ownerName}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Role</dt>
          <dd className="mt-1 font-medium">{roleLabel}</dd>
        </div>
        {inviter ? (
          <div>
            <dt className="text-carbon-400 text-xs">Invited By</dt>
            <dd className="mt-1 font-medium">{inviter.name}</dd>
            <dd className="text-carbon-500 text-xs">Property Manager</dd>
          </div>
        ) : null}
      </dl>
      <p className="text-carbon-500 mt-5 text-sm leading-6">
        Joining this team does not automatically give you access to any properties. Properties will appear here after they&apos;re assigned to you.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            acceptInvitation(invitation.id);
            onAccept();
            if (inviter) {
              pushOwnerNotification({
                category: "management",
                title: "Agent joined your team",
                body: `${professional.name} accepted an invitation from ${inviter.name} and joined your property team as ${invitation.role === "agent" ? "an" : "a"} ${roleLabel}.`,
                actionLabel: "View Team",
                actionHref: "/owner-dashboard/team",
              });
            }
          }}
          className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white"
        >
          <Check aria-hidden="true" className="size-4" />
          Accept Invitation
        </button>
        <button
          type="button"
          onClick={() => {
            declineInvitation(invitation.id);
            onDecline();
            if (inviter) {
              pushOwnerNotification({
                category: "management",
                title: "Agent declined invitation",
                body: `${professional.name} declined an invitation from ${inviter.name} to join your property team as ${invitation.role === "agent" ? "an" : "a"} ${roleLabel}.`,
                actionLabel: "View Team",
                actionHref: "/owner-dashboard/team",
              });
            }
          }}
          className="font-bricolage inline-flex h-11 items-center rounded-full border border-black/15 px-6 text-sm font-medium hover:border-black"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

function TeamMembershipCard({ membership, professional }: { membership: TeamMembership; professional: RegisteredProfessional }) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const team = getTeamById(membership.teamId);
  const teamName = team?.name ?? "Team";
  const ownerName = team?.ownerName ?? OWNER.name;
  const assignments = getActiveAssignmentsFor(professional.id, membership.teamId);
  const role = membership.role;

  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white p-7">
      <h2 className="font-bricolage text-xl font-medium">{teamName}</h2>
      <dl className="mt-6 grid gap-4 border-y border-black/10 py-5 sm:grid-cols-2">
        <div>
          <dt className="text-carbon-400 text-xs">Team Owner</dt>
          <dd className="mt-1 font-medium">{ownerName}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Your Role</dt>
          <dd className="mt-1 font-medium">{role === "agent" ? "Agent" : "Property Manager"}</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Status</dt>
          <dd className="mt-1 font-medium">Active</dd>
        </div>
        <div>
          <dt className="text-carbon-400 text-xs">Assigned Properties</dt>
          <dd className="mt-1 font-medium">{assignments.length}</dd>
        </div>
        {role === "property_manager" ? (
          <div>
            <dt className="text-carbon-400 text-xs">Agent Management</dt>
            <dd className="mt-1 font-medium">{membership.canManageAgents ? "Allowed" : "Not allowed"}</dd>
          </div>
        ) : null}
      </dl>
      {assignments.length > 0 ? (
        <ul className="mt-5 space-y-1.5">
          {assignments.map((a) => (
            <li key={a.id} className="text-sm">{resolveAnyPropertyTitle(a.propertyId)}</li>
          ))}
        </ul>
      ) : (
        <p className="text-carbon-500 mt-5 text-sm leading-6">
          You&apos;re part of {ownerName.split(" ")[0]}&apos;s team, but you don&apos;t currently have access to any properties through it. {ownerName.split(" ")[0]} can assign you one at any time.
        </p>
      )}
      <div className="mt-6">
        <button type="button" onClick={() => setLeaveOpen(true)} className="font-bricolage text-carbon-500 text-sm font-medium hover:text-black">
          Leave Team
        </button>
      </div>

      {role === "property_manager" ? (
        <PmAgentManagementSection pm={professional} teamId={membership.teamId} teamName={teamName} canManageAgents={membership.canManageAgents ?? false} />
      ) : null}

      {leaveOpen ? <LeaveTeamDialog membershipId={membership.id} role={role} teamName={teamName} onClose={() => setLeaveOpen(false)} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 2 -- Property Manager Agent management. Only ever rendered for a
// Property Manager membership; gated entirely on canManageAgents (Section
// 10/11 of the Phase 2 brief) -- with the permission off, this renders one
// quiet informational line and nothing else. Everything below only ever
// touches properties in getManagedPropertyIdsFor(pm.id, teamId) -- the PM's
// OWN delegated scope on THIS Team specifically (Phase 3, Section 57: this
// must never spill into another Team or into independent work).
// ---------------------------------------------------------------------------

function PmAgentManagementSection({ pm, teamId, teamName, canManageAgents }: { pm: RegisteredProfessional; teamId: string; teamName: string; canManageAgents: boolean }) {
  const [tab, setTab] = useState<"agents" | "invitations">("agents");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AssignableMember | null>(null);
  const [manageAssignment, setManageAssignment] = useState<PropertyAssignment | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PropertyAssignment | null>(null);
  const [invitationFilter, setInvitationFilter] = useState<InvitationStatus>("Pending");

  if (!canManageAgents) {
    return (
      <div className="mt-6 rounded-2xl bg-black/3 p-5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <p className="text-carbon-600 text-sm leading-6">Agent management is controlled by the Property Owner.</p>
      </div>
    );
  }

  const actor: TeamActor = { name: pm.name, professionalId: pm.id, roleLabel: "Property Manager" };
  const managedPropertyIds = getManagedPropertyIdsFor(pm.id, teamId);
  const agentMemberships = getActiveMemberships(teamId).filter((m) => m.role === "agent");
  const invitations = getInvitationsCreatedBy(pm.id);

  return (
    <div className="mt-6 border-t border-black/10 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1.5">
          <TabButton active={tab === "agents"} onClick={() => setTab("agents")}>
            Agents <span className="ml-1 opacity-60">{agentMemberships.length}</span>
          </TabButton>
          <TabButton active={tab === "invitations"} onClick={() => setTab("invitations")}>
            Invitations <span className="ml-1 opacity-60">{invitations.length}</span>
          </TabButton>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="font-bricolage inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-xs font-medium text-white transition-colors hover:bg-black/80"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Invite Agent
        </button>
      </div>

      {tab === "agents" ? (
        agentMemberships.length === 0 ? (
          <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
            <h3 className="font-bricolage text-lg font-medium">No Agents available</h3>
            <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">There are no Agents on this team that you can assign to your managed properties.</p>
            <button type="button" onClick={() => setInviteOpen(true)} className="font-bricolage mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white">
              <Plus aria-hidden="true" className="size-4" />
              Invite Agent
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {agentMemberships.map((m) => {
              const agent = getProfessional(m.professionalId);
              if (!agent) return null;
              const shared = getAgentAssignmentWithinScope(pm.id, agent.id, teamId);
              const assignableIds = getAssignablePropertyIdsFor(pm.id, agent.id, teamId);
              return (
                <article key={m.id} className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center gap-3">
                    {agent.avatar ? (
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-full">
                        <Image src={agent.avatar} alt="" fill className="object-cover" />
                      </span>
                    ) : (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{agent.name.slice(0, 1)}</span>
                    )}
                    <div>
                      <p className="flex items-center gap-1.5 font-medium">
                        {agent.name}
                        {agent.verified ? <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 fill-black text-white" /> : null}
                      </p>
                      <p className="text-carbon-500 text-xs">Agent · Active Team Member</p>
                    </div>
                  </div>

                  {shared ? (
                    <div className="mt-4 border-t border-black/8 pt-4">
                      <p className="text-carbon-400 text-xs">Assigned with you</p>
                      <p className="mt-1 text-sm font-medium">{resolveAnyPropertyTitle(shared.propertyId)}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {shared.responsibilities.map((r) => (
                          <span key={r} className="bg-black/4.5 rounded-full px-2.5 py-1 text-xs">
                            {r}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setManageAssignment(shared)}
                          className="font-bricolage inline-flex h-9 items-center rounded-full border border-black/15 px-4 text-xs font-medium hover:border-black"
                        >
                          Manage Access
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-black/8 pt-4">
                      <p className="text-carbon-500 text-sm">No assignments within your managed properties.</p>
                      {assignableIds.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setAssignTarget({ professionalId: agent.id, name: agent.name, verified: agent.verified, avatar: agent.avatar })}
                          className="font-bricolage mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-4 text-xs font-medium text-white"
                        >
                          <Plus aria-hidden="true" className="size-3.5" />
                          Assign Property
                        </button>
                      ) : null}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap gap-1.5">
            {(["Pending", "Accepted", "Declined"] as InvitationStatus[]).map((s) => (
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
            <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
              <h3 className="font-bricolage text-lg font-medium">{invitationFilter === "Pending" ? "No pending Agent invitations" : `No ${invitationFilter.toLowerCase()} Agent invitations`}</h3>
              <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">Agent invitations you send will appear here.</p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <div className="divide-y divide-black/8">
                {invitations
                  .filter((i) => i.status === invitationFilter)
                  .map((invitation) => {
                    const agent = getProfessional(invitation.professionalId);
                    if (!agent) return null;
                    return (
                      <div key={invitation.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          {agent.avatar ? (
                            <span className="relative size-11 shrink-0 overflow-hidden rounded-full">
                              <Image src={agent.avatar} alt="" fill className="object-cover" />
                            </span>
                          ) : (
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{agent.name.slice(0, 1)}</span>
                          )}
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-medium">
                              {agent.name}
                              {agent.verified ? <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 fill-black text-white" /> : null}
                            </p>
                            <p className="text-carbon-500 text-sm">Agent</p>
                            <p className="text-carbon-400 text-xs">Invited {invitation.invitedAt}</p>
                          </div>
                        </div>
                        {invitation.status === "Pending" ? (
                          <div className="flex shrink-0 items-center gap-2">
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
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      <InviteTeamMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        fixedRole="agent"
        actor={actor}
        dialogTitle="Invite Agent"
        onSent={(invitee) =>
          pushOwnerNotification({
            category: "management",
            title: "Property Manager invited an Agent",
            body: `${pm.name} invited ${invitee.name} to join ${teamName} as an Agent.`,
            actionLabel: "View Invitations",
            actionHref: "/owner-dashboard/team",
          })
        }
      />

      <AssignAgentDialog
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        member={assignTarget}
        allowedPropertyIds={managedPropertyIds}
        actor={actor}
        onAssigned={(propertyId) => {
          if (!assignTarget) return;
          pushOwnerNotification({
            category: "management",
            title: "Property Manager assigned an Agent",
            body: `${pm.name} assigned ${assignTarget.name} to ${resolveAnyPropertyTitle(propertyId)}.`,
            actionLabel: "View Property",
            actionHref: `/owner-dashboard/properties/${propertyId}?tab=team`,
          });
        }}
      />

      {manageAssignment ? (
        <ManageAssignmentDialog
          assignment={manageAssignment}
          member={{ name: getProfessional(manageAssignment.professionalId)?.name ?? "" }}
          role="agent"
          onClose={() => setManageAssignment(null)}
          onRemove={() => {
            setRemoveTarget(manageAssignment);
            setManageAssignment(null);
          }}
        />
      ) : null}

      {removeTarget ? (
        <RemoveFromPropertyDialog
          assignment={removeTarget}
          memberName={getProfessional(removeTarget.professionalId)?.name ?? ""}
          onClose={() => setRemoveTarget(null)}
          onRemoved={() => {
            const agentName = getProfessional(removeTarget.professionalId)?.name ?? "The Agent";
            pushOwnerNotification({
              category: "management",
              title: "Property Manager removed an Agent",
              body: `${pm.name} removed ${agentName} from ${resolveAnyPropertyTitle(removeTarget.propertyId)}.`,
              actionLabel: "View Property",
              actionHref: `/owner-dashboard/properties/${removeTarget.propertyId}?tab=team`,
            });
          }}
        />
      ) : null}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 rounded-full px-3.5 text-xs font-medium transition-colors ${active ? "bg-black text-white" : "bg-black/4.5 text-black/60 hover:text-black"}`}
    >
      {children}
    </button>
  );
}

function LeaveTeamDialog({
  membershipId,
  role,
  teamName,
  onClose,
}: {
  membershipId: string;
  role: "agent" | "property_manager";
  teamName: string;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(false);

  if (left) {
    return (
      <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm bg-white p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
          <Image src={applicationReceivedIllustration} alt="" className="mx-auto h-28 w-auto object-contain" />
          <p className="font-bricolage mt-5 text-lg font-medium">You&apos;ve left {teamName}</p>
          <p className="text-carbon-500 mt-3 text-sm leading-6">Your HauxHunt account remains active.</p>
          <Link href="/partner-dashboard/team" className="font-bricolage mt-6 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white">
            Back to My Teams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="leave-team-title" onMouseDown={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
        <div className="relative flex min-h-48 items-center justify-center bg-black/6 p-6">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 hover:border-black/40 hover:text-black">
            <X aria-hidden="true" className="size-5" />
          </button>
          <Image src={leaveIllustration} alt="" className="h-40 w-auto object-contain" />
        </div>
        <div className="p-6 sm:p-8">
          <h2 id="leave-team-title" className="font-bricolage text-2xl leading-tight font-medium">
            Leave {teamName}?
          </h2>
          <p className="text-carbon-600 mt-4 text-sm leading-6">You&apos;ll lose access to all properties assigned to you through this team.</p>
          {role === "property_manager" ? (
            <p className="text-carbon-600 mt-2 text-sm leading-6">Open rental, payment and maintenance records will remain with the Property Owner. Any responsibilities assigned to you will return to the Owner or become unassigned. Any Agents you invited or assigned remain on the team -- its Owner keeps full control of those assignments.</p>
          ) : null}
          <p className="text-carbon-600 mt-2 text-sm leading-6">Your HauxHunt account will remain active, along with any other teams you belong to and any properties you represent independently. Your previous activity will remain in property history.</p>
          <div className="mt-7 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="font-bricolage inline-flex h-12 items-center rounded-full border border-black/15 px-5 font-medium hover:border-black">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                leaveTeam(membershipId);
                setLeft(true);
              }}
              className="font-bricolage inline-flex h-12 items-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-black/80"
            >
              Leave Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
