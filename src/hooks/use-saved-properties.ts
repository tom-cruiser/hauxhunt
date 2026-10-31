"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { resolveListingId, toListing, type ApiListing } from "@/lib/api/listings";
import type { MockListing } from "@/data/hero-search-demo";

const SAVED_PROPERTIES_EVENT = "hauxhunt-saved-properties-change";

let savedListings: MockListing[] = [];
let savedIds: string[] = [];

function publish() {
  window.dispatchEvent(new Event(SAVED_PROPERTIES_EVENT));
}

function isRenter() {
  return (
    window.sessionStorage.getItem("hauxhunt-authenticated-role") === "renter"
  );
}

async function loadSaved() {
  if (!isRenter()) {
    savedListings = [];
    savedIds = [];
    publish();
    return;
  }
  const { data } = await api<{ data: ApiListing[] }>("/me/saved-listings", {
    query: { pageSize: 100 },
  });
  savedListings = data.map(toListing);
  savedIds = savedListings.map((listing) => listing.id);
  publish();
}

async function writeSaved(propertyId: string, saved: boolean) {
  const listingId = await resolveListingId(propertyId);
  await api(`/listings/${listingId}/save`, {
    method: saved ? "PUT" : "DELETE",
  });
  await loadSaved();
}

function toggle(propertyId: string, saved: boolean) {
  savedIds = saved
    ? [...savedIds, propertyId]
    : savedIds.filter((id) => id !== propertyId);
  publish();
  // A failed write reloads, which puts the heart back to the real state.
  void writeSaved(propertyId, saved).catch(() => loadSaved().catch(() => {}));
}

export function saveProperty(propertyId: string) {
  if (savedIds.includes(propertyId)) return false;
  toggle(propertyId, true);
  return true;
}

export function useSavedProperties() {
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [listings, setListings] = useState<MockListing[]>([]);

  useEffect(() => {
    const sync = () => {
      setPropertyIds(savedIds);
      setListings(savedListings);
    };
    const reload = () => void loadSaved().catch(() => {});
    sync();
    reload();
    window.addEventListener(SAVED_PROPERTIES_EVENT, sync);
    window.addEventListener("rentup-session-changed", reload);
    return () => {
      window.removeEventListener(SAVED_PROPERTIES_EVENT, sync);
      window.removeEventListener("rentup-session-changed", reload);
    };
  }, []);

  const toggleProperty = useCallback((propertyId: string) => {
    const saved = !savedIds.includes(propertyId);
    toggle(propertyId, saved);
    return saved;
  }, []);

  return { propertyIds, listings, toggleProperty };
}

export function useSavedProperty(propertyId: string) {
  const { propertyIds, toggleProperty } = useSavedProperties();
  return {
    saved: propertyIds.includes(propertyId),
    toggleSaved: () => toggleProperty(propertyId),
  };
}
