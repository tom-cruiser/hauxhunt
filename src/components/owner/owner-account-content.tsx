"use client";

import { useReducer, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Bell, CheckCircle2, Lock, UserRound, X } from "lucide-react";

import ownerProfile from "@/assets/images/flatmate-billy.jpg";
import { OWNER } from "@/lib/owner-data";

// Owner Account Polish phase (Phase 6) -- mirrors the established
// server-page + "use client" content-component split already used by
// components/partner/partner-settings-content.tsx (see
// partner-dashboard/settings/page.tsx), and reuses that same SettingsCard
// visual language (icon circle, title, description, content) rather than
// inventing a new settings pattern. The old "Owner information" card
// (Display name -- a duplicate of Full name above -- and Preferred contact
// method, which belongs conceptually with Messages, not a standalone card)
// is gone; every field below maps to one of the three sections the audit
// confirmed the product actually needs: Personal Information, Login &
// Security, Notifications & Preferences. No Billing, Payment Methods,
// Payout, or Team content -- none of that is an Account concept for this
// product yet (Sections 19-23).

type PersonalInfo = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
};

const PERSONAL_INFO_KEY = "hauxhunt-owner-personal-info";
const DEFAULT_PERSONAL_INFO: PersonalInfo = {
  fullName: OWNER.name,
  email: OWNER.email,
  phone: "+250 788 000 000",
  country: "Rwanda",
};

function readPersonalInfo(): PersonalInfo {
  if (typeof window === "undefined") return DEFAULT_PERSONAL_INFO;
  try {
    const raw = window.sessionStorage.getItem(PERSONAL_INFO_KEY);
    return raw ? { ...DEFAULT_PERSONAL_INFO, ...(JSON.parse(raw) as Partial<PersonalInfo>) } : DEFAULT_PERSONAL_INFO;
  } catch {
    return DEFAULT_PERSONAL_INFO;
  }
}
function writePersonalInfo(info: PersonalInfo) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PERSONAL_INFO_KEY, JSON.stringify(info));
  } catch {
    // Storage full/unavailable -- change still applies for this render.
  }
}

// Section 15/16: category-level, not one toggle per individual event type.
// "Property & Listings" is the one addition beyond the brief's own example
// list, covering the one Owner-relevant activity type (listing/property
// state changes) the example list didn't already name.
type PrefKey = "applications" | "payments" | "maintenance" | "team" | "messages" | "property";

const PREFERENCE_CATEGORIES: { key: PrefKey; title: string; description: string }[] = [
  { key: "applications", title: "Applications", description: "Application decisions and important status updates." },
  { key: "payments", title: "Payments", description: "Payment received and overdue rent alerts." },
  { key: "maintenance", title: "Maintenance", description: "Urgent and important maintenance updates." },
  { key: "team", title: "Team", description: "Invitations, assignments, and Team changes." },
  { key: "messages", title: "Messages", description: "New conversation activity." },
  { key: "property", title: "Property & Listings", description: "Listing status and property updates." },
];

const DEFAULT_PREFS: Record<PrefKey, boolean> = {
  applications: true,
  payments: true,
  maintenance: true,
  team: true,
  messages: true,
  property: true,
};

const PREFS_KEY = "hauxhunt-owner-notification-preferences";

function readPrefs(): Record<PrefKey, boolean> {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.sessionStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Record<PrefKey, boolean>>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}
function writePrefs(prefs: Record<PrefKey, boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full/unavailable -- change still applies for this render.
  }
}

