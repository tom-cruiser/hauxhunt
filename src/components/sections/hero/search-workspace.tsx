"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Mic, Plus, Search } from "lucide-react";

import { FilterToken } from "./filter-token";
import { MatchRow } from "./match-row";
import { heroEase } from "./hero-motion";
import { matchListings } from "@/data/hero-search-demo";
import type { ParsedFilter, PropertyPreview } from "@/types";
import {
  formatCurrencyRange,
  useDisplayCurrency,
} from "@/components/currency/currency-selector";
import { useTranslation } from "@/components/language/use-translation";

type Stage = "idle" | "parsed" | "results";

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type ReverseGeocodeResult = {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
  };
};

const LOCATIONS = [
  "Lagos",
  "Abuja",
  "Rivers State",
  "Uyo",
  "Kaduna",
  "Enugu",
  "Kigali",
  "Gisenyi",
  "Karongi",
  "Nairobi",
  "Mombasa",
  "Kiambu",
  "Kisumu",
] as const;

const PROPERTY_TYPES = [
  "Apartment",
  "Beach Front Apartments",
  "Duplex",
  "Single room",
  "Penthouse",
  "Shared apartment",
  "Studio apartment",
  "Mansion",
  "Villa",
  "Hotel",
] as const;

const CRITERIA = ["Entire place", "Shared home"] as const;

const PRICE_RANGES = [
  "USD 50 – 100",
  "USD 100 – 150",
  "USD 150 – 250",
  "USD 250 – 500",
  "USD 500 – 1,000",
  "USD 1,000+",
] as const;

const PRICE_RANGE_VALUES: Record<string, string> = {
  "USD 50 – 100": "50-100",
  "USD 100 – 150": "100-150",
  "USD 150 – 250": "150-250",
  "USD 250 – 500": "250-500",
  "USD 500 – 1,000": "500-1000",
  "USD 1,000+": "1000-Infinity",
};

const reveal = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.35, ease: heroEase },
};

/**
 * The workspace — the composition's centre of gravity.
 *
 * It is not a search bar, a form, a dashboard or a chat. It is one quiet
 * surface that accepts a sentence, shows what it understood as material you
 * can correct, and then resolves into homes. The intelligence is demonstrated
 * by that sequence; it is never announced. No "AI" label appears anywhere,
 * there are no conversation bubbles, and nothing pretends to talk back.
 *
 * The interaction model is unchanged from the approved Flow 3B spec — only its
 * form is new.
 */
