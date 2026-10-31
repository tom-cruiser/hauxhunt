"use client";

import { setPartnerRole } from "@/components/partner/use-partner-role";
import { clearTier, setTier } from "@/hooks/use-tier";
import { api } from "@/lib/api/client";

export type UserRole = "renter" | "owner" | "property_manager" | "agent";

export type Me = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: "RW" | "NG" | "KE";
  role: UserRole | "admin";
  plan: "free" | "paid";
  language: string;
  avatarUrl: string | null;
  verificationStatus: string;
};

export type RegisterInput = {
  role: UserRole;
  fullName: string;
  agencyName?: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  acceptTerms: boolean;
};

export const SESSION_CHANGED_EVENT = "rentup-session-changed";

const ROLE_KEY = "hauxhunt-authenticated-role";

export function dashboardFor(role: Me["role"]) {
  if (role === "renter") return "/renter-dashboard";
  if (role === "owner") return "/owner-dashboard";
  if (role === "admin") return "/";
  return "/partner-dashboard";
}

/**
 * Copies the signed-in user into the keys the UI reads synchronously. This is
 * a display cache only: the API decides what each user may do.
 */
export function mirrorSession(me: Me) {
  window.sessionStorage.setItem(ROLE_KEY, me.role);
  if (me.role === "property_manager" || me.role === "agent") {
    setPartnerRole(me.role);
  }
  setTier(me.plan);
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
  window.dispatchEvent(new Event("storage"));
}

export function clearSessionMirror() {
  window.sessionStorage.removeItem(ROLE_KEY);
  clearTier();
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
  window.dispatchEvent(new Event("storage"));
}

export async function login(email: string, password: string) {
  const me = await api<Me>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  mirrorSession(me);
  return me;
}

export async function register(input: RegisterInput) {
  const me = await api<Me>("/auth/register", { method: "POST", body: input });
  mirrorSession(me);
  return me;
}

// Logging out navigates straight away, so the session check on the next page
// must wait here or it could read the cookies that are about to be cleared.
let signingOut: Promise<unknown> = Promise.resolve();

export function logout() {
  clearSessionMirror();
  signingOut = api("/auth/logout", { method: "POST" }).catch(() => undefined);
  return signingOut;
}

export async function fetchMe() {
  await signingOut;
  return api<Me>("/me");
}

export function forgotPassword(email: string) {
  return api("/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword(token: string, password: string) {
  return api("/auth/reset-password", {
    method: "POST",
    body: { token, password },
  });
}