// Hydration-safe read of client-only sessionStorage, matching this
// codebase's established useDemoProfessional pattern (components/partner/
// use-demo-professional.ts): before mount, every render -- server and
// client alike -- resolves to the same default, so there is nothing to
// reconcile; the real (possibly session-edited) value only takes over once
// mounted. useReducer's dispatch is called from within our own write
// handlers below, never from inside an effect body, so a save/toggle
// re-renders this component without the synchronous-setState-in-an-effect
// pattern the rest of this file's reads would otherwise need.
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function OwnerAccountContent() {
  const mounted = useMounted();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  const personalInfo = mounted ? readPersonalInfo() : DEFAULT_PERSONAL_INFO;
  const prefs = mounted ? readPrefs() : DEFAULT_PREFS;
  const [passwordJustChanged, setPasswordJustChanged] = useState(false);

  function savePersonalInfo(next: PersonalInfo) {
    writePersonalInfo(next);
    forceUpdate();
  }

  function togglePref(key: PrefKey) {
    writePrefs({ ...prefs, [key]: !prefs[key] });
    forceUpdate();
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-[1.5rem] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4">
          <Image src={ownerProfile} alt="" className="size-16 rounded-full object-cover" />
          <div>
            <p className="font-bricolage text-lg font-medium">{personalInfo.fullName}</p>
            <p className="text-carbon-500 text-sm">{personalInfo.email}</p>
            <p className="text-carbon-400 mt-0.5 text-xs">{OWNER.role}</p>
          </div>
        </div>
      </section>

      <PersonalInformationCard info={personalInfo} onSave={savePersonalInfo} />

      <LoginSecurityCard
        email={personalInfo.email}
        passwordStatus={passwordJustChanged ? "Changed just now" : "Last changed 3 months ago"}
        onPasswordChanged={() => setPasswordJustChanged(true)}
      />

      <SettingsCard icon={Bell} title="Notifications & preferences" description="Choose which HauxHunt updates matter to you.">
        <div className="space-y-3">
          {PREFERENCE_CATEGORIES.map((category) => (
            <label key={category.key} className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{category.title}</p>
                <p className="text-carbon-500 mt-0.5 text-xs">{category.description}</p>
              </div>
              <input
                type="checkbox"
                checked={prefs[category.key]}
                onChange={() => togglePref(category.key)}
                className="size-4 shrink-0 accent-black"
                aria-label={`${category.title} notifications`}
              />
            </label>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function PersonalInformationCard({ info, onSave }: { info: PersonalInfo; onSave: (info: PersonalInfo) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(info);
  const [justSaved, setJustSaved] = useState(false);

  return (
    <SettingsCard icon={UserRound} title="Personal information" description="Your name, email, phone number, and country.">
      {editing ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <EditableField label="Full name" value={draft.fullName} onChange={(v) => setDraft((d) => ({ ...d, fullName: v }))} />
            <EditableField label="Email" type="email" value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} />
            <EditableField label="Phone number" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} placeholder="Add phone number" />
            <EditableField label="Country" value={draft.country} onChange={(v) => setDraft((d) => ({ ...d, country: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(info);
                setEditing(false);
              }}
              className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft);
                setEditing(false);
                setJustSaved(true);
                window.setTimeout(() => setJustSaved(false), 2400);
              }}
              className="font-bricolage inline-flex h-10 items-center rounded-full bg-black px-5 text-sm font-medium text-white hover:bg-black/80"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <ReadRow label="Full name" value={info.fullName} />
            <ReadRow label="Email" value={info.email} />
            <ReadRow label="Phone number" value={info.phone} emptyLabel="Add phone number" />
            <ReadRow label="Country" value={info.country} emptyLabel="Not added" />
            <ReadRow label="Account type" value={OWNER.role} />
          </dl>
          <div className="mt-5 flex items-center justify-end gap-3">
            {justSaved ? (
              <p role="status" className="feedback-toast flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Saved
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setDraft(info);
                setEditing(true);
              }}
              className="font-bricolage inline-flex h-10 items-center rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black"
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

function LoginSecurityCard({
  email,
  passwordStatus,
  onPasswordChanged,
}: {
  email: string;
  passwordStatus: string;
  onPasswordChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <SettingsCard icon={Lock} title="Login & security" description="How you sign in, and your password.">
      <div className="space-y-3">
        <div className="rounded-2xl bg-black/3.5 p-4">
          <p className="text-sm font-medium">Email</p>
          <p className="text-carbon-500 mt-0.5 text-xs">{email} · used to sign in</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-black/3.5 p-4">
          <div>
            <p className="text-sm font-medium">Password</p>
            <p className="text-carbon-500 mt-0.5 text-xs">{passwordStatus}</p>
          </div>
          <button type="button" onClick={() => setDialogOpen(true)} className="font-bricolage text-sm font-medium underline underline-offset-4">
            Change
          </button>
        </div>
      </div>
      {dialogOpen ? (
        <ChangePasswordDialog
          onClose={() => setDialogOpen(false)}
          onChanged={() => {
            onPasswordChanged();
            setDialogOpen(false);
          }}
        />
      ) : null}
    </SettingsCard>
  );
}

function ChangePasswordDialog({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword;

  return (
    <div className="fixed inset-0 z-190 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="change-password-title" className="font-bricolage text-xl font-medium">
            Change password
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-carbon-500 mt-2 text-sm leading-6">Choose a new password for your account. Use at least 8 characters.</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            onChanged();
          }}
        >
          <label className="block">
            <span className="text-carbon-900 mb-2 block text-sm font-medium">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-carbon-900 mb-2 block text-sm font-medium">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black"
            />
          </label>
          {confirmPassword && newPassword !== confirmPassword ? <p className="text-xs text-red-600">Passwords don&apos;t match.</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="font-bricolage inline-flex h-11 items-center rounded-full border border-black/15 px-5 text-sm font-medium hover:border-black">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="font-bricolage inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="mb-6 flex gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-bricolage text-carbon-900 text-lg font-medium">{title}</h2>
          <p className="text-carbon-500 mt-1 text-sm">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-carbon-900 mb-2 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="contact-field-control border-border-default h-11 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:border-black"
      />
    </label>
  );
}

// Section 45: never renders "undefined" or an empty value silently.
function ReadRow({ label, value, emptyLabel }: { label: string; value: string; emptyLabel?: string }) {
  const hasValue = value.trim().length > 0;
  return (
    <div>
      <dt className="text-carbon-400 text-xs">{label}</dt>
      <dd className={`mt-1 text-sm font-medium ${hasValue ? "" : "text-carbon-400 font-normal italic"}`}>{hasValue ? value : (emptyLabel ?? "Not added")}</dd>
    </div>
  );
}
