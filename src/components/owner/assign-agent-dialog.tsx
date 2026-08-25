"use client";

import Image from "next/image";
import type { StaticImageData } from "next/image";
import { useState } from "react";
import { BadgeCheck, Check, ChevronLeft, X } from "lucide-react";

import applicationReceivedIllustration from "@/assets/images/application-received.png";
import assignIllustration from "@/assets/images/assign.png";
import { AGENT_RESPONSIBILITIES, assignPropertyToMember, getActiveAssignmentsFor, type PropertyAssignment, type TeamActor } from "@/lib/team-data";
import { OWNER, getOwnerProperties } from "@/lib/owner-data";

// Property-assignment-only flow, Phase 1 of the Property Team model. This
// used to also pick WHICH agent to assign (see the old "select agent"
// step) -- that's now the separate Invite Team Member flow
// (invite-team-member-dialog.tsx). This dialog only ever runs for an
// Agent who is already an ACTIVE team member: give them access to one more
// property and decide what they can do there.
//
// Phase 2: a Property Manager assigning an Agent within their own scope
// reuses this SAME component via `allowedPropertyIds` (hides every property
// outside the PM's scope entirely -- never shown even disabled) + `actor`
// (adds Property Owner / Assigned By to the review, and shows a success
// screen with the PM's own next step, instead of the Owner flow's silent
// close).

export type AssignableMember = {
  professionalId: string;
  name: string;
  verified: boolean;
  avatar?: StaticImageData;
};

type Step = "property" | "responsibilities" | "confirm" | "success";

