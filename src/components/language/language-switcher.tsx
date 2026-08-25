"use client";

import { ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { locales, setLocale, useTranslation } from "./use-translation";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Language toggle, styled and wired the same way as `CurrencySelector`: a
 * borderless button that opens a small listbox, closes on outside click or
 * Escape, and writes the choice to `localStorage` rather than navigating —
 * switching languages is a preference, not a page.
 */
export function LanguageSwitcher({
  inverse = false,
  openOnHover = false,
}: {
  inverse?: boolean;
  openOnHover?: boolean;
}) {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node))
        setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function chooseLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-flex h-10 items-center"
      onMouseEnter={() => {
        if (openOnHover) setIsOpen(true);
      }}
      onMouseLeave={() => {
        if (openOnHover) setIsOpen(false);
      }}
      onFocus={() => {
        if (openOnHover) setIsOpen(true);
      }}
      onBlur={(event) => {
        if (openOnHover && !event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-label={t("languageSwitcher.ariaLabel")}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`inline-flex h-10 items-center gap-1 border-0 bg-transparent p-0 text-sm font-normal shadow-none outline-none ${inverse ? "text-white" : "text-black"}`}
      >
        <Globe aria-hidden="true" className="size-3.5" />
        <span className="uppercase">{locale}</span>
        <ChevronDown
          aria-hidden="true"
          className={`ml-0.5 size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-[100] w-56 pt-2">
          <div
            role="listbox"
            aria-label={t("languageSwitcher.listLabel")}
            className="overflow-hidden rounded-2xl border border-black/10 bg-white px-2 py-2 font-sans text-black shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
          >
            <p className="px-3 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-black/45 uppercase">
              {t("languageSwitcher.listLabel")}
            </p>
            <div className="space-y-0.5">
              {locales.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={locale === option}
                  onClick={() => chooseLocale(option)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left font-sans transition-colors hover:bg-black/[0.045] focus-visible:bg-black/[0.045] focus-visible:outline-none"
                >
                  <span className="block text-sm leading-5 font-normal">
                    {t(`languageSwitcher.${option}`)}
                  </span>
                  <span className="pl-5 text-sm text-black/45 uppercase">
                    {option}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
