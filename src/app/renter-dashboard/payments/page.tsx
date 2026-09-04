"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CircleAlert,
  Download,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import emptyIllustration from "@/assets/images/empty.png";
import blackHauxHuntLogo from "@/assets/images/HauxHunt_black_with_company_name.png";
import bankMethodImage from "@/assets/images/bank.png";
import cardMethodImage from "@/assets/images/card.png";
import mobileMethodImage from "@/assets/images/mobile.png";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";
import { useTranslation } from "@/components/language/use-translation";
import { getOwnerPayments, updateOwnerPayment } from "@/lib/owner-data";
import { REGISTERED_PROFESSIONALS } from "@/lib/team-data";
import { pushProfessionalNotification } from "@/lib/professional-work";
import { pushOwnerNotification } from "@/lib/owner-notifications";

// Cross-Role Lifecycle Synchronization phase -- Section 20-24/54: this page
// is otherwise untouched (a large, self-contained mock payment-state
// machine -- Section 47/48 caution against a broader rebuild here). One
// targeted connection: paying a property that has a real, matching
// OwnerPayment record also marks that SAME record Paid, so PM/Owner see it
// -- covering the manual test's Kacyiru/Remera scenarios without touching
// visual design or the rest of the flow.
const PROPERTY_TO_ID: Record<string, string> = {
  "Kacyiru Residence": "kacyiru-2br",
  "Nyarutarama Garden Apartment": "nyarutarama-2br",
  "Remera Family House": "remera-3br",
};

function markSharedPaymentPaid(propertyName: string) {
  const propertyId = PROPERTY_TO_ID[propertyName];
  if (!propertyId) return;
  const due = getOwnerPayments().find(
    (p) =>
      p.propertyId === propertyId &&
      (p.status === "Due" || p.status === "Overdue" || p.status === "Pending"),
  );
  if (!due) return;
  updateOwnerPayment(due.id, { status: "Paid", date: "Just now" });

  // Section 45: "Renter pays -> PM: Payment received -> Owner: Payment received."
  const manager = due.managedBy
    ? REGISTERED_PROFESSIONALS.find((p) => p.name === due.managedBy)
    : undefined;
  if (manager) {
    pushProfessionalNotification({
      professionalId: manager.id,
      category: "payment",
      title: "Payment received",
      body: `${due.renter} paid ${due.purpose} for ${propertyName}.`,
      actionLabel: "View Payment",
      actionHref: `/partner-dashboard/payments?propertyId=${encodeURIComponent(propertyId)}`,
    });
  }
  pushOwnerNotification({
    category: "payment",
    title: "Payment received",
    body: `${due.renter} paid ${due.purpose} for ${propertyName}.`,
    actionLabel: "View Payments",
    actionHref: "/owner-dashboard/payments",
  });
}

type PageState = "active" | "due" | "overdue";
type PaymentAccess = "disabled" | "invited" | "enabled";
type PaymentMethod = "Mobile Money" | "Card" | "Bank Transfer";
type Modal =
  | "setup"
  | "setup-success"
  | "details"
  | "pay"
  | "success"
  | "processing"
  | "failed"
  | "receipt"
  | "methods"
  | null;
type HistoryFilter = "All" | "Rent" | "Deposits";
type PayablePayment = {
  purpose: string;
  property: string;
  amount: string;
  due: string;
  manager: string;
};

const rental = {
  id: "HH-RENT-104",
  propertyId: "kacyiru-2br",
  title: "Kacyiru Residence",
  manager: "Jean Mugisha",
  rent: "RWF 850,000",
  due: "1 September 2026",
};

const upcomingPayments = [
  {
    title: "September Rent",
    property: "Kacyiru Residence",
    amount: "RWF 850,000",
    due: "1 September 2026",
    manager: "Jean Mugisha",
  },
  {
    title: "September Rent",
    property: "Nyarutarama Garden Apartment",
    amount: "RWF 920,000",
    due: "5 September 2026",
    manager: "Aline Uwase",
  },
];

const upcomingTotal = "RWF 1,770,000";
const hasPaymentDueToday = true;
const linkedRentalPayments: Record<string, PayablePayment> = {
  "HH-RENT-104": {
    purpose: "September Rent",
    property: "Kacyiru Residence",
    amount: "RWF 850,000",
    due: "1 September 2026",
    manager: "Jean Mugisha",
  },
  "HH-RENT-112": {
    purpose: "September Rent",
    property: "Nyarutarama Garden Apartment",
    amount: "RWF 920,000",
    due: "5 September 2026",
    manager: "Aline Uwase",
  },
  "HH-RENT-087": {
    purpose: "August Rent",
    property: "Remera Family House",
    amount: "RWF 780,000",
    due: "16 August 2026",
    manager: "Sarah Uwase",
  },
};

