import type { Metadata } from "next";

import { AuthenticationPage } from "@/components/auth/authentication-page";

export const metadata: Metadata = {
  title: "Login | RentUp",
  description: "Login to your RentUp account.",
};

export default function LoginPage() {
  return <AuthenticationPage mode="login" />;
}
