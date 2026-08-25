"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { useTranslation } from "@/components/language/use-translation";

type LocationCardProps = {
  name: string;
  country: string;
  homes: number;
  href: string;
  image: StaticImageData;
  className?: string;
  focalPoint?: string;
};

export function LocationCard({
  name,
  country,
  homes,
  href,
  image,
  className,
  focalPoint = "50% 55%",
}: LocationCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      href={href}
      aria-label={t("trendingLocations.exploreAria", { count: homes, name, country })}
      className={`group relative isolate min-h-[310px] overflow-hidden rounded-2xl ${className ?? ""}`}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw"
        placeholder="blur"
        style={{ objectPosition: focalPoint }}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/5" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white sm:p-7">
        <div>
          <p className="text-caption text-white/75">{country}</p>
          <h3 className="font-bricolage mt-1 text-[1.75rem] leading-tight font-medium tracking-[-0.025em]">
            {name}
          </h3>
          <p className="mt-2 text-sm text-white/85">
            {homes.toLocaleString()}+ {t("trendingLocations.housesSuffix")}
          </p>
        </div>

        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/35 bg-black/15 backdrop-blur-sm transition-colors duration-150 group-hover:bg-white group-hover:text-black">
          <ArrowUpRight aria-hidden="true" className="size-5" />
        </span>
      </div>
    </Link>
  );
}