const history = [
  {
    date: "1 Aug 2026",
    description: "August Rent",
    type: "Rent" as const,
    amount: "RWF 850,000",
    method: "Mobile Money",
    reference: "HH-PAY-19842",
    property: "Kacyiru Residence",
    manager: "Jean Mugisha",
  },
  {
    date: "28 Jul 2026",
    description: "Security Deposit",
    type: "Deposits" as const,
    amount: "RWF 850,000",
    method: "Mobile Money",
    reference: "HH-PAY-19204",
    property: "Kacyiru Residence",
    manager: "Jean Mugisha",
  },
  {
    date: "1 Jul 2026",
    description: "July Rent",
    type: "Rent" as const,
    amount: "RWF 850,000",
    method: "Mobile Money",
    reference: "HH-PAY-18766",
    property: "Kacyiru Residence",
    manager: "Jean Mugisha",
  },
  {
    date: "1 Jun 2026",
    description: "June Rent",
    type: "Rent" as const,
    amount: "RWF 780,000",
    method: "Bank Transfer",
    reference: "HH-PAY-17931",
    property: "Remera Family House",
    manager: "Sarah Uwase",
  },
];

export default function PaymentsPage() {
  const [paymentAccess, setPaymentAccess] = useState<PaymentAccess>("enabled");
  const [pageState, setPageState] = useState<PageState>(
    hasPaymentDueToday ? "due" : "active",
  );
  const [modal, setModal] = useState<Modal>(null);
  const [method, setMethod] = useState<PaymentMethod>("Mobile Money");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("All");
  const [receipt, setReceipt] = useState(history[0]);
  const [selectedPayment, setSelectedPayment] = useState<PayablePayment | null>(
    null,
  );
  const visibleHistory = history.filter(
    (item) => historyFilter === "All" || item.type === historyFilter,
  );
  const currentPayment: PayablePayment =
    pageState === "due"
      ? {
          purpose: "August Rent",
          due: "16 August 2026",
          property: rental.title,
          amount: rental.rent,
          manager: rental.manager,
        }
      : pageState === "overdue"
        ? {
            purpose: "August Rent",
            due: "1 August 2026",
            property: rental.title,
            amount: rental.rent,
            manager: rental.manager,
          }
        : {
            purpose: "September Rent",
            due: rental.due,
            property: rental.title,
            amount: rental.rent,
            manager: rental.manager,
          };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rentalId = params.get("pay");
    const receiptRef = params.get("receipt");
    const linkedPayment = rentalId ? linkedRentalPayments[rentalId] : null;
    if (receiptRef) {
      const target = history.find((item) => item.reference === receiptRef);
      if (target) {
        window.setTimeout(() => {
          setReceipt(target);
          setModal("receipt");
        }, 0);
      }
      return;
    }
    if (!linkedPayment) return;
    const openLinkedPayment = window.setTimeout(() => {
      setSelectedPayment(linkedPayment);
      setPageState(linkedPayment.due === "16 August 2026" ? "due" : "active");
      setModal("pay");
    }, 0);
    return () => window.clearTimeout(openLinkedPayment);
  }, []);

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <header className="px-5 pt-9 sm:px-6 lg:px-11 xl:px-[52px]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="dashboard-page-title">Payments</h1>
              {paymentAccess === "enabled" ? (
                <p className="text-carbon-500 mt-2 text-sm">
                  Manage rent and view payment activity for your HauxHunt
                  rentals.
                </p>
              ) : null}
            </div>
            {paymentAccess === "enabled" ? (
              <label className="flex items-center gap-2 text-xs text-black/45">
                Payment status
                <span className="relative">
                  <select
                    value={pageState}
                    onChange={(event) => (
                      setPageState(event.target.value as PageState),
                      setSelectedPayment(null)
                    )}
                    className="h-11 appearance-none rounded-full border-0 bg-white pr-10 pl-4 text-sm font-medium text-black shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0 outline-none focus:ring-0"
                  >
                    <option value="active">Upcoming</option>
                    <option value="due">Due today</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-black/45" />
                </span>
              </label>
            ) : null}
          </div>
        </header>

        {paymentAccess === "disabled" ? (
          <EmptyPayments />
        ) : paymentAccess === "invited" ? (
          <Invitation onSetup={() => setModal("setup")} />
        ) : (
          <ActivePayments
            pageState={pageState}
            historyFilter={historyFilter}
            setHistoryFilter={setHistoryFilter}
            visibleHistory={visibleHistory}
            method={method}
            openModal={setModal}
            payUpcoming={(payment) => {
              setSelectedPayment({
                purpose: payment.title,
                property: payment.property,
                amount: payment.amount,
                due: payment.due,
                manager: payment.manager,
              });
              setModal("pay");
            }}
            openReceipt={(item) => {
              setReceipt(item);
              setModal("receipt");
            }}
          />
        )}
      </main>
      {modal ? (
        <PaymentModal
          modal={modal}
          method={method}
          receipt={receipt}
          payment={selectedPayment ?? currentPayment}
          setReceipt={setReceipt}
          setMethod={setMethod}
          setModal={setModal}
          enablePayments={() => {
            setPaymentAccess("enabled");
            setPageState(hasPaymentDueToday ? "due" : "active");
            setModal("setup-success");
          }}
        />
      ) : null}
    </>
  );
}

