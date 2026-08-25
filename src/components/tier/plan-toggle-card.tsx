"use client";

import { Check } from "lucide-react";

import { setTier, useTier } from "@/hooks/use-tier";

/**
 * The demo "Plan" toggle shown on every role's account/settings page. There
 * is no payment provider in this app (see `src/lib/access-control.ts`), so
 * this is how a demo session becomes "paid" — flipping it writes directly
 * to the `hauxhunt-tier` session flag `useTier()` reads everywhere else.
 *
 * `features` is the short "what's different" list for that role, purely
 * descriptive — it doesn't drive any gating itself, the individual
 * `LockedFeature`/`LockedPanel` call sites do that.
 */
export function PlanToggleCard({
  features,
}: {
  features: readonly { label: string; free: string; paid: string }[];
}) {
  const tier = useTier();

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-bricolage text-lg font-medium">Plan</h3>
          <p className="text-carbon-500 mt-1 text-sm leading-6">
            This is a demo toggle — HauxHunt has no payment provider yet, so
            switching plans here is instant and free, purely to preview the
            Paid experience.
          </p>
        </div>
        <div
          role="group"
          aria-label="Choose plan"
          className="inline-flex shrink-0 rounded-full bg-black/[0.05] p-1"
        >
          {(["free", "paid"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={tier === option}
              onClick={() => setTier(option)}
              className={`font-bricolage inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium capitalize transition-colors ${
                tier === option
                  ? "bg-black text-white"
                  : "text-black/55 hover:text-black"
              }`}
            >
              {tier === option ? <Check aria-hidden="true" className="size-3.5" /> : null}
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
        {features.map((feature) => (
          <div
            key={feature.label}
            className="grid gap-2 py-3.5 sm:grid-cols-[1fr_1fr_1fr] sm:items-center sm:gap-4"
          >
            <p className="text-sm font-medium">{feature.label}</p>
            <p className="text-carbon-500 text-xs sm:text-sm">{feature.free}</p>
            <p className="text-carbon-900 text-xs font-medium sm:text-sm">
              {feature.paid}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
