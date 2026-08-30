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

type SectionId = "personal" | "security" | "methods" | "preferences" | "plan";

const TENANT_PLAN_FEATURES = [
  { label: "Listing access", free: "All listings", paid: "All listings" },
  { label: "Agent/landlord messaging", free: "Up to 3 per month", paid: "Unlimited" },
  { label: "Map view & location link", free: "Locked", paid: "Included" },
  { label: "House reviews", free: "Locked", paid: "Included" },
  { label: "Priority alert on requests", free: "Locked", paid: "Included" },
  { label: "In-app maintenance requests", free: "Locked", paid: "Included" },
  { label: "Viewing fee", free: "Market rate", paid: "Capped at 5,000 RWF" },
  { label: "WhatsApp alerts", free: "Locked", paid: "Included" },
] as const;
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

const INITIAL_PROFILE = {
  name: "Julien Mugisha",
  email: "renter@gmail.com",
  phone: "+250 788 000 456",
  country: "Rwanda",
  language: "English",
};

const PREFERENCE_GROUPS = [
  {
    title: "Property Search",
    items: [
      "New matches from Saved Searches",
      "Price changes on favourite properties",
      "Property availability changes",
    ],
  },
  {
    title: "Viewings & Applications",
    items: [
      "Viewing confirmations and changes",
      "Application status updates",
      "Additional information requested",
      "Rental invitations",
    ],
  },
  {
    title: "Rental & Payments",
    items: [
      "Rent due soon",
      "Payment successful or failed",
      "Rental setup updates",
      "Maintenance updates",
    ],
  },
  {
    title: "Flatmates",
    items: [
      "New flatmate match",
      "Someone interested in your profile",
      "New flatmate message",
    ],
  },
] as const;

