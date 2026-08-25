"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Paperclip, Star, X } from "lucide-react";
import chatImage from "@/assets/images/chat.png";
import thankyouImage from "@/assets/images/thankyou.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { Navbar } from "@/components/layout/navbar";
import { OWNER } from "@/lib/owner-data";

const TOPICS = [
  "Search & Listings",
  "Applications",
  "Payments",
  "Maintenance",
  "Flatmates",
  "Messages",
  "Account & Settings",
  "Other",
];

const USER_TYPES = ["Renter", "Property Manager", "Property Owner", "Agent", "Other"];

const STAR_LABELS = ["Terrible", "Poor", "Okay", "Good", "Excellent"];

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 100;
const ALLOWED_TYPES = ["Word", "Excel", "PPT", "PDF", "Image", "Video", "Audio"];

type UploadedFile = { name: string; size: number; url: string };

export default function FeedbackPage() {
  const [role, setRole] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicOther, setTopicOther] = useState("");
  const [userType, setUserType] = useState("Renter");
  const [userTypeOther, setUserTypeOther] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Owner Account Polish phase -- this page previously assumed every
  // authenticated session was a Renter (hardcoding "Julien Mugisha" /
  // renter@gmail.com regardless of who was actually signed in), so an
  // Owner opening Send Feedback from their own profile menu would have
  // seen the wrong name, email, and "Which best describes you?" selection.
  // Reads the same session role every dashboard shell already sets.
  useEffect(() => {
    const authRole = window.sessionStorage.getItem("hauxhunt-authenticated-role");
    setRole(authRole);
    if (authRole === "owner") {
      setEmail(OWNER.email);
      setName(OWNER.name);
      setUserType("Property Owner");
    } else if (authRole === "agent") {
      setUserType("Agent");
    } else if (authRole === "property_manager") {
      setUserType("Property Manager");
    } else if (authRole === "renter") {
      setEmail("renter@gmail.com");
      setName("Julien Mugisha");
      setUserType("Renter");
    }
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [message]);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setFileError("");
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_FILES) {
        setFileError(`Maximum ${MAX_FILES} files allowed.`);
        break;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setFileError(`"${file.name}" exceeds the 100 MB limit.`);
        continue;
      }
      next.push({ name: file.name, size: file.size, url: URL.createObjectURL(file) });
    }
    setFiles(next);
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function toggleTopic(topic: string) {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  }

  const canSubmit =
    rating > 0 &&
    message.trim().length >= 10 &&
    topics.length > 0 &&
    name.trim() &&
    email.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitted(true);
  }

  const TopBar = role === "renter" ? RenterCatalogueTopBar : Navbar;

  if (submitted) {
    return (
      <>
        <TopBar />
        <main className="bg-carbon-50 flex min-h-svh flex-col items-center justify-center px-5 pt-16 text-black">
          <div className="flex w-full max-w-md flex-col items-center text-center">
            <Image src={thankyouImage} alt="" className="h-40 w-auto object-contain" />
            <h1 className="font-bricolage mt-6 text-3xl font-medium tracking-[-0.03em]">
              Thanks for your feedback!
            </h1>
            <p className="text-carbon-500 mt-3 text-sm leading-6">
              We read every submission and use it to make HauxHunt better. We'll
              reach out to {email} if we need more details.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setRating(0);
                setMessage("");
                setFiles([]);
                setTopics([]);
                setTopicOther("");
                setUserTypeOther("");
              }}
              className="mt-8 h-11 rounded-full border border-black/20 px-6 text-sm font-medium transition-colors hover:bg-black hover:text-white"
            >
              Send more feedback
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        {/* Hero */}
        <section className="bg-white px-5 pb-10 pt-10 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <Image src={chatImage} alt="" className="h-28 w-auto shrink-0 object-contain" />
            <div>
              <h1 className="font-bricolage text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
                Send Feedback
              </h1>
              <p className="text-carbon-500 mt-3 max-w-xl text-sm leading-6">
                Tell us what's working, what's broken, or what you'd love to see.
                Every message goes directly to the HauxHunt product team.
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="px-5 py-10 sm:px-6 lg:px-11 xl:px-[52px]">
          <form
            onSubmit={handleSubmit}
            className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-[1fr_340px]"
          >
            {/* Left — main form */}
            <div className="space-y-8 rounded-2xl bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:p-8">

              {/* 1. Star rating */}
              <fieldset>
                <legend className="mb-4 text-sm font-medium">
                  Please rate your experience today
                </legend>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        aria-label={STAR_LABELS[star - 1]}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`size-9 transition-colors ${active ? "fill-black text-black" : "fill-transparent text-black/20"}`}
                        />
                      </button>
                    );
                  })}
                  {(hoverRating || rating) > 0 && (
                    <span className="ml-2 text-sm text-black/50">
                      {STAR_LABELS[(hoverRating || rating) - 1]}
                    </span>
                  )}
                </div>
              </fieldset>

              {/* 2. Experience message */}
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Tell us about your experience. What did you like? What can we do better?
                </span>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your experience, the issue you encountered, or the feature you'd like to see…"
                  rows={5}
                  className="w-full resize-none overflow-hidden rounded-xl border-0 bg-black/[0.035] px-4 py-3 text-sm leading-6 outline-none focus:ring-1 focus:ring-black/20 placeholder:text-black/35"
                />
                <span className="mt-1 block text-right text-xs text-black/35">
                  {message.trim().length} chars {message.trim().length < 10 && "· 10 min"}
                </span>
              </label>

              {/* 3. File upload */}
              <fieldset>
                <legend className="mb-1 text-sm font-medium">
                  Want to share any reference screenshot(s)? Upload here
                </legend>
                <div className="mb-3 flex flex-wrap gap-2">
                  {[
                    `File limit: ${MAX_FILES}`,
                    `Max size: ${MAX_FILE_SIZE_MB} MB`,
                    `Types: ${ALLOWED_TYPES.join(", ")}`,
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-black/10 bg-black/[0.035] px-3 py-1 text-xs text-black/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${isDragging ? "border-black bg-black/[0.04]" : "border-black/15 bg-black/[0.02] hover:border-black/30"}`}
                >
                  <Paperclip className="size-5 text-black/30" />
                  <p className="text-sm text-black/45">
                    Drop files or <span className="font-medium text-black underline underline-offset-2">click here to upload</span>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    className="sr-only"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>
                {fileError && (
                  <p className="mt-2 text-xs text-red-500">{fileError}</p>
                )}
                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((file, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-black/[0.035] px-4 py-2.5 text-sm">
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-black/40">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          aria-label={`Remove ${file.name}`}
                          className="shrink-0 text-black/40 hover:text-black"
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              {/* 4. Topics (multi-select) */}
              <fieldset>
                <legend className="mb-3 text-sm font-medium">
                  Which topic(s) is your feedback about?
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {TOPICS.map((topic) => {
                    const checked = topics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${checked ? "border-black bg-black text-white" : "border-black/12 bg-black/[0.02] hover:border-black/25"}`}
                      >
                        {topic}
                        <span className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${checked ? "border-white/60 bg-white" : "border-black/25 bg-transparent"}`}>
                          {checked && (
                            <svg viewBox="0 0 10 8" className="size-3" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                  {topics.includes("Other") && (
                    <input
                      type="text"
                      value={topicOther}
                      onChange={(e) => setTopicOther(e.target.value)}
                      placeholder="Please specify…"
                      className="mt-1 h-11 w-full rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none focus:ring-1 focus:ring-black/20"
                    />
                  )}
                </div>
              </fieldset>

              {/* 5. Which best describes you */}
              <fieldset>
                <legend className="mb-3 text-sm font-medium">
                  Which best describes you?
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {USER_TYPES.map((type) => {
                    const selected = userType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setUserType(type)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${selected ? "border-black bg-black text-white" : "border-black/12 bg-black/[0.02] hover:border-black/25"}`}
                      >
                        {type}
                        <span className={`flex size-5 items-center justify-center rounded-full border transition-colors ${selected ? "border-white" : "border-black/25"}`}>
                          {selected && <span className="size-2.5 rounded-full bg-white" />}
                        </span>
                      </button>
                    );
                  })}
                  {userType === "Other" && (
                    <input
                      type="text"
                      value={userTypeOther}
                      onChange={(e) => setUserTypeOther(e.target.value)}
                      placeholder="Please describe…"
                      className="mt-1 h-11 w-full rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none focus:ring-1 focus:ring-black/20"
                    />
                  )}
                </div>
              </fieldset>

              {/* 6. Contact info */}
              <fieldset>
                <legend className="mb-4 text-sm font-medium">
                  May we contact you for more information about your experience?
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-black/60">Name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="h-11 w-full rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none focus:ring-1 focus:ring-black/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm text-black/60">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-11 w-full rounded-xl border-0 bg-black/[0.035] px-4 text-sm outline-none focus:ring-1 focus:ring-black/20"
                    />
                  </label>
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={!canSubmit}
                className="h-11 w-full rounded-full bg-black text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto sm:px-10"
              >
                Submit Feedback
              </button>
            </div>

            {/* Right sidebar */}
            <aside className="space-y-4">
              <div className="rounded-2xl bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.035)]">
                <h2 className="font-bricolage text-lg font-medium">
                  Tips for great feedback
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-black/60">
                  {[
                    "Be specific — mention the page or feature you were using.",
                    "Include steps to reproduce a bug if you can.",
                    "Let us know what you expected vs. what happened.",
                    "Feature requests are welcome — describe the problem you're solving.",
                  ].map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-black/30" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-black p-6 text-white">
                <h2 className="font-bricolage text-lg font-medium">
                  Need help instead?
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  For account issues, billing questions, or urgent support,
                  visit the Help Center.
                </p>
                <a
                  href="/renter-dashboard/help"
                  className="mt-4 inline-flex h-10 items-center rounded-full border border-white/20 px-5 text-sm font-medium transition-colors hover:bg-white/10"
                >
                  Go to Help Center
                </a>
              </div>
            </aside>
          </form>
        </section>
      </main>
    </>
  );
}
