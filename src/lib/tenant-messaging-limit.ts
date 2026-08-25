/**
 * Tracks which agents/landlords a free tenant has messaged for the first
 * time this calendar month, for `canMessageAgent()`
 * (`src/lib/access-control.ts`). Backs `ContactPropertyManagerForm`
 * (`src/components/properties/contact-landlord-form.tsx`) — the "message
 * this property's manager" action on a listing, which is the tenant's one
 * point of contact with a *new* agent/landlord. The many other "Message
 * {name}" links elsewhere in the renter dashboard (rentals, applications,
 * maintenance, payments, viewings) follow up with a manager the tenant
 * already has an active case with, so they don't draw against this cap.
 *
 * `localStorage`, not `sessionStorage`: the cap is meant to survive across
 * browser sessions within the same month, unlike the tier/role flags which
 * intentionally reset per demo session.
 */
const KEY = "hauxhunt-tenant-contacted-agents";

type State = { month: string; agentIds: string[] };

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function readState(): State {
  if (typeof window === "undefined") return { month: currentMonth(), agentIds: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { month: currentMonth(), agentIds: [] };
    const parsed = JSON.parse(raw) as State;
    // A new month zeroes the count — the cap is monthly, not lifetime.
    return parsed.month === currentMonth()
      ? parsed
      : { month: currentMonth(), agentIds: [] };
  } catch {
    return { month: currentMonth(), agentIds: [] };
  }
}

function writeState(state: State) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full/unavailable — the cap simply won't persist this write.
  }
}

/** Distinct agent/landlord ids a free tenant has messaged for the first
 * time so far this month. */
export function getAgentsMessagedThisMonth(): string[] {
  return readState().agentIds;
}

/** Records that `agentId` was messaged, if not already recorded this month.
 * Call only after a message to that agent actually sends — never
 * speculatively, or a failed send would still consume the cap. */
export function recordAgentMessaged(agentId: string) {
  const state = readState();
  if (state.agentIds.includes(agentId)) return;
  writeState({ month: state.month, agentIds: [...state.agentIds, agentId] });
}
