"use client";

import Image from "next/image";
import { BadgeCheck, Camera, ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import bankMethodImage from "@/assets/images/bank.png";
import cardMethodImage from "@/assets/images/card.png";
import deletingIllustration from "@/assets/images/deleting.png";
import mobileMethodImage from "@/assets/images/mobile.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { InternationalPhoneInput } from "@/components/shared/international-phone-input";
import { PlanToggleCard } from "@/components/tier/plan-toggle-card";
import { LockedFeature } from "@/components/tier/locked-feature";
import { isPaidTier, useTier } from "@/hooks/use-tier";
import { useTranslation } from "@/components/language/use-translation";

type SectionId = "personal" | "security" | "methods" | "preferences" | "plan";

const SECTION_IDS: SectionId[] = [
  "personal",
  "security",
  "methods",
  "preferences",
  "plan",
];

// Section ids double as the `?section=` query-param value and the internal
// `openSection` state, so they stay in English — only the tab/Accordion
// label rendered for each id is translated, via this lookup.
const SECTION_TAB_KEYS: Record<SectionId, string> = {
  personal: "renterDashboard.account.tabs.personalInformation",
  security: "renterDashboard.account.tabs.loginSecurity",
  methods: "renterDashboard.account.tabs.paymentMethods",
  preferences: "renterDashboard.account.tabs.notificationsPreferences",
  plan: "renterDashboard.account.tabs.planBilling",
};

type PlanFeatureKeys = {
  labelKey: string;
  freeKey: string;
  paidKey: string;
  paidVars?: Record<string, string>;
};

const TENANT_PLAN_FEATURE_KEYS: PlanFeatureKeys[] = [
  {
    labelKey: "renterDashboard.account.plan.features.listingAccess.label",
    freeKey: "renterDashboard.account.plan.features.listingAccess.free",
    paidKey: "renterDashboard.account.plan.features.listingAccess.paid",
  },
  {
    labelKey: "renterDashboard.account.plan.features.messaging.label",
    freeKey: "renterDashboard.account.plan.features.messaging.free",
    paidKey: "renterDashboard.account.plan.features.messaging.paid",
  },
  {
    labelKey: "renterDashboard.account.plan.features.mapView.label",
    freeKey: "renterDashboard.account.plan.features.mapView.free",
    paidKey: "renterDashboard.account.plan.features.mapView.paid",
  },
  {
    labelKey: "renterDashboard.account.plan.features.houseReviews.label",
    freeKey: "renterDashboard.account.plan.features.houseReviews.free",
    paidKey: "renterDashboard.account.plan.features.houseReviews.paid",
  },
  {
    labelKey: "renterDashboard.account.plan.features.priorityAlerts.label",
    freeKey: "renterDashboard.account.plan.features.priorityAlerts.free",
    paidKey: "renterDashboard.account.plan.features.priorityAlerts.paid",
  },
  {
    labelKey:
      "renterDashboard.account.plan.features.maintenanceRequests.label",
    freeKey: "renterDashboard.account.plan.features.maintenanceRequests.free",
    paidKey: "renterDashboard.account.plan.features.maintenanceRequests.paid",
  },
  {
    labelKey: "renterDashboard.account.plan.features.viewingFee.label",
    freeKey: "renterDashboard.account.plan.features.viewingFee.free",
    paidKey: "renterDashboard.account.plan.features.viewingFee.paid",
    paidVars: { amount: "5,000 RWF" },
  },
  {
    labelKey: "renterDashboard.account.plan.features.whatsappAlerts.label",
    freeKey: "renterDashboard.account.plan.features.whatsappAlerts.free",
    paidKey: "renterDashboard.account.plan.features.whatsappAlerts.paid",
  },
];

type Modal =
  | "sessions"
  | "delete-account"
  | "add-method"
  | "edit-method"
  | "remove-method"
  | null;
type MethodKind = "mobile" | "card" | "bank";
type PaymentMethod = {
  id: number;
  kind: MethodKind;
  name: string;
  detail: string;
  phoneNumber?: string;
  fields: Record<string, string>;
  note: string;
  isDefault: boolean;
};

// `kind` is the internal, English identifier compared throughout this file
// (`method.kind === "mobile"`, etc.) — this only maps it to a translated
// display label, the same defensive split used for `optionLabels` elsewhere.
const KIND_LABEL_KEYS: Record<MethodKind, string> = {
  mobile: "renterDashboard.account.modal.addMethod.kinds.mobileMoney",
  card: "renterDashboard.account.modal.addMethod.kinds.card",
  bank: "renterDashboard.account.modal.addMethod.kinds.bankAccount",
};

const INITIAL_PROFILE = {
  name: "Julien Mugisha",
  email: "renter@gmail.com",
  phone: "+250 788 000 456",
  country: "Rwanda",
  language: "English",
};

type PreferenceItem = { id: string; labelKey: string };
type PreferenceGroupData = { titleKey: string; items: readonly PreferenceItem[] };

// Item `id` is the internal identifier the preferences state is keyed on
// (`${id}-${channel}`); `labelKey` is only the translated display text, kept
// separate so switching language never changes which state entries a toggle
// reads or writes. "new-flatmate-message" is intentionally reused as the id
// for both its appearance here and in MESSAGE_PREFERENCE_ITEMS below, to
// preserve the original (pre-i18n) behaviour where both rows shared one
// underlying preference toggle.
const PREFERENCE_GROUPS: readonly PreferenceGroupData[] = [
  {
    titleKey: "renterDashboard.account.preferences.groups.propertySearch.title",
    items: [
      {
        id: "new-matches-saved-searches",
        labelKey:
          "renterDashboard.account.preferences.groups.propertySearch.items.newMatches",
      },
      {
        id: "price-changes-favourites",
        labelKey:
          "renterDashboard.account.preferences.groups.propertySearch.items.priceChanges",
      },
      {
        id: "property-availability-changes",
        labelKey:
          "renterDashboard.account.preferences.groups.propertySearch.items.availabilityChanges",
      },
    ],
  },
  {
    titleKey:
      "renterDashboard.account.preferences.groups.viewingsApplications.title",
    items: [
      {
        id: "viewing-confirmations-changes",
        labelKey:
          "renterDashboard.account.preferences.groups.viewingsApplications.items.viewingConfirmations",
      },
      {
        id: "application-status-updates",
        labelKey:
          "renterDashboard.account.preferences.groups.viewingsApplications.items.applicationStatusUpdates",
      },
      {
        id: "additional-information-requested",
        labelKey:
          "renterDashboard.account.preferences.groups.viewingsApplications.items.additionalInfoRequested",
      },
      {
        id: "rental-invitations",
        labelKey:
          "renterDashboard.account.preferences.groups.viewingsApplications.items.rentalInvitations",
      },
    ],
  },
  {
    titleKey: "renterDashboard.account.preferences.groups.rentalPayments.title",
    items: [
      {
        id: "rent-due-soon",
        labelKey:
          "renterDashboard.account.preferences.groups.rentalPayments.items.rentDueSoon",
      },
      {
        id: "payment-successful-or-failed",
        labelKey:
          "renterDashboard.account.preferences.groups.rentalPayments.items.paymentSuccessFailed",
      },
      {
        id: "rental-setup-updates",
        labelKey:
          "renterDashboard.account.preferences.groups.rentalPayments.items.rentalSetupUpdates",
      },
      {
        id: "maintenance-updates",
        labelKey:
          "renterDashboard.account.preferences.groups.rentalPayments.items.maintenanceUpdates",
      },
    ],
  },
  {
    titleKey: "renterDashboard.account.preferences.groups.flatmates.title",
    items: [
      {
        id: "new-flatmate-match",
        labelKey:
          "renterDashboard.account.preferences.groups.flatmates.items.newFlatmateMatch",
      },
      {
        id: "someone-interested-in-profile",
        labelKey:
          "renterDashboard.account.preferences.groups.flatmates.items.someoneInterested",
      },
      {
        id: "new-flatmate-message",
        labelKey:
          "renterDashboard.account.preferences.groups.flatmates.items.newFlatmateMessage",
      },
    ],
  },
];

const MESSAGE_PREFERENCE_ITEMS: readonly PreferenceItem[] = [
  {
    id: "new-message-received",
    labelKey:
      "renterDashboard.account.preferences.groups.messagePreferences.items.newMessageReceived",
  },
  {
    id: "message-from-property-representative",
    labelKey:
      "renterDashboard.account.preferences.groups.messagePreferences.items.messageFromRepresentative",
  },
  {
    id: "new-flatmate-message",
    labelKey:
      "renterDashboard.account.preferences.groups.flatmates.items.newFlatmateMessage",
  },
];

const HAUXHUNT_UPDATES_ITEMS: readonly PreferenceItem[] = [
  {
    id: "product-updates-features",
    labelKey:
      "renterDashboard.account.preferences.groups.hauxhuntUpdates.items.productUpdatesFeatures",
  },
  {
    id: "tips-and-recommendations",
    labelKey:
      "renterDashboard.account.preferences.groups.hauxhuntUpdates.items.tipsRecommendations",
  },
];

// WhatsApp is a Paid-only delivery channel (see access-control.ts) — its
// checkbox renders disabled with a lock for Free tenants (PreferenceGroup
// below) rather than being omitted, so the option is visible, not hidden.
const NOTIFICATION_CHANNELS = ["In-app", "Email", "SMS", "WhatsApp"] as const;

// Internal channel identifiers (also used to build preference state keys and
// in `===` comparisons) mapped to their translated column/row labels.
const CHANNEL_LABEL_KEYS: Record<(typeof NOTIFICATION_CHANNELS)[number], string> = {
  "In-app": "renterDashboard.account.preferences.channels.inApp",
  Email: "renterDashboard.account.preferences.channels.email",
  SMS: "renterDashboard.account.preferences.channels.sms",
  WhatsApp: "renterDashboard.account.preferences.channels.whatsapp",
};

const INITIAL_METHODS: PaymentMethod[] = [
  {
    id: 1,
    kind: "mobile",
    name: "MTN Mobile Money",
    detail: "+250 78•• ••• 456",
    phoneNumber: "+250 788 000 456",
    fields: {
      country: "Rwanda",
      provider: "MTN",
      phone: "788 000 456",
    },
    note: "Rwanda",
    isDefault: true,
  },
  {
    id: 2,
    kind: "card",
    name: "Visa",
    detail: "•••• 4821",
    fields: {
      name: "Julien Mugisha",
      number: "4111 1111 1111 4821",
      expiry: "08/28",
      cvv: "",
    },
    note: "Expires 08/28",
    isDefault: false,
  },
  {
    id: 3,
    kind: "bank",
    name: "Bank Account",
    detail: "Bank of Kigali · •••• 2741",
    fields: {
      bank: "Bank of Kigali",
      accountName: "Julien Mugisha",
      accountNumber: "0012345672741",
    },
    note: "Account ending in 2741",
    isDefault: false,
  },
];

const INITIAL_DEVICES = [
  {
    id: "macbook-pro",
    device: "MacBook Pro",
    date: "16 Aug 2026 · 18:40",
    location: "Kigali, Rwanda",
  },
  {
    id: "iphone",
    device: "iPhone",
    date: "15 Aug 2026 · 09:20",
    location: "Kigali, Rwanda",
  },
];

const COUNTRY_CODES: Record<string, string> = {
  Rwanda: "+250",
  Kenya: "+254",
  Nigeria: "+234",
};

const COUNTRY_PHONE_PLACEHOLDERS: Record<string, string> = {
  Rwanda: "7XXXXXXXX",
  Kenya: "7XXXXXXXX",
  Nigeria: "8XXXXXXXXX",
};

export default function MyAccountPage() {
  const { t } = useTranslation();
  const [openSection, setOpenSection] = useState<SectionId>("personal");
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [savedProfile, setSavedProfile] = useState(INITIAL_PROFILE);
  const [forceOpenDevices, setForceOpenDevices] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section") as SectionId | null;
    const open = params.get("open");
    if (section) setOpenSection(section);
    if (open === "devices") setForceOpenDevices(true);
  }, []);
  const [emailDraft, setEmailDraft] = useState(INITIAL_PROFILE.email);
  const [countryCode, setCountryCode] = useState("+250");
  const [phoneDraft, setPhoneDraft] = useState("788 000 456");
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailVerificationRequested, setEmailVerificationRequested] =
    useState(false);
  const [phoneVerificationRequested, setPhoneVerificationRequested] =
    useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [methods, setMethods] = useState(INITIAL_METHODS);
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [methodToRemove, setMethodToRemove] = useState<PaymentMethod | null>(
    null,
  );
  const [methodToEdit, setMethodToEdit] = useState<PaymentMethod | null>(null);
  const [newMethodKind, setNewMethodKind] = useState<MethodKind | null>(null);
  const [preferencesDirty, setPreferencesDirty] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    Object.fromEntries(
      PREFERENCE_GROUPS.flatMap((group) =>
        group.items.flatMap((item) =>
          NOTIFICATION_CHANNELS.map((channel) => [
            `${item.id}-${channel}`,
            channel === "In-app" || channel === "Email",
          ]),
        ),
      ),
    ),
  );
  const profileDirty = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(savedProfile),
    [profile, savedProfile],
  );
  const emailChanged = emailDraft.trim() !== savedProfile.email;
  const fullPhoneDraft = `${countryCode} ${phoneDraft.trim()}`;
  const phoneChanged = fullPhoneDraft !== savedProfile.phone;
  const contactDirty = emailChanged || phoneChanged;
  const contactVerificationComplete =
    (!emailChanged || emailOtpVerified) && (!phoneChanged || phoneOtpVerified);
  const passwordDirty = Object.values(passwordDraft).some(Boolean);
  const passwordComplete =
    !passwordDirty ||
    (Boolean(passwordDraft.current) &&
      passwordDraft.next.length >= 8 &&
      passwordDraft.next === passwordDraft.confirm);
  const accountDirty = profileDirty || contactDirty || preferencesDirty;

  const planFeatures = useMemo(
    () =>
      TENANT_PLAN_FEATURE_KEYS.map((feature) => ({
        label: t(feature.labelKey),
        free: t(feature.freeKey),
        paid: t(feature.paidKey, feature.paidVars),
      })),
    [t],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function toggleSection(id: SectionId) {
    setOpenSection((current) => (current === id ? current : id));
  }

  function saveAccountChanges() {
    const updatedProfile = {
      ...profile,
      email: emailDraft.trim(),
      phone: fullPhoneDraft,
    };
    setProfile(updatedProfile);
    setSavedProfile(updatedProfile);
    setEmailDraft(updatedProfile.email);
    setEmailOtp("");
    setPhoneOtp("");
    setEmailVerificationRequested(false);
    setPhoneVerificationRequested(false);
    setEmailOtpVerified(false);
    setPhoneOtpVerified(false);
    setPreferencesDirty(false);
  }

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <header className="px-5 pt-9 pb-7 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h1 className="dashboard-page-title">
                  {t("renterDashboard.account.heading")}
                </h1>
                <p className="text-carbon-500 mt-2 text-sm">
                  {t("renterDashboard.account.subheading")}
                </p>
              </div>
              <button
                type="button"
                disabled={
                  !accountDirty ||
                  !emailDraft.trim() ||
                  !phoneDraft.trim() ||
                  !contactVerificationComplete
                }
                onClick={() => {
                  saveAccountChanges();
                  showToast(t("renterDashboard.account.toast.accountChangesSaved"));
                }}
                className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                {t("renterDashboard.account.actions.saveChanges")}
              </button>
            </div>
            <nav
              aria-label={t("renterDashboard.account.sectionsNavAria")}
              className="mt-7 flex gap-7 overflow-x-auto"
            >
              {SECTION_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleSection(id)}
                  aria-current={openSection === id ? "page" : undefined}
                  className={`relative flex h-12 shrink-0 items-center text-sm font-medium ${openSection === id ? "text-black" : "text-black/45"}`}
                >
                  {t(SECTION_TAB_KEYS[id])}
                  {openSection === id ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />
                  ) : null}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <div className="px-5 pb-12 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto max-w-[1200px]">
            <Accordion
              id="personal"
              title={t(SECTION_TAB_KEYS.personal)}
              open={openSection === "personal"}
              toggle={toggleSection}
            >
              <div className="grid items-stretch gap-5 lg:grid-cols-[230px_1fr]">
                <div className="relative flex h-full min-h-[330px] flex-col items-center rounded-2xl bg-white p-5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:p-7">
                  <p className="text-sm font-medium">
                    {t("renterDashboard.account.personal.profilePhoto.heading")}
                  </p>
                  <div className="absolute top-[46%] left-1/2 size-36 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-black/5 shadow-[0_10px_28px_rgba(0,0,0,0.16)]">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={profile.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center bg-[#292929]">
                        <span
                          aria-hidden="true"
                          className="font-bricolage text-5xl font-medium text-white/90"
                        >
                          {getInitials(profile.name)}
                        </span>
                        <span className="sr-only">
                          {t(
                            "renterDashboard.account.personal.profilePhoto.noPhotoSr",
                          )}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-col items-center gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium transition-colors hover:bg-black/[0.04]">
                      <Camera className="size-4" />
                      {avatarUrl
                        ? t("renterDashboard.account.personal.profilePhoto.changePhoto")
                        : t("renterDashboard.account.personal.profilePhoto.uploadPhoto")}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            if (avatarUrl) URL.revokeObjectURL(avatarUrl);
                            setAvatarUrl(URL.createObjectURL(file));
                            showToast(
                              t(
                                "renterDashboard.account.personal.profilePhoto.toastUpdated",
                              ),
                            );
                            event.target.value = "";
                          }
                        }}
                      />
                    </label>
                    {avatarUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(avatarUrl);
                          setAvatarUrl("");
                          showToast(
                            t(
                              "renterDashboard.account.personal.profilePhoto.toastRemoved",
                            ),
                          );
                        }}
                        className="text-xs text-black/55 transition-colors hover:text-black"
                      >
                        {t("renterDashboard.account.personal.profilePhoto.removePhoto")}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-5 rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:grid-cols-2 sm:p-7">
                  <Field
                    label={t("auth.form.fullName")}
                    value={profile.name}
                    onChange={(value) =>
                      setProfile((current) => ({ ...current, name: value }))
                    }
                  />
                  <ReadOnlyField
                    label={t("auth.form.emailAddress")}
                    value={profile.email}
                    verified
                  />
                  <ReadOnlyField
                    label={t("auth.form.phoneNumber")}
                    value={profile.phone}
                    verified
                  />
                  <SelectField
                    label={t("renterDashboard.account.personal.countryRegion")}
                    value={profile.country}
                    options={["Rwanda", "Kenya", "Nigeria"]}
                    onChange={(value) =>
                      setProfile((current) => ({ ...current, country: value }))
                    }
                  />
                  <SelectField
                    label={t("renterDashboard.account.personal.preferredLanguage")}
                    value={profile.language}
                    options={["English", "French", "Kinyarwanda"]}
                    onChange={(value) =>
                      setProfile((current) => ({ ...current, language: value }))
                    }
                  />
                </div>
              </div>
            </Accordion>

            <Accordion
              id="security"
              title={t(SECTION_TAB_KEYS.security)}
              open={openSection === "security"}
              toggle={toggleSection}
            >
              <SecurityDisclosure
                title={t("renterDashboard.account.security.updateContact.title")}
                defaultOpen
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      className="text-sm font-medium"
                      htmlFor="account-email"
                    >
                      {t("auth.form.emailAddress")}
                    </label>
                    <div className="mt-2 flex h-11 items-center rounded-xl bg-black/[0.035] pr-1.5">
                      <input
                        id="account-email"
                        type="email"
                        value={emailDraft}
                        placeholder={t(
                          "renterDashboard.account.security.updateContact.emailPlaceholder",
                        )}
                        onChange={(event) => {
                          setEmailDraft(event.target.value);
                          setEmailOtp("");
                          setEmailVerificationRequested(false);
                          setEmailOtpVerified(false);
                        }}
                        className="contact-field-control h-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-4 text-sm font-normal shadow-none ring-0 outline-none"
                      />
                      {emailChanged && emailDraft.trim() ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEmailVerificationRequested(true);
                            setEmailOtpVerified(false);
                            showToast(
                              t(
                                "renterDashboard.account.security.updateContact.verificationSentToast",
                                { destination: emailDraft },
                              ),
                            );
                          }}
                          disabled={emailOtpVerified}
                          className="h-8 shrink-0 rounded-full bg-black px-4 text-xs font-medium text-white"
                        >
                          {emailOtpVerified
                            ? t("renterDashboard.account.verified")
                            : t("renterDashboard.account.verify")}
                        </button>
                      ) : null}
                    </div>
                    {emailVerificationRequested &&
                    emailChanged &&
                    !emailOtpVerified ? (
                      <OtpBoxes
                        label={t(
                          "renterDashboard.account.security.updateContact.otpLabel",
                          { destination: emailDraft.trim() },
                        )}
                        value={emailOtp}
                        onChange={(code) => {
                          setEmailOtp(code);
                          if (/^\d{6}$/.test(code)) {
                            setEmailOtpVerified(true);
                            showToast(
                              t(
                                "renterDashboard.account.security.updateContact.emailVerifiedToast",
                              ),
                            );
                          }
                        }}
                      />
                    ) : null}
                  </div>
                  <div>
                    <label
                      className="text-sm font-medium"
                      htmlFor="account-phone"
                    >
                      {t("auth.form.phoneNumber")}
                    </label>
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="min-w-0 flex-1">
                        <InternationalPhoneInput
                          id="account-phone"
                          dialCode={countryCode}
                          nationalNumber={phoneDraft}
                          onDialCodeChange={(dialCode) => {
                            setCountryCode(dialCode);
                            setPhoneOtp("");
                            setPhoneVerificationRequested(false);
                            setPhoneOtpVerified(false);
                          }}
                          onNationalNumberChange={(value) => {
                            setPhoneDraft(value);
                            setPhoneOtp("");
                            setPhoneVerificationRequested(false);
                            setPhoneOtpVerified(false);
                          }}
                        />
                      </div>
                      {phoneChanged && phoneDraft.trim() ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneVerificationRequested(true);
                            setPhoneOtpVerified(false);
                            showToast(
                              t(
                                "renterDashboard.account.security.updateContact.verificationSentToast",
                                { destination: fullPhoneDraft },
                              ),
                            );
                          }}
                          disabled={phoneOtpVerified}
                          className="h-8 shrink-0 rounded-full bg-black px-4 text-xs font-medium text-white"
                        >
                          {phoneOtpVerified
                            ? t("renterDashboard.account.verified")
                            : t("renterDashboard.account.verify")}
                        </button>
                      ) : null}
                    </div>
                    {phoneVerificationRequested &&
                    phoneChanged &&
                    !phoneOtpVerified ? (
                      <OtpBoxes
                        label={t(
                          "renterDashboard.account.security.updateContact.otpLabel",
                          { destination: fullPhoneDraft },
                        )}
                        value={phoneOtp}
                        onChange={(code) => {
                          setPhoneOtp(code);
                          if (/^\d{6}$/.test(code)) {
                            setPhoneOtpVerified(true);
                            showToast(
                              t(
                                "renterDashboard.account.security.updateContact.phoneVerifiedToast",
                              ),
                            );
                          }
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </SecurityDisclosure>
              <SecurityDisclosure
                title={t("renterDashboard.account.security.changePassword.title")}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-carbon-500 text-xs">
                    {t("renterDashboard.account.security.changePassword.lastChanged", {
                      date: "2 June 2026",
                    })}
                  </span>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-3">
                  <Field
                    label={t(
                      "renterDashboard.account.security.changePassword.currentPasswordLabel",
                    )}
                    value={passwordDraft.current}
                    type="password"
                    placeholder={t(
                      "renterDashboard.account.security.changePassword.currentPasswordPlaceholder",
                    )}
                    onChange={(value) =>
                      setPasswordDraft((current) => ({
                        ...current,
                        current: value,
                      }))
                    }
                  />
                  <Field
                    label={t(
                      "renterDashboard.account.security.changePassword.newPasswordLabel",
                    )}
                    value={passwordDraft.next}
                    type="password"
                    placeholder={t(
                      "renterDashboard.account.security.changePassword.newPasswordPlaceholder",
                    )}
                    onChange={(value) =>
                      setPasswordDraft((current) => ({
                        ...current,
                        next: value,
                      }))
                    }
                  />
                  <Field
                    label={t(
                      "renterDashboard.account.security.changePassword.confirmNewPasswordLabel",
                    )}
                    value={passwordDraft.confirm}
                    type="password"
                    placeholder={t(
                      "renterDashboard.account.security.changePassword.confirmNewPasswordPlaceholder",
                    )}
                    onChange={(value) =>
                      setPasswordDraft((current) => ({
                        ...current,
                        confirm: value,
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  disabled={!passwordDirty || !passwordComplete}
                  onClick={() => {
                    setPasswordDraft({ current: "", next: "", confirm: "" });
                    showToast(
                      t("renterDashboard.account.security.changePassword.toastUpdated"),
                    );
                  }}
                  className="mt-5 h-10 rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {t("renterDashboard.account.security.changePassword.updateButton")}
                </button>
              </SecurityDisclosure>

              <SecurityDisclosure
                title={t("renterDashboard.account.security.devices.title")}
                forceOpen={forceOpenDevices}
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-carbon-500 mt-1 text-sm">
                      {t("renterDashboard.account.security.devices.subtitle")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal("sessions")}
                    className="h-10 rounded-full border border-black/15 px-5 text-sm font-medium transition-colors hover:bg-black/[0.04]"
                  >
                    {t("renterDashboard.account.security.devices.logOutOthers")}
                  </button>
                </div>
                <div className="mt-5">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="mx-5 grid gap-2 border-t border-black/10 px-3 py-4 text-sm last:border-b sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
                    >
                      <strong className="font-medium">{device.device}</strong>
                      <span className="text-carbon-500">{device.date}</span>
                      <span>{device.location}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDevices((current) =>
                            current.filter((item) => item.id !== device.id),
                          );
                          showToast(
                            t(
                              "renterDashboard.account.security.devices.toastLoggedOut",
                              { device: device.device },
                            ),
                          );
                        }}
                        className="justify-self-start text-xs font-medium text-black/55 transition-colors hover:text-black sm:justify-self-end"
                      >
                        {t("renterDashboard.account.security.devices.logOut")}
                      </button>
                    </div>
                  ))}
                </div>
              </SecurityDisclosure>

              <SecurityDisclosure
                title={t("renterDashboard.account.security.accountData.title")}
              >
                <h3 className="font-bricolage text-lg font-medium">
                  {t("renterDashboard.account.security.accountData.deleteAccountHeading")}
                </h3>
                <p className="text-carbon-500 mt-2 max-w-2xl text-sm leading-6">
                  {t(
                    "renterDashboard.account.security.accountData.deleteAccountDescription",
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setModal("delete-account")}
                  className="mt-5 h-10 rounded-full border border-black/25 px-5 text-sm font-medium transition-colors hover:bg-black hover:text-white"
                >
                  {t("renterDashboard.account.security.accountData.deleteAccountButton")}
                </button>
              </SecurityDisclosure>
            </Accordion>

            <Accordion
              id="methods"
              title={t(SECTION_TAB_KEYS.methods)}
              open={openSection === "methods"}
              toggle={toggleSection}
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="font-bricolage text-xl font-medium">
                    {t("renterDashboard.account.methods.heading")}
                  </h3>
                  <p className="text-carbon-500 mt-1 text-sm">
                    {t("renterDashboard.account.methods.subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewMethodKind(null);
                    setModal("add-method");
                  }}
                  className="h-10 rounded-full bg-black px-5 text-sm font-medium text-white"
                >
                  {t("renterDashboard.account.methods.addButton")}
                </button>
              </div>
              <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
                {methods.map((method) => (
                  <MethodRow
                    key={method.id}
                    method={method}
                    setDefault={() => {
                      setMethods((current) =>
                        current.map((item) => ({
                          ...item,
                          isDefault: item.id === method.id,
                        })),
                      );
                      showToast(
                        t("renterDashboard.account.methods.toastSetDefault", {
                          name: method.name,
                        }),
                      );
                    }}
                    remove={() => {
                      if (methods.length === 1) {
                        showToast(
                          t(
                            "renterDashboard.account.methods.toastAddBeforeRemoving",
                          ),
                        );
                        return;
                      }
                      setMethodToRemove(method);
                      setModal("remove-method");
                    }}
                    edit={() => {
                      setMethodToEdit(method);
                      setModal("edit-method");
                    }}
                  />
                ))}
              </div>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  <strong>{t("renterDashboard.account.methods.info.label")}</strong>{" "}
                  {t("renterDashboard.account.methods.info.description")}
                </p>
                <p className="text-carbon-500">
                  {t("renterDashboard.account.methods.info.note")}
                </p>
              </div>
            </Accordion>

            <Accordion
              id="preferences"
              title={t(SECTION_TAB_KEYS.preferences)}
              open={openSection === "preferences"}
              toggle={toggleSection}
            >
              <div className="hidden grid-cols-[1fr_repeat(4,82px)] items-center gap-3 border-b border-black/10 pb-3 text-xs font-medium text-black/45 sm:grid">
                <span>{t("renterDashboard.account.preferences.columnNotification")}</span>
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <span key={channel} className="text-center">
                    {t(CHANNEL_LABEL_KEYS[channel])}
                  </span>
                ))}
              </div>
              {PREFERENCE_GROUPS.map((group) => (
                <PreferenceGroup
                  key={group.titleKey}
                  titleKey={group.titleKey}
                  items={group.items}
                  values={preferences}
                  toggle={(key) => {
                    setPreferences((current) => ({
                      ...current,
                      [key]: !current[key],
                    }));
                    setPreferencesDirty(true);
                  }}
                />
              ))}
              <PreferenceGroup
                titleKey="renterDashboard.account.preferences.groups.messagePreferences.title"
                items={MESSAGE_PREFERENCE_ITEMS}
                values={preferences}
                toggle={(key) => {
                  setPreferences((current) => ({
                    ...current,
                    [key]: !current[key],
                  }));
                  setPreferencesDirty(true);
                }}
              />
              <PreferenceGroup
                titleKey="renterDashboard.account.preferences.groups.hauxhuntUpdates.title"
                items={HAUXHUNT_UPDATES_ITEMS}
                values={preferences}
                toggle={(key) => {
                  setPreferences((current) => ({
                    ...current,
                    [key]: !current[key],
                  }));
                  setPreferencesDirty(true);
                }}
              />
            </Accordion>

            <Accordion
              id="plan"
              title={t(SECTION_TAB_KEYS.plan)}
              open={openSection === "plan"}
              toggle={toggleSection}
            >
              <PlanToggleCard features={planFeatures} />
            </Accordion>
          </div>
        </div>
      </main>

      {toast ? (
        <div role="status" className="feedback-toast">
          {toast}
        </div>
      ) : null}
      {modal ? (
        <AccountModal
          type={modal}
          close={() => setModal(null)}
          showToast={showToast}
          newMethodKind={newMethodKind}
          setNewMethodKind={setNewMethodKind}
          addMethod={(method) => setMethods((current) => [...current, method])}
          methodToRemove={methodToRemove}
          methodToEdit={methodToEdit}
          updateMethod={(updatedMethod) =>
            setMethods((current) =>
              current.map((method) =>
                method.id === updatedMethod.id ? updatedMethod : method,
              ),
            )
          }
          removeMethod={() => {
            if (!methodToRemove) return;
            setMethods((current) =>
              current.filter((method) => method.id !== methodToRemove.id),
            );
            showToast(
              t("renterDashboard.account.methods.toastRemoved", {
                name: methodToRemove.name,
              }),
            );
            setMethodToRemove(null);
          }}
        />
      ) : null}
    </>
  );
}

