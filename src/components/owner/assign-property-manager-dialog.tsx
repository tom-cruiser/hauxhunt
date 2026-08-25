"use client";

import Image from "next/image";
import { useState } from "react";
import { BadgeCheck, Check, ChevronLeft, X } from "lucide-react";

import assignIllustration from "@/assets/images/assign.png";
import { PM_RESPONSIBILITIES, assignPropertyToMember, getActiveAssignmentsFor, type PropertyAssignment } from "@/lib/team-data";
import { getOwnerProperties } from "@/lib/owner-data";
import type { AssignableMember } from "@/components/owner/assign-agent-dialog";

// Same shape as AssignAgentDialog -- see that file's header comment for
// what changed in Phase 1. A Property Manager's responsibility set is
// broader (leasing is optional, operations are the core); the separate,
// higher-level "Manage Agents" Team permission is granted from Team Member
// Detail, not here -- it's not a per-property responsibility.

type Step = "property" | "responsibilities" | "confirm";

export function AssignPropertyManagerDialog({
  open,
  onClose,
  member,
  propertyId,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  member: AssignableMember | null;
  propertyId?: string;
  onAssigned?: (propertyId: string) => void;
}) {
  const [targetPropertyId, setTargetPropertyId] = useState<string | null>(propertyId ?? null);
  const [responsibilities, setResponsibilities] = useState<string[]>([...PM_RESPONSIBILITIES]);
  const [step, setStep] = useState<Step>(propertyId ? "responsibilities" : "property");

  if (!open || !member) return null;

  const properties = getOwnerProperties();
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
    setResponsibilities([...PM_RESPONSIBILITIES]);
    setStep(propertyId ? "responsibilities" : "property");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function confirm() {
    if (!member || !targetPropertyId) return;
    assignPropertyToMember(targetPropertyId, member.professionalId, "property_manager", responsibilities);
    onAssigned?.(targetPropertyId);
    handleClose();
  }

  const isAlreadyAssigned = (id: string) => existingAssignments.some((a: PropertyAssignment) => a.propertyId === id);

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onMouseDown={handleClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-pm-title"
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
          <h2 id="assign-pm-title" className="font-bricolage text-lg font-medium">
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
              <span className="text-carbon-500 font-normal">· Property Manager</span>
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {step === "property" ? (
            <fieldset>
              <legend className="text-carbon-500 text-xs font-medium tracking-widest uppercase">Step {stepNumber} of {totalSteps} · Select property</legend>
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
                {PM_RESPONSIBILITIES.map((item) => {
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
                  <p className="text-carbon-500 text-sm">Property Manager</p>
                </div>
                <div className="rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                  <p className="text-xs font-medium tracking-wider text-black/40 uppercase">Property</p>
                  <p className="mt-2 font-medium">{targetProperty?.title}</p>
                  <p className="text-carbon-500 text-sm">{targetProperty?.location}</p>
                </div>
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
