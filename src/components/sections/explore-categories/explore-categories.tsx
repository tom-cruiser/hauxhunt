"use client";

import {
  Building2,
  Castle,
  House,
  PanelsTopLeft,
  UsersRound,
  Waves,
} from "lucide-react";

import { CategoryCard } from "./category-card";
import { useTranslation } from "@/components/language/use-translation";

const CATEGORIES = [
  {
    titleKey: "exploreCategories.categories.beachFront",
    count: 86,
    href: "/search?type=Beach+Front+Apartments",
    icon: Waves,
  },
  {
    titleKey: "exploreCategories.categories.apartments",
    count: 341,
    href: "/search?type=Apartment",
    icon: Building2,
  },
  {
    titleKey: "exploreCategories.categories.houses",
    count: 128,
    href: "/search?type=House",
    icon: House,
  },
  {
    titleKey: "exploreCategories.categories.duplexes",
    count: 94,
    href: "/search?type=Duplex",
    icon: PanelsTopLeft,
  },
  {
    titleKey: "exploreCategories.categories.villas",
    count: 67,
    href: "/search?type=Villa",
    icon: Castle,
  },
  {
    titleKey: "exploreCategories.categories.flatmates",
    count: 118,
    href: "/flatmates",
    icon: UsersRound,
    countLabelKey: "exploreCategories.categories.flatmatesCountLabel",
  },
] as const;

export function ExploreCategories() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="explore-categories-title"
      className="category-atmosphere relative overflow-hidden px-5 py-16 sm:px-6 sm:py-20 lg:px-11 xl:px-[52px]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 650"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[78%] w-full text-black opacity-[0.1]"
      >
        <defs>
          <path
            id="category-wave-a"
            d="M-120 105 C260 20 470 80 700 330 S1090 575 1720 205"
          />
          <path
            id="category-wave-b"
            d="M-100 490 C250 285 430 640 790 505 S1080 160 1710 330"
          />
        </defs>
        <g fill="none" stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 14 }, (_, index) => (
            <use
              key={`wave-a-${index}`}
              href="#category-wave-a"
              transform={`translate(0 ${index * 14})`}
            />
          ))}
          {Array.from({ length: 11 }, (_, index) => (
            <use
              key={`wave-b-${index}`}
              href="#category-wave-b"
              transform={`translate(0 ${index * 13})`}
            />
          ))}
        </g>
      </svg>

      <div className="relative z-10 mx-auto max-w-[1562px]">
        <h2
          id="explore-categories-title"
          className="font-bricolage text-carbon-900 text-[clamp(2rem,3vw,3rem)] leading-none font-normal tracking-[-0.035em]"
        >
          {t("exploreCategories.title")}
        </h2>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.titleKey} {...category} />
          ))}
        </div>
      </div>
    </section>
  );
}
