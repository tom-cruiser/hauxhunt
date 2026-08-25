"use client";

import { BadgeCheck } from "lucide-react";

import type { PropertyPreview } from "@/types";
import { CurrencyAmount } from "@/components/currency/currency-selector";
import { useTranslation } from "@/components/language/use-translation";

type MatchRowProps = {
  property: PropertyPreview;
};

/**
 * One matched home, as an editorial row rather than a card.
 *
 * Cards would put a second bordered container inside an already-bordered
 * workspace and make the panel read as a dashboard. A row separated only by a
 * hairline keeps the workspace one object, which is what lets it stay the
 * composition's centre of gravity.
 *
 * The match percentage is set in Lime — machine-derived evidence, the accent's
 * defined role — and is always accompanied by the sentence that justifies it.
 * A score without its reasoning would be exactly the kind of unearned claim
 * the brand is built against.
 */
export function MatchRow({ property }: MatchRowProps) {
  const { t } = useTranslation();

  return (
    <article className="border-border-subtle grid gap-x-6 gap-y-2 border-t py-5 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h4 className="text-heading-s text-fg">{property.title}</h4>
          {property.verified ? (
            <span className="text-caption text-fg-muted inline-flex items-center gap-1">
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              {t("hero.matchRow.verified")}
            </span>
          ) : null}
        </div>

        <p className="text-body-s text-fg-muted mt-1">
          {property.location} · {property.bedrooms} {t("hero.matchRow.bed")}{" "}
          · <CurrencyAmount usdAmount={property.price} />
          {t("hero.matchRow.perMonth")}
        </p>

        <p className="text-body-s text-fg-tertiary mt-3 max-w-[54ch]">
          {property.whyItMatches}
        </p>
      </div>

      <p className="text-fg-muted sm:text-right">
        <span className="text-heading-m text-intel block tabular-nums">
          {property.matchPercentage}%
        </span>
        <span className="text-caption">{t("hero.matchRow.match")}</span>
      </p>
    </article>
  );
}
