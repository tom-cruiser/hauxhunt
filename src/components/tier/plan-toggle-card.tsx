"use client";

import { Check } from "lucide-react";

import { useState } from "react";

import { useTier, type Tier } from "@/hooks/use-tier";
import { api, DATA_CHANGED_EVENT } from "@/lib/api/client";
import { fetchMe, mirrorSession } from "@/lib/api/session";

/**
 * The plan switch shown on every role's account/settings page. `features` is
 * the short "what's different" list for that role, purely descriptive.
 */
export function PlanToggleCard({
  features,
}: {
  features: readonly { label: string; free: string; paid: string }[];
}) {
  const tier = useTier();
  const [error, setError] = useState("");

  async function choose(option: Tier) {
    if (option === tier) return;
    setError("");
    try {
      if (option === "paid") {
        await api("/me/plan/upgrade", {
          method: "POST",
          body: { method: "mobile_money" },
        });
      } else {
        await api("/me/plan/cancel", { method: "POST" });
      }
      window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
      mirrorSession(await fetchMe());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-bricolage text-lg font-medium">Plan</h3>
          <p className="text-carbon-500 mt-1 text-sm leading-6">
            RentUp uses a test payment provider for now, so no real money
            moves.
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
              onClick={() => void choose(option)}
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

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

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
