"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

/** A cinematic property film with restrained scroll depth on desktop. */
export function HeroAtmosphere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "4%"]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.16, 1.12]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <motion.div
        style={
          reducedMotion ? { scale: 1.14 } : { y: photoY, scale: photoScale }
        }
        className="hero-photo-motion absolute inset-x-0 -inset-y-[4%] overflow-hidden"
      >
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="hero-photo absolute inset-0 h-full w-full object-cover object-center"
        >
          <source src="/videos/landingvideo.mp4" type="video/mp4" />
        </video>
      </motion.div>

      <div aria-hidden="true" className="hero-atmosphere absolute inset-0" />
      <div aria-hidden="true" className="hero-bloom absolute inset-0" />
    </div>
  );
}
