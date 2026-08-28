"use client";

import { useState } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";

import type { ApplicationStatus } from "@/lib/owner-data";
import { getAvailableTransitions } from "@/lib/application-status-machine";
import { StatusReasonModal } from "@/components/partner/status-reason-modal";

export type StatusActionConfig = {
  to: ApplicationStatus;
  label: string;
  icon?: LucideIcon;
  /** "primary" renders solid black; "outline" (the default) renders
   * bordered. Callers mark the decisive Approve call primary; everything
   * else defaults to outline so the bar reads as one action, not a wall of
   * black buttons. */
  emphasis?: "primary" | "outline";
};

export type ApplicationStatusActionsProps = {
  status: ApplicationStatus;
  /** Forward-move labels/icons, keyed by destination. Only destinations the
   * state machine actually allows from `status` render -- a config for an
   * illegal destination is simply never shown, and a legal destination with
   * no config gets a generic "Move to {status}" label so the bar never
   * silently drops a real transition. */
  forwardActions?: StatusActionConfig[];
  /** Forward destinations to omit even though the state machine allows them
   * topologically -- for an authority boundary this bar doesn't know about
   * (e.g. a recommend-only reviewer must never reach "Approved" through a
   * generic button; the caller renders its own "Recommend Approve" control,
   * which lands on "Decision Pending" with a recommendation attached, not
   * on "Approved" directly). Never applied to backward moves -- rolling an
   * application back never requires final decision authority. */
  hideForward?: ApplicationStatus[];
  /** Backward destinations to omit -- for cross-entity state this bar has
   * no visibility into (e.g. rolling "Approved" back to "Under Review" once
   * rental setup has already been sent to the renter would leave that
   * invite pointing at an application that's no longer approved). */
  hideBackward?: ApplicationStatus[];
  onTransition: (to: ApplicationStatus, reason?: string) => void;
  disabled?: boolean;
};

/**
 * The applicant profile's contextual action bar (product spec §3): renders
 * only the forward/backward moves the state machine (`application-status-
 * machine.ts`) actually allows from the CURRENT status -- never a raw
 * dropdown of all seven states. Forward moves run immediately, except
 * "Not Selected" (decline), which -- like every backward move -- opens
 * `StatusReasonModal` first, since both require a recorded reason.
 */
export function ApplicationStatusActions({ status, forwardActions = [], hideForward = [], hideBackward = [], onTransition, disabled }: ApplicationStatusActionsProps) {
  const [pending, setPending] = useState<{ to: ApplicationStatus; title: string; description: string; confirmLabel: string } | null>(null);

  const available = getAvailableTransitions(status);
  const forward = available.filter((t) => t.direction === "forward" && !hideForward.includes(t.to));
  const backward = available.filter((t) => t.direction === "backward" && !hideBackward.includes(t.to));

  if (forward.length === 0 && backward.length === 0) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {forward.map((t) => {
        const config = forwardActions.find((c) => c.to === t.to);
        const label = config?.label ?? `Move to ${t.to}`;
        const Icon = config?.icon;
        const isDecline = t.to === "Not Selected";
        const emphasis = config?.emphasis ?? (t.to === "Approved" ? "primary" : "outline");

        return (
          <button
            key={t.to}
            type="button"
            disabled={disabled}
            onClick={() =>
              isDecline
                ? setPending({
                    to: t.to,
                    title: "Decline this application?",
                    description: "The applicant will see that their application was declined. A declined application can be reopened later if needed.",
                    confirmLabel: "Decline",
                  })
                : onTransition(t.to)
            }
            className={`font-bricolage inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              emphasis === "primary" ? "bg-black text-white hover:bg-black/80" : "border border-black/15 hover:border-black"
            }`}
          >
            {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
            {label}
          </button>
        );
      })}

      {backward.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {backward.map((t) => (
            <button
              key={t.to}
              type="button"
              disabled={disabled}
              onClick={() =>
                setPending({
                  to: t.to,
                  title: `Move back to "${t.to}"?`,
                  description: "This rolls the application backward. Explain why so it's recorded on the status history below.",
                  confirmLabel: "Move Back",
                })
              }
              className="text-carbon-500 inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-black/20 px-4 text-xs font-medium transition-colors hover:border-black/40 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Back to {t.to}
            </button>
          ))}
        </div>
      ) : null}

      {pending ? (
        <StatusReasonModal
          title={pending.title}
          description={pending.description}
          confirmLabel={pending.confirmLabel}
          reasonRequired
          onCancel={() => setPending(null)}
          onConfirm={(reason) => {
            onTransition(pending.to, reason);
            setPending(null);
          }}
        />
      ) : null}
    </div>
  );
}
