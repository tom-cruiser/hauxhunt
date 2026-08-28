"use client";

import { Star, UserRoundX, X } from "lucide-react";

import { getTenantHistory, type TenantStay } from "@/lib/tenant-history";

export type TenantHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  applicantName: string;
};

/**
 * The paid-tier "View Tenant History" panel -- previous stay durations,
 * on-time payment reliability, and past landlord feedback for an applicant.
 * Ported from the Joseph checkout's `TenantHistoryDrawer`/`Tenanthistory.md`
 * onto HauxHunt's own conventions: HauxHunt has no shared `Dialog`
 * primitive, so this uses the same hand-rolled `fixed inset-0` + `role=
 * "dialog"` pattern as `NotSelectDialog` (owner-dashboard/applications) and
 * `PaymentDetail` (owner-dashboard/payments); and it renders unconditionally
 * once open -- the tier check (`useTier`/`isPaidTier`) and the `LockedFeature`
 * fallback for free tenants live in the caller, not here, matching how
 * `LockedFeature`'s own doc comment describes the split ("callers render
 * this instead of the real control when free, the real control when paid").
 */
export function TenantHistoryDrawer({ open, onClose, applicantName }: TenantHistoryDrawerProps) {
  if (!open) return null;
  const history = getTenantHistory(applicantName);

  return (
    <div className="fixed inset-0 z-190 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-history-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-carbon-500 text-xs font-medium tracking-[0.1em] uppercase">Tenant history</p>
            <h2 id="tenant-history-title" className="font-bricolage text-carbon-900 mt-2 text-2xl leading-tight font-medium tracking-[-0.03em]">
              {applicantName}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {history ? (
          <div className="mt-7">
            <dl className="grid grid-cols-3 gap-3">
              <HistoryMetric
                label="Rental history"
                value={`${history.totalMonthsRented} mo.`}
                detail={`Across ${history.propertiesRented} ${history.propertiesRented === 1 ? "property" : "properties"}`}
              />
              <HistoryMetric label="On-time payments" value={`${history.onTimePaymentRate}%`} />
              <HistoryMetric label="Average rating" value={averageRating(history.stays).toFixed(1)} detail="out of 5" />
            </dl>

            <h3 className="font-bricolage text-carbon-900 mt-8 text-base font-medium">Previous landlord feedback</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {history.stays.map((stay) => (
                <li key={`${stay.propertyTitle}-${stay.location}`} className="rounded-2xl border border-black/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bricolage text-sm font-medium">{stay.propertyTitle}</p>
                      <p className="text-carbon-500 text-xs">
                        {stay.location} · {stay.durationMonths} months
                      </p>
                    </div>
                    <StarRating rating={stay.landlordRating} />
                  </div>
                  <p className="text-carbon-600 mt-3 text-sm leading-6">&ldquo;{stay.landlordComment}&rdquo;</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-7 flex flex-col items-center gap-2 rounded-2xl bg-black/[0.03] p-10 text-center">
            <UserRoundX aria-hidden="true" className="size-8 text-black/30" />
            <p className="font-bricolage text-carbon-900 mt-1 font-medium">No rental history yet</p>
            <p className="text-carbon-500 max-w-[36ch] text-sm">
              {applicantName} has no previous tenancies on record — likely a first-time renter. Consider requesting references directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function averageRating(stays: TenantStay[]): number {
  if (stays.length === 0) return 0;
  return stays.reduce((sum, stay) => sum + stay.landlordRating, 0) / stays.length;
}

function HistoryMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.035] p-3.5">
      <dt className="text-carbon-500 text-[0.68rem] leading-4">{label}</dt>
      <dd className="font-bricolage text-carbon-900 mt-1 text-lg font-medium tracking-[-0.02em]">{value}</dd>
      {detail ? <p className="text-carbon-400 mt-0.5 text-[0.68rem]">{detail}</p> : null}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} aria-hidden="true" className={`size-3.5 ${index < rating ? "fill-black text-black" : "text-black/15"}`} />
      ))}
    </div>
  );
}
