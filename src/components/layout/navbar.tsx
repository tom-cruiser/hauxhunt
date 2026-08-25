"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Wordmark } from "./wordmark";
import { useScrolled } from "@/hooks/use-scrolled";
import { authConfig, navConfig } from "@/config/site";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { useTranslation } from "@/components/language/use-translation";

/**
 * Primary navigation: lockup left, sections centred, account actions right.
 *
 * The three zones are a grid rather than `justify-between`, because with
 * space-between the centre group only lands in the middle when the logo and
 * the account buttons happen to be the same width — which they are not, and
 * which would drift again the moment a label changed. `1fr auto 1fr` centres
 * the sections optically no matter what sits either side of them.
 *
 * At rest the bar is pure structure — no background, no border — so the canvas
 * runs unbroken to the top edge. Past 40px it condenses onto the same glass
 * the workspace is made of, one step denser, reading as the same material at a
 * nearer depth rather than as a second design language.
 */
export function Navbar() {
  const { t } = useTranslation();
  const { scrolled, sentinelRef, threshold } = useScrolled(40);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const solidNav = pathname !== "/" || scrolled || menuOpen;

  // The panel closes from the links' own click handlers rather than from an
  // effect watching the pathname: navigation is the event, so handling it at
  // the source avoids a second render pass just to undo state.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Zero-width sentinel at the top of document flow. Once it leaves the
          viewport the nav has earned its surface. */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 w-px"
        style={{ height: threshold }}
      />

      <header
        className={[
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,height] duration-300 ease-out",
          solidNav
            ? "nav-surface border-border-subtle h-16"
            : "h-20 border-transparent bg-transparent lg:h-24",
        ].join(" ")}
      >
        <nav
          aria-label={t("nav.primaryLabel")}
          className="mx-auto grid h-full w-[calc(100%-2.5rem)] max-w-[1562px] grid-cols-[auto_1fr_auto] items-center gap-4 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-5.5rem)] lg:grid-cols-[1fr_auto_1fr] lg:gap-10 xl:w-[calc(100%-6.5rem)]"
        >
          <Link
            href="/"
            className={[
              "flex items-center justify-self-start rounded-sm transition-[filter] duration-300",
              solidNav ? "" : "invert",
            ].join(" ")}
            aria-label={t("nav.homeAriaLabel")}
          >
            {/* Shrinks with the bar so the lockup keeps its breathing room in
                both states rather than crowding the condensed nav. */}
            <Wordmark height={scrolled ? 38 : 48} />
          </Link>

          {/* --- Sections, centred --------------------------------------- */}
          <ul className="hidden items-center gap-8 justify-self-center lg:flex xl:gap-10">
            {navConfig.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                  className={[
                    "font-bricolage text-body-m relative inline-flex rounded-sm transition-colors duration-150",
                    solidNav
                      ? isCurrent(item.href)
                        ? "text-fg font-medium"
                        : "text-fg-tertiary hover:text-fg"
                      : isCurrent(item.href)
                        ? "font-medium text-white"
                        : "text-white/75 hover:text-white",
                  ].join(" ")}
                >
                  {t(item.labelKey)}
                  {isCurrent(item.href) ? (
                    <span
                      aria-hidden="true"
                      className={`absolute top-[calc(100%+0.28rem)] left-1/2 size-1.5 -translate-x-1/2 rounded-full ${solidNav ? "bg-black" : "bg-white"}`}
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          {/* --- Account actions, right ---------------------------------- */}
          <div className="flex items-center gap-2 justify-self-end lg:gap-4 xl:gap-5">
            <LanguageSwitcher inverse={!solidNav} openOnHover />
            <CurrencySelector inverse={!solidNav} openOnHover />
            <Link
              href={authConfig.register.href}
              className={[
                "font-bricolage text-body-m hidden h-10 items-center rounded-sm px-2 font-medium transition-colors duration-150 sm:inline-flex",
                solidNav
                  ? "text-fg-tertiary hover:text-fg"
                  : "text-white/75 hover:text-white",
              ].join(" ")}
            >
              {t(authConfig.register.labelKey)}
            </Link>
            <Link
              href={authConfig.login.href}
              className={[
                "font-bricolage text-body-m inline-flex h-10 items-center rounded-full px-5 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors duration-150",
                solidNav
                  ? "bg-carbon-900 text-carbon-0 hover:bg-carbon-800 active:bg-carbon-950"
                  : "bg-white text-black hover:bg-white/85",
              ].join(" ")}
            >
              {t(authConfig.login.labelKey)}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="primary-menu"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              className={[
                "-mr-2 flex size-10 items-center justify-center rounded-full transition-colors duration-150 lg:hidden",
                solidNav
                  ? "text-fg hover:bg-subtle"
                  : "text-white hover:bg-white/10",
              ].join(" ")}
            >
              {menuOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* --- Small-viewport panel --------------------------------------------
          The sections have to go somewhere below `lg`; hiding them with no
          disclosure would leave the site with no navigation at all on a phone,
          which is the viewport most of these visitors arrive on. */}
      {menuOpen ? (
        <div
          id="primary-menu"
          className="nav-surface border-border-subtle fixed inset-x-0 top-16 z-40 border-b lg:hidden"
        >
          <ul className="mx-auto flex w-full max-w-[1440px] flex-col px-5 py-2 sm:px-8">
            {navConfig.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                  className={[
                    "font-bricolage text-body-l border-border-subtle block border-b py-4 transition-colors duration-150",
                    isCurrent(item.href)
                      ? "text-fg font-medium"
                      : "text-fg-secondary hover:text-fg",
                  ].join(" ")}
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
            <li className="sm:hidden">
              <Link
                href={authConfig.register.href}
                onClick={() => setMenuOpen(false)}
                className="font-bricolage text-body-l text-fg-secondary hover:text-fg block py-4 transition-colors duration-150"
              >
                {t(authConfig.register.labelKey)}
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </>
  );
}