function getInitials(name: string) {
  const names = name.trim().split(/\s+/).filter(Boolean);
  if (!names.length) return "?";

  return `${names[0][0]}${names.length > 1 ? names.at(-1)?.[0] : ""}`.toUpperCase();
}

function SecurityDisclosure({
  title,
  defaultOpen = false,
  forceOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || (forceOpen ?? false));

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <section className="mb-3 last:mb-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 bg-black/[0.035] px-5 py-5 text-left sm:px-6"
      >
        <span className="font-bricolage text-lg font-medium">{title}</span>
        <ChevronDown
          className={`size-5 shrink-0 text-black/55 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="px-5 pt-6 pb-7 sm:px-6">{children}</div> : null}
    </section>
  );
}

function Accordion({
  id,
  open,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  toggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <section
      className={
        id === "personal"
          ? ""
          : "rounded-2xl bg-white px-5 py-7 shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:px-7 sm:py-8"
      }
    >
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="contact-field-control h-11 w-full rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none"
      />
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
  verified,
}: {
  label: string;
  value: string;
  verified?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex h-11 items-center justify-between gap-3 rounded-xl bg-black/[0.035] px-4 text-sm">
        <span className="truncate">{value}</span>
        {verified ? (
          <span className="text-carbon-600 flex items-center gap-1.5 text-xs font-medium">
            <BadgeCheck aria-hidden="true" className="size-5" />
            {t("renterDashboard.account.verified")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border-0 bg-black/[0.035] px-4 pr-10 text-sm outline-none focus:ring-1 focus:ring-black/20"
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="text-carbon-500 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2" />
      </span>
    </label>
  );
}

function MethodRow({
  method,
  setDefault,
  remove,
  edit,
}: {
  method: PaymentMethod;
  setDefault: () => void;
  remove: () => void;
  edit: () => void;
}) {
  const { t } = useTranslation();
  const methodImage =
    method.kind === "mobile"
      ? mobileMethodImage
      : method.kind === "card"
        ? cardMethodImage
        : bankMethodImage;
  return (
    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
      <span className="flex size-11 shrink-0 items-center justify-center">
        <Image src={methodImage} alt="" className="size-8 object-contain" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{method.name}</p>
          {method.isDefault ? (
            <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-medium text-white">
              {t("renterDashboard.account.methods.defaultBadge")}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm">{method.detail}</p>
        <p className="text-carbon-500 mt-1 text-xs">{method.note}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <button onClick={edit} className="underline underline-offset-4">
          {t("renterDashboard.account.methods.edit")}
        </button>
        {!method.isDefault ? (
          <button onClick={setDefault} className="underline underline-offset-4">
            {t("renterDashboard.account.methods.setAsDefault")}
          </button>
        ) : null}
        <button onClick={remove} className="underline underline-offset-4">
          {t("renterDashboard.account.methods.remove")}
        </button>
      </div>
    </div>
  );
}

function PreferenceGroup({
  titleKey,
  items,
  values,
  toggle,
}: {
  titleKey: string;
  items: readonly PreferenceItem[];
  values: Record<string, boolean>;
  toggle: (key: string) => void;
}) {
  const { t } = useTranslation();
  const tier = useTier();

  return (
    <section className="border-b border-black/10 py-6">
      <h3 className="font-bricolage text-lg font-medium">{t(titleKey)}</h3>
      <div className="mt-4 space-y-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 sm:grid-cols-[1fr_repeat(4,82px)] sm:items-center"
          >
            <p className="text-sm">{t(item.labelKey)}</p>
            {NOTIFICATION_CHANNELS.map((channel) => {
              const key = `${item.id}-${channel}`;
              // WhatsApp is Paid-only (access-control.ts): Free renders a
              // disabled checkbox that opens the upgrade modal instead of
              // toggling, so the option is visibly present, not hidden.
              if (channel === "WhatsApp" && !isPaidTier(tier)) {
                return (
                  <div key={channel} className="flex items-center justify-center">
                    <LockedFeature
                      feature="tenant.whatsappAlerts"
                      variant="badge"
                      label={t("renterDashboard.account.preferences.whatsappAlertsLabel")}
                    />
                  </div>
                );
              }
              return (
                <label
                  key={channel}
                  className="flex items-center justify-between gap-2 text-xs sm:justify-center"
                >
                  <span className="sm:sr-only">{t(CHANNEL_LABEL_KEYS[channel])}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(values[key])}
                    onChange={() => toggle(key)}
                    className="size-5 rounded accent-black"
                  />
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function OtpBoxes({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-carbon-500 text-xs">{label}</p>
      <div
        className="flex gap-2"
        role="group"
        aria-label={label}
        onPaste={(event) => {
          const pastedCode = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);
          if (pastedCode) {
            event.preventDefault();
            onChange(pastedCode);
          }
        }}
      >
        {Array.from({ length: 6 }, (_, index) => (
          <input
            key={index}
            aria-label={t(
              "renterDashboard.account.security.updateContact.otpDigitAria",
              { label, index: index + 1 },
            )}
            inputMode="numeric"
            maxLength={1}
            value={value[index] ?? ""}
            onChange={(event) => {
              const digit = event.target.value.replace(/\D/g, "").slice(-1);
              const digits = value.padEnd(6, " ").split("");
              digits[index] = digit || " ";
              onChange(digits.join("").trimEnd());
              if (digit) {
                (
                  event.currentTarget
                    .nextElementSibling as HTMLInputElement | null
                )?.focus();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !value[index]) {
                (
                  event.currentTarget
                    .previousElementSibling as HTMLInputElement | null
                )?.focus();
              }
            }}
            className="contact-field-control h-9 w-7 border-0 border-b border-black/35 bg-transparent text-center text-base outline-none focus:border-black"
          />
        ))}
      </div>
    </div>
  );
}

function AccountModal({
  type,
  close,
  showToast,
  newMethodKind,
  setNewMethodKind,
  addMethod,
  methodToRemove,
  methodToEdit,
  updateMethod,
  removeMethod,
}: {
  type: NonNullable<Modal>;
  close: () => void;
  showToast: (message: string) => void;
  newMethodKind: MethodKind | null;
  setNewMethodKind: (kind: MethodKind | null) => void;
  addMethod: (method: PaymentMethod) => void;
  methodToRemove: PaymentMethod | null;
  methodToEdit: PaymentMethod | null;
  updateMethod: (method: PaymentMethod) => void;
  removeMethod: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    current: "",
    next: "",
    confirm: "",
    country: "Rwanda",
    provider: "MTN",
    phone: "",
    name: "",
    number: "",
    expiry: "",
    cvv: "",
    bank: "Bank of Kigali",
    accountName: "",
    accountNumber: "",
  });
  const title =
    type === "sessions"
      ? t("renterDashboard.account.modal.sessions.title")
      : type === "delete-account"
        ? t("renterDashboard.account.modal.deleteAccount.title")
        : type === "remove-method"
          ? t("renterDashboard.account.modal.removeMethod.title")
          : type === "edit-method"
            ? t("renterDashboard.account.modal.editMethod.title")
            : t("renterDashboard.account.modal.addMethod.title");
  function finish(message: string) {
    close();
    showToast(message);
  }
  function saveMethod() {
    if (!newMethodKind) return;
    const number = form.phone || form.number || form.accountNumber;
    const ending = number.replace(/\s/g, "").slice(-4) || "2741";
    const mobileCountryCode = COUNTRY_CODES[form.country] ?? "+250";
    addMethod({
      id: Date.now(),
      kind: newMethodKind,
      name:
        newMethodKind === "mobile"
          ? `${form.provider} ${t(KIND_LABEL_KEYS.mobile)}`
          : newMethodKind === "card"
            ? "Visa"
            : t(KIND_LABEL_KEYS.bank),
      detail:
        newMethodKind === "mobile"
          ? `${mobileCountryCode} ••• ••• ${ending}`
          : newMethodKind === "card"
            ? `•••• ${ending}`
            : `${form.bank} · •••• ${ending}`,
      note:
        newMethodKind === "mobile"
          ? form.country
          : newMethodKind === "card"
            ? t("renterDashboard.account.modal.generated.cardNote", {
                expiry: form.expiry || "08/28",
              })
            : t("renterDashboard.account.modal.generated.bankNote", {
                last4: ending,
              }),
      isDefault: false,
      fields: { ...form },
      phoneNumber:
        newMethodKind === "mobile"
          ? `${mobileCountryCode} ${form.phone.trim()}`
          : undefined,
    });
    finish(t("renterDashboard.account.modal.addMethod.toastAdded"));
  }
  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90svh] w-full overflow-x-hidden overflow-y-auto bg-white shadow-2xl ${type === "delete-account" || type === "remove-method" ? "max-w-xl" : "max-w-lg p-6 sm:p-8"}`}
      >
        {type === "delete-account" || type === "remove-method" ? (
          <>
            <div className="relative flex min-h-48 items-center justify-center bg-black/[0.06] p-6">
              <button
                type="button"
                onClick={close}
                aria-label={
                  type === "delete-account"
                    ? t("renterDashboard.account.modal.deleteAccount.closeAria")
                    : t("renterDashboard.account.modal.removeMethod.closeAria")
                }
                className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 transition-colors hover:border-black/40 hover:text-black"
              >
                <X className="size-5" />
              </button>
              <Image
                src={deletingIllustration}
                alt={
                  type === "delete-account"
                    ? t("renterDashboard.account.modal.deleteAccount.illustrationAlt")
                    : t("renterDashboard.account.modal.removeMethod.illustrationAlt")
                }
                className="h-40 w-auto object-contain"
              />
            </div>
            <div className="p-6 sm:p-8">
              <h2 className="font-bricolage text-2xl font-medium">{title}</h2>
              <p className="text-carbon-500 mt-4 text-sm leading-6">
                {type === "delete-account"
                  ? t("renterDashboard.account.modal.deleteAccount.description")
                  : t("renterDashboard.account.modal.removeMethod.description", {
                      name:
                        methodToRemove?.name ??
                        t("renterDashboard.account.modal.removeMethod.fallbackName"),
                      detail: methodToRemove?.detail ?? "",
                    })}
              </p>
              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (type === "delete-account") {
                      finish(t("renterDashboard.account.modal.deleteAccount.toastRequested"));
                      return;
                    }
                    removeMethod();
                    close();
                  }}
                  className="h-11 rounded-full border border-black/20 px-5 text-sm font-medium transition-colors hover:bg-black/[0.04]"
                >
                  {type === "delete-account"
                    ? t("renterDashboard.account.security.accountData.deleteAccountButton")
                    : t("renterDashboard.account.methods.remove")}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white"
                >
                  {t("renterDashboard.account.actions.cancel")}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bricolage text-2xl font-medium">{title}</h2>
              <button
                onClick={close}
                aria-label={t("common.close")}
                className="flex size-9 items-center justify-center rounded-full hover:bg-black/[0.05]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-6">
              {type === "sessions" ? (
                <Confirm
                  text={t("renterDashboard.account.modal.sessions.description")}
                  cancel={close}
                  action={t("renterDashboard.account.security.devices.logOutOthers")}
                  confirm={() =>
                    finish(t("renterDashboard.account.modal.sessions.toastLoggedOut"))
                  }
                />
              ) : type === "edit-method" && methodToEdit ? (
                <EditMethodForm
                  method={methodToEdit}
                  cancel={close}
                  save={(updatedMethod) => {
                    updateMethod(updatedMethod);
                    finish(t("renterDashboard.account.modal.editMethod.toastUpdated"));
                  }}
                />
              ) : newMethodKind ? (
                <AddMethodForm
                  kind={newMethodKind}
                  form={form}
                  setForm={setForm}
                  back={() => setNewMethodKind(null)}
                  save={saveMethod}
                />
              ) : (
                <div className="space-y-3">
                  {(
                    [
                      ["mobile", mobileMethodImage],
                      ["card", cardMethodImage],
                      ["bank", bankMethodImage],
                    ] as const
                  ).map(([kind, methodImage]) => (
                    <button
                      key={kind}
                      onClick={() => setNewMethodKind(kind)}
                      className="flex w-full items-center gap-4 rounded-xl border border-black/10 p-4 text-left transition-colors hover:bg-black/[0.035]"
                    >
                      <Image
                        src={methodImage}
                        alt=""
                        className="size-8 object-contain"
                      />
                      <span className="font-medium">{t(KIND_LABEL_KEYS[kind])}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditMethodForm({
  method,
  cancel,
  save,
}: {
  method: PaymentMethod;
  cancel: () => void;
  save: (method: PaymentMethod) => void;
}) {
  const { t } = useTranslation();
  const [fields, setFields] = useState(method.fields);
  const set = (name: string, value: string) =>
    setFields((current) => ({ ...current, [name]: value }));
  const complete =
    method.kind === "mobile"
      ? Boolean(fields.country && fields.provider && fields.phone?.trim())
      : method.kind === "card"
        ? Boolean(
            fields.name?.trim() &&
            fields.number?.trim() &&
            fields.expiry?.trim(),
          )
        : Boolean(
            fields.bank &&
            fields.accountName?.trim() &&
            fields.accountNumber?.trim(),
          );

  function saveChanges() {
    const number =
      method.kind === "mobile"
        ? fields.phone
        : method.kind === "card"
          ? fields.number
          : fields.accountNumber;
    const ending = number.replace(/\s/g, "").slice(-4);

    if (method.kind === "mobile") {
      const code = COUNTRY_CODES[fields.country] ?? "+250";
      save({
        ...method,
        name: `${fields.provider} ${t(KIND_LABEL_KEYS.mobile)}`,
        detail: `${code} ••• ••• ${ending}`,
        phoneNumber: `${code} ${fields.phone.trim()}`,
        note: fields.country,
        fields,
      });
      return;
    }

    if (method.kind === "card") {
      save({
        ...method,
        name: "Visa",
        detail: `•••• ${ending}`,
        note: t("renterDashboard.account.modal.generated.cardNote", {
          expiry: fields.expiry,
        }),
        fields,
      });
      return;
    }

    save({
      ...method,
      name: t(KIND_LABEL_KEYS.bank),
      detail: `${fields.bank} · •••• ${ending}`,
      note: t("renterDashboard.account.modal.generated.bankNote", {
        last4: ending,
      }),
      fields,
    });
  }

  return (
    <div>
      <div className="space-y-5">
        {method.kind === "mobile" ? (
          <>
            <SelectField
              label={t("auth.form.country")}
              value={fields.country}
              options={["Rwanda", "Kenya", "Nigeria"]}
              onChange={(value) => set("country", value)}
            />
            <SelectField
              label={t("renterDashboard.account.modal.fields.mobileProvider")}
              value={fields.provider}
              options={["MTN", "Airtel"]}
              onChange={(value) => set("provider", value)}
            />
            <label>
              <span className="mb-2 block text-sm font-medium">
                {t("auth.form.phoneNumber")}
              </span>
              <span className="flex h-11 items-center rounded-xl bg-black/[0.035]">
                <span className="shrink-0 border-r border-black/10 px-4 text-sm">
                  {COUNTRY_CODES[fields.country] ?? "+250"}
                </span>
                <input
                  type="tel"
                  value={fields.phone}
                  placeholder={
                    COUNTRY_PHONE_PLACEHOLDERS[fields.country] ?? "7XXXXXXXX"
                  }
                  onChange={(event) => set("phone", event.target.value)}
                  className="contact-field-control h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-sm outline-none"
                />
              </span>
            </label>
          </>
        ) : method.kind === "card" ? (
          <>
            <Field
              label={t("renterDashboard.account.modal.fields.nameOnCard")}
              value={fields.name}
              autoComplete="off"
              onChange={(value) => set("name", value)}
            />
            <Field
              label={t("renterDashboard.account.modal.fields.cardNumber")}
              value={fields.number}
              autoComplete="off"
              onChange={(value) => set("number", value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t("renterDashboard.account.modal.fields.expiryDate")}
                value={fields.expiry}
                placeholder="MM/YY"
                autoComplete="off"
                onChange={(value) => set("expiry", value)}
              />
              <Field
                label={t("renterDashboard.account.modal.fields.cvv")}
                value={fields.cvv}
                type="password"
                autoComplete="off"
                onChange={(value) => set("cvv", value)}
              />
            </div>
          </>
        ) : (
          <>
            <SelectField
              label={t("renterDashboard.account.modal.fields.bank")}
              value={fields.bank}
              options={["Bank of Kigali", "I&M Bank", "Equity Bank"]}
              onChange={(value) => set("bank", value)}
            />
            <Field
              label={t("renterDashboard.account.modal.fields.accountName")}
              value={fields.accountName}
              onChange={(value) => set("accountName", value)}
            />
            <Field
              label={t("renterDashboard.account.modal.fields.accountNumber")}
              value={fields.accountNumber}
              onChange={(value) => set("accountNumber", value)}
            />
          </>
        )}
      </div>
      <div className="mt-8 flex justify-end gap-3">
        <button
          type="button"
          onClick={cancel}
          className="h-11 rounded-full border border-black/15 px-5 text-sm"
        >
          {t("renterDashboard.account.actions.cancel")}
        </button>
        <button
          type="button"
          disabled={!complete}
          onClick={saveChanges}
          className="h-11 rounded-full bg-black px-5 text-sm text-white disabled:opacity-30"
        >
          {t("renterDashboard.account.actions.saveChanges")}
        </button>
      </div>
    </div>
  );
}

function Confirm({
  text,
  cancel,
  action,
  confirm,
}: {
  text: string;
  cancel: () => void;
  action: string;
  confirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-carbon-500 text-sm leading-6">{text}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          onClick={confirm}
          className="h-11 rounded-full bg-black px-5 text-sm text-white"
        >
          {action}
        </button>
        <button
          onClick={cancel}
          className="h-11 rounded-full border border-black/15 px-5 text-sm"
        >
          {t("renterDashboard.account.actions.cancel")}
        </button>
      </div>
    </div>
  );
}

function AddMethodForm({
  kind,
  form,
  setForm,
  back,
  save,
}: {
  kind: MethodKind;
  form: Record<string, string>;
  setForm: React.Dispatch<
    React.SetStateAction<{
      current: string;
      next: string;
      confirm: string;
      country: string;
      provider: string;
      phone: string;
      name: string;
      number: string;
      expiry: string;
      cvv: string;
      bank: string;
      accountName: string;
      accountNumber: string;
    }>
  >;
  back: () => void;
  save: () => void;
}) {
  const { t } = useTranslation();
  const set = (name: string, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  return (
    <div className="space-y-5">
      {kind === "mobile" ? (
        <>
          <SelectField
            label={t("auth.form.country")}
            value={form.country}
            options={["Rwanda", "Kenya", "Nigeria"]}
            onChange={(value) => set("country", value)}
          />
          <SelectField
            label={t("renterDashboard.account.modal.fields.mobileProvider")}
            value={form.provider}
            options={["MTN", "Airtel"]}
            onChange={(value) => set("provider", value)}
          />
          <label>
            <span className="mb-2 block text-sm font-medium">
              {t("auth.form.phoneNumber")}
            </span>
            <span className="flex h-11 items-center rounded-xl bg-black/[0.035]">
              <span className="shrink-0 border-r border-black/10 px-4 text-sm">
                {COUNTRY_CODES[form.country] ?? "+250"}
              </span>
              <input
                type="tel"
                value={form.phone}
                placeholder={
                  COUNTRY_PHONE_PLACEHOLDERS[form.country] ?? "7XXXXXXXX"
                }
                onChange={(event) => set("phone", event.target.value)}
                className="contact-field-control h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-sm outline-none"
              />
            </span>
          </label>
        </>
      ) : kind === "card" ? (
        <>
          <Field
            label={t("renterDashboard.account.modal.fields.nameOnCard")}
            value={form.name}
            autoComplete="off"
            onChange={(value) => set("name", value)}
          />
          <Field
            label={t("renterDashboard.account.modal.fields.cardNumber")}
            value={form.number}
            autoComplete="off"
            onChange={(value) => set("number", value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label={t("renterDashboard.account.modal.fields.expiryDate")}
              value={form.expiry}
              placeholder="MM/YY"
              autoComplete="off"
              onChange={(value) => set("expiry", value)}
            />
            <Field
              label={t("renterDashboard.account.modal.fields.cvv")}
              value={form.cvv}
              type="password"
              autoComplete="off"
              onChange={(value) => set("cvv", value)}
            />
          </div>
        </>
      ) : (
        <>
          <SelectField
            label={t("renterDashboard.account.modal.fields.bank")}
            value={form.bank}
            options={["Bank of Kigali", "I&M Bank", "Equity Bank"]}
            onChange={(value) => set("bank", value)}
          />
          <Field
            label={t("renterDashboard.account.modal.fields.accountName")}
            value={form.accountName}
            onChange={(value) => set("accountName", value)}
          />
          <Field
            label={t("renterDashboard.account.modal.fields.accountNumber")}
            value={form.accountNumber}
            onChange={(value) => set("accountNumber", value)}
          />
        </>
      )}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={back}
          className="h-11 rounded-full border border-black/15 px-5 text-sm"
        >
          {t("renterDashboard.account.modal.addMethod.back")}
        </button>
        <button
          onClick={save}
          className="h-11 rounded-full bg-black px-5 text-sm text-white"
        >
          {t("renterDashboard.account.modal.addMethod.addButton", {
            kind: t(KIND_LABEL_KEYS[kind]),
          })}
        </button>
      </div>
    </div>
  );
}
