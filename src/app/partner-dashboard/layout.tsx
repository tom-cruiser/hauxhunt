import { StoreGate } from "@/components/auth/store-gate";

export default function DashboardLayout({ children }: LayoutProps<"/partner-dashboard">) {
  return <StoreGate>{children}</StoreGate>;
}
