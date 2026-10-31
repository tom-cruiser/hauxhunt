"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "@/components/language/use-translation";
import { forgotPassword, resetPassword } from "@/lib/api/session";

const FIELD =
  "mt-2 h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm";

function ResetPasswordForm() {
  const { t } = useTranslation();
  const token = useSearchParams().get("token");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (token) {
        await resetPassword(token, String(data.get("password")));
      } else {
        await forgotPassword(String(data.get("email")));
      }
      setDone(true);
    } catch {
      setError(t("auth.reset.failed"));
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="font-bricolage text-3xl font-medium tracking-[-0.03em]">
        {t(token ? "auth.reset.newPasswordTitle" : "auth.reset.requestTitle")}
      </h1>
      {done ? (
        <p className="text-carbon-600 mt-4 leading-7">
          {t(token ? "auth.reset.changed" : "auth.reset.sent")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6">
          <label className="block text-sm font-medium">
            {t(token ? "auth.reset.passwordLabel" : "auth.reset.emailLabel")}
            <input
              name={token ? "password" : "email"}
              type={token ? "password" : "email"}
              required
              minLength={token ? 8 : undefined}
              className={FIELD}
            />
          </label>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-5 h-12 w-full rounded-xl bg-black text-sm font-medium text-white"
          >
            {t("auth.reset.submit")}
          </button>
        </form>
      )}
      <Link href="/login" className="mt-6 text-sm underline">
        {t("auth.reset.backToLogin")}
      </Link>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
