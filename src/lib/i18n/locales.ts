/**
 * Supported locales for the app.
 *
 * English is the source language and the fallback: any key missing from a
 * translated dictionary (or any dictionary that fails to load) resolves back
 * to its English value rather than crashing or rendering the raw key. See
 * `src/components/language/use-translation.ts`.
 */
export const locales = ["en", "fr", "rw"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Each language's own name for itself, as shown in the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  rw: "Ikinyarwanda",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