function EmptyPayments() {
  return (
    <div className="px-5 py-10 sm:px-6 lg:px-11 xl:px-[52px]">
      <section className="mx-auto flex max-w-[760px] flex-col items-center px-6 py-10 text-center sm:px-12">
        <Image
          src={emptyIllustration}
          alt="No payments yet"
          className="h-44 w-auto object-contain"
          priority
        />
        <h2 className="font-bricolage mt-5 text-3xl font-medium">
          No Payments Yet
        </h2>
        <p className="text-carbon-500 mt-3 max-w-xl text-sm leading-6">
          Once payments are enabled for one of your HauxHunt rentals, your rent,
          deposits, and payment history will appear here.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <PrimaryLink href="/renter-dashboard/rentals">
            View My Rentals
          </PrimaryLink>
          <SecondaryLink href="/renter-dashboard/applications">
            View Applications
          </SecondaryLink>
        </div>
      </section>
    </div>
  );
}

function Invitation({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="px-5 py-10 sm:px-6 lg:px-11 xl:px-[52px]">
      <section className="mx-auto max-w-[820px] rounded-2xl bg-white/75 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] ring-1 ring-white/70 backdrop-blur-xl sm:p-9">
        <span className="flex size-11 items-center justify-center rounded-full bg-black text-white">
          <Building2 className="size-5" />
        </span>
        <h2 className="font-bricolage mt-6 text-3xl font-medium">
          You&apos;re invited to manage rent through HauxHunt
        </h2>
        <p className="text-carbon-500 mt-3 text-sm">
          {rental.manager} has enabled HauxHunt payments for:
        </p>
        <h3 className="mt-2 text-lg font-medium">{rental.title}</h3>
        <div className="mt-7 grid gap-5 border-y border-black/10 py-6 sm:grid-cols-2">
          <Data label="Monthly rent" value={rental.rent} />
          <Data label="Next rent due" value={rental.due} />
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            onClick={onSetup}
            className="h-11 rounded-full bg-black px-5 text-sm font-medium text-white"
          >
            Set Up Payments
          </button>
          <SecondaryLink href={`/renter-dashboard/rentals/${rental.id}`}>
            View Rental
          </SecondaryLink>
          <SecondaryLink
            href={`/renter-dashboard/messages?host=${encodeURIComponent(rental.manager)}&role=Property%20Manager&verified=1&ctx=active-rental&property=${encodeURIComponent(rental.title)}&propertyId=${encodeURIComponent(rental.propertyId)}&status=Active&detail=${encodeURIComponent(`${rental.rent} / month`)}&refId=${encodeURIComponent(rental.id)}`}
          >
            Message Property Manager
          </SecondaryLink>
        </div>
      </section>
    </div>
  );
}

