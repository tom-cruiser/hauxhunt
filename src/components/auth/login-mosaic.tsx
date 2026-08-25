"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language/use-translation";

type CardTone = "dark" | "green" | "lime" | "white";
type CardPhase = "entering" | "visible" | "exiting";

/**
 * `labelKey`/`titleKey` point at the `auth.mosaic.card{n}.{labelA,titleA}`
 * pair; `rotateCard` below toggles each card between its "A" and "B" copy by
 * checking which `titleKey` is currently showing, then flips to the other.
 */
type MosaicCard = {
  id: number;
  position: number;
  tone: CardTone;
  labelKey: string;
  titleKey: string;
  phase: CardPhase;
  version: number;
};

const INITIAL_CARDS: MosaicCard[] = [
  {
    id: 0,
    position: 3,
    tone: "lime",
    labelKey: "auth.mosaic.card1.labelA",
    titleKey: "auth.mosaic.card1.titleA",
    phase: "entering",
    version: 0,
  },
  {
    id: 1,
    position: 10,
    tone: "green",
    labelKey: "auth.mosaic.card2.labelA",
    titleKey: "auth.mosaic.card2.titleA",
    phase: "entering",
    version: 0,
  },
  {
    id: 2,
    position: 13,
    tone: "white",
    labelKey: "auth.mosaic.card3.labelA",
    titleKey: "auth.mosaic.card3.titleA",
    phase: "entering",
    version: 0,
  },
  {
    id: 3,
    position: 16,
    tone: "lime",
    labelKey: "auth.mosaic.card4.labelA",
    titleKey: "auth.mosaic.card4.titleA",
    phase: "entering",
    version: 0,
  },
  {
    id: 4,
    position: 19,
    tone: "dark",
    labelKey: "auth.mosaic.card5.labelA",
    titleKey: "auth.mosaic.card5.titleA",
    phase: "entering",
    version: 0,
  },
];

