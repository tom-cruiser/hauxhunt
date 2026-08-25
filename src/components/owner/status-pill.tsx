// Shared status badge for the Owner dashboard. Matches the black/white
// system already used everywhere else (partner ListingOptionsMenu's
// Live/In review/Archived pills, the renter Applications "Action Required"
// badge) -- no semantic color. Urgency is carried by an icon, not a hue.

import { AlertCircle } from "lucide-react";

type Tone = "solid" | "soft" | "outline";

const TONE_CLASSES: Record<Tone, string> = {
  solid: "bg-black text-white",
  soft: "bg-black/8 text-black",
  outline: "border border-black/15 text-black",
};

const SOLID = new Set(["Live", "Active", "Paid", "Resolved", "Approved", "Occupied", "Signed", "Confirmed", "Accepted", "Verified"]);
const OUTLINE_URGENT = new Set(["Overdue", "Failed", "Not Selected", "Urgent", "Ending Soon", "Action Required", "Declined", "Cancelled", "Removed", "Left", "Needs Attention", "Rejected"]);

export function toneForStatus(status: string): Tone {
  if (SOLID.has(status)) return "solid";
  if (OUTLINE_URGENT.has(status)) return "outline";
  return "soft";
}

export function StatusPill({ status, tone }: { status: string; tone?: Tone }) {
  const resolvedTone = tone ?? toneForStatus(status);
  const urgent = OUTLINE_URGENT.has(status);
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[resolvedTone]}`}
    >
      {urgent ? <AlertCircle aria-hidden="true" className="size-3" /> : null}
      {status}
    </span>
  );
}
