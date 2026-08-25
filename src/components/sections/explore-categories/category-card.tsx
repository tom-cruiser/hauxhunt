"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { useTranslation } from "@/components/language/use-translation";

type CategoryCardProps = {
  titleKey: string;
  count: number;
  href: string;
  icon: LucideIcon;
  countLabelKey?: string;
};

export function CategoryCard({
  titleKey,
  count,
  href,
  icon: Icon,
  countLabelKey = "exploreCategories.defaultCountLabel",
}: CategoryCardProps) {
  const { t } = useTranslation();
  const title = t(titleKey);
  const countLabel = t(countLabelKey);

  return (
    <Link
      href={href}
      aria-label={t("exploreCategories.exploreAria", {
        count,
        countLabel,
        title,
      })}
      className="category-glass hover:border-carbon-900 group flex min-h-[170px] flex-col rounded-2xl p-6 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-7"
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.5}
        className="text-carbon-900 size-7"
      />

      <h3 className="font-bricolage text-carbon-900 mt-7 text-xl font-medium tracking-[-0.02em]">
        {title}
      </h3>

      <div className="mt-auto flex items-center justify-between gap-4 pt-3">
        <p className="text-body-s text-carbon-600">
          {count.toLocaleString()}+ {countLabel}
        </p>
        <ArrowRight
          aria-hidden="true"
          className="text-carbon-600 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}