export function LoginMosaic() {
  const { t } = useTranslation();
  const [cards, setCards] = useState(INITIAL_CARDS);
  const replacementStep = useRef(0);

  useEffect(() => {
    const timeouts: number[] = [];

    const rotateCard = () => {
      const targetId = replacementStep.current % 5;
      replacementStep.current += 1;

      setCards((current) =>
        current.map((card) =>
          card.id === targetId ? { ...card, phase: "exiting" } : card,
        ),
      );

      timeouts.push(
        window.setTimeout(() => {
          setCards((current) =>
            current.map((card) => {
              if (card.id !== targetId) return card;

              if (card.id === 0) {
                const showOriginalMessage =
                  card.titleKey === "auth.mosaic.card1.titleB";
                return {
                  ...card,
                  position: 3,
                  tone: showOriginalMessage ? "lime" : "white",
                  labelKey: showOriginalMessage
                    ? "auth.mosaic.card1.labelA"
                    : "auth.mosaic.card1.labelB",
                  titleKey: showOriginalMessage
                    ? "auth.mosaic.card1.titleA"
                    : "auth.mosaic.card1.titleB",
                  phase: "entering",
                  version: card.version + 1,
                };
              }

              if (card.id === 1) {
                const showOriginalMessage =
                  card.titleKey === "auth.mosaic.card2.titleB";
                return {
                  ...card,
                  position: 10,
                  tone: "green",
                  labelKey: showOriginalMessage
                    ? "auth.mosaic.card2.labelA"
                    : "auth.mosaic.card2.labelB",
                  titleKey: showOriginalMessage
                    ? "auth.mosaic.card2.titleA"
                    : "auth.mosaic.card2.titleB",
                  phase: "entering",
                  version: card.version + 1,
                };
              }

              if (card.id === 2) {
                const showOriginalMessage =
                  card.titleKey === "auth.mosaic.card3.titleB";
                return {
                  ...card,
                  position: 13,
                  tone: "white",
                  labelKey: showOriginalMessage
                    ? "auth.mosaic.card3.labelA"
                    : "auth.mosaic.card3.labelB",
                  titleKey: showOriginalMessage
                    ? "auth.mosaic.card3.titleA"
                    : "auth.mosaic.card3.titleB",
                  phase: "entering",
                  version: card.version + 1,
                };
              }

              if (card.id === 3) {
                const showOriginalMessage =
                  card.titleKey === "auth.mosaic.card4.titleB";
                return {
                  ...card,
                  position: 16,
                  tone: "lime",
                  labelKey: showOriginalMessage
                    ? "auth.mosaic.card4.labelA"
                    : "auth.mosaic.card4.labelB",
                  titleKey: showOriginalMessage
                    ? "auth.mosaic.card4.titleA"
                    : "auth.mosaic.card4.titleB",
                  phase: "entering",
                  version: card.version + 1,
                };
              }

              const showOriginalMessage =
                card.titleKey === "auth.mosaic.card5.titleB";
              return {
                ...card,
                position: 19,
                tone: "dark",
                labelKey: showOriginalMessage
                  ? "auth.mosaic.card5.labelA"
                  : "auth.mosaic.card5.labelB",
                titleKey: showOriginalMessage
                  ? "auth.mosaic.card5.titleA"
                  : "auth.mosaic.card5.titleB",
                phase: "entering",
                version: card.version + 1,
              };
            }),
          );
        }, 700),
      );

      timeouts.push(
        window.setTimeout(() => {
          setCards((current) =>
            current.map((card) =>
              card.id === targetId ? { ...card, phase: "visible" } : card,
            ),
          );
        }, 1550),
      );
    };

    const interval = window.setInterval(rotateCard, 4200);

    return () => {
      window.clearInterval(interval);
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, []);

  return (
    <section
      aria-label={t("auth.showcaseAria")}
      className="relative hidden min-h-0 grid-cols-5 grid-rows-4 gap-1 overflow-hidden rounded-[1.75rem] bg-[#0a0a0a] p-2 lg:grid"
    >
      <svg aria-hidden="true" className="absolute size-0">
        <defs>
          <clipPath id="login-mosaic-grid" clipPathUnits="objectBoundingBox">
            {Array.from({ length: 20 }, (_, index) => {
              const row = Math.floor(index / 5);
              const column = index % 5;
              return (
                <rect
                  key={index}
                  x={column * 0.2008}
                  y={row * 0.251}
                  width="0.1968"
                  height="0.247"
                  rx="0.018"
                  ry="0.022"
                />
              );
            })}
          </clipPath>
        </defs>
      </svg>
      <video
        aria-hidden="true"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-[1.25rem] object-cover"
        style={{ clipPath: "url(#login-mosaic-grid)" }}
      >
        <source src="/videos/hauxhunt-login.mp4" type="video/mp4" />
      </video>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 bg-black/10"
        style={{ clipPath: "url(#login-mosaic-grid)" }}
      />

      {Array.from({ length: 20 }, (_, position) => {
        const card = cards.find((item) => item.position === position);
        return (
          <div
            key={position}
            className="relative z-10 min-h-0 overflow-hidden rounded-[1.25rem]"
          >
            {card ? (
              <MessageCard key={`${card.id}-${card.version}`} card={card} />
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function MessageCard({ card }: { card: MosaicCard }) {
  const { t } = useTranslation();
  const toneClass =
    card.tone === "lime"
      ? "bg-[#d9ff35] text-black"
      : card.tone === "green"
        ? "bg-[#00f58a] text-black"
        : card.tone === "white"
          ? "bg-white text-black"
          : "bg-[#151515] text-white";
  const phaseClass =
    card.phase === "exiting"
      ? "login-mosaic-message-exit"
      : card.phase === "entering"
        ? "login-mosaic-message-enter"
        : "";
  const delay =
    card.phase === "entering"
      ? card.version === 0
        ? 500 + card.id * 700
        : 80
      : 0;

  return (
    <article
      className={`absolute inset-0 p-4 xl:p-5 ${toneClass} ${phaseClass}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex h-full flex-col justify-between">
        <span className="font-bricolage text-[0.6rem] font-medium tracking-[0.1em] uppercase opacity-45 xl:text-xs">
          {t(card.labelKey)}
        </span>
        <h2 className="font-bricolage text-lg leading-none font-medium tracking-[-0.04em] xl:text-2xl">
          {t(card.titleKey)}
        </h2>
      </div>
    </article>
  );
}
