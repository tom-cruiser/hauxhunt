import type { Metadata } from "next";

import {
  CataloguePage,
  type CatalogueSearchParams,
} from "@/components/listings/catalogue-page";

export const metadata: Metadata = {
  title: "All properties | RentUp",
  description: "Explore homes for rent across Rwanda, Nigeria, and Kenya.",
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>;
}) {
  return <CataloguePage purpose="all" searchParams={await searchParams} />;
}
