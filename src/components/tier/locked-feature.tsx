"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { GATED_FEATURES, type GatedFeature } from "@/lib/access-control";
import { UpgradeModal } from "./upgrade-modal";

type Variant = "row" | "button" | "badge";

const VARIANT_CLASS: Record<Variant, string> = {
  row: "flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 p-3.5 text-left transition-colors hover:bg-black/[0.03]",
  button:
    "inline-flex h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium text-black/60 transition-colors hover:border-black/30 hover:text-black",
  badge:
    "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-black/45 transition-colors hover:bg-black/10",
};

/**
 * A gated control for a paid-only feature: shown to free-tier users in
 * place of the real thing, it opens `UpgradeModal` on click rather than
 * performing the action. Copy comes from the `GATED_FEATURES` registry
 * (`src/lib/access-control.ts`) via `feature`, so the same id always reads
 * the same everywhere it appears.
 *
 * Callers render this *instead of* the real control when
 * `!isPaidTier(tier)`, and the real control when the tier check passes —
 * this component has no tier awareness of its own, it's just the locked
 * state's visual + the modal it opens.
 */
export function LockedFeature({
  feature,
  variant = "row",
  label,
  className,
}: {
  feature: GatedFeature;
  variant?: Variant;
  /** Overrides the registry's default label (e.g. for a row that already
   * shows its own title and only needs the lock as a trailing icon). */
  label?: string;
  className?: string;
}) {
  const copy = GATED_FEATURES[feature];
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={variant === "badge" ? `${label ?? copy.label} — Paid feature` : undefined}
        className={className ?? VARIANT_CLASS[variant]}
      >
        {variant === "badge" ? (
          <Lock aria-hidden="true" className="size-3" />
        ) : (
          <>
            <span className="text-sm font-medium">{label ?? copy.label}</span>
            <Lock aria-hidden="true" className="size-4 shrink-0 text-black/35" />
          </>
        )}
      </button>
      <UpgradeModal feature={feature} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * A full-section lock: replaces an entire real feature (e.g. a dashboard
 * tab's content) with an inline empty-state card carrying the same registry
 * copy, plus a direct link to upgrade — no modal, since there's already
 * room to say everything in place.
 */
export function LockedPanel({
  feature,
  className,
}: {
  feature: GatedFeature;
  className?: string;
}) {
  const copy = GATED_FEATURES[feature];

  return (
    <div
      className={
        className ??
        "flex flex-col items-center rounded-2xl border border-black/10 bg-black/[0.02] px-6 py-14 text-center"
      }
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-black text-white">
        <Lock aria-hidden="true" className="size-5" />
      </span>
      <h3 className="font-bricolage mt-5 text-xl font-medium tracking-[-0.01em]">
        {copy.title}
      </h3>
      <p className="text-carbon-500 mt-2 max-w-sm text-sm leading-6">
        {copy.description}
      </p>
      <Link
        href={copy.upgradeHref}
        className="font-bricolage mt-6 inline-flex h-11 items-center rounded-full bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-black/80"
      >
        Upgrade to Paid
      </Link>
    </div>
  );
}
