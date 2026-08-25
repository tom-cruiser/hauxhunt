"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { setPartnerRole } from "@/components/partner/use-partner-role";
import { saveProperty } from "@/hooks/use-saved-properties";
import { setTier } from "@/hooks/use-tier";
import { useTranslation } from "@/components/language/use-translation";
import {
  Building2,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Home,
  KeyRound,
  UserRound,
} from "lucide-react";

type AuthenticationFormProps = {
  mode: "login" | "register";
  variant?: "light" | "dark";
  compact?: boolean;
};

const ACCOUNT_TYPES = [
  {
    value: "renter",
    labelKey: "auth.form.accountTypes.renter.label",
    descriptionKey: "auth.form.accountTypes.renter.description",
    icon: Home,
  },
  {
    value: "owner",
    labelKey: "auth.form.accountTypes.owner.label",
    descriptionKey: "auth.form.accountTypes.owner.description",
    icon: KeyRound,
  },
  {
    value: "property_manager",
    labelKey: "auth.form.accountTypes.propertyManager.label",
    descriptionKey: "auth.form.accountTypes.propertyManager.description",
    icon: Building2,
  },
  {
    value: "agent",
    labelKey: "auth.form.accountTypes.agent.label",
    descriptionKey: "auth.form.accountTypes.agent.description",
    icon: UserRound,
  },
] as const;

