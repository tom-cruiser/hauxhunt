"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { useHouseReviews } from "@/hooks/use-house-reviews";
import { isPaidTier, useTier } from "@/hooks/use-tier";
import { LockedPanel } from "@/components/tier/locked-feature";

/**
 * Tenant tier gate: house reviews are Paid-only. Free tenants see
 * `LockedPanel`; Paid tenants get the real (if minimal) thing — read
 * existing reviews and leave one, backed by `useHouseReviews`.
 */
export function HouseReviews({ propertyId }: { propertyId: string }) {
  const tier = useTier();

  if (!isPaidTier(tier)) {
    return <LockedPanel feature="tenant.houseReviews" />;
  }

  return <PaidHouseReviews propertyId={propertyId} />;
}

function PaidHouseReviews({ propertyId }: { propertyId: string }) {
  const { reviews, addReview } = useHouseReviews(propertyId);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [body, setBody] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    addReview({ author: "You", rating, body: trimmed });
    setBody("");
    setRating(5);
  }

  return (
    <div>
      {reviews.length ? (
        <ul className="space-y-5">
          {reviews.map((review) => (
            <li key={review.id} className="border-t border-black/10 pt-5 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-2">
                <Stars rating={review.rating} />
                <span className="font-bricolage text-sm font-medium">
                  {review.author}
                </span>
              </div>
              <p className="text-carbon-600 mt-2 text-sm leading-6">
                {review.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-carbon-500 text-sm">
          No reviews yet — be the first to write one.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-black/10 p-5"
      >
        <p className="text-sm font-medium">Leave a review</p>
        <div className="mt-3 flex items-center gap-1">
          {([1, 2, 3, 4, 5] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
              className="p-0.5"
            >
              <Star
                aria-hidden="true"
                className={`size-5 ${value <= rating ? "fill-black text-black" : "text-black/20"}`}
              />
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What was it like to live here or visit?"
          rows={3}
          className="contact-field-control mt-3 w-full resize-none rounded-xl border border-black/15 p-3 text-sm outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="font-bricolage mt-3 h-10 rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          Post review
        </button>
      </form>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={`size-3.5 ${value <= rating ? "fill-black text-black" : "text-black/20"}`}
        />
      ))}
    </span>
  );
}
