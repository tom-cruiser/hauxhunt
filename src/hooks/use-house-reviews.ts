"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * House reviews are Paid-only for tenants (access-control.ts) and didn't
 * exist in this codebase at all before this feature — there is no reviews
 * table, API, or moderation anywhere. This hook models them the same way
 * every other renter-side record in this prototype is modeled: plain
 * `localStorage`, no server, same read/write/broadcast shape as
 * `use-saved-properties.ts`.
 */
export type HouseReview = {
  id: string;
  propertyId: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string;
};

const REVIEWS_KEY = "hauxhunt-house-reviews";
const REVIEWS_EVENT = "hauxhunt-house-reviews-change";

function isHouseReview(value: unknown): value is HouseReview {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.propertyId === "string" &&
    typeof record.author === "string" &&
    typeof record.body === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.rating === "number"
  );
}

function readAllReviews(): HouseReview[] {
  try {
    const stored = window.localStorage.getItem(REVIEWS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(isHouseReview) : [];
  } catch {
    return [];
  }
}

function writeAllReviews(reviews: HouseReview[]) {
  window.localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  window.dispatchEvent(new Event(REVIEWS_EVENT));
}

export function useHouseReviews(propertyId: string) {
  const [reviews, setReviews] = useState<HouseReview[]>([]);

  useEffect(() => {
    const sync = () =>
      setReviews(
        readAllReviews().filter((review) => review.propertyId === propertyId),
      );
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(REVIEWS_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(REVIEWS_EVENT, sync);
    };
  }, [propertyId]);

  const addReview = useCallback(
    (review: { author: string; rating: HouseReview["rating"]; body: string }) => {
      const all = readAllReviews();
      const created: HouseReview = {
        id: `review-${Date.now()}`,
        propertyId,
        createdAt: new Date().toISOString(),
        ...review,
      };
      writeAllReviews([...all, created]);
      return created;
    },
    [propertyId],
  );

  return { reviews, addReview };
}
