import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { siteConfig } from "@/config/site";
import { PrototypeReset } from "@/components/prototype-reset";
import { LanguageHtmlSync } from "@/components/language/language-html-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Aether is declared as a font stack in `globals.css`, not injected by
  // `next/font` — so there is no font variable class to apply here. See
  // `src/lib/fonts.ts` for the self-hosting steps.
  return (
    <html lang="en" className="h-full antialiased">
      {/* `theme-paper` puts the whole page in the light context (approved
          2026-08-06). Every semantic token re-points underneath — including
          the two roles that cannot simply be re-mapped, since Martian Green is
          1.90:1 and Lime 1.18:1 against white: primary actions and the focus
          ring both become Martian 800. Components reference roles only, so
          none of them needed changing. */}
      <body className="theme-paper bg-canvas text-fg flex min-h-full flex-col">
        <PrototypeReset />
        <LanguageHtmlSync />
        {/* `reducedMotion="user"` makes every Framer Motion transform/layout
            animation sitewide respect prefers-reduced-motion automatically
            (2026-08-05 motion decision) — one place to enforce it, not a
            per-component opt-in. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <div id="toast-portal" />
      </body>
    </html>
  );
}
