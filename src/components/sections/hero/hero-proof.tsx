"use client";

import { KeyRound, ReceiptText, ShieldCheck } from "lucide-react";

import { useTranslation } from "@/components/language/use-translation";

const PROOF_POINTS = [
  { icon: ShieldCheck, labelKey: "hero.proof.verifiedHomes" },
  { icon: KeyRound, labelKey: "hero.proof.verifiedManagers" },
  { icon: ReceiptText, labelKey: "hero.proof.clearCosts" },
] as const;

/**
 * Three quiet proof points closing the composition.
 *
 * Deliberately the lowest-contrast text in the hero and set at Label size:
 * these are reassurance the eye collects on its way out, not a claim competing
 * with the statement above. Each pairs an icon with words — never a bare
 * coloured dot, which would carry meaning in colour alone.
 */
export function HeroProof() {
  const { t } = useTranslation();

  return (
    <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3">
      {PROOF_POINTS.map(({ icon: Icon, labelKey }) => (
        <li
          key={labelKey}
          className="text-caption text-fg-tertiary flex items-center gap-2"
        >
          <Icon aria-hidden="true" className="text-fg-brand size-4 shrink-0" />
          {t(labelKey)}
        </li>
      ))}
    </ul>
  );
}
