"use client";

import { useCallback, useSyncExternalStore } from "react";

import { defaultLocale, isLocale, locales, type Locale } from "@/lib/i18n/locales";
import en from "@/lib/i18n/dictionaries/en.json";
import fr from "@/lib/i18n/dictionaries/fr.json";
import rw from "@/lib/i18n/dictionaries/rw.json";

/**
 * English is the source of truth for shape: `fr`/`rw` are cast to it rather
 * than inferred on their own, so a key present in English but missing from a
 * translation resolves through `readPath`'s fallback instead of surfacing as
 * `undefined` at the call site.
 */
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  fr: fr as Dictionary,
  rw: rw as Dictionary,
};

const STORAGE_KEY = "hauxhunt-locale";
const LOCALE_EVENT = "hauxhunt-locale-change";

/**
 * Same shape as the display-currency preference in
 * `currency-selector.tsx`: `localStorage` + a same-tab `CustomEvent` (storage
 * events don't fire in the tab that wrote the value) + `useSyncExternalStore`
 * so every consumer re-renders together, with no provider tree required.
 */
function readStoredLocale(): Locale {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(saved) ? saved : defaultLocale;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCALE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCALE_EVENT, callback);
  };
}

/** The active locale. Server-rendered markup always reads as English — the
 * required default fallback — then hydrates to the visitor's saved choice. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, readStoredLocale, () => defaultLocale);
}

export function setLocale(next: Locale) {
  window.localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new Event(LOCALE_EVENT));
}

export { locales };
export type { Locale };

function readPath(dictionary: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, segment) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[segment] : undefined,
      dictionary,
    );
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * `t("hero.search.search")` resolves a dot-separated key against the active
 * dictionary, falling back to English (never the raw key) if a translation
 * is missing — the behaviour required of the default fallback language.
 * `{{placeholders}}` in the resolved string are substituted from `vars`.
 */
export function useTranslation() {
  const locale = useLocale();

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = readPath(dictionaries[locale], key);
      const resolved = typeof value === "string" ? value : readPath(dictionaries[defaultLocale], key);
      return interpolate(typeof resolved === "string" ? resolved : key, vars);
    },
    [locale],
  );

  return { t, locale };
}
