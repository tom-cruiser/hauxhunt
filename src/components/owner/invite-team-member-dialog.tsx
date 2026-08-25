"use client";

import Image from "next/image";
import { useState } from "react";
import { BadgeCheck, Briefcase, Building2, ChevronLeft, MapPin, Search, X } from "lucide-react";

import applicationReceivedIllustration from "@/assets/images/application-received.png";
import inviteIllustration from "@/assets/images/invite.png";
import { OWNER } from "@/lib/owner-data";
import {
  REGISTERED_PROFESSIONALS,
  TEAM_ID,
  TEAM_NAME,
  getInvitationFor,
  getMembershipFor,
  inviteProfessional,
  type ProfessionalRole,
  type RegisteredProfessional,
  type TeamActor,
} from "@/lib/team-data";

// Invitation-only flow, Phase 1 of the Property Team model. Deliberately
// does NOT ask which property or what responsibilities -- those only make
// sense once someone has accepted and become a Team Member (see
// AssignAgentDialog / AssignPropertyManagerDialog). This flow ends in
// "Send Invitation", not "Confirm Assignment".
//
// Phase 2: a Property Manager with canManageAgents may also invite an
// Agent, through this SAME component, via `fixedRole="agent"` + `actor` --
// PM never gets the role step (they can only ever invite Agents) and the
// review/sent copy makes clear the Team stays Owner-owned and the PM is
// acting on the Owner's behalf, not inviting into a team of their own.

type Step = "role" | "search" | "review" | "sent";

