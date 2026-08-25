/**
 * Central site configuration.
 *
 * Single source of truth for site-wide metadata, URLs, and navigation.
 * Import from here instead of hardcoding strings across pages/components.
 */

export const siteConfig = {
  name: "HauxHunt",
  title: "HauxHunt — Find a home you can trust",
  description:
    "Search in plain language, see verified listings, and understand exactly why each match fits — in Rwanda, Nigeria, and Kenya.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://hauxhunt.com",
  ogImage: "/images/og.png",
  links: {
    twitter: "",
    github: "",
    linkedin: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * Primary navigation items for the marketing site header.
 *
 * Only `/` exists so far — the other three routes are declared here ahead of
 * their pages so the nav is built against the real information architecture
 * rather than against placeholders that would have to be found and replaced
 * later. They will 404 until those pages are built.
 *
 * `labelKey` points into the `nav.*` translation namespace rather than
 * carrying English text directly — `Navbar` resolves it through
 * `useTranslation()` so the label follows the visitor's chosen language.
 */
export const navConfig: { labelKey: string; href: string }[] = [
  { labelKey: "nav.home", href: "/" },
  { labelKey: "nav.rent", href: "/rent" },
  { labelKey: "nav.flatmates", href: "/flatmates" },
  { labelKey: "nav.list", href: "/landlords" },
];

/** Account actions, right-aligned in the header. */
export const authConfig = {
  register: { labelKey: "common.register", href: "/register" },
  login: { labelKey: "common.login", href: "/login" },
} as const;