export function AuthenticationForm({
  mode,
  variant = "light",
  compact = false,
}: AuthenticationFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState("renter");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const isRegister = mode === "register";
  const isDark = variant === "dark";
  const returnTo = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("returnTo")
    : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);

    if (isRegister) {
      if (data.get("password") !== data.get("confirmPassword")) {
        setError(t("auth.form.passwordsDontMatch"));
        return;
      }
    }

    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    const pendingPropertyId = searchParams.get("save");
    const pendingPropertyAlreadySaved = searchParams.get("already") === "1";

    const finishPendingRenterSave = () => {
      const newlySaved =
        pendingPropertyId && !pendingPropertyAlreadySaved
          ? saveProperty(pendingPropertyId)
          : false;
      const destination = new URL(
        returnTo?.startsWith("/") ? returnTo : "/renter-dashboard/saved",
        window.location.origin,
      );
      destination.searchParams.set("saved", newlySaved ? "1" : "already");
      router.replace(`${destination.pathname}${destination.search}`);
    };

    if (!isRegister) {
      if (email === "renter@gmail.com") {
        window.sessionStorage.setItem("hauxhunt-authenticated-role", "renter");
        window.sessionStorage.setItem("hauxhunt-has-flatmate-profile", "true");
        setTier("free");
        if (pendingPropertyId) {
          finishPendingRenterSave();
        } else {
          router.replace(
            returnTo?.startsWith("/") ? returnTo : "/renter-dashboard",
          );
        }
        return;
      }

      if (email === "partner@gmail.com") {
        window.sessionStorage.setItem(
          "hauxhunt-authenticated-role",
          "property_manager",
        );
        setPartnerRole("property_manager");
        setTier("free");
        router.replace(
          returnTo?.startsWith("/") ? returnTo : "/partner-dashboard",
        );
        return;
      }

      if (email === "agent@gmail.com") {
        window.sessionStorage.setItem("hauxhunt-authenticated-role", "agent");
        setPartnerRole("agent");
        setTier("free");
        router.replace(
          returnTo?.startsWith("/") ? returnTo : "/partner-dashboard",
        );
        return;
      }

      if (email === "owner@gmail.com") {
        window.sessionStorage.setItem("hauxhunt-authenticated-role", "owner");
        setTier("free");
        router.replace(returnTo?.startsWith("/") ? returnTo : "/owner-dashboard");
        return;
      }

      setError(t("auth.form.wrongCredentials"));
      return;
    }

    setTier("free");

    if (accountType === "renter") {
      window.sessionStorage.setItem("hauxhunt-authenticated-role", "renter");
      if (pendingPropertyId) {
        finishPendingRenterSave();
        return;
      }
    } else if (accountType === "owner") {
      window.sessionStorage.setItem("hauxhunt-authenticated-role", "owner");
    } else if (accountType === "property_manager") {
      window.sessionStorage.setItem(
        "hauxhunt-authenticated-role",
        "property_manager",
      );
      setPartnerRole("property_manager");
    } else if (accountType === "agent") {
      window.sessionStorage.setItem("hauxhunt-authenticated-role", "agent");
      setPartnerRole("agent");
    }

    setComplete(true);
  }

  if (complete) {
    const handleContinue = () => {
      if (returnTo?.startsWith("/")) {
        router.replace(returnTo);
      } else {
        router.push(
          accountType === "renter"
            ? "/renter-dashboard"
            : accountType === "owner"
              ? "/owner-dashboard"
              : "/partner-dashboard",
        );
      }
    };

    return (
      <div className="py-10 text-center">
        <span
          className={`mx-auto flex size-16 items-center justify-center rounded-full ${isDark ? "bg-white text-black" : "bg-black text-white"}`}
        >
          <Check aria-hidden="true" className="size-7" />
        </span>
        <h2
          className={`font-bricolage mt-7 text-4xl font-medium tracking-[-0.04em] ${isDark ? "text-white" : "text-carbon-900"}`}
        >
          {t("auth.form.accountReadyTitle")}
        </h2>
        <p
          className={`mx-auto mt-4 max-w-md leading-7 ${isDark ? "text-white/50" : "text-carbon-600"}`}
        >
          {t("auth.form.accountReadyDescription")}
        </p>
        <button
          type="button"
          onClick={handleContinue}
          className={`font-bricolage mt-8 h-12 rounded-full px-7 font-medium transition-colors ${isDark ? "bg-white text-black hover:bg-white/85" : "bg-black text-white hover:bg-black/80"}`}
        >
          {returnTo ? t("auth.form.continueButton") : t("auth.form.goToDashboard")}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={isDark ? "text-white" : undefined}
    >
      {isRegister && (
        <fieldset>
          <legend
            className={`font-bricolage text-carbon-900 font-medium ${compact ? "text-lg" : "text-xl"}`}
          >
            {t("auth.form.chooseAccountType")}
          </legend>
          <p
            className={`text-carbon-500 text-sm ${compact ? "mt-0.5" : "mt-1"}`}
          >
            {t("auth.form.chooseAccountTypeHelp")}
          </p>
          <div
            className={`grid sm:grid-cols-2 ${compact ? "mt-3 gap-2" : "mt-5 gap-3"}`}
          >
            {ACCOUNT_TYPES.map(({ value, labelKey, descriptionKey, icon: Icon }) => (
              <label
                key={value}
                className={`cursor-pointer rounded-2xl border transition-colors ${compact ? "p-3" : "p-4"} ${
                  accountType === value
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white hover:border-black/40"
                }`}
              >
                <input
                  type="radio"
                  name="accountType"
                  value={value}
                  checked={accountType === value}
                  onChange={() => setAccountType(value)}
                  className="sr-only"
                />
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="font-bricolage block font-medium">
                      {t(labelKey)}
                    </span>
                    <span
                      className={`mt-1 block text-xs ${compact ? "leading-4" : "leading-5"} ${accountType === value ? "text-white/65" : "text-carbon-500"}`}
                    >
                      {t(descriptionKey)}
                    </span>
                  </span>
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div
        className={`grid ${compact ? "gap-3" : "gap-5"} ${isRegister ? `${compact ? "mt-4" : "mt-8"} sm:grid-cols-2` : ""}`}
      >
        {isRegister && (
          <>
            <Field
              label={t("auth.form.fullName")}
              name="fullName"
              compact={compact}
              required
            />
            {(accountType === "property_manager" ||
              accountType === "agent") && (
              <Field
                label={t("auth.form.agencyNameOptional")}
                name="businessName"
                compact={compact}
              />
            )}
          </>
        )}

        <Field
          label={t("auth.form.emailAddress")}
          name="email"
          type="email"
          autoComplete="email"
          className={isRegister ? "sm:col-span-2" : undefined}
          dark={isDark}
          compact={compact}
          required
        />

        {isRegister && (
          <>
            <Field
              label={t("auth.form.phoneNumber")}
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              compact={compact}
            />
            <SelectField
              label={t("auth.form.country")}
              name="country"
              options={["Rwanda", "Nigeria", "Kenya"]}
              compact={compact}
              required
            />
          </>
        )}

        <PasswordField
          label={t("auth.form.password")}
          name="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          visible={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
          dark={isDark}
          compact={compact}
          required
        />

        {isRegister && (
          <PasswordField
            label={t("auth.form.confirmPassword")}
            name="confirmPassword"
            autoComplete="new-password"
            visible={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            compact={compact}
            required
          />
        )}
      </div>

      {!isRegister && (
        <div
          className={`mt-4 flex items-center justify-between gap-4 text-sm ${isDark ? "text-white/55" : ""}`}
        >
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="remember"
              className={`size-4 ${isDark ? "accent-white" : "accent-black"}`}
            />
            {t("auth.form.rememberMe")}
          </label>
          <button
            type="button"
            className={`font-medium ${isDark ? "text-white/75 hover:text-white" : ""}`}
          >
            {t("auth.form.forgotPassword")}
          </button>
        </div>
      )}

      {isRegister && (
        <label
          className={`flex items-start gap-3 text-sm ${compact ? "mt-4 leading-5" : "mt-6 leading-6"}`}
        >
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-1 size-4 accent-black"
          />
          <span>{t("auth.form.termsAgreement")}</span>
        </label>
      )}

      {error && (
        <p
          role="alert"
          className={`mt-5 text-sm font-medium ${isDark ? "text-red-300" : "text-red-700"}`}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        className={`font-bricolage inline-flex w-full items-center justify-center gap-2 rounded-full px-7 font-medium transition-colors ${compact ? "mt-4 h-11" : "mt-7 h-12"} ${isDark ? "bg-white text-black hover:bg-white/85" : "bg-black text-white hover:bg-black/80"}`}
      >
        {isRegister ? t("auth.form.createAccount") : t("common.login")}
      </button>

      <p
        className={`text-center text-sm ${compact ? "mt-3" : "mt-6"} ${isDark ? "text-white/40" : "text-carbon-600"}`}
      >
        {isRegister
          ? t("auth.form.alreadyHaveAccount")
          : t("auth.form.newToHauxHunt")}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className={`font-medium ${isDark ? "text-white hover:text-white/75" : "text-black"}`}
        >
          {isRegister ? t("common.login") : t("auth.form.createAccount")}
        </Link>
      </p>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
  dark?: boolean;
  compact?: boolean;
};

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required,
  className,
  dark = false,
  compact = false,
}: FieldProps) {
  return (
    <label className={className}>
      <span
        className={`block text-sm font-medium ${compact ? "mb-1" : "mb-2"} ${dark ? "text-white/70" : "text-carbon-900"}`}
      >
        {label}
      </span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        required={required}
        className={`contact-field-control w-full rounded-xl border px-4 transition-colors outline-none ${compact ? "h-10" : "h-12"} ${dark ? "border-white/12 bg-white/[0.035] text-white placeholder:text-white/25 focus:border-white/45" : "border-black/20 focus:border-black"}`}
      />
    </label>
  );
}

type PasswordFieldProps = {
  label: string;
  name: string;
  autoComplete: string;
  visible: boolean;
  onToggle: () => void;
  required?: boolean;
  dark?: boolean;
  compact?: boolean;
};

function PasswordField({
  label,
  name,
  autoComplete,
  visible,
  onToggle,
  required,
  dark = false,
  compact = false,
}: PasswordFieldProps) {
  const { t } = useTranslation();
  return (
    <label>
      <span
        className={`block text-sm font-medium ${compact ? "mb-1" : "mb-2"} ${dark ? "text-white/70" : "text-carbon-900"}`}
      >
        {label}
      </span>
      <span
        className={`flex items-center rounded-xl border px-4 transition-colors ${compact ? "h-10" : "h-12"} ${dark ? "border-white/12 bg-white/[0.035] focus-within:border-white/45" : "border-black/20 focus-within:border-black"}`}
      >
        <input
          type={visible ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          minLength={8}
          required={required}
          className="contact-field-control min-w-0 flex-1 bg-transparent outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            visible ? t("auth.form.hidePassword") : t("auth.form.showPassword")
          }
          className={`-mr-1 flex size-8 items-center justify-center rounded-full ${dark ? "text-white/35 hover:text-white" : "text-carbon-500 hover:text-carbon-900"}`}
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      </span>
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
  compact?: boolean;
};

function SelectField({
  label,
  name,
  options,
  required,
  compact = false,
}: SelectFieldProps) {
  const { t } = useTranslation();
  return (
    <label>
      <span
        className={`text-carbon-900 block text-sm font-medium ${compact ? "mb-1" : "mb-2"}`}
      >
        {label}
      </span>
      <span className="relative block">
        <select
          name={name}
          defaultValue=""
          required={required}
          className={`contact-field-control w-full appearance-none rounded-xl border border-black/20 bg-white pr-11 pl-4 transition-colors outline-none focus:border-black ${compact ? "h-10" : "h-12"}`}
        >
          <option value="" disabled>
            {t("auth.form.chooseCountry")}
          </option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="text-carbon-500 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
        />
      </span>
    </label>
  );
}
