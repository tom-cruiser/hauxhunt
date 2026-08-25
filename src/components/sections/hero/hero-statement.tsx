"use client";

import { motion } from "framer-motion";

import { heroContainer, heroRise } from "./hero-motion";
import { useTranslation } from "@/components/language/use-translation";

/**
 * The editorial type stack: eyebrow, two-line statement, one supporting
 * sentence.
 *
 * The headline is the product promise compressed to a single sentence broken
 * across two lines — describe it, find it. It never says "AI"; the claim is
 * about the outcome, and the workspace below demonstrates the mechanism.
 *
 * Lines are separate block elements rather than wrapped text so the break is
 * deterministic at every width, and each one carries its own reveal.
 */
export function HeroStatement() {
  const { t } = useTranslation();
  const headlineLines = [
    t("hero.statement.line1"),
    t("hero.statement.line2"),
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={heroContainer}
      className="mx-auto flex flex-col items-center"
    >
      <h1 className="font-bricolage text-fg max-w-[16ch] text-[clamp(3rem,5.4vw,5rem)] leading-[0.98] font-normal tracking-[-0.045em] text-balance">
        {headlineLines.map((line, index) => (
          <motion.span key={index} variants={heroRise} className="block">
            {/* The second line carries the resolution, so it gets the lighter
                weight — the eye lands on the promise, then settles. */}
            <span>{line}</span>
          </motion.span>
        ))}
      </h1>
    </motion.div>
  );
}
