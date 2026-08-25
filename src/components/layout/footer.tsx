"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import footerLogo from "@/assets/images/HauxHunt_white_with_company_name.png";
import { useTranslation } from "@/components/language/use-translation";

/**
 * `labelKey` resolves through `nav.*`/`footer.groups.*` at render time, and
 * `trending` is the one link matched by key rather than by English text (see
 * the native-navigation branch below) — both so relabelling in translation
 * never breaks the lookup.
 */
const FOOTER_GROUPS = [
  {
    titleKey: "footer.groups.findHome.title",
    links: [
      { key: "rent", labelKey: "footer.groups.findHome.rent", href: "/rent" },
      {
        key: "flatmates",
        labelKey: "footer.groups.findHome.flatmates",
        href: "/flatmates",
      },
      {
        key: "trending",
        labelKey: "footer.groups.findHome.trending",
        href: "/#trending-locations",
      },
      {
        key: "howItWorks",
        labelKey: "footer.groups.findHome.howItWorks",
        href: "#how-it-works",
      },
    ],
  },
  {
    titleKey: "footer.groups.partners.title",
    links: [
      {
        key: "list",
        labelKey: "footer.groups.partners.list",
        href: "/landlords",
      },
      {
        key: "managers",
        labelKey: "footer.groups.partners.managers",
        href: "/landlords",
      },
      {
        key: "agents",
        labelKey: "footer.groups.partners.agents",
        href: "/landlords",
      },
      {
        key: "agencyTeams",
        labelKey: "footer.groups.partners.agencyTeams",
        href: "/landlords",
      },
    ],
  },
  {
    titleKey: "footer.groups.company.title",
    links: [
      { key: "about", labelKey: "footer.groups.company.about", href: "/about" },
      { key: "help", labelKey: "footer.groups.company.help", href: "/help" },
      { key: "safety", labelKey: "footer.groups.company.safety", href: "/safety" },
      {
        key: "contact",
        labelKey: "footer.groups.company.contact",
        href: "/contact",
      },
    ],
  },
] as const;

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-carbon-950 relative overflow-hidden px-5 pt-16 pb-7 text-white sm:px-6 sm:pt-20 lg:px-11 xl:px-[52px]">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[78%] w-full"
      >
        <defs>
          <pattern
            id="footer-dot-pattern"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="11" cy="11" r="1" fill="white" opacity="0.18" />
          </pattern>
          <linearGradient id="footer-plus-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="32%" stopColor="white" stopOpacity="0.48" />
            <stop offset="76%" stopColor="white" stopOpacity="0.08" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="footer-plus-mask">
            <rect width="100%" height="100%" fill="url(#footer-plus-fade)" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#footer-dot-pattern)"
          mask="url(#footer-plus-mask)"
        />
      </svg>

      <div className="relative z-10 mx-auto max-w-[1562px]">
        <div className="grid gap-14 border-b border-white/15 pb-14 lg:grid-cols-[1.25fr_2fr] lg:gap-20 lg:pb-20">
          <div>
            <Link
              href="/"
              aria-label={t("footer.homeAriaLabel")}
              className="inline-flex rounded-sm"
            >
              <Image
                src={footerLogo}
                alt=""
                width={120}
                placeholder="blur"
                className="h-auto w-[120px]"
              />
            </Link>
            <p className="text-body-m mt-6 max-w-[38ch] text-white/60">
              {t("footer.tagline")}
            </p>
          </div>

          <nav
            aria-label={t("footer.navLabel")}
            className="grid gap-10 sm:grid-cols-3 sm:gap-6"
          >
            {FOOTER_GROUPS.map((group) => (
              <div key={group.titleKey}>
                <h2 className="font-bricolage text-sm font-medium text-white">
                  {t(group.titleKey)}
                </h2>
                <ul className="mt-5 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.key}>
                      {link.key === "trending" ? (
                        // Native navigation guarantees cross-page hash scrolling after the home document loads.
                        // eslint-disable-next-line @next/next/no-html-link-for-pages
                        <a
                          href="/#trending-locations"
                          className="text-body-m rounded-sm text-white/55 transition-colors hover:text-white"
                        >
                          {t(link.labelKey)}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-body-m rounded-sm text-white/55 transition-colors hover:text-white"
                        >
                          {t(link.labelKey)}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="grid gap-6 lg:col-span-2 lg:grid-cols-[1.25fr_2fr] lg:gap-20">
            <div>
              <Link
                href="/register"
                className="font-bricolage inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-base font-medium text-black transition-colors hover:bg-white/85"
              >
                {t("common.getStarted")}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 sm:gap-6">
              <div className="flex items-center gap-2 sm:col-start-3">
                <Link
                  href="https://instagram.com"
                  aria-label={t("footer.socialAria.instagram")}
                  className="flex size-10 items-center justify-center rounded-full border border-white/20 text-white/65 transition-colors hover:border-white/50 hover:text-white"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="size-[18px]"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle
                      cx="17.5"
                      cy="6.5"
                      r="1"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                </Link>
                <Link
                  href="https://linkedin.com"
                  aria-label={t("footer.socialAria.linkedin")}
                  className="flex size-10 items-center justify-center rounded-full border border-white/20 text-white/65 transition-colors hover:border-white/50 hover:text-white"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-[18px]"
                  >
                    <path d="M6.5 8.2H3V21h3.5V8.2ZM4.75 3A2.05 2.05 0 1 0 4.75 7.1 2.05 2.05 0 0 0 4.75 3ZM21 13.65c0-3.85-2.05-5.65-4.8-5.65a4.13 4.13 0 0 0-3.75 2.05V8.2H9V21h3.5v-6.35c0-1.68.32-3.3 2.4-3.3 2.05 0 2.08 1.92 2.08 3.4V21H21v-7.35Z" />
                  </svg>
                </Link>
                <Link
                  href="https://facebook.com"
                  aria-label={t("footer.socialAria.facebook")}
                  className="flex size-10 items-center justify-center rounded-full border border-white/20 text-white/65 transition-colors hover:border-white/50 hover:text-white"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-[18px]"
                  >
                    <path d="M13.6 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.25-1.5 1.56-1.5h1.66V3.62c-.29-.04-1.27-.12-2.42-.12-2.4 0-4.04 1.46-4.04 4.15V10H7.65v3.1h2.71V21h3.24Z" />
                  </svg>
                </Link>
                <Link
                  href="https://wa.me/"
                  aria-label={t("footer.socialAria.whatsapp")}
                  className="flex size-10 items-center justify-center rounded-full border border-white/20 text-white/65 transition-colors hover:border-white/50 hover:text-white"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-[18px]"
                  >
                    <path d="M12.04 2a9.84 9.84 0 0 0-8.5 14.78L2 22l5.38-1.48A9.91 9.91 0 1 0 12.04 2Zm0 17.98a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.2.88.86-3.11-.2-.32a8.11 8.11 0 1 1 6.97 3.86Zm4.45-6.07c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.25-.63.8-.77.96-.14.17-.28.19-.53.07a6.65 6.65 0 0 1-1.95-1.2 7.3 7.3 0 0 1-1.35-1.68c-.14-.25-.02-.38.1-.5.11-.11.25-.29.37-.43.12-.14.16-.25.24-.41.08-.17.04-.31-.02-.43-.06-.13-.55-1.33-.75-1.82-.2-.48-.4-.42-.55-.43h-.47c-.17 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.55c.13.16 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.51.59.19 1.12.16 1.54.1.47-.07 1.44-.59 1.64-1.16.21-.57.21-1.06.15-1.16-.06-.1-.23-.16-.47-.28Z" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-7 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="rounded-sm hover:text-white">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="rounded-sm hover:text-white">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
