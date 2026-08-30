"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useReducer, useState } from "react";
import { BadgeCheck, Check, ChevronLeft, MessageSquare, MoreVertical, Plus, X } from "lucide-react";

import deletingIllustration from "@/assets/images/deleting.png";
import { OwnerDashboardShell } from "@/components/owner/owner-dashboard-shell";
import { StatusPill } from "@/components/owner/status-pill";
import { AssignAgentDialog, type AssignableMember } from "@/components/owner/assign-agent-dialog";
import { AssignPropertyManagerDialog } from "@/components/owner/assign-property-manager-dialog";
import {
  AGENT_RESPONSIBILITIES,
  PM_RESPONSIBILITIES,
  getActiveAssignmentsFor,
  getProfessional,
  getTeamMemberships,
  removeAssignment,
  removeTeamMember,
  setCanManageAgents,
  subscribeToTeam,
  updateAssignmentResponsibilities,
  type PropertyAssignment,
} from "@/lib/team-data";
import { getOwnerProperty } from "@/lib/owner-data";
import { OWNER_PARTICIPANT_ID, getOrCreateConversation } from "@/lib/messages-data";

export default function TeamMemberDetailPage() {
  const params = useParams<{ memberId: string }>();
  const router = useRouter();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeToTeam(forceUpdate), []);

  const membership = getTeamMemberships().find((m) => m.id === params.memberId);
  const professional = membership ? getProfessional(membership.professionalId) : undefined;

  const [assignOpen, setAssignOpen] = useState(false);
  const [manageAssignment, setManageAssignment] = useState<PropertyAssignment | null>(null);
  const [removeFromPropertyTarget, setRemoveFromPropertyTarget] = useState<PropertyAssignment | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [removeFromTeamOpen, setRemoveFromTeamOpen] = useState(false);

  if (!membership || !professional || membership.status !== "Active") return notFound();

  const assignments = getActiveAssignmentsFor(membership.professionalId, membership.teamId);
  const roleLabel = membership.role === "agent" ? "Agent" : "Property Manager";
  const assignableMember: AssignableMember = { professionalId: professional.id, name: professional.name, verified: professional.verified, avatar: professional.avatar };

  return (
    <OwnerDashboardShell>
      <section className="px-5 pt-8 pb-24 sm:px-6 lg:px-10 lg:pt-10 xl:px-12">
        <div className="mx-auto max-w-[900px]">
          <Link href="/owner-dashboard/team" className="text-carbon-500 inline-flex items-center gap-1 text-sm font-medium hover:text-black">
            <ChevronLeft className="size-4" />
            Team
          </Link>

          <header className="mt-4 flex flex-col gap-6 border-b border-black/10 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              {professional.avatar ? (
                <span className="relative size-16 shrink-0 overflow-hidden rounded-full">
                  <Image src={professional.avatar} alt="" fill className="object-cover" />
                </span>
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-black text-lg font-medium text-white">{professional.name.slice(0, 1)}</span>
              )}
              <div>
                <h1 className="font-bricolage flex items-center gap-2 text-2xl font-medium">
                  {professional.name}
                  {professional.verified ? <BadgeCheck aria-label="Verified" className="size-5 fill-black text-white" /> : null}
                </h1>
                <p className="text-carbon-500 mt-1 text-sm">{professional.verified ? "Verified " : ""}{roleLabel}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusPill status="Active" />
                  <span className="text-carbon-400 text-xs">Team Member</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={() => setAssignOpen(true)} className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white">
                <Plus aria-hidden="true" className="size-4" />
                Assign Property
              </button>
              {(() => {
                // Messages Synchronization phase -- Section 41/84: resolves
                // the same Owner <-> professional conversation as any other
                // "Message" action for this same person elsewhere (Rentals,
                // Property Detail), using their stable professionalId.
                const conversation = getOrCreateConversation(OWNER_PARTICIPANT_ID, professional.id, { type: "team", label: "Team" });
                if (!conversation) return null;
                return (
                  <Link
                    href={`/owner-dashboard/messages?open=${conversation.id}`}
                    className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
                  >
                    <MessageSquare aria-hidden="true" className="size-4" />
                    Message
                  </Link>
                );
              })()}
              <div className="relative">
                <button
                  type="button"
                  aria-label="More options"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="flex size-11 items-center justify-center rounded-full border border-black/15 hover:border-black"
                >
                  <MoreVertical aria-hidden="true" className="size-4" />
                </button>
                {moreOpen ? (
                  <div className="absolute top-[calc(100%+0.5rem)] right-0 z-20 w-52 rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        setRemoveFromTeamOpen(true);
                      }}
                      className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-black/75 transition-colors hover:bg-black/5"
                    >
                      Remove from Team
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact label="Role" value={roleLabel} />
            <Fact label="Status" value="Active" />
            <Fact label="Joined" value={membership.joinedAt} />
            <Fact label="Properties Assigned" value={String(assignments.length)} />
          </section>

          {membership.role === "property_manager" ? (
            <section className="mt-8 rounded-2xl bg-black/2 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Team Management</p>
              <p className="mt-2 font-medium">Manage Agents</p>
              <p className="text-carbon-500 mt-1 max-w-lg text-sm leading-6">
                Allows {professional.name.split(" ")[0]} to invite and manage Agents for properties assigned to them. This is a separate, higher-level permission — not a per-property responsibility.
              </p>
              <label className="mt-4 flex w-fit cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={membership.canManageAgents ?? false}
                  onChange={(e) => setCanManageAgents(membership.id, e.target.checked)}
                  className="size-4 accent-black"
                />
                <span className="text-sm font-medium">Allow {professional.name.split(" ")[0]} to manage Agents</span>
              </label>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="font-bricolage text-lg font-medium">Assigned Properties</h2>
            {assignments.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
                <p className="font-medium">No properties assigned yet.</p>
                <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">
                  {professional.name.split(" ")[0]} is part of your team, but doesn&apos;t currently have access to any of your properties.
                </p>
                <button type="button" onClick={() => setAssignOpen(true)} className="font-bricolage mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white">
                  <Plus aria-hidden="true" className="size-4" />
                  Assign Property
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {assignments.map((assignment) => {
                  const property = getOwnerProperty(assignment.propertyId);
                  if (!property) return null;
                  return (
                    <article key={assignment.id} className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{property.title}</p>
                          <p className="text-carbon-500 text-sm">{property.location}</p>
                        </div>
                        <p className="text-carbon-500 text-xs">
                          Role: <span className="text-carbon-900 font-medium">{roleLabel}</span>
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {assignment.responsibilities.map((r) => (
                          <span key={r} className="bg-black/4.5 rounded-full px-2.5 py-1 text-xs">
                            {r}
                          </span>
                        ))}
                      </div>
                      <p className="text-carbon-400 mt-3 text-xs">
                        Assigned by {assignment.assignedBy}
                        {assignment.assignedByProfessionalId ? " · Property Manager" : ""}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-black/8 pt-4">
                        <Link href={`/owner-dashboard/properties/${property.id}`} className="font-bricolage inline-flex h-9 items-center rounded-full border border-black/15 px-4 text-xs font-medium hover:border-black">
                          View Property
                        </Link>
                        <button
                          type="button"
                          onClick={() => setManageAssignment(assignment)}
                          className="font-bricolage inline-flex h-9 items-center rounded-full border border-black/15 px-4 text-xs font-medium hover:border-black"
                        >
                          Manage Assignment
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>

      <AssignAgentDialog open={assignOpen && membership.role === "agent"} onClose={() => setAssignOpen(false)} member={membership.role === "agent" ? assignableMember : null} />
      <AssignPropertyManagerDialog open={assignOpen && membership.role === "property_manager"} onClose={() => setAssignOpen(false)} member={membership.role === "property_manager" ? assignableMember : null} />

      {manageAssignment ? (
        <ManageAssignmentDialog
          assignment={manageAssignment}
          member={professional}
          role={membership.role}
          onClose={() => setManageAssignment(null)}
          onRemove={() => {
            setRemoveFromPropertyTarget(manageAssignment);
            setManageAssignment(null);
          }}
        />
      ) : null}

      {removeFromPropertyTarget ? (
        <RemoveFromPropertyDialog
          assignment={removeFromPropertyTarget}
          memberName={professional.name}
          onClose={() => setRemoveFromPropertyTarget(null)}
        />
      ) : null}

      {removeFromTeamOpen ? (
        <RemoveFromTeamDialog
          memberName={professional.name}
          onClose={() => setRemoveFromTeamOpen(false)}
          onConfirm={() => {
            removeTeamMember(membership.id);
            router.push("/owner-dashboard/team");
          }}
        />
      ) : null}
    </OwnerDashboardShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <p className="text-carbon-400 text-xs">{label}</p>
      <p className="font-bricolage mt-1 font-medium">{value}</p>
    </div>
  );
}

// Exported for reuse elsewhere in the Owner dashboard. This was also
// reused by the partner-dashboard Team page for the PM's own,
// scope-limited "Manage Access" action, before that page was removed along
// with the rest of the partner-dashboard Team surface -- kept exported here
// regardless, since it's still used locally below.
export function ManageAssignmentDialog({
  assignment,
  member,
  role,
  onClose,
  onRemove,
}: {
  assignment: PropertyAssignment;
  member: { name: string };
  role: "agent" | "property_manager";
  onClose: () => void;
  onRemove: () => void;
}) {
  const [responsibilities, setResponsibilities] = useState<string[]>(assignment.responsibilities);
  const options = role === "agent" ? AGENT_RESPONSIBILITIES : PM_RESPONSIBILITIES;
  const property = getOwnerProperty(assignment.propertyId);

  function save() {
    updateAssignmentResponsibilities(assignment.id, responsibilities);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <h2 className="font-bricolage text-lg font-medium">Manage Assignment</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 py-6">
          <p className="font-medium">{member.name}</p>
          <p className="text-carbon-500 text-sm">{property?.title}</p>
          <div className="mt-5 space-y-2">
            {options.map((item) => {
              const checked = responsibilities.includes(item);
              return (
                <label key={item} className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 p-3.5 hover:bg-black/2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setResponsibilities((current) => (checked ? current.filter((r) => r !== item) : [...current, item]))}
                    className="size-4 accent-black"
                  />
                  <span className="text-sm">{item}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-2">
            <button type="button" onClick={onRemove} className="font-bricolage text-sm font-medium text-black/60 hover:text-black">
              Remove from Property
            </button>
            <button type="button" onClick={save} className="font-bricolage inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-black/80">
              <Check aria-hidden="true" className="size-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RemoveFromPropertyDialog({
  assignment,
  memberName,
  onClose,
  onRemoved,
}: {
  assignment: PropertyAssignment;
  memberName: string;
  onClose: () => void;
  onRemoved?: () => void;
}) {
  const property = getOwnerProperty(assignment.propertyId);
  const firstName = memberName.split(" ")[0];

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="remove-property-title" onMouseDown={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
        <div className="relative flex min-h-48 items-center justify-center bg-black/6 p-6">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 hover:border-black/40 hover:text-black">
            <X aria-hidden="true" className="size-5" />
          </button>
          <Image src={deletingIllustration} alt="" className="h-40 w-auto object-contain" />
        </div>
        <div className="p-6 sm:p-8">
          <h2 id="remove-property-title" className="font-bricolage text-2xl leading-tight font-medium">
            Remove {firstName} from {property?.title}?
          </h2>
          <p className="text-carbon-600 mt-4 text-sm leading-6">{firstName} will lose access to this property.</p>
          <p className="text-carbon-600 mt-2 text-sm leading-6">{firstName} will remain a member of your property team and can be assigned to another property later.</p>
          <p className="text-carbon-600 mt-2 text-sm leading-6">Previous activity will remain in the property&apos;s history.</p>
          <div className="mt-7 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="font-bricolage inline-flex h-12 items-center rounded-full border border-black/15 px-5 font-medium hover:border-black">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                removeAssignment(assignment.id);
                onRemoved?.();
                onClose();
              }}
              className="font-bricolage inline-flex h-12 items-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-black/80"
            >
              Remove from Property
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemoveFromTeamDialog({ memberName, onClose, onConfirm }: { memberName: string; onClose: () => void; onConfirm: () => void }) {
  const firstName = memberName.split(" ")[0];
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="remove-team-title" onMouseDown={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
        <div className="relative flex min-h-48 items-center justify-center bg-black/6 p-6">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 hover:border-black/40 hover:text-black">
            <X aria-hidden="true" className="size-5" />
          </button>
          <Image src={deletingIllustration} alt="" className="h-40 w-auto object-contain" />
        </div>
        <div className="p-6 sm:p-8">
          <h2 id="remove-team-title" className="font-bricolage text-2xl leading-tight font-medium">
            Remove {firstName} from your team?
          </h2>
          <p className="text-carbon-600 mt-4 text-sm leading-6">{firstName} will lose access to all properties assigned to them through your team.</p>
          <p className="text-carbon-600 mt-2 text-sm leading-6">Previous property, listing, viewing and application activity will remain available.</p>
          <p className="text-carbon-600 mt-2 text-sm leading-6">{firstName}&apos;s personal HauxHunt account will not be deleted.</p>
          <div className="mt-7 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="font-bricolage inline-flex h-12 items-center rounded-full border border-black/15 px-5 font-medium hover:border-black">
              Cancel
            </button>
            <button type="button" onClick={onConfirm} className="font-bricolage inline-flex h-12 items-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-black/80">
              Remove from Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
