"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Download,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";

import appleStoreBadge from "@/assets/images/Apple store badge.png";
import googlePlayBadge from "@/assets/images/google play store badge.png";
import { useTranslation } from "@/components/language/use-translation";

const STEPS = [
  { number: "01", key: "step1", icon: Search },
  { number: "02", key: "step2", icon: SlidersHorizontal },
  { number: "03", key: "step3", icon: UsersRound },
] as const;

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="bg-canvas px-5 py-20 sm:px-6 sm:py-24 lg:px-11 xl:px-[52px]"
    >
      <div className="mx-auto max-w-[1562px]">
        <div className="max-w-[720px]">
          <h2
            id="how-it-works-title"
            className="font-bricolage text-carbon-900 text-[clamp(2.25rem,4vw,3.75rem)] leading-none font-normal tracking-[-0.04em]"
          >
            {t("howItWorks.title")}
          </h2>
          <p className="text-body-m text-carbon-600 mt-4 max-w-[58ch]">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <ol className="mt-12 grid gap-5 lg:grid-cols-3">
          {STEPS.map(({ number, key, icon: Icon }) => (
            <li
              key={number}
              className="border-border-default rounded-2xl border bg-white p-6 sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="font-bricolage text-carbon-500 text-sm font-medium">
                  {number}
                </span>
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="text-carbon-900 size-7"
                />
              </div>
              <h3 className="font-bricolage text-carbon-900 mt-10 text-2xl font-medium tracking-[-0.025em]">
                {t(`howItWorks.${key}.title`)}
              </h3>
              <p className="text-body-m text-carbon-600 mt-3">
                {t(`howItWorks.${key}.description`)}
              </p>
            </li>
          ))}
        </ol>

        <div className="partner-app-panel mt-16 grid overflow-hidden rounded-3xl lg:grid-cols-2">
          <div className="border-b border-white/12 p-7 sm:p-10 lg:border-r lg:border-b-0 lg:p-12">
            <Building2
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-8 text-white"
            />
            <h3 className="font-bricolage mt-8 text-[clamp(1.75rem,3vw,2.75rem)] leading-tight font-normal tracking-[-0.035em] text-white">
              {t("howItWorks.partnerPanel.growTitle")}
            </h3>
            <p className="text-body-m mt-4 max-w-[54ch] text-white/65">
              {t("howItWorks.partnerPanel.growDescription")}
            </p>
            <Link
              href="/register"
              className="font-bricolage bg-carbon-0 text-carbon-900 hover:bg-carbon-100 mt-8 inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-medium transition-colors duration-150"
            >
              {t("howItWorks.partnerPanel.joinUs")}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="p-7 sm:p-10 lg:p-12">
            <Download
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-8 text-white"
            />
            <h3 className="font-bricolage mt-8 text-[clamp(1.75rem,3vw,2.75rem)] leading-tight font-normal tracking-[-0.035em] text-white">
              {t("howItWorks.partnerPanel.appTitle")}
            </h3>
            <p className="text-body-m mt-4 max-w-[52ch] text-white/65">
              {t("howItWorks.partnerPanel.appDescription")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/download/android"
                aria-label={t("howItWorks.partnerPanel.googlePlayAria")}
                className="relative h-11 w-40 overflow-hidden rounded-lg transition-transform duration-150 hover:-translate-y-0.5"
              >
                <Image
                  src={googlePlayBadge}
                  alt={t("howItWorks.partnerPanel.googlePlayAlt")}
                  placeholder="blur"
                  className="absolute top-[-59px] left-[-48px] h-[171px] w-64 max-w-none"
                />
              </Link>
              <Link
                href="/download/ios"
                aria-label={t("howItWorks.partnerPanel.appStoreAria")}
                className="relative h-[46px] w-40 overflow-hidden rounded-lg transition-transform duration-150 hover:-translate-y-0.5"
              >
                <Image
                  src={appleStoreBadge}
                  alt={t("howItWorks.partnerPanel.appStoreAlt")}
                  placeholder="blur"
                  className="absolute top-[-40px] left-[-19px] h-[132px] w-[198px] max-w-none"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
