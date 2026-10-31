import { StoreGate } from "@/components/auth/store-gate";

export default function DashboardLayout({ children }: LayoutProps<"/owner-dashboard">) {
  return <StoreGate>{children}</StoreGate>;
}