export function AssignAgentDialog({
  open,
  onClose,
  member,
  propertyId,
  onAssigned,
  allowedPropertyIds,
  actor,
}: {
  open: boolean;
  onClose: () => void;
  member: AssignableMember | null;
  propertyId?: string;
  onAssigned?: (propertyId: string) => void;
  allowedPropertyIds?: string[];
  actor?: TeamActor;
}) {
  const [targetPropertyId, setTargetPropertyId] = useState<string | null>(propertyId ?? null);
  const [responsibilities, setResponsibilities] = useState<string[]>([...AGENT_RESPONSIBILITIES]);
  const [step, setStep] = useState<Step>(propertyId ? "responsibilities" : "property");

  if (!open || !member) return null;

  const properties = getOwnerProperties().filter((p) => !allowedPropertyIds || allowedPropertyIds.includes(p.id));
  const targetProperty = properties.find((p) => p.id === targetPropertyId) ?? null;
  const existingAssignments = getActiveAssignmentsFor(member.professionalId);
  const needsPropertyStep = !propertyId;
  const totalSteps = needsPropertyStep ? 3 : 2;
  const stepNumber = step === "property" ? 1 : step === "responsibilities" ? (needsPropertyStep ? 2 : 1) : totalSteps;

  function goNext() {
    if (step === "property") setStep("responsibilities");
    else if (step === "responsibilities") setStep("confirm");
  }

  function goBack() {
    if (step === "confirm") setStep("responsibilities");
    else if (step === "responsibilities" && needsPropertyStep) setStep("property");
  }

  function reset() {
    setTargetPropertyId(propertyId ?? null);
    setResponsibilities([...AGENT_RESPONSIBILITIES]);
    setStep(propertyId ? "responsibilities" : "property");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function confirm() {
    if (!member || !targetPropertyId) return;
    assignPropertyToMember(targetPropertyId, member.professionalId, "agent", responsibilities, actor?.name ?? "You", actor?.professionalId);
    onAssigned?.(targetPropertyId);
    if (actor) {
      setStep("success");
    } else {
      handleClose();
    }
  }

  const isAlreadyAssigned = (id: string) => existingAssignments.some((a: PropertyAssignment) => a.propertyId === id);

  // Distinct two-part success screen, PM flow only -- the Owner flow keeps
  // its established silent-close behavior (unchanged, Phase 1).
  if (step === "success" && actor && targetProperty) {
    return (
      <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onMouseDown={handleClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-agent-success-title"
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
            <h2 id="assign-agent-success-title" className="font-bricolage text-2xl leading-tight font-medium tracking-tight">
              Property Assigned
            </h2>
            <p className="text-carbon-600 mt-3 text-sm leading-6">
              {member.name} has been assigned to {targetProperty.title}.
            </p>
            <p className="text-carbon-600 mt-2 text-sm leading-6">
              {member.name.split(" ")[0]} can now work on this property according to the responsibilities you&apos;ve granted.
            </p>
            <div className="mt-7 flex justify-end">
              <button type="button" onClick={handleClose} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80">
                Done
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
        aria-labelledby="assign-agent-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
      >
        <div className="relative flex h-32 shrink-0 items-center justify-center bg-black/6 px-8">
          <Image src={assignIllustration} alt="" className="h-full w-auto object-contain py-3" />
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
          {step !== "property" && needsPropertyStep ? (
            <button type="button" onClick={goBack} aria-label="Back" className="flex size-8 items-center justify-center rounded-full hover:bg-black/5">
              <ChevronLeft className="size-4" />
            </button>
          ) : null}
          <h2 id="assign-agent-title" className="font-bricolage text-lg font-medium">
            Assign Property
          </h2>
        </div>

        <div className="border-b border-black/10 px-6 py-4">
          <p className="text-carbon-500 text-xs">Assign a property to</p>
          <div className="mt-2 flex items-center gap-3">
            {member.avatar ? (
              <span className="relative size-9 shrink-0 overflow-hidden rounded-full">
                <Image src={member.avatar} alt="" fill className="object-cover" />
              </span>
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white">{member.name.slice(0, 1)}</span>
            )}
            <p className="flex items-center gap-1.5 font-medium">
              {member.name}
              {member.verified ? <BadgeCheck aria-label="Verified" className="size-4 shrink-0 fill-black text-white" /> : null}
              <span className="text-carbon-500 font-normal">· Agent</span>
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {step === "property" ? (
            <fieldset>
              <legend className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Step {stepNumber} of {totalSteps} · Select property</legend>
              {properties.length === 0 ? (
                <p className="text-carbon-500 mt-4 text-sm leading-6">You don&apos;t currently manage any properties to assign {member.name.split(" ")[0]} to.</p>
              ) : null}
              <div className="mt-4 space-y-2">
                {properties.map((p) => {
                  const already = isAlreadyAssigned(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${already ? "cursor-not-allowed border-black/8 opacity-50" : "cursor-pointer"} ${targetPropertyId === p.id ? "border-black bg-black text-white" : "border-black/12 hover:border-black/30"}`}
                    >
                      <span>
                        <span className="block font-medium">{p.title}</span>
                        <span className={`block text-xs ${targetPropertyId === p.id ? "text-white/70" : "text-carbon-500"}`}>{already ? "Already assigned" : p.location}</span>
                      </span>
                      <input
                        type="radio"
                        name="property"
                        className="sr-only"
                        disabled={already}
                        checked={targetPropertyId === p.id}
                        onChange={() => setTargetPropertyId(p.id)}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!targetPropertyId}
                  className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Continue
                </button>
              </div>
            </fieldset>
          ) : null}

          {step === "responsibilities" ? (
            <fieldset>
              <legend className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Step {stepNumber} of {totalSteps} · Responsibilities</legend>
              <p className="text-carbon-500 mt-2 text-sm">What can {member.name} do for {targetProperty?.title ?? "this property"}?</p>
              <div className="mt-4 space-y-2">
                {AGENT_RESPONSIBILITIES.map((item) => {
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
              <p className="text-carbon-400 mt-4 text-xs">Rent payments, active rentals, and maintenance always stay with a Property Manager.</p>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={goNext} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80">
                  Continue
                </button>
              </div>
            </fieldset>
          ) : null}

          {step === "confirm" ? (
            <div>
              <p className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Review Assignment</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Team member</p>
                  <p className="mt-2 flex items-center gap-1.5 font-medium">
                    {member.name}
                    {member.verified ? <BadgeCheck aria-label="Verified" className="size-4 fill-black text-white" /> : null}
                  </p>
                  <p className="text-carbon-500 text-sm">Agent</p>
                </div>
                <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Property</p>
                  <p className="mt-2 font-medium">{targetProperty?.title}</p>
                  <p className="text-carbon-500 text-sm">{targetProperty?.location}</p>
                </div>
                {actor ? (
                  <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Property Owner</p>
                    <p className="mt-2 font-medium">{OWNER.name}</p>
                  </div>
                ) : null}
                {actor ? (
                  <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Assigned By</p>
                    <p className="mt-2 font-medium">{actor.name}</p>
                    <p className="text-carbon-500 text-sm">{actor.roleLabel}</p>
                  </div>
                ) : null}
                <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Responsibilities</p>
                  <ul className="mt-3 space-y-2">
                    {responsibilities.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <Check className="size-4 shrink-0" />
                        {item}
                      </li>
                    ))}
                    {responsibilities.length === 0 ? <li className="text-carbon-500 text-sm">No responsibilities selected.</li> : null}
                  </ul>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={confirm} className="font-bricolage inline-flex h-12 items-center justify-center rounded-full bg-black px-6 font-medium text-white transition-colors hover:bg-black/80">
                  Assign Property
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
