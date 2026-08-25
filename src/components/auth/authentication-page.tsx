"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { AuthenticationForm } from "@/components/auth/authentication-form";
import { LoginMosaic } from "@/components/auth/login-mosaic";
import { Wordmark } from "@/components/layout/wordmark";
import { HistoryBackButton } from "@/components/navigation/history-back-button";
import { useTranslation } from "@/components/language/use-translation";

import registrationImage from "@/assets/images/interior.jpg";

type AuthenticationPageProps = {
  mode: "login" | "register";
};

export function AuthenticationPage({ mode }: AuthenticationPageProps) {
  const { t } = useTranslation();
  const isRegister = mode === "register";

  if (!isRegister) {
    return (
      <main className="min-h-svh bg-[#0a0a0a] p-3 text-white sm:p-5 lg:h-svh lg:overflow-hidden">
        <div className="mx-auto grid min-h-[calc(100svh-1.5rem)] max-w-[1600px] gap-3 lg:h-[calc(100svh-2.5rem)] lg:min-h-0 lg:grid-cols-[minmax(360px,0.68fr)_minmax(0,1.32fr)]">
          <section className="flex min-h-[720px] flex-col p-6 sm:p-9 lg:min-h-0 lg:p-10 xl:p-14">
            <div className="flex -translate-y-3 items-center justify-between gap-5">
              <Link
                href="/"
                aria-label={t("auth.homeAriaLabel")}
                className="w-fit invert"
              >
                <Wordmark height={42} />
              </Link>
              <HistoryBackButton
                fallbackHref="/"
                className="font-bricolage inline-flex h-10 items-center gap-0.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                {t("auth.back")}
              </HistoryBackButton>
            </div>

            <div className="my-auto w-full max-w-md -translate-y-6 self-center py-10">
              <h1 className="font-bricolage text-[clamp(2.7rem,5vw,4.7rem)] leading-[0.92] font-medium tracking-[-0.055em]">
                {t("auth.login.welcomeTitle")}
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/45">
                {t("auth.login.welcomeSubtitle")}
              </p>
              <div className="mt-10">
                <AuthenticationForm mode="login" variant="dark" />
              </div>
            </div>
          </section>

          <LoginMosaic />
        </div>
      </main>
    );
  }

  return (
    <main className="bg-carbon-50 min-h-svh lg:h-svh lg:overflow-hidden">
      <div className="grid min-h-svh w-full bg-white lg:h-full lg:min-h-0 lg:grid-cols-2 lg:overflow-hidden">
        <section className="relative hidden min-h-0 overflow-hidden lg:block lg:w-[calc(100%+3rem)]">
          <Image
            src={registrationImage}
            alt={t("auth.registrationImageAlt")}
            fill
            priority
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-black/65" />
          <div className="relative z-10 flex h-full flex-col p-10 text-white xl:p-14">
            <div className="flex items-center justify-between gap-5 lg:pr-28">
              <Link
                href="/"
                aria-label={t("auth.homeAriaLabel")}
                className="w-fit invert"
              >
                <Wordmark height={42} />
              </Link>
              <HistoryBackButton
                fallbackHref="/"
                className="font-bricolage inline-flex h-10 items-center gap-0.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                {t("auth.back")}
              </HistoryBackButton>
            </div>

            <div className="mt-auto max-w-xl pb-5">
              <h1 className="font-bricolage text-[clamp(3.5rem,7vw,7rem)] leading-[0.86] font-medium tracking-[-0.065em]">
                {t("auth.register.joinTitle")}
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-white/70">
                {t("auth.register.joinSubtitle")}
              </p>
            </div>
          </div>
        </section>

        <section className="relative z-10 min-h-svh bg-white px-5 py-5 sm:px-8 sm:py-6 lg:-ml-12 lg:h-full lg:min-h-0 lg:overflow-hidden lg:rounded-tl-[5.5rem] lg:px-12 xl:px-16">
          <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-xl flex-col justify-center lg:h-full lg:min-h-0">
            <HistoryBackButton
              fallbackHref="/"
              className="font-bricolage mb-5 inline-flex h-10 w-fit items-center gap-0.5 text-sm font-medium text-black/60 transition-colors hover:text-black lg:hidden"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              {t("auth.back")}
            </HistoryBackButton>
            <AuthenticationForm mode="register" compact />
          </div>
        </section>
      </div>
    </main>
  );
}
