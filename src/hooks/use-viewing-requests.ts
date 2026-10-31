"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { resolveListingId } from "@/lib/api/listings";

export type ViewingRequest = {
  id: string;
  propertyId: string;
  title: string;
  location: string;
  date: string;
  time: string;
  note: string;
  status: string;
};

type ApiViewing = {
  id: string;
  propertyId: string;
  startsAt: string;
  note: string | null;
  status: string;
  property?: {
    title: string;
    neighbourhood: string | null;
    city: string | null;
    listing: { slug: string } | null;
  };
};

const EVENT = "hauxhunt-viewing-requests-change";

function toRequest(viewing: ApiViewing): ViewingRequest {
  const startsAt = new Date(viewing.startsAt);
  return {
    id: viewing.id,
    propertyId: viewing.property?.listing?.slug ?? viewing.propertyId,
    title: viewing.property?.title ?? "",
    location: [viewing.property?.neighbourhood, viewing.property?.city]
      .filter(Boolean)
      .join(", "),
    date: startsAt.toISOString().slice(0, 10),
    time: startsAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    note: viewing.note ?? "",
    status: viewing.status,
  };
}

async function fetchRequests() {
  const { data } = await api<{ data: ApiViewing[] }>("/me/viewings");
  return data.map(toRequest);
}

export async function addViewingRequest(
  request: Pick<ViewingRequest, "propertyId" | "date" | "time" | "note">,
) {
  const listingId = await resolveListingId(request.propertyId);
  try {
    const viewing = await api<ApiViewing>(
      `/listings/${listingId}/viewing-requests`,
      {
        method: "POST",
        body: {
          startsAt: new Date(`${request.date} ${request.time}`).toISOString(),
          note: request.note || undefined,
        },
      },
    );
    window.dispatchEvent(new Event(EVENT));
    return { created: true, request: toRequest(viewing) };
  } catch (error) {
    if (error instanceof ApiError && error.code === "VIEWING_ALREADY_REQUESTED") {
      const { viewingId } = error.details as { viewingId: string };
      const existing = (await fetchRequests()).find(
        (item) => item.id === viewingId,
      );
      if (existing) return { created: false, request: existing };
    }
    throw error;
  }
}

export async function updateViewingRequest(
  id: string,
  status: string,
  suggestedAt?: string,
) {
  await api(`/me/viewings/${id}`, {
    method: "PATCH",
    body: { status, suggestedAt },
  });
  window.dispatchEvent(new Event(EVENT));
}

export function useViewingRequests() {
  const [requests, setRequests] = useState<ViewingRequest[]>([]);
  useEffect(() => {
    const sync = () => void fetchRequests().then(setRequests, () => {});
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return requests;
}
