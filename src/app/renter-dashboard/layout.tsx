import { StoreGate } from "@/components/auth/store-gate";

export default function DashboardLayout({ children }: LayoutProps<"/renter-dashboard">) {
  return <StoreGate>{children}</StoreGate>;
}
