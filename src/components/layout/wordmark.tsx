import Image from "next/image";

/**
 * Declared at the lockup's largest rendered size, proportional to the asset's
 * true proportions. These drive the generated srcset, not the layout — the style
 * prop sets the real height. Declaring the asset's full intrinsic size here
 * would ship a 643px bitmap for a 54px logo; declaring a `sizes` string caps
 * the srcset at 1x and ships one too small to survive a retina screen. A fixed
 * width/height with no `sizes` is what makes Next emit a plain 1x/2x pair.
 */
const LOGO_W = 60;
const LOGO_H = 63;

type WordmarkProps = {
  /** Rendered height in px. The nav shrinks this as it condenses on scroll. */
  height?: number;
};

/**
 * The RentUp lockup: the house and "R" mark above the company name.
 *
 * The asset is the supplied artwork cropped to its own alpha bounds — the
 * source carried wide dark padding, which would otherwise have
 * shrunk the visible mark to nothing inside the nav's height budget. Stored as
 * lossless WebP because the artwork is flat black on transparency, where lossy
 * encoding leaves visible ringing around the letterforms.
 *
 * Marked decorative: the link that wraps it carries the accessible name, so an
 * alt here would announce the destination twice.
 *
 * Note on scale: the company name occupies only ~14% of the lockup's height,
 * so at any size a horizontal navigation bar can accommodate it reads as a
 * brand signature rather than as legible type. That is a property of a stacked
 * lockup in a horizontal bar, not of the sizing chosen here.
 */
export function Wordmark({ height = 60 }: WordmarkProps) {
  return (
    <Image
      src="/images/rentup-logo.webp"
      alt=""
      width={LOGO_W}
      height={LOGO_H}
      loading="eager"
      style={{ height, width: "auto" }}
      className="transition-[height] duration-300 ease-out"
    />
  );
}
