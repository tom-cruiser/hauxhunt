import type { Metadata } from "next";

import {
  CataloguePage,
  type CatalogueSearchParams,
} from "@/components/listings/catalogue-page";

export const metadata: Metadata = {
  title: "Houses for rent | RentUp",
  description:
    "Explore long-term rental houses across Rwanda, Nigeria, and Kenya.",
};

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>;
}) {
  return <CataloguePage purpose="rent" searchParams={await searchParams} />;
}
