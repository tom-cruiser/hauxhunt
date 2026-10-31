"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export type AlertFrequency = "instant" | "daily" | "weekly" | "paused";

export type SavedSearch = {
  id: string;
  name: string;
  location: string;
  type: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  extras: string[];
  matches: number;
  newMatches: number;
  alert: AlertFrequency;
};

const CHANGE_EVENT = "hauxhunt-saved-searches-change";

type ApiSavedSearch = {
  id: string;
  name: string;
  alert: AlertFrequency;
  filters: Partial<SavedSearch>;
};

function toSearch({ id, name, alert, filters }: ApiSavedSearch): SavedSearch {
  return {
    location: "All locations",
    type: "Any Home Type",
    price: "Any Price",
    bedrooms: "Any Bedrooms",
    bathrooms: "Any Bathrooms",
    extras: [],
    ...filters,
    // The API doesn't compute match counts yet.
    matches: 0,
    newMatches: 0,
    id,
    name,
    alert,
  };
}

async function fetchSearches() {
  const { data } = await api<{ data: ApiSavedSearch[] }>("/me/saved-searches");
  return data.map(toSearch);
}

export async function addSavedSearch(search: Omit<SavedSearch, "id">) {
  const { location, type, price, bedrooms, bathrooms, extras } = search;
  await api("/me/saved-searches", {
    method: "POST",
    body: {
      name: search.name,
      alert: search.alert,
      filters: { location, type, price, bedrooms, bathrooms, extras },
    },
  });
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    const sync = () => void fetchSearches().then(setSearches, () => {});
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const updateSearch = useCallback(
    async (id: string, updates: Partial<SavedSearch>) => {
      setSearches((current) =>
        current.map((search) =>
          search.id === id ? { ...search, ...updates } : search,
        ),
      );
      if (updates.alert) {
        await api(`/me/saved-searches/${id}`, {
          method: "PATCH",
          body: { alert: updates.alert },
        });
      }
    },
    [],
  );

  const deleteSearch = useCallback(async (id: string) => {
    setSearches((current) => current.filter((search) => search.id !== id));
    await api(`/me/saved-searches/${id}`, { method: "DELETE" });
  }, []);

  return { searches, updateSearch, deleteSearch };
}
