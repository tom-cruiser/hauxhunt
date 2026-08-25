"use client";

import { use, useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import emptyIllustration from "@/assets/images/empty.png";
import { CurrencyFilterSelect } from "@/components/currency/currency-selector";
import { FlatmateBanner } from "@/components/flatmates/flatmate-banner";
import { FlatmateCard } from "@/components/flatmates/flatmate-card";
import { FlatmatesNavigation } from "@/components/flatmates/flatmates-navigation";
import { Footer } from "@/components/layout/footer";
import { AutoSubmitFilterForm } from "@/components/listings/auto-submit-filter-form";
import { VoiceInputButton } from "@/components/listings/voice-input-button";
import { PUBLIC_FLATMATES, type PublicFlatmate } from "@/data/public-flatmates";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

// Grid columns top out at 4 (xl breakpoint), so "3 rows" = 12 cards per batch.
const GRID_ROWS_PER_PAGE = 3;
const GRID_COLUMNS = 4;
const GRID_BATCH_SIZE = GRID_ROWS_PER_PAGE * GRID_COLUMNS;

export function FlatmatesPageClient({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = use(searchParams);
  const renterView = valueOf(params.from) === "renter";
  const location = valueOf(params.location).trim();
  const budget = valueOf(params.budget);
  const moveIn = valueOf(params.moveIn);
  const situation = valueOf(params.situation);
  const gender = valueOf(params.gender);
  const occupation = valueOf(params.occupation);
  const smoking = valueOf(params.smoking);
  const lifestyle = valueOf(params.lifestyle);
  const showAll = valueOf(params.view) === "all";
  const country = valueOf(params.country);

  // Client states
  const [hasProfile, setHasProfile] = useState(false);
  const [customProfileData, setCustomProfileData] = useState<any>(null);
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [visibleGridCount, setVisibleGridCount] = useState(GRID_BATCH_SIZE);

  useEffect(() => {
    const published = window.sessionStorage.getItem("hauxhunt-has-flatmate-profile") === "true";
    setHasProfile(published);
    if (published) {
      const saved = window.sessionStorage.getItem("hauxhunt-flatmate-profile-data");
      if (saved) {
        try {
          setCustomProfileData(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const filtered = PUBLIC_FLATMATES.filter((flatmate) => {
    // If it's Julien, we override with client-side details if custom profile exists,
    // otherwise use default fields.
    const f = (flatmate.id === "julien" && customProfileData) ? {
      ...flatmate,
      firstName: customProfileData.firstName || flatmate.firstName,
      age: Number(customProfileData.age) || flatmate.age,
      occupation: customProfileData.occupation || flatmate.occupation,
      city: customProfileData.city || flatmate.city,
      country: customProfileData.country || flatmate.country,
      situation: customProfileData.situation || flatmate.situation,
      budgetMin: Number(customProfileData.budget) || flatmate.budgetMin,
      budgetMax: Number(customProfileData.budget) || flatmate.budgetMax,
      areas: customProfileData.areas || flatmate.areas,
      lifestyleTags: customProfileData.lifestyleTags || flatmate.lifestyleTags,
      gender: customProfileData.gender || flatmate.gender,
    } : flatmate;

    // Filter logic
    const searchableLocation =
      `${f.city} ${f.country} ${f.areas.join(" ")}`.toLowerCase();
    const locationMatch =
      !location || searchableLocation.includes(location.toLowerCase());
    const countryMatch = !country || f.country.toLowerCase() === country.toLowerCase();
    const budgetMatch =
      !budget ||
      (budget === "under-300" && f.budgetMin < 300000) ||
      (budget === "300-450" &&
        f.budgetMin <= 450000 &&
        f.budgetMax >= 300000) ||
      (budget === "450-600" &&
        f.budgetMin <= 600000 &&
        f.budgetMax >= 450000) ||
      (budget === "above-600" && f.budgetMax > 600000);
    return (
      locationMatch &&
      countryMatch &&
      budgetMatch &&
      (!moveIn || f.moveInValue === moveIn) &&
      (!situation || f.situation === situation) &&
      (!gender || f.gender === gender) &&
      (!occupation ||
        f.occupation.toLowerCase().includes(occupation.toLowerCase())) &&
      (!smoking || f.smoking === smoking) &&
      (!lifestyle || f.lifestyle === lifestyle)
    );
  });

  // Filter out Julien if profile not published
  const withoutUnpublishedJulien = filtered.filter(
    (flatmate) => flatmate.id !== "julien" || hasProfile
  );

  const computeMatchScore = (f: PublicFlatmate): number => {
    if (!customProfileData) return 0;
    const viewerBudget = Number(customProfileData.budget) || 450000;
    const viewerAreas: string[] = customProfileData.areas || [];
    const viewerTags: string[] = customProfileData.lifestyleTags || [];
    const budgetDiff = Math.abs(f.budgetMin - viewerBudget) / viewerBudget;
    const budgetScore = Math.max(0, 40 - Math.round(budgetDiff * 40));
    const areaMatches = viewerAreas.filter((a) => f.areas.includes(a)).length;
    const areaScore = viewerAreas.length > 0 ? Math.round((areaMatches / viewerAreas.length) * 35) : 25;
    const tagMatches = viewerTags.filter((t) => f.lifestyleTags.includes(t)).length;
    const tagScore = viewerTags.length > 0 ? Math.round((tagMatches / viewerTags.length) * 25) : 15;
    return Math.min(99, budgetScore + areaScore + tagScore);
  };

  // Compute "People matching your needs" — only when viewer has a published profile
  const suggestedFlatmates = hasProfile && customProfileData
    ? PUBLIC_FLATMATES.filter((f) => {
        if (f.id === "julien") return false; // exclude self
        const viewerBudget = Number(customProfileData.budget) || 450000;
        const viewerAreas: string[] = customProfileData.areas || [];
        const viewerTags: string[] = customProfileData.lifestyleTags || [];
        const budgetOverlap = f.budgetMin <= viewerBudget * 1.3 && f.budgetMax >= viewerBudget * 0.7;
        const areaOverlap = viewerAreas.length === 0 || f.areas.some((a) => viewerAreas.includes(a));
        const tagOverlap = viewerTags.length === 0 || f.lifestyleTags.some((t) => viewerTags.includes(t));
        return budgetOverlap && areaOverlap && tagOverlap;
      })
      .sort((a, b) => computeMatchScore(b) - computeMatchScore(a))
      .slice(0, 10)
    : [];

  // Re-shuffle whenever the actual set of matching flatmates changes (e.g. filters
  // applied or cleared) — not just once on mount. Navigating via a plain <Link>
  // (like "Clear Filters") doesn't remount this component, so relying on an
  // empty dependency array here left `visible` stuck on the pre-clear results.
  const filteredIdsKey = withoutUnpublishedJulien.map((f) => f.id).join(",");
  const [visible, setVisible] = useState(withoutUnpublishedJulien);
  useEffect(() => {
    const arr = [...withoutUnpublishedJulien];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setVisible(arr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredIdsKey]);
  const hasFilters = Boolean(
    location ||
      country ||
      budget ||
      moveIn ||
      situation ||
      gender ||
      occupation ||
      smoking ||
      lifestyle
  );
  const query = new URLSearchParams();
  if (renterView) query.set("from", "renter");
  for (const [key, value] of Object.entries({
    location,
    country,
    budget,
    moveIn,
    situation,
    gender,
    occupation,
    smoking,
    lifestyle,
  })) {
    if (value) query.set(key, value);
  }
  const allQuery = new URLSearchParams(query);
  allQuery.set("view", "all");

  const finalFlatmates = visible.map((flatmate) => {
    if (flatmate.id === "julien" && customProfileData) {
      return {
        ...flatmate,
        firstName: customProfileData.firstName || flatmate.firstName,
        age: Number(customProfileData.age) || flatmate.age,
        occupation: customProfileData.occupation || flatmate.occupation,
        city: customProfileData.city || flatmate.city,
        country: customProfileData.country || flatmate.country,
        situation: customProfileData.situation || flatmate.situation,
        portrait: customProfileData.profileImage || flatmate.portrait,
        budgetMin: Number(customProfileData.budget) || flatmate.budgetMin,
        budgetMax: Number(customProfileData.budget) || flatmate.budgetMax,
        areas: customProfileData.areas || flatmate.areas,
        lifestyleTags: customProfileData.lifestyleTags || flatmate.lifestyleTags,
      };
    }
    return flatmate;
  });

  return (
    <>
      <FlatmatesNavigation initialRenterView={renterView} />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <section className="bg-carbon-50 px-5 pt-8 pb-4 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto flex max-w-[1562px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="dashboard-page-title text-carbon-900">
                Find a Flatmate
              </h1>
              <p className="text-carbon-600 mt-3 max-w-3xl text-base leading-6">
                Find people whose budget, location, move-in plans, and lifestyle
                could work with yours.
              </p>
            </div>
            {hasFilters ? (
              <Link
                href={renterView ? "/flatmates?from=renter" : "/flatmates"}
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-black/20 bg-white px-5 text-xs font-medium text-black transition-colors hover:bg-black hover:text-white"
              >
                Clear Filters
              </Link>
            ) : null}
          </div>
        </section>

        <section
          id="flatmate-filters"
          className="bg-carbon-50 px-5 py-4 sm:px-6 lg:px-11 xl:px-[52px]"
        >
          <AutoSubmitFilterForm
            key={`${location}|${budget}|${moveIn}|${situation}|${gender}|${country}|${occupation}|${smoking}|${lifestyle}`}
            action="/flatmates"
            className="mx-auto grid max-w-[1562px] gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr]"
          >
            {renterView ? <input type="hidden" name="from" value="renter" /> : null}
            <label>
              <span className="sr-only">Location</span>
              <span className="catalogue-location-filter flex items-center gap-2 px-4">
                <button
                  type="submit"
                  aria-label="Search location"
                  className="text-carbon-500 hover:text-carbon-900 shrink-0 transition-colors"
                >
                  <Search aria-hidden="true" className="size-4" />
                </button>
                <input
                  name="location"
                  defaultValue={location}
                  data-no-auto-submit="true"
                  data-submit-when-empty="true"
                  placeholder="Location"
                  className="catalogue-filter-control min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                <VoiceInputButton />
              </span>
            </label>
            <CurrencyFilterSelect
              name="budget"
              label="Monthly Budget"
              value={budget}
              placeholder="Budget"
              hideLabel
              ranges={[
                { value: "under-300", minimumUsd: null, maximumUsd: 215 },
                { value: "300-450", minimumUsd: 215, maximumUsd: 325 },
                { value: "450-600", minimumUsd: 325, maximumUsd: 430 },
                { value: "above-600", minimumUsd: 430, maximumUsd: null },
              ]}
            />
            <FilterSelect
              name="moveIn"
              label="Move-in"
              value={moveIn}
              options={[
                ["2026-08", "Available now"],
                ["2026-09", "September 2026"],
                ["2026-10", "October 2026"],
                ["2026-11", "November 2026"],
              ]}
            />
            <FilterSelect
              name="situation"
              label="Housing Situation"
              value={situation}
              options={[
                ["", "Any"],
                ["looking", "Looking for a place"],
                ["has-place", "Already has a place"],
              ]}
            />
            <FilterSelect
              name="gender"
              label="Gender preference"
              value={gender}
              options={[
                ["female", "Female"],
                ["male", "Male"],
              ]}
            />
            <FilterSelect
              name="country"
              label="Country"
              value={country}
              options={[
                ["Rwanda", "Rwanda"],
                ["Kenya", "Kenya"],
                ["Nigeria", "Nigeria"],
                ["Uganda", "Uganda"],
              ]}
            />
            <details className="group relative z-20 block w-full">
              <summary className="flex h-10 w-full cursor-pointer list-none items-center justify-between rounded-full bg-white px-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.09)] ring-0 outline-none [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2 truncate">
                  <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0 text-carbon-500" />
                  <span>More Filters</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-black/55 transition-transform group-open:rotate-180" />
              </summary>
              <div className="absolute top-[calc(100%+0.65rem)] right-0 grid w-[min(88vw,560px)] gap-3 rounded-2xl bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:grid-cols-2">
                <FilterSelect
                  name="occupation"
                  label="Occupation"
                  value={occupation}
                  options={[
                    ["professional", "Professional"],
                    ["engineer", "Engineer"],
                    ["designer", "Designer"],
                    ["student", "Student"],
                  ]}
                />
                <FilterSelect
                  name="smoking"
                  label="Smoking"
                  value={smoking}
                  options={[
                    ["non-smoker", "Non-smoker"],
                    ["outdoor-only", "Outdoor only"],
                  ]}
                />
                <FilterSelect
                  name="lifestyle"
                  label="Lifestyle"
                  value={lifestyle}
                  options={[
                    ["quiet", "Quiet"],
                    ["balanced", "Balanced"],
                    ["social", "Social"],
                  ]}
                />
              </div>
            </details>
          </AutoSubmitFilterForm>
        </section>

        <section className="bg-carbon-50 px-5 py-8 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1562px]">
            {suggestedFlatmates.length > 0 && (
              <div className="mb-10">
                <ScrollRow
                  title="Flatmates Who Match What You're Looking For"
                  viewMoreHref={`/flatmates${renterView ? "?from=renter" : ""}`}
                  viewMoreLabel="View more"
                >
                  {suggestedFlatmates.map((flatmate) => (
                    <div key={flatmate.id} className="w-[calc((100vw-10rem)/4-0.5rem)] min-w-[300px] shrink-0 h-[460px]">
                      <FlatmateCard
                        flatmate={flatmate}
                        priority={false}
                        renterView={renterView}
                        matchScore={computeMatchScore(flatmate)}
                      />
                    </div>
                  ))}
                </ScrollRow>
              </div>
            )}
            {finalFlatmates.length ? (
              <>
                {showAllProfiles ? (
                  <div>
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h2 className="font-bricolage text-2xl font-bold text-neutral-900">
                        People Looking for Flatmates
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAllProfiles(false);
                          setVisibleGridCount(GRID_BATCH_SIZE);
                        }}
                        className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-black/60 hover:text-black transition-colors"
                      >
                        Show less
                        <ArrowDownLeft aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {finalFlatmates.slice(0, visibleGridCount).map((flatmate, index) => (
                        <div key={flatmate.id} className="h-[460px]">
                          <FlatmateCard
                            flatmate={flatmate}
                            priority={index < 3}
                            renterView={renterView}
                          />
                        </div>
                      ))}
                    </div>
                    {visibleGridCount < finalFlatmates.length ? (
                      <div className="mt-6 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setVisibleGridCount((count) => count + GRID_BATCH_SIZE)}
                          className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black/70 transition-colors hover:bg-black hover:text-white"
                        >
                          View more
                          <ArrowUpRight aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <ScrollRow
                    title="People Looking for Flatmates"
                    onViewMore={() => {
                      setShowAllProfiles(true);
                      setVisibleGridCount(GRID_BATCH_SIZE);
                    }}
                    viewMoreLabel="View more"
                  >
                    {finalFlatmates.map((flatmate, index) => (
                      <div key={flatmate.id} className="w-[calc((100vw-10rem)/4-0.5rem)] min-w-[300px] shrink-0 h-[460px]">
                        <FlatmateCard
                          flatmate={flatmate}
                          priority={index < 3}
                          renterView={renterView}
                        />
                      </div>
                    ))}
                  </ScrollRow>
                )}
              </>
            ) : (
              <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
                <Image src={emptyIllustration} alt="" className="h-40 w-auto" />
                <h3 className="font-bricolage mt-5 text-2xl font-medium">
                  No Flatmates Match These Filters
                </h3>
                <p className="text-carbon-500 mt-2 text-sm">
                  Try adjusting your location, budget, move-in date, or
                  preferences.
                </p>
                <div className="mt-6 flex gap-3">
                  <Link
                    href={renterView ? "/flatmates?from=renter" : "/flatmates"}
                    className="h-11 rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
                  >
                    Clear Filters
                  </Link>
                  <a
                    href="#flatmate-filters"
                    className="h-11 rounded-full border border-black/20 px-5 py-3 text-sm font-medium"
                  >
                    Adjust Filters
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>


        <FlatmateBanner initialRenterView={renterView} />
      </main>
      {renterView ? null : <Footer />}
    </>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="relative block">
      <select
        aria-label={label}
        name={name}
        defaultValue={value}
        className="catalogue-filter-control h-10 w-full appearance-none rounded-full border-0 bg-white pr-11 pl-4 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.09)] ring-0 outline-none focus:ring-0"
      >
        <option value="">{label}</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={`${name}-${optionValue || "any"}`} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-black/55"
      />
    </label>
  );
}

function ScrollRow({
  title,
  viewMoreHref,
  onViewMore,
  viewMoreLabel,
  children,
}: {
  title: string;
  viewMoreHref?: string;
  onViewMore?: () => void;
  viewMoreLabel?: string;
  children: React.ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = rowRef.current;
    el?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    rowRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const scrollToEnd = () => {
    rowRef.current?.scrollTo({ left: rowRef.current.scrollWidth, behavior: "smooth" });
  };

  const viewMoreAction = onViewMore ?? (canScrollRight ? scrollToEnd : undefined);

  return (
    <div className="group/row relative">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-bricolage text-2xl font-bold text-neutral-900">{title}</h2>
        {viewMoreHref ? (
          <Link
            href={viewMoreHref}
            className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-black/60 hover:text-black transition-colors"
          >
            {viewMoreLabel ?? "View more"}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        ) : viewMoreAction ? (
          <button
            type="button"
            onClick={viewMoreAction}
            className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-black/60 hover:text-black transition-colors"
          >
            {viewMoreLabel ?? "View more"}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="relative" style={{ overflowY: "visible" }}>
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full border border-black/15 bg-white shadow-md transition-opacity duration-100 hover:bg-neutral-50 opacity-0 group-hover/row:opacity-100"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full border border-black/15 bg-white shadow-md transition-opacity duration-100 hover:bg-neutral-50 opacity-0 group-hover/row:opacity-100"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto py-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", overflowY: "visible", background: "none" }}
          onScroll={checkScroll}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
