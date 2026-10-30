/**
 * Typography — official RentUp brand identity.
 *
 * Aether is the single sitewide typeface: display weight for statements,
 * regular weight for body copy, and every step of the 12-token scale in
 * between. There is no display/body pairing and no decorative secondary
 * family — one family carrying the whole system is what makes the interface
 * read as precise rather than assembled.
 *
 * Aether is not distributed through `next/font/google`, so it is declared as a
 * plain family in the CSS font stack (`--font-sans` in `globals.css`) rather
 * than loaded here. To self-host it:
 *
 *   1. Drop `aether-{regular,medium,semibold,bold}.woff2` into `public/fonts/`.
 *   2. Uncomment the `@font-face` block at the top of `src/app/globals.css`.
 *
 * Until those files land, the stack falls through to the system UI sans. The
 * fallbacks are ordered so metrics stay close to Aether's, which keeps the
 * eventual swap from shifting layout (CLS budget < 0.1).
 */

/** The four sanctioned weights. Anything outside this set is a bug. */
export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Canonical font stack. Mirrors `--font-sans` in `globals.css` — that CSS
 * variable is the source of truth for styling; this export exists for the
 * places CSS can't reach (canvas rendering, OG image generation, email).
 */
export const fontSansStack =
  '"Aether", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export type FontWeight = (typeof fontWeights)[keyof typeof fontWeights];