// WhatsApp is a Paid-only delivery channel (see access-control.ts) — its
// checkbox renders disabled with a lock for Free tenants (PreferenceGroup
// below) rather than being omitted, so the option is visible, not hidden.
const NOTIFICATION_CHANNELS = ["In-app", "Email", "SMS", "WhatsApp"] as const;

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
            `${item}-${channel}`,
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
                <h1 className="dashboard-page-title">My Account</h1>
                <p className="text-carbon-500 mt-2 text-sm">
                  Manage your profile, security, payment methods, and
                  communication preferences.
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
                  showToast("Account changes saved");
                }}
                className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Save Changes
              </button>
            </div>
            <nav
              aria-label="Account sections"
              className="mt-7 flex gap-7 overflow-x-auto"
            >
              {(
                [
                  ["personal", "Personal Information"],
                  ["security", "Login & Security"],
                  ["methods", "Payment Methods"],
                  ["preferences", "Notifications & Preferences"],
                  ["plan", "Plan & Billing"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleSection(id)}
                  aria-current={openSection === id ? "page" : undefined}
                  className={`relative flex h-12 shrink-0 items-center text-sm font-medium ${openSection === id ? "text-black" : "text-black/45"}`}
                >
                  {label}
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
              title="Personal Information"
              open={openSection === "personal"}
              toggle={toggleSection}
            >
              <div className="grid items-stretch gap-5 lg:grid-cols-[230px_1fr]">
                <div className="relative flex h-full min-h-[330px] flex-col items-center rounded-2xl bg-white p-5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:p-7">
                  <p className="text-sm font-medium">Profile Photo</p>
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
                          No profile photo selected
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-col items-center gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium transition-colors hover:bg-black/[0.04]">
                      <Camera className="size-4" />
                      {avatarUrl ? "Change Photo" : "Upload Photo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            if (avatarUrl) URL.revokeObjectURL(avatarUrl);
                            setAvatarUrl(URL.createObjectURL(file));
                            showToast("Profile photo updated");
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
                          showToast("Profile photo removed");
                        }}
                        className="text-xs text-black/55 transition-colors hover:text-black"
                      >
                        Remove Photo
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-5 rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:grid-cols-2 sm:p-7">
                  <Field
                    label="Full Name"
                    value={profile.name}
                    onChange={(value) =>
                      setProfile((current) => ({ ...current, name: value }))
                    }
                  />
                  <ReadOnlyField
                    label="Email Address"
                    value={profile.email}
                    verified
                  />
                  <ReadOnlyField
                    label="Phone Number"
                    value={profile.phone}
                    verified
                  />
                  <SelectField
                    label="Country / Region"
                    value={profile.country}
                    options={["Rwanda", "Kenya", "Nigeria"]}
                    onChange={(value) =>
                      setProfile((current) => ({ ...current, country: value }))
                    }
                  />
                  <SelectField
                    label="Preferred Language"
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
              title="Login & Security"
              open={openSection === "security"}
              toggle={toggleSection}
            >
              <SecurityDisclosure
                title="Update Email & Phone Number"
                defaultOpen
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      className="text-sm font-medium"
                      htmlFor="account-email"
                    >
                      Email Address
                    </label>
                    <div className="mt-2 flex h-11 items-center rounded-xl bg-black/[0.035] pr-1.5">
                      <input
                        id="account-email"
                        type="email"
                        value={emailDraft}
                        placeholder="Enter your email address"
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
                              `Verification code sent to ${emailDraft}`,
                            );
                          }}
                          disabled={emailOtpVerified}
                          className="h-8 shrink-0 rounded-full bg-black px-4 text-xs font-medium text-white"
                        >
                          {emailOtpVerified ? "Verified" : "Verify"}
                        </button>
                      ) : null}
                    </div>
                    {emailVerificationRequested &&
                    emailChanged &&
                    !emailOtpVerified ? (
                      <OtpBoxes
                        label={`Enter OTP sent to ${emailDraft.trim()}:`}
                        value={emailOtp}
                        onChange={(code) => {
                          setEmailOtp(code);
                          if (/^\d{6}$/.test(code)) {
                            setEmailOtpVerified(true);
                            showToast("Email address verified");
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
                      Phone Number
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
                              `Verification code sent to ${fullPhoneDraft}`,
                            );
                          }}
                          disabled={phoneOtpVerified}
                          className="h-8 shrink-0 rounded-full bg-black px-4 text-xs font-medium text-white"
                        >
                          {phoneOtpVerified ? "Verified" : "Verify"}
                        </button>
                      ) : null}
                    </div>
                    {phoneVerificationRequested &&
                    phoneChanged &&
                    !phoneOtpVerified ? (
                      <OtpBoxes
                        label={`Enter OTP sent to ${fullPhoneDraft}:`}
                        value={phoneOtp}
                        onChange={(code) => {
                          setPhoneOtp(code);
                          if (/^\d{6}$/.test(code)) {
                            setPhoneOtpVerified(true);
                            showToast("Phone number verified");
                          }
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </SecurityDisclosure>
              <SecurityDisclosure title="Change Password">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-carbon-500 text-xs">
                    Last changed 2 June 2026
                  </span>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-3">
                  <Field
                    label="Current Password"
                    value={passwordDraft.current}
                    type="password"
                    placeholder="Enter current password"
                    onChange={(value) =>
                      setPasswordDraft((current) => ({
                        ...current,
                        current: value,
                      }))
                    }
                  />
                  <Field
                    label="New Password"
                    value={passwordDraft.next}
                    type="password"
                    placeholder="At least 8 characters"
                    onChange={(value) =>
                      setPasswordDraft((current) => ({
                        ...current,
                        next: value,
                      }))
                    }
                  />
                  <Field
                    label="Confirm New Password"
                    value={passwordDraft.confirm}
                    type="password"
                    placeholder="Repeat new password"
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
                    showToast("Password updated");
                  }}
                  className="mt-5 h-10 rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Update Password
                </button>
              </SecurityDisclosure>

              <SecurityDisclosure title="Devices where you are logged in" forceOpen={forceOpenDevices}>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-carbon-500 mt-1 text-sm">
                      Your recent account activity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal("sessions")}
                    className="h-10 rounded-full border border-black/15 px-5 text-sm font-medium transition-colors hover:bg-black/[0.04]"
                  >
                    Log Out Other Sessions
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
                          showToast(`${device.device} logged out`);
                        }}
                        className="justify-self-start text-xs font-medium text-black/55 transition-colors hover:text-black sm:justify-self-end"
                      >
                        Log out
                      </button>
                    </div>
                  ))}
                </div>
              </SecurityDisclosure>

              <SecurityDisclosure title="Account Data">
                <h3 className="font-bricolage text-lg font-medium">
                  Delete Account
                </h3>
                <p className="text-carbon-500 mt-2 max-w-2xl text-sm leading-6">
                  Permanently delete your HauxHunt account, profile, and saved
                  account data. This action cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={() => setModal("delete-account")}
                  className="mt-5 h-10 rounded-full border border-black/25 px-5 text-sm font-medium transition-colors hover:bg-black hover:text-white"
                >
                  Delete Account
                </button>
              </SecurityDisclosure>
            </Accordion>

            <Accordion
              id="methods"
              title="Payment Methods"
              open={openSection === "methods"}
              toggle={toggleSection}
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="font-bricolage text-xl font-medium">
                    Payment Methods
                  </h3>
                  <p className="text-carbon-500 mt-1 text-sm">
                    Manage the payment methods you can use for rent and other
                    rental payments.
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
                  + Add Payment Method
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
                      showToast(`${method.name} is now your default`);
                    }}
                    remove={() => {
                      if (methods.length === 1) {
                        showToast(
                          "Add another payment method before removing this one",
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
                  <strong>Payment Methods:</strong> How you pay.
                </p>
                <p className="text-carbon-500">
                  Rent, transactions, and receipts remain under My Home →
                  Payments.
                </p>
              </div>
            </Accordion>

            <Accordion
              id="preferences"
              title="Notifications & Preferences"
              open={openSection === "preferences"}
              toggle={toggleSection}
            >
              <div className="hidden grid-cols-[1fr_repeat(4,82px)] items-center gap-3 border-b border-black/10 pb-3 text-xs font-medium text-black/45 sm:grid">
                <span>Notification</span>
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <span key={channel} className="text-center">
                    {channel}
                  </span>
                ))}
              </div>
              {PREFERENCE_GROUPS.map((group) => (
                <PreferenceGroup
                  key={group.title}
                  title={group.title}
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
                title="Message Preferences"
                items={[
                  "New message received",
                  "Message from a property representative",
                  "New flatmate message",
                ]}
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
                title="HauxHunt Updates"
                items={[
                  "Product updates and new features",
                  "Tips and recommendations",
                ]}
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
              title="Plan & Billing"
              open={openSection === "plan"}
              toggle={toggleSection}
            >
              <PlanToggleCard features={TENANT_PLAN_FEATURES} />
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
            showToast(`${methodToRemove.name} removed`);
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
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex h-11 items-center justify-between gap-3 rounded-xl bg-black/[0.035] px-4 text-sm">
        <span className="truncate">{value}</span>
        {verified ? (
          <span className="text-carbon-600 flex items-center gap-1.5 text-xs font-medium">
            <BadgeCheck aria-hidden="true" className="size-5" />
            Verified
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
              Default
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm">{method.detail}</p>
        <p className="text-carbon-500 mt-1 text-xs">{method.note}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <button onClick={edit} className="underline underline-offset-4">
          Edit
        </button>
        {!method.isDefault ? (
          <button onClick={setDefault} className="underline underline-offset-4">
            Set as Default
          </button>
        ) : null}
        <button onClick={remove} className="underline underline-offset-4">
          Remove
        </button>
      </div>
    </div>
  );
}

function PreferenceGroup({
  title,
  items,
  values,
  toggle,
}: {
  title: string;
  items: readonly string[];
  values: Record<string, boolean>;
  toggle: (key: string) => void;
}) {
  const tier = useTier();

  return (
    <section className="border-b border-black/10 py-6">
      <h3 className="font-bricolage text-lg font-medium">{title}</h3>
      <div className="mt-4 space-y-5">
        {items.map((item) => (
          <div
            key={item}
            className="grid gap-3 sm:grid-cols-[1fr_repeat(4,82px)] sm:items-center"
          >
            <p className="text-sm">{item}</p>
            {NOTIFICATION_CHANNELS.map((channel) => {
              const key = `${item}-${channel}`;
              // WhatsApp is Paid-only (access-control.ts): Free renders a
              // disabled checkbox that opens the upgrade modal instead of
              // toggling, so the option is visibly present, not hidden.
              if (channel === "WhatsApp" && !isPaidTier(tier)) {
                return (
                  <div key={channel} className="flex items-center justify-center">
                    <LockedFeature
                      feature="tenant.whatsappAlerts"
                      variant="badge"
                      label="WhatsApp alerts"
                    />
                  </div>
                );
              }
              return (
                <label
                  key={channel}
                  className="flex items-center justify-between gap-2 text-xs sm:justify-center"
                >
                  <span className="sm:sr-only">{channel}</span>
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
            aria-label={`${label}, digit ${index + 1}`}
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
      ? "Log out of all other devices?"
      : type === "delete-account"
        ? "Delete Account?"
        : type === "remove-method"
          ? "Remove payment method?"
          : type === "edit-method"
            ? "Edit Payment Method"
            : "Add Payment Method";
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
          ? `${form.provider} Mobile Money`
          : newMethodKind === "card"
            ? "Visa"
            : "Bank Account",
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
            ? `Expires ${form.expiry || "08/28"}`
            : `Account ending in ${ending}`,
      isDefault: false,
      fields: { ...form },
      phoneNumber:
        newMethodKind === "mobile"
          ? `${mobileCountryCode} ${form.phone.trim()}`
          : undefined,
    });
    finish("Payment method added");
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
                    ? "Close delete account dialog"
                    : "Close remove payment method dialog"
                }
                className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-black/20 text-black/55 transition-colors hover:border-black/40 hover:text-black"
              >
                <X className="size-5" />
              </button>
              <Image
                src={deletingIllustration}
                alt={
                  type === "delete-account"
                    ? "Delete account illustration"
                    : "Remove payment method illustration"
                }
                className="h-40 w-auto object-contain"
              />
            </div>
            <div className="p-6 sm:p-8">
              <h2 className="font-bricolage text-2xl font-medium">
                {type === "delete-account"
                  ? "Delete Account?"
                  : "Remove payment method?"}
              </h2>
              <p className="text-carbon-500 mt-4 text-sm leading-6">
                {type === "delete-account"
                  ? "Your HauxHunt account, profile, and saved account data will be permanently deleted. This cannot be undone."
                  : `${methodToRemove?.name ?? "This method"} ${methodToRemove?.detail ?? ""} will no longer be available for rental payments.`}
              </p>
              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (type === "delete-account") {
                      finish("Account deletion requested");
                      return;
                    }
                    removeMethod();
                    close();
                  }}
                  className="h-11 rounded-full border border-black/20 px-5 text-sm font-medium transition-colors hover:bg-black/[0.04]"
                >
                  {type === "delete-account" ? "Delete Account" : "Remove"}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white"
                >
                  Cancel
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
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-full hover:bg-black/[0.05]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-6">
              {type === "sessions" ? (
                <Confirm
                  text="You'll remain signed in on this device."
                  cancel={close}
                  action="Log Out Other Sessions"
                  confirm={() => finish("Other sessions logged out")}
                />
              ) : type === "edit-method" && methodToEdit ? (
                <EditMethodForm
                  method={methodToEdit}
                  cancel={close}
                  save={(updatedMethod) => {
                    updateMethod(updatedMethod);
                    finish("Payment method updated");
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
                      ["mobile", "Mobile Money", mobileMethodImage],
                      ["card", "Card", cardMethodImage],
                      ["bank", "Bank Account", bankMethodImage],
                    ] as const
                  ).map(([kind, label, methodImage]) => (
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
                      <span className="font-medium">{label}</span>
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
        name: `${fields.provider} Mobile Money`,
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
        note: `Expires ${fields.expiry}`,
        fields,
      });
      return;
    }

    save({
      ...method,
      name: "Bank Account",
      detail: `${fields.bank} · •••• ${ending}`,
      note: `Account ending in ${ending}`,
      fields,
    });
  }

  return (
    <div>
      <div className="space-y-5">
        {method.kind === "mobile" ? (
          <>
            <SelectField
              label="Country"
              value={fields.country}
              options={["Rwanda", "Kenya", "Nigeria"]}
              onChange={(value) => set("country", value)}
            />
            <SelectField
              label="Mobile network / provider"
              value={fields.provider}
              options={["MTN", "Airtel"]}
              onChange={(value) => set("provider", value)}
            />
            <label>
              <span className="mb-2 block text-sm font-medium">
                Phone Number
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
              label="Name on Card"
              value={fields.name}
              autoComplete="off"
              onChange={(value) => set("name", value)}
            />
            <Field
              label="Card Number"
              value={fields.number}
              autoComplete="off"
              onChange={(value) => set("number", value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Expiry Date"
                value={fields.expiry}
                placeholder="MM/YY"
                autoComplete="off"
                onChange={(value) => set("expiry", value)}
              />
              <Field
                label="CVV"
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
              label="Bank"
              value={fields.bank}
              options={["Bank of Kigali", "I&M Bank", "Equity Bank"]}
              onChange={(value) => set("bank", value)}
            />
            <Field
              label="Account Name"
              value={fields.accountName}
              onChange={(value) => set("accountName", value)}
            />
            <Field
              label="Account Number"
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
          Cancel
        </button>
        <button
          type="button"
          disabled={!complete}
          onClick={saveChanges}
          className="h-11 rounded-full bg-black px-5 text-sm text-white disabled:opacity-30"
        >
          Save Changes
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
          Cancel
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
  const set = (name: string, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  return (
    <div className="space-y-5">
      {kind === "mobile" ? (
        <>
          <SelectField
            label="Country"
            value={form.country}
            options={["Rwanda", "Kenya", "Nigeria"]}
            onChange={(value) => set("country", value)}
          />
          <SelectField
            label="Mobile network / provider"
            value={form.provider}
            options={["MTN", "Airtel"]}
            onChange={(value) => set("provider", value)}
          />
          <label>
            <span className="mb-2 block text-sm font-medium">Phone Number</span>
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
            label="Name on Card"
            value={form.name}
            autoComplete="off"
            onChange={(value) => set("name", value)}
          />
          <Field
            label="Card Number"
            value={form.number}
            autoComplete="off"
            onChange={(value) => set("number", value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Expiry Date"
              value={form.expiry}
              placeholder="MM/YY"
              autoComplete="off"
              onChange={(value) => set("expiry", value)}
            />
            <Field
              label="CVV"
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
            label="Bank"
            value={form.bank}
            options={["Bank of Kigali", "I&M Bank", "Equity Bank"]}
            onChange={(value) => set("bank", value)}
          />
          <Field
            label="Account Name"
            value={form.accountName}
            onChange={(value) => set("accountName", value)}
          />
          <Field
            label="Account Number"
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
          Back
        </button>
        <button
          onClick={save}
          className="h-11 rounded-full bg-black px-5 text-sm text-white"
        >
          Add{" "}
          {kind === "mobile"
            ? "Mobile Money"
            : kind === "card"
              ? "Card"
              : "Bank Account"}
        </button>
      </div>
    </div>
  );
}
