"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import abujaImage from "@/assets/images/abuja.jpg";
import gisenyiImage from "@/assets/images/gisenyi.jpg";
import karongiImage from "@/assets/images/karongi.jpg";
import kigaliImage from "@/assets/images/kigali-city.jpg";
import lagosImage from "@/assets/images/lagos.jpg";
import lekkiImage from "@/assets/images/lekki.png";
import { LocationCard } from "./location-card";
import { useTranslation } from "@/components/language/use-translation";

const LOCATIONS = [
  {
    name: "Kigali",
    country: "Rwanda",
    homes: 247,
    image: kigaliImage,
    focalPoint: "50% 52%",
    className: "lg:col-span-7",
  },
  {
    name: "Gisenyi",
    country: "Rwanda",
    homes: 86,
    image: gisenyiImage,
    focalPoint: "50% 52%",
    className: "lg:col-span-5",
  },
  {
    name: "Karongi",
    country: "Rwanda",
    homes: 54,
    image: karongiImage,
    focalPoint: "50% 54%",
    className: "lg:col-span-4",
  },
  {
    name: "Lagos",
    country: "Nigeria",
    homes: 412,
    image: lagosImage,
    focalPoint: "50% 50%",
    className: "lg:col-span-4",
  },
  {
    name: "Abuja",
    country: "Nigeria",
    homes: 196,
    image: abujaImage,
    focalPoint: "50% 52%",
    className: "lg:col-span-4",
  },
  {
    name: "Lekki",
    country: "Nigeria",
    homes: 173,
    image: lekkiImage,
    focalPoint: "50% 52%",
    className: "lg:col-span-12 lg:min-h-[360px]",
  },
] as const;

type TrendingLocationsProps = {
  audience?: "guest" | "renter";
  variant?: "page" | "embedded";
};

export function TrendingLocations({
  audience = "guest",
  variant = "page",
}: TrendingLocationsProps = {}) {
  const { t } = useTranslation();
  const embedded = variant === "embedded";

  return (
    <section
      id="trending-locations"
      aria-labelledby="trending-locations-title"
      className={
        embedded
          ? "mt-20 scroll-mt-24"
          : "bg-canvas scroll-mt-24 px-5 py-20 sm:px-6 sm:py-24 lg:px-11 xl:px-[52px]"
      }
    >
      <div className="mx-auto max-w-[1562px]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="trending-locations-title"
              className={
                embedded
                  ? "font-bricolage text-carbon-900 text-3xl leading-none font-medium tracking-[-0.04em] sm:text-4xl"
                  : "font-bricolage text-carbon-900 text-[clamp(2.25rem,4vw,3.75rem)] leading-none font-normal tracking-[-0.04em]"
              }
            >
              {t("trendingLocations.title")}
            </h2>
            <p className="text-body-m text-carbon-900 mt-4 sm:whitespace-nowrap">
              {t("trendingLocations.subtitle")}
            </p>
          </div>

          <Link
            href={
              audience === "renter"
                ? "/renter-dashboard/properties"
                : "/properties?map=1"
            }
            className="font-bricolage border-carbon-900 text-carbon-900 hover:bg-muted inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border bg-transparent px-5 text-base font-medium transition-colors duration-150 sm:self-auto"
          >
            {t("trendingLocations.exploreMore")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {LOCATIONS.map((location) => (
            <LocationCard
              key={`${location.country}-${location.name}`}
              {...location}
              href={
                audience === "renter"
                  ? `/renter-dashboard/properties?location=${encodeURIComponent(location.name)}`
                  : `/properties?location=${encodeURIComponent(location.name)}&map=1`
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
