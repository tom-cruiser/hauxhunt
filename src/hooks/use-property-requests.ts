"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export type PropertyRequest = {
  id: string;
  submittedAt: string;
  purpose: string;
  country: string;
  city: string;
  neighbourhood?: string;
  propertyType: string;
  bedrooms: string;
  minimumBudget: string;
  maximumBudget: string;
  moveInDate: string;
  furnishing?: string;
  fullName: string;
  phone: string;
  email: string;
  notes?: string;
};

type ApiPropertyRequest = {
  id: string;
  createdAt: string;
  country: string;
  city: string;
  neighbourhood: string | null;
  propertyType: string;
  bedrooms: number;
  minBudgetUsd: number;
  maxBudgetUsd: number;
  moveInDate: string;
  furnishing: string | null;
  fullName: string;
  phone: string;
  email: string;
  notes: string | null;
};

const COUNTRIES: Record<string, string> = {
  Rwanda: "RW",
  Nigeria: "NG",
  Kenya: "KE",
};
const COUNTRY_NAMES = Object.fromEntries(
  Object.entries(COUNTRIES).map(([name, code]) => [code, name]),
);

function toPropertyType(label: string) {
  return label.toLowerCase().replace(/ apartments$/, " apartment").replace(/[ -]/g, "_");
}

function fromApi(request: ApiPropertyRequest): PropertyRequest {
  return {
    id: request.id,
    submittedAt: request.createdAt,
    purpose: "Rent a house",
    country: COUNTRY_NAMES[request.country] ?? request.country,
    city: request.city,
    neighbourhood: request.neighbourhood ?? undefined,
    propertyType: request.propertyType.replace(/_/g, " "),
    bedrooms: String(request.bedrooms),
    minimumBudget: String(request.minBudgetUsd),
    maximumBudget: String(request.maxBudgetUsd),
    moveInDate: request.moveInDate.slice(0, 10),
    furnishing: request.furnishing ?? undefined,
    fullName: request.fullName,
    phone: request.phone,
    email: request.email,
    notes: request.notes ?? undefined,
  };
}

export function usePropertyRequests() {
  const [requests, setRequests] = useState<PropertyRequest[]>([]);

  const reload = useCallback(async () => {
    const { data } = await api<{ data: ApiPropertyRequest[] }>(
      "/me/property-requests",
    );
    setRequests(data.map(fromApi));
  }, []);

  useEffect(() => {
    void reload().catch(() => {});
  }, [reload]);

  async function addRequest(data: Omit<PropertyRequest, "id" | "submittedAt">) {
    await api("/property-requests", {
      method: "POST",
      body: {
        country: COUNTRIES[data.country] ?? data.country,
        city: data.city,
        neighbourhood: data.neighbourhood || undefined,
        propertyType: toPropertyType(data.propertyType),
        bedrooms: Number.parseInt(data.bedrooms, 10),
        minBudgetUsd: Number(data.minimumBudget),
        maxBudgetUsd: Number(data.maximumBudget),
        moveInDate: data.moveInDate,
        furnishing: data.furnishing || undefined,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        notes: data.notes || undefined,
        consent: true,
      },
    });
    await reload();
  }

  async function removeRequest(id: string) {
    await api(`/property-requests/${id}`, { method: "DELETE" });
    await reload();
  }

  return { requests, addRequest, removeRequest };
}