function ActivePayments({
  pageState,
  historyFilter,
  setHistoryFilter,
  visibleHistory,
  method,
  openModal,
  openReceipt,
  payUpcoming,
}: {
  pageState: PageState;
  historyFilter: HistoryFilter;
  setHistoryFilter: (value: HistoryFilter) => void;
  visibleHistory: typeof history;
  method: PaymentMethod;
  openModal: (modal: Modal) => void;
  openReceipt: (item: (typeof history)[number]) => void;
  payUpcoming: (payment: (typeof upcomingPayments)[number]) => void;
}) {
  const overdue = pageState === "overdue";
  const due = pageState === "due";
  const upcoming = pageState === "active";
  const paymentPurpose = upcoming ? "September Rent" : "August Rent";
  const paymentDue = overdue
    ? "1 August 2026"
    : due
      ? "16 August 2026"
      : rental.due;
  return (
    <div className="px-5 py-8 sm:px-6 lg:px-11 xl:px-[52px]">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <section className="verification-glass relative overflow-hidden rounded-[1.75rem] p-6 text-white sm:p-8">
          <svg
            aria-hidden="true"
            viewBox="0 0 1400 280"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full text-white opacity-[0.12]"
          >
            <defs>
              <path
                id="payment-wave"
                d="M-100 35 C230 -55 410 30 625 155 S1010 310 1500 75"
              />
            </defs>
            <g fill="none" stroke="currentColor" strokeWidth="1">
              {Array.from({ length: 7 }, (_, index) => (
                <use
                  key={`payment-wave-${index}`}
                  href="#payment-wave"
                  transform={`translate(0 ${index * 13 - 70})`}
                />
              ))}
            </g>
          </svg>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-black/30"
          />
          <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm text-white/60">
                {overdue
                  ? "Payment overdue"
                  : due
                    ? "Rent due today"
                    : "Upcoming payments next month"}
              </p>
              <p className="font-bricolage mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
                {upcoming ? upcomingTotal : rental.rent}
              </p>
              <p className="mt-3 text-sm text-white/70">
                {upcoming
                  ? `Total across ${upcomingPayments.length} rentals`
                  : `${paymentPurpose} · ${rental.title}`}
              </p>
              <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
                <Data
                  label={upcoming ? "Payment month" : "Due"}
                  value={upcoming ? "September 2026" : paymentDue}
                  inverse
                />
                <Data
                  label={upcoming ? "Rentals" : "Status"}
                  value={
                    upcoming
                      ? `${upcomingPayments.length} properties`
                      : overdue
                        ? "Overdue"
                        : "Due"
                  }
                  inverse
                />
              </div>
              {overdue ? (
                <p className="mt-5 text-sm text-white/65">
                  This payment is past its due date.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {upcoming ? (
                <button
                  onClick={() =>
                    document
                      .getElementById("upcoming-payments")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                  className="h-11 rounded-full bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-white/85"
                >
                  View Upcoming Payments
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openModal("pay")}
                    className="h-11 rounded-full bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-white/85"
                  >
                    Pay Now
                  </button>
                  <button
                    onClick={() => openModal("details")}
                    className="h-11 rounded-full border border-white/25 px-5 text-sm transition-colors hover:bg-white/10"
                  >
                    View Details
                  </button>
                </>
              )}
              {overdue ? (
                <Link
                  href={`/renter-dashboard/messages?host=${encodeURIComponent(rental.manager)}&role=Property%20Manager&verified=1&ctx=active-rental&property=${encodeURIComponent(rental.title)}&propertyId=${encodeURIComponent(rental.propertyId)}&status=Active&detail=${encodeURIComponent(`${rental.rent} / month`)}&refId=${encodeURIComponent(rental.id)}`}
                  className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm transition-colors hover:bg-white/10"
                >
                  Message Property Manager
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div id="upcoming-payments">
            <Card title="Upcoming">
              <div className="divide-y divide-black/10 border-t border-black/10 pt-4">
                {upcomingPayments.map((payment) => (
                  <div
                    key={payment.property}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{payment.title}</p>
                      <p className="text-carbon-500 mt-1 text-xs">
                        {payment.property} · Due {payment.due}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{payment.amount}</p>
                      <div className="mt-1 flex items-center justify-end gap-2 [&>span]:mt-0">
                        <Status>Upcoming</Status>
                        <button
                          type="button"
                          onClick={() => payUpcoming(payment)}
                          className="h-7 rounded-full border border-black/15 px-3 text-[11px] font-medium transition-colors hover:bg-black hover:text-white"
                        >
                          Pay Early
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card title="Security Deposit">
            <p className="font-bricolage text-2xl font-medium">{rental.rent}</p>
            <div className="mt-3 flex items-center gap-2">
              <Status>Paid</Status>
              <span className="text-carbon-500 text-xs">28 July 2026</span>
            </div>
            <p className="text-carbon-500 mt-3 text-sm leading-6">
              Paid during rental setup after the agreement was signed.
            </p>
            <button
              onClick={() => openReceipt(history[1])}
              className="mt-5 text-sm font-medium underline underline-offset-4"
            >
              View Receipt
            </button>
          </Card>
        </div>

        <Card title="Payment History">
          <div className="mb-5 flex gap-2">
            {(["All", "Rent", "Deposits"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setHistoryFilter(filter)}
                className={`h-9 rounded-full px-4 text-sm ${historyFilter === filter ? "bg-black text-white" : "bg-black/[0.045]"}`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="divide-y divide-black/10 border-t border-black/10 pt-4">
            {visibleHistory.map((item) => (
              <div
                key={item.reference}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[110px_1fr_150px_80px] sm:items-center"
              >
                <p className="text-sm">{item.date}</p>
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-carbon-500 mt-1 text-xs">
                    {item.property}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">{item.amount}</p>
                  <Status>Paid</Status>
                </div>
                <button
                  onClick={() => openReceipt(item)}
                  className="justify-self-start text-sm underline underline-offset-4 sm:justify-self-end"
                >
                  Receipt
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Payment Method">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="flex size-11 items-center justify-center">
                <Image
                  src={
                    method === "Mobile Money"
                      ? mobileMethodImage
                      : method === "Card"
                        ? cardMethodImage
                        : bankMethodImage
                  }
                  alt=""
                  className="size-8 object-contain"
                />
              </span>
              <div>
                <p className="font-medium">{method}</p>
                <p className="text-carbon-500 mt-1 text-xs">
                  {method === "Mobile Money"
                    ? "+250 *** *** 456"
                    : method === "Card"
                      ? "•••• 4821 · Expires 08/28"
                      : "Bank instructions available"}{" "}
                  · Default
                </p>
              </div>
            </div>
            <button
              onClick={() => openModal("methods")}
              className="h-10 rounded-full border border-black/15 px-5 text-sm font-medium"
            >
              Change
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PaymentModal({
  modal,
  method,
  receipt,
  payment,
  setReceipt,
  setMethod,
  setModal,
  enablePayments,
}: {
  modal: NonNullable<Modal>;
  method: PaymentMethod;
  receipt: (typeof history)[number];
  payment: PayablePayment;
  setReceipt: (item: (typeof history)[number]) => void;
  setMethod: (method: PaymentMethod) => void;
  setModal: (modal: Modal) => void;
  enablePayments: () => void;
}) {
  const close = () => setModal(null);
  if (modal === "setup-success")
    return (
      <OutcomeModal
        icon="success"
        title="Payments are ready"
        text={`You can now manage payments for ${rental.title}.`}
        close={close}
      >
        <SummaryRows
          rows={[
            ["Next payment", rental.rent],
            ["Due", rental.due],
          ]}
        />
        <button
          onClick={close}
          className="mt-6 h-11 rounded-full bg-black px-5 text-sm text-white"
        >
          Go to Payments
        </button>
      </OutcomeModal>
    );
  if (modal === "success")
    return (
      <OutcomeModal
        icon="success"
        title="Payment Successful"
        text={`${payment.amount} · ${payment.purpose} · ${payment.property}`}
        close={close}
      >
        <SummaryRows
          rows={[
            ["Paid", "16 August 2026"],
            ["Reference", "HH-PAY-20481"],
            ["Payment method", method],
          ]}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setModal("receipt")}
            className="h-11 rounded-full bg-black px-5 text-sm text-white"
          >
            View Receipt
          </button>
          <button
            onClick={close}
            className="h-11 rounded-full border border-black/15 px-5 text-sm"
          >
            Back to Payments
          </button>
        </div>
      </OutcomeModal>
    );
  if (modal === "processing")
    return (
      <OutcomeModal
        icon="processing"
        title="Payment Processing"
        text="We're confirming your payment."
        close={close}
      >
        <p className="font-bricolage mt-5 text-3xl font-medium">
          {payment.amount}
        </p>
        <p className="text-carbon-500 mt-2 text-sm">Reference HH-PAY-20481</p>
        <p className="mt-5 rounded-xl bg-black/[0.04] p-4 text-sm">
          You don&apos;t need to make another payment while this one is
          processing.
        </p>
        <button
          onClick={close}
          className="mt-6 h-11 rounded-full bg-black px-5 text-sm text-white"
        >
          Back to Payments
        </button>
      </OutcomeModal>
    );
  if (modal === "failed")
    return (
      <OutcomeModal
        icon="failed"
        title="Payment Unsuccessful"
        text="We couldn't complete this payment. It has not been recorded as completed."
        close={close}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setModal("pay")}
            className="h-11 rounded-full bg-black px-5 text-sm text-white"
          >
            Try Again
          </button>
          <button
            onClick={() => setModal("methods")}
            className="h-11 rounded-full border border-black/15 px-5 text-sm"
          >
            Choose Another Method
          </button>
          <button onClick={close} className="h-11 px-2 text-sm">
            Back to Payments
          </button>
        </div>
      </OutcomeModal>
    );

  return (
    <ModalShell
      title={
        modal === "setup"
          ? "Set Up Payments"
          : modal === "details"
            ? "Payment Details"
            : modal === "pay"
              ? "Pay Rent"
              : modal === "receipt"
                ? "Payment Receipt"
                : "Payment Method"
      }
      close={close}
    >
      {modal === "setup" || modal === "methods" ? (
        <MethodSelection selected={method} select={setMethod} />
      ) : null}
      {modal === "setup" ? (
        <button
          onClick={enablePayments}
          className="mt-7 h-11 rounded-full bg-black px-5 text-sm font-medium text-white"
        >
          Complete Setup
        </button>
      ) : null}
      {modal === "methods" ? (
        <button
          onClick={close}
          className="mt-7 h-11 rounded-full bg-black px-5 text-sm font-medium text-white"
        >
          Use {method}
        </button>
      ) : null}
      {modal === "details" ? (
        <>
          <p className="text-carbon-500 text-sm">{payment.purpose}</p>
          <p className="font-bricolage mt-2 text-3xl font-medium">
            {payment.amount}
          </p>
          <SummaryRows
            rows={[
              ["Rent", payment.amount],
              ["Total", payment.amount],
              ["Due", payment.due],
              ["Property", payment.property],
              ["Managed by", payment.manager],
            ]}
          />
          <button
            onClick={() => setModal("pay")}
            className="mt-7 h-11 rounded-full bg-black px-5 text-sm text-white"
          >
            Pay Now
          </button>
        </>
      ) : null}
      {modal === "pay" ? (
        <>
          <p className="font-bricolage text-3xl font-medium">
            {payment.amount}
          </p>
          <p className="text-carbon-500 mt-2 text-sm">
            {payment.purpose} · {payment.property}
          </p>
          <SummaryRows
            rows={[
              ["Property", payment.property],
              ["Payment purpose", payment.purpose],
              ["Amount", payment.amount],
              ["Payment method", method],
              ["Due date", payment.due],
              ["Total", payment.amount],
            ]}
          />
          <button
            onClick={() => setModal("methods")}
            className="mt-5 text-sm underline underline-offset-4"
          >
            Change payment method
          </button>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => {
                markSharedPaymentPaid(payment.property);
                setReceipt({
                  date: "16 Aug 2026",
                  description: payment.purpose,
                  type: "Rent",
                  amount: payment.amount,
                  method,
                  reference: "HH-PAY-20481",
                  property: payment.property,
                  manager: payment.manager,
                });
                setModal("success");
              }}
              className="h-11 rounded-full bg-black px-5 text-sm font-medium text-white"
            >
              Pay {payment.amount}
            </button>
            <button
              onClick={close}
              className="h-11 rounded-full border border-black/15 px-5 text-sm"
            >
              Cancel
            </button>
          </div>
        </>
      ) : null}
      {modal === "receipt" ? <Receipt item={receipt} close={close} /> : null}
    </ModalShell>
  );
}

function MethodSelection({
  selected,
  select,
}: {
  selected: PaymentMethod;
  select: (method: PaymentMethod) => void;
}) {
  const methods = [
    [
      "Mobile Money",
      "Pay using your supported mobile money account.",
      mobileMethodImage,
    ],
    ["Card", "Pay using a debit or credit card.", cardMethodImage],
    ["Bank Transfer", "View bank-transfer instructions.", bankMethodImage],
  ] as const;
  return (
    <div className="mt-5 space-y-3">
      {methods.map(([name, description, methodImage]) => (
        <button
          key={name}
          onClick={() => select(name)}
          className={`flex w-full items-center gap-4 rounded-xl p-4 text-left ring-1 ${selected === name ? "bg-black text-white ring-black" : "ring-black/10"}`}
        >
          <Image
            src={methodImage}
            alt=""
            className="size-8 shrink-0 object-contain"
          />
          <span className="flex-1">
            <span className="block font-medium">{name}</span>
            <span
              className={`mt-1 block text-xs ${selected === name ? "text-white/65" : "text-carbon-500"}`}
            >
              {description}
            </span>
          </span>
          {selected === name ? <Check className="size-4" /> : null}
        </button>
      ))}
    </div>
  );
}

function Receipt({
  item,
  close,
}: {
  item: (typeof history)[number];
  close: () => void;
}) {
  async function download() {
    const pdf = await createReceiptPdf(item);
    const url = URL.createObjectURL(pdf);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${item.reference}-receipt.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <div className="bg-carbon-50 p-3 sm:p-5">
        <article className="mx-auto min-h-[620px] max-w-md bg-white px-6 py-7 text-left shadow-[0_12px_35px_rgba(0,0,0,0.12)] sm:px-8 sm:py-9">
          <header className="flex items-start justify-between gap-5 border-b border-black/15 pb-6">
            <Image
              src={blackHauxHuntLogo}
              alt="HauxHunt"
              className="h-20 w-20 object-contain"
            />
            <div className="text-right">
              <p className="font-bricolage text-xl font-medium">
                Payment Receipt
              </p>
              <p className="text-carbon-500 mt-1 text-xs">
                Receipt no. {item.reference}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-black px-3 py-1 text-[10px] font-medium tracking-wide text-white uppercase">
                Paid
              </span>
            </div>
          </header>

          <section className="border-b border-black/10 py-7 text-center">
            <p className="text-carbon-500 text-xs tracking-[0.14em] uppercase">
              Amount paid
            </p>
            <p className="font-bricolage mt-2 text-4xl font-medium tracking-tight">
              {item.amount}
            </p>
            <p className="text-carbon-500 mt-2 text-sm">{item.description}</p>
          </section>

          <section className="py-6">
            <h3 className="text-xs font-semibold tracking-[0.12em] uppercase">
              Payment details
            </h3>
            <dl className="mt-4 divide-y divide-black/8 border-y border-black/8">
              {[
                ["Property", item.property],
                ["Paid by", "Pacifique Harerimana"],
                ["Payment date", item.date],
                ["Payment method", item.method],
                ["Reference", item.reference],
                ["Managed by", item.manager],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[120px_1fr] gap-4 py-3 text-xs"
                >
                  <dt className="text-carbon-500">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <footer className="mt-2 border-t border-dashed border-black/20 pt-5 text-center">
            <p className="text-carbon-500 text-[10px] leading-4">
              This receipt is a payment record and is not a legally binding
              financial document.
            </p>
            <p className="mt-3 text-[10px] font-medium tracking-[0.12em] uppercase">
              HauxHunt · Rental payment services
            </p>
          </footer>
        </article>
      </div>
      <div className="mt-7 flex justify-center gap-3">
        <button
          onClick={download}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm text-white"
        >
          <Download className="size-4" />
          Download Receipt
        </button>
        <button
          onClick={close}
          className="h-11 rounded-full border border-black/15 px-5 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

async function createReceiptPdf(item: (typeof history)[number]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create receipt");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const logo = new window.Image();
  logo.src = blackHauxHuntLogo.src;
  await logo.decode();
  context.drawImage(logo, 80, 55, 190, 190);

  context.textAlign = "right";
  context.fillStyle = "#171717";
  context.font = "600 38px Arial, sans-serif";
  context.fillText("Payment Receipt", 1160, 105);
  context.fillStyle = "#575757";
  context.font = "22px Arial, sans-serif";
  context.fillText(`Receipt no. ${item.reference}`, 1160, 150);
  context.fillStyle = "#171717";
  context.beginPath();
  context.roundRect(1054, 175, 106, 44, 22);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "600 18px Arial, sans-serif";
  context.fillText("PAID", 1127, 204);

  context.strokeStyle = "#c9c9c9";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(80, 270);
  context.lineTo(1160, 270);
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = "#575757";
  context.font = "20px Arial, sans-serif";
  context.fillText("AMOUNT PAID", 620, 340);
  context.fillStyle = "#171717";
  context.font = "600 58px Arial, sans-serif";
  context.fillText(item.amount, 620, 420);
  context.fillStyle = "#575757";
  context.font = "24px Arial, sans-serif";
  context.fillText(item.description, 620, 465);
  context.strokeStyle = "#e4e4e4";
  context.beginPath();
  context.moveTo(80, 520);
  context.lineTo(1160, 520);
  context.stroke();

  context.textAlign = "left";
  context.fillStyle = "#171717";
  context.font = "600 21px Arial, sans-serif";
  context.fillText("PAYMENT DETAILS", 80, 585);
  const details = [
    ["Property", item.property],
    ["Paid by", "Pacifique Harerimana"],
    ["Payment date", item.date],
    ["Payment method", item.method],
    ["Reference", item.reference],
    ["Managed by", item.manager],
  ];
  let y = 650;
  context.beginPath();
  context.moveTo(80, 615);
  context.lineTo(1160, 615);
  context.stroke();
  details.forEach(([label, value]) => {
    context.fillStyle = "#575757";
    context.font = "22px Arial, sans-serif";
    context.textAlign = "left";
    context.fillText(label, 80, y);
    context.fillStyle = "#171717";
    context.font = "600 22px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText(value, 1160, y);
    context.strokeStyle = "#e4e4e4";
    context.beginPath();
    context.moveTo(80, y + 30);
    context.lineTo(1160, y + 30);
    context.stroke();
    y += 72;
  });

  context.setLineDash([10, 10]);
  context.strokeStyle = "#c9c9c9";
  context.beginPath();
  context.moveTo(80, 1130);
  context.lineTo(1160, 1130);
  context.stroke();
  context.setLineDash([]);
  context.textAlign = "center";
  context.fillStyle = "#575757";
  context.font = "18px Arial, sans-serif";
  context.fillText(
    "This receipt is a payment record and is not a legally binding financial document.",
    620,
    1190,
  );
  context.fillStyle = "#171717";
  context.font = "600 18px Arial, sans-serif";
  context.fillText("HAUXHUNT · RENTAL PAYMENT SERVICES", 620, 1240);

  const jpegBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Unable to export receipt")),
      "image/jpeg",
      0.94,
    ),
  );
  return createImagePdf(
    new Uint8Array(await jpegBlob.arrayBuffer()),
    canvas.width,
    canvas.height,
  );
}

function createImagePdf(image: Uint8Array, width: number, height: number) {
  const encode = (value: string) => new TextEncoder().encode(value);
  const parts: Uint8Array[] = [encode("%PDF-1.4\n")];
  const offsets = [0];
  let length = parts[0].length;
  const addObject = (number: number, chunks: Uint8Array[]) => {
    offsets[number] = length;
    const objectParts = [
      encode(`${number} 0 obj\n`),
      ...chunks,
      encode("\nendobj\n"),
    ];
    objectParts.forEach((part) => {
      parts.push(part);
      length += part.length;
    });
  };
  addObject(1, [encode("<< /Type /Catalog /Pages 2 0 R >>")]);
  addObject(2, [encode("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")]);
  addObject(3, [
    encode(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /LogoReceipt 5 0 R >> >> /Contents 4 0 R >>",
    ),
  ]);
  const drawImage = "q 612 0 0 792 0 0 cm /LogoReceipt Do Q";
  addObject(4, [
    encode(
      `<< /Length ${drawImage.length} >>\nstream\n${drawImage}\nendstream`,
    ),
  ]);
  addObject(5, [
    encode(
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
    ),
    image,
    encode("\nendstream"),
  ]);
  const xrefOffset = length;
  const xref = `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(encode(xref));
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(new ArrayBuffer(totalLength));
  let position = 0;
  parts.forEach((part) => {
    output.set(part, position);
    position += part.length;
  });
  return new Blob([output.buffer], { type: "application/pdf" });
}

function ModalShell({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ borderRadius: 0, clipPath: "inset(0)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 z-[100] flex min-h-svh w-screen items-center justify-center rounded-none bg-black/55 p-4"
    >
      <div className="flex max-h-[90svh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="z-10 flex shrink-0 items-center justify-between gap-4 border-b border-black/10 bg-white px-6 pt-6 pb-5 sm:px-8 sm:pt-8">
          <h2 className="font-bricolage text-2xl font-medium">{title}</h2>
          <button
            onClick={close}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-full hover:bg-black/[0.05]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-6 pt-6 pb-6 sm:px-8 sm:pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function OutcomeModal({
  icon,
  title,
  text,
  close,
  children,
}: {
  icon: "success" | "processing" | "failed";
  title: string;
  text: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <ModalShell title={title} close={close}>
      <div className="text-center">
        <span
          className={`mx-auto flex size-14 items-center justify-center rounded-full ${icon === "failed" ? "bg-black/[0.06]" : "bg-black text-white"}`}
        >
          {icon === "success" ? (
            <Check className="size-6" />
          ) : icon === "processing" ? (
            <ArrowRight className="size-6" />
          ) : (
            <CircleAlert className="size-6" />
          )}
        </span>
        <p className="text-carbon-500 mt-4 text-sm leading-6">{text}</p>
        <div className="text-left">{children}</div>
      </div>
    </ModalShell>
  );
}

function SummaryRows({ rows }: { rows: string[][] }) {
  return (
    <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-5 py-3 text-sm">
          <span className="text-carbon-500">{label}</span>
          <strong className="text-right font-medium">{value}</strong>
        </div>
      ))}
    </div>
  );
}
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white/75 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] ring-1 ring-white/70 backdrop-blur-xl">
      <h2 className="font-bricolage mb-5 text-xl font-medium">{title}</h2>
      {children}
    </section>
  );
}
function Data({
  label,
  value,
  inverse = false,
}: {
  label: string;
  value: string;
  inverse?: boolean;
}) {
  return (
    <div>
      <p className={`text-xs ${inverse ? "text-white/50" : "text-carbon-500"}`}>
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
function Status({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1 inline-block rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-medium">
      {children}
    </span>
  );
}
function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white"
    >
      {children}
    </Link>
  );
}
function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-full border border-black/15 px-5 text-sm font-medium"
    >
      {children}
    </Link>
  );
}
