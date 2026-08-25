"use client";

import { useEffect } from "react";

import { useLocale } from "./use-translation";

/**
 * Keeps `<html lang>` in step with the chosen language.
 *
 * The switch itself is a client-only preference (localStorage, no route or
 * cookie), so the server always renders `lang="en"`. This effect corrects it
 * post-hydration — screen readers and browser translation prompts read the
 * `lang` attribute, not the visible text, so leaving it stale after a switch
 * would mislead them even though the page itself is now in French/Kinyarwanda.
 * Renders nothing; mount it once, near the root layout's `<body>`.
 */
export function LanguageHtmlSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