export function InviteTeamMemberDialog({
  open,
  onClose,
  onSent,
  fixedRole,
  actor,
  dialogTitle,
}: {
  open: boolean;
  onClose: () => void;
  onSent?: (invitee: RegisteredProfessional) => void;
  fixedRole?: ProfessionalRole;
  actor?: TeamActor;
  dialogTitle?: string;
}) {
  const [step, setStep] = useState<Step>(fixedRole ? "search" : "role");
  const [role, setRole] = useState<ProfessionalRole | null>(fixedRole ?? null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!open) return null;

  const selected = REGISTERED_PROFESSIONALS.find((p) => p.id === selectedId) ?? null;
  const roleLabel = role === "agent" ? "Agent" : "Property Manager";
  const totalSteps = fixedRole ? 2 : 3;

  const results = REGISTERED_PROFESSIONALS.filter((p) => p.role === role).filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  function reset() {
    setStep(fixedRole ? "search" : "role");
    setRole(fixedRole ?? null);
    setQuery("");
    setSelectedId(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function chooseRole(next: ProfessionalRole) {
    setRole(next);
    setStep("search");
  }

  function choosePerson(id: string) {
    const membership = getMembershipFor(id, TEAM_ID);
    if (membership?.status === "Active") return; // already on team, not selectable
    const invitation = getInvitationFor(id, TEAM_ID);
    if (invitation?.status === "Pending") return; // already invited, not selectable
    setSelectedId(id);
    setStep("review");
  }

  function send() {
    if (!selected || !role) return;
    inviteProfessional(selected.id, role, actor?.name ?? "You", actor?.professionalId);
    setStep("sent");
    onSent?.(selected);
  }

  // The confirmation is a distinct, two-part dialog (image panel + content
  // panel) rather than another step in the wizard chrome above -- the same
  // pattern used by the sign-in dialog in contact-landlord-form.tsx.
  if (step === "sent" && selected && role) {
    return (
      <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onMouseDown={handleClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-sent-title"
          onMouseDown={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
        >
          <div className="relative flex h-48 items-center justify-center bg-black/4.5 px-8 pt-3">
            <Image src={applicationReceivedIllustration} alt="" className="h-full w-auto object-contain" />
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-black/15 bg-white/80"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="p-7 sm:p-9">
            <h2 id="invite-sent-title" className="font-bricolage text-2xl leading-tight font-medium tracking-tight">
              Invitation Sent
            </h2>
            {actor ? (
              <>
                <p className="text-carbon-600 mt-3 text-sm leading-6">
                  {selected.name} has been invited to join {TEAM_NAME} as {role === "agent" ? "an" : "a"} {roleLabel}.
                </p>
                <p className="text-carbon-600 mt-2 text-sm leading-6">
                  You&apos;ll be able to assign them to properties you manage after {selected.name.split(" ")[0]} accepts the invitation.
                </p>
              </>
            ) : (
              <>
                <p className="text-carbon-600 mt-3 text-sm leading-6">
                  {selected.name} has been invited to join your property team as {role === "agent" ? "an" : "a"} {roleLabel}.
                </p>
                <p className="text-carbon-600 mt-2 text-sm leading-6">
                  You&apos;ll be able to assign properties after {selected.name.split(" ")[0]} accepts the invitation.
                </p>
              </>
            )}
            <div className="mt-7 flex justify-end">
              <button type="button" onClick={handleClose} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80">
                Back to Team
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onMouseDown={handleClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-team-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
      >
        <div className="relative flex h-32 shrink-0 items-center justify-center bg-black/6 px-8">
          <Image src={inviteIllustration} alt="" className="h-full w-auto object-contain py-3" />
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 bg-white/80 text-black/55 hover:border-black/40 hover:text-black"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 px-6 pt-5 pb-2">
          {(step === "review" || (step === "search" && !fixedRole)) ? (
            <button
              type="button"
              onClick={() => setStep(step === "review" ? "search" : "role")}
              aria-label="Back"
              className="flex size-8 items-center justify-center rounded-full hover:bg-black/5"
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : null}
          <h2 id="invite-team-title" className="font-bricolage text-lg font-medium">
            {dialogTitle ?? "Invite Team Member"}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {step === "role" && !fixedRole ? (
            <fieldset>
              <legend className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Step 1 of 3 · What role will this person have?</legend>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => chooseRole("agent")}
                  className="flex w-full items-start gap-4 rounded-2xl border border-black/12 p-4 text-left transition-colors hover:border-black"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center text-black">
                    <Briefcase aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block font-medium">Agent</span>
                    <span className="text-carbon-500 mt-1 block text-sm leading-6">Helps market properties, manage enquiries, viewings, and prospective renter activity.</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => chooseRole("property_manager")}
                  className="flex w-full items-start gap-4 rounded-2xl border border-black/12 p-4 text-left transition-colors hover:border-black"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center text-black">
                    <Building2 aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block font-medium">Property Manager</span>
                    <span className="text-carbon-500 mt-1 block text-sm leading-6">Helps manage assigned properties, renters, payments, maintenance, and other property operations.</span>
                  </span>
                </button>
              </div>
            </fieldset>
          ) : null}

          {step === "search" ? (
            <div>
              <p className="text-carbon-500 text-xs font-medium tracking-widest uppercase">
                Step {fixedRole ? 1 : 2} of {totalSteps} · Find a{role === "agent" ? "n" : ""} {roleLabel}
              </p>
              <label className="catalogue-location-filter mt-4 flex items-center gap-2 px-4">
                <span className="sr-only">Search by name or email</span>
                <Search aria-hidden="true" className="text-carbon-500 size-4 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email"
                  className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              <p className="text-carbon-500 mt-3 text-xs">Search registered HauxHunt {roleLabel.toLowerCase()}s.</p>
              <div className="mt-3 space-y-2">
                {results.map((p) => {
                  const membership = getMembershipFor(p.id, TEAM_ID);
                  const invitation = getInvitationFor(p.id, TEAM_ID);
                  const alreadyMember = membership?.status === "Active";
                  const alreadyInvited = !alreadyMember && invitation?.status === "Pending";
                  const disabled = alreadyMember || alreadyInvited;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => choosePerson(p.id)}
                      disabled={disabled}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors ${disabled ? "cursor-not-allowed border-black/8 opacity-60" : "border-black/12 hover:border-black/30"}`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {p.avatar ? (
                          <span className="relative size-11 shrink-0 overflow-hidden rounded-full">
                            <Image src={p.avatar} alt="" fill className="object-cover" />
                          </span>
                        ) : (
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{p.name.slice(0, 1)}</span>
                        )}
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 font-medium">
                            {p.name}
                            {p.verified ? <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 fill-black text-white" /> : null}
                          </span>
                          <span className="text-carbon-500 flex items-center gap-1 text-xs">
                            <MapPin aria-hidden="true" className="size-3" />
                            {p.location}
                          </span>
                        </span>
                      </span>
                      {alreadyMember ? (
                        <span className="text-carbon-500 shrink-0 text-xs font-medium whitespace-nowrap">Already on your team</span>
                      ) : alreadyInvited ? (
                        <span className="text-carbon-500 shrink-0 text-xs font-medium whitespace-nowrap">Invitation Pending</span>
                      ) : (
                        <span className="font-bricolage shrink-0 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white">Select</span>
                      )}
                    </button>
                  );
                })}
                {results.length === 0 ? <p className="text-carbon-500 py-8 text-center text-sm">No {roleLabel.toLowerCase()}s match this search.</p> : null}
              </div>
            </div>
          ) : null}

          {step === "review" && selected && role ? (
            <div>
              <p className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Step {totalSteps} of {totalSteps} · Review Invitation</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Team</p>
                  <p className="mt-2 font-medium">{TEAM_NAME}</p>
                </div>
                {actor ? (
                  <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Team Owner</p>
                    <p className="mt-2 font-medium">{OWNER.name}</p>
                  </div>
                ) : null}
                {actor ? (
                  <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Invited By</p>
                    <p className="mt-2 font-medium">{actor.name}</p>
                    <p className="text-carbon-500 text-sm">{actor.roleLabel}</p>
                  </div>
                ) : null}
                <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Role</p>
                  <p className="mt-2 font-medium">{roleLabel}</p>
                </div>
                <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Invitee</p>
                  <div className="mt-2 flex items-center gap-3">
                    {selected.avatar ? (
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-full">
                        <Image src={selected.avatar} alt="" fill className="object-cover" />
                      </span>
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{selected.name.slice(0, 1)}</span>
                    )}
                    <p className="flex items-center gap-1.5 font-medium">
                      {selected.name}
                      {selected.verified ? <BadgeCheck aria-label="Verified" className="size-4 fill-black text-white" /> : null}
                    </p>
                  </div>
                </div>
              </div>
              {actor ? (
                <>
                  <p className="text-carbon-600 mt-5 text-sm leading-6">
                    {selected.name.split(" ")[0]} will be invited to join {TEAM_NAME} as {role === "agent" ? "an" : "a"} {roleLabel}.
                  </p>
                  <p className="text-carbon-600 mt-3 text-sm leading-6">
                    Accepting this invitation will make {selected.name.split(" ")[0]} a team member, but will <strong>not</strong> automatically give them access to any properties.
                  </p>
                  <p className="text-carbon-600 mt-3 text-sm leading-6">
                    After {selected.name.split(" ")[0]} accepts, you can assign them to properties you are authorized to manage.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-carbon-600 mt-5 text-sm leading-6">
                    {selected.name.split(" ")[0]} will be invited to join your property team as {role === "agent" ? "an" : "a"} {roleLabel}.
                  </p>
                  <p className="text-carbon-600 mt-3 text-sm leading-6">
                    Joining your team will <strong>not</strong> automatically give {selected.name.split(" ")[0]} access to any of your properties.
                  </p>
                  <p className="text-carbon-600 mt-3 text-sm leading-6">
                    After {selected.name.split(" ")[0]} accepts, you can assign specific properties and responsibilities.
                  </p>
                </>
              )}
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={send} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80">
                  Send Invitation
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