export function SearchWorkspace() {
  const router = useRouter();
  const { t } = useTranslation();
  const displayCurrency = useDisplayCurrency();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [filters, setFilters] = useState<ParsedFilter[]>([]);
  const [results, setResults] = useState<PropertyPreview[]>([]);
  const [directResults, setDirectResults] = useState(false);
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [criteria, setCriteria] = useState("");
  const [pricing, setPricing] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const understoodRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceTranscriptRef = useRef("");
  const inputId = useId();

  function useCurrentLocation() {
    const demoAddress = "31 KG 152 St, Kigali";
    setUsingCurrentLocation(true);
    setQuery(demoAddress);

    if (!navigator.geolocation) return;

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const endpoint = new URL(
            "https://nominatim.openstreetmap.org/reverse",
          );
          endpoint.searchParams.set("format", "jsonv2");
          endpoint.searchParams.set("lat", String(coords.latitude));
          endpoint.searchParams.set("lon", String(coords.longitude));
          endpoint.searchParams.set("zoom", "18");
          endpoint.searchParams.set("addressdetails", "1");
          endpoint.searchParams.set("layer", "address");
          endpoint.searchParams.set("accept-language", "en");
          const response = await fetch(endpoint);
          if (!response.ok) throw new Error("Address lookup failed");
          const result = (await response.json()) as ReverseGeocodeResult;
          const address = result.address;
          const street = [
            address?.house_number,
            address?.road ?? address?.pedestrian,
          ]
            .filter(Boolean)
            .join(" ");
          const area = address?.neighbourhood ?? address?.suburb;
          const city = address?.city ?? address?.town ?? address?.village;
          const readableAddress =
            [street, area, city].filter(Boolean).join(", ") ||
            result.display_name?.split(",").slice(0, 3).join(",").trim();
          if (!readableAddress) throw new Error("No street address found");
          setQuery(readableAddress);
        } catch {
          setQuery(demoAddress);
        } finally {
          setLocationLoading(false);
        }
      },
      () => setLocationLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function toggleVoiceSearch() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setUsingCurrentLocation(false);
      setQuery(t("hero.search.voiceNotSupported"));
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      voiceTranscriptRef.current = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
    };
    recognition.onend = () => {
      if (voiceTranscriptRef.current) {
        setUsingCurrentLocation(false);
        setQuery(voiceTranscriptRef.current);
      }
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    voiceTranscriptRef.current = "";
    setListening(true);
    recognition.start();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (criteria === "Shared home") {
      const sharedHomeLocation = location || query.trim();
      const sharedHomeParams = new URLSearchParams();
      if (sharedHomeLocation) {
        sharedHomeParams.set("location", sharedHomeLocation);
      }
      if (propertyType) sharedHomeParams.set("type", propertyType);
      if (pricing) sharedHomeParams.set("priceRange", pricing);
      router.push(
        `/flatmates${sharedHomeParams.size ? `?${sharedHomeParams.toString()}` : ""}`,
      );
      return;
    }

    const standardSearchParams = new URLSearchParams();
    const searchText = query.trim() || location;
    if (searchText) standardSearchParams.set("q", searchText);
    if (usingCurrentLocation) standardSearchParams.set("source", "location");
    if (propertyType) standardSearchParams.set("type", propertyType);
    if (pricing) standardSearchParams.set("price", PRICE_RANGE_VALUES[pricing]);

    if (standardSearchParams.size) {
      router.push(`/search?${standardSearchParams.toString()}`);
      return;
    }

    if (criteria === "Entire place") {
      router.push("/properties?mapHidden=1");
    }
  }

  function handleRemoveFilter(id: string) {
    setFilters((prev) => prev.filter((filter) => filter.id !== id));
  }

  function handleUpdateFilter(id: string, label: string) {
    setFilters((prev) =>
      prev.map((filter) =>
        filter.id === id ? { ...filter, label, unclear: false } : filter,
      ),
    );
  }

  function handleAddFilter(label: string) {
    setFilters((prev) => [
      ...prev,
      { id: `custom-${prev.length}-${label}`, kind: "custom", label },
    ]);
  }

  function handleShowMatches() {
    setResults(matchListings(filters));
    setStage("results");
  }

  function handleStartOver() {
    setQuery("");
    setFilters([]);
    setResults([]);
    setLocation("");
    setPropertyType("");
    setCriteria("");
    setPricing("");
    setDirectResults(false);
    setStage("idle");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const announcement = useMemo(() => {
    if (stage === "idle") return "";
    if (stage === "parsed") {
      const understood = filters.filter((f) => !f.unclear).length;
      const unclear = filters.some((f) => f.unclear);
      const filterPhrase = t(
        understood === 1
          ? "hero.search.understoodFilterOne"
          : "hero.search.understoodFilterOther",
        { count: understood },
      );
      return `${filterPhrase}${
        unclear ? t("hero.search.withUnclearPart") : ""
      }${t("hero.search.reviewThenShow")}`;
    }
    return t(
      results.length === 1
        ? "hero.search.resultsCountOne"
        : "hero.search.resultsCountOther",
      { count: results.length },
    );
  }, [stage, filters, results, t]);

  const hasSearchInput =
    query.trim().length > 0 ||
    Boolean(location || propertyType || criteria || pricing);

  return (
    <div
      id="search"
      className="workspace-surface scroll-mt-28 overflow-hidden rounded-[1.5rem]"
    >
      {/* --- The sentence ------------------------------------------------ */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="focus-within:border-border-interactive flex min-w-0 flex-1 items-center gap-3 border-b border-transparent transition-colors duration-150">
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locationLoading}
              aria-label={t("hero.search.useCurrentLocation")}
              title={t("hero.search.useCurrentLocation")}
              className="text-carbon-600 flex size-9 shrink-0 items-center justify-center rounded-full bg-transparent transition-colors hover:text-black disabled:opacity-40"
            >
              <MapPin aria-hidden="true" className="size-5" />
            </button>
            <label htmlFor={inputId} className="sr-only">
              {t("hero.search.describeHome")}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={query}
              onChange={(event) => {
                setUsingCurrentLocation(false);
                setQuery(event.target.value);
              }}
              placeholder={t("hero.search.placeholder")}
              autoComplete="off"
              className="search-query-input text-body-l text-fg min-w-0 flex-1 bg-transparent px-1 py-1.5 placeholder:text-black/55 placeholder:opacity-100"
            />
          </div>
          <button
            type="button"
            onClick={toggleVoiceSearch}
            aria-label={
              listening
                ? t("hero.search.stopVoiceSearch")
                : t("hero.search.startVoiceSearch")
            }
            title={
              listening
                ? t("hero.search.stopListening")
                : t("hero.search.searchByVoice")
            }
            className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-transparent transition-colors ${
              listening ? "text-red-600" : "text-carbon-600 hover:text-black"
            }`}
          >
            <Mic aria-hidden="true" className="size-5" />
          </button>
          <button
            type="submit"
            disabled={!hasSearchInput}
            aria-label={t("hero.search.search")}
            title={t("hero.search.search")}
            className="bg-action-primary text-fg-on-brand hover:bg-action-primary-hover active:bg-action-primary-active inline-flex size-11 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35"
          >
            <Search aria-hidden="true" className="size-4" />
          </button>
        </div>

        {stage === "idle" ? (
          <div className="border-border-subtle mt-3 grid gap-2.5 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <SearchSelect
              label={t("hero.search.location")}
              value={location}
              onChange={setLocation}
              placeholder={t("hero.search.chooseLocation")}
              options={LOCATIONS}
            />
            <SearchSelect
              label={t("hero.search.type")}
              value={propertyType}
              onChange={setPropertyType}
              placeholder={t("hero.search.choosePropertyType")}
              options={PROPERTY_TYPES}
            />
            <SearchSelect
              label={t("hero.search.criteria")}
              value={criteria}
              onChange={setCriteria}
              placeholder={t("hero.search.chooseCriteria")}
              options={CRITERIA}
            />
            <SearchSelect
              label={t("hero.search.pricing")}
              value={pricing}
              onChange={setPricing}
              placeholder={t("hero.search.choosePricing")}
              options={PRICE_RANGES}
              optionLabels={Object.fromEntries([
                [
                  PRICE_RANGES[0],
                  formatCurrencyRange(50, 100, displayCurrency),
                ],
                [
                  PRICE_RANGES[1],
                  formatCurrencyRange(100, 150, displayCurrency),
                ],
                [
                  PRICE_RANGES[2],
                  formatCurrencyRange(150, 250, displayCurrency),
                ],
                [
                  PRICE_RANGES[3],
                  formatCurrencyRange(250, 500, displayCurrency),
                ],
                [
                  PRICE_RANGES[4],
                  formatCurrencyRange(500, 1000, displayCurrency),
                ],
                [
                  PRICE_RANGES[5],
                  formatCurrencyRange(1000, null, displayCurrency),
                ],
              ])}
            />
          </div>
        ) : null}
      </form>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* --- What we understood ------------------------------------------ */}
      <AnimatePresence initial={false}>
        {stage !== "idle" ? (
          <motion.div
            key="understood"
            {...reveal}
            className="border-border-subtle border-t px-4 pt-5 pb-4 sm:px-6"
          >
            <h3
              ref={understoodRef}
              tabIndex={-1}
              className="text-label text-fg-muted uppercase"
            >
              {directResults
                ? t("hero.search.matchingHomes")
                : t("hero.search.whatWeUnderstood")}
            </h3>

            {!directResults ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {filters.map((filter) => (
                    <FilterToken
                      key={filter.id}
                      filter={filter}
                      onRemove={handleRemoveFilter}
                      onUpdate={handleUpdateFilter}
                    />
                  ))}
                  <AddFilter onAdd={handleAddFilter} />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <button
                    type="button"
                    onClick={handleShowMatches}
                    className="border-border-interactive text-body-s text-fg hover:bg-subtle inline-flex h-11 items-center rounded-lg border px-5 font-medium transition-colors duration-150"
                  >
                    {stage === "results"
                      ? t("hero.search.updateMatches")
                      : t("hero.search.showMatches")}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="text-body-s text-fg-muted hover:text-fg rounded transition-colors duration-150"
                  >
                    {t("hero.search.startOver")}
                  </button>
                </div>
              </>
            ) : null}

            {/* --- Matches ----------------------------------------------- */}
            <AnimatePresence initial={false}>
              {stage === "results" ? (
                <motion.div
                  key="results"
                  {...reveal}
                  className={directResults ? "mt-3" : "mt-6"}
                >
                  {results.length > 0 ? (
                    results.map((property) => (
                      <MatchRow key={property.id} property={property} />
                    ))
                  ) : (
                    <p className="text-body-s text-fg-muted border-border-subtle border-t py-5">
                      {t("hero.search.noExactMatches")}
                    </p>
                  )}
                  {directResults ? (
                    <button
                      type="button"
                      onClick={handleStartOver}
                      className="text-body-s text-fg-muted hover:text-fg mt-3 rounded transition-colors duration-150"
                    >
                      {t("hero.search.startOver")}
                    </button>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type SearchSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: readonly string[];
  optionLabels?: Record<string, string>;
};

function SearchSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
  optionLabels = {},
}: SearchSelectProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="border-border-interactive focus-within:border-fg bg-canvas flex min-w-0 flex-col gap-1 rounded-lg border px-3 py-2"
    >
      <span className="text-caption text-fg-muted">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="hero-search-control text-body-s text-fg min-w-0 cursor-pointer bg-transparent font-medium"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

type AddFilterProps = {
  onAdd: (label: string) => void;
};

/** Inline control for adding a criterion the sentence didn't cover. */
function AddFilter({ onAdd }: AddFilterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="border-border-subtle text-body-s text-fg-muted hover:border-border-default hover:text-fg inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed px-3 transition-colors duration-150"
      >
        <Plus aria-hidden="true" className="size-3.5" />
        {t("hero.search.add")}
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (trimmed) {
          onAdd(trimmed);
          setValue("");
        }
        setOpen(false);
      }}
      className="border-border-interactive bg-wash inline-flex h-9 items-center rounded-full border pr-1 pl-3"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setValue("");
            setOpen(false);
          }
        }}
        placeholder={t("hero.search.addPlaceholder")}
        aria-label={t("hero.search.addCriterion")}
        className="hero-search-control text-body-s text-fg placeholder:text-fg-muted w-28 bg-transparent"
      />
      <button
        type="submit"
        aria-label={t("hero.search.addCriterion")}
        className="text-fg-muted hover:bg-subtle hover:text-fg flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
      >
        <Plus aria-hidden="true" className="size-3.5" />
      </button>
    </form>
  );
}
