# HauxHunt — Frontend Overview & Backend Handoff

> Audience: backend developers who will build the API behind this frontend.
> Scope: everything in `src/` as of `origin/main` commit `9210c22`. Guide last updated 30 Oct 2026.

---

## 1. What HauxHunt is

HauxHunt is a **long-term rental marketplace** for **Rwanda, Nigeria and Kenya**.
It covers the whole rental journey, from finding a home to paying rent. It connects four kinds of people:

| Role                 | What they do on HauxHunt                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Renter**           | Searches for homes, saves them, requests viewings, applies, completes rental setup, pays rent, reports maintenance, and finds **flatmates**.          |
| **Property owner**   | Owns the asset. Adds properties, either self-manages or delegates through a **team**, decides applications, sets up rentals and tracks payments.      |
| **Property manager** | Operates properties for an owner, or independently with the owner's authorization. Handles applications, payments, payouts, messages and maintenance. |
| **Agent**            | Markets properties. Handles listings, enquiries, viewings and applications, and can recommend a decision on an application.                           |

The roles in one line each: the owner **owns**, the property manager **operates**, the agent **markets** and the renter **occupies**.

The product promise is **trust**: every partner is identity-verified, every listing is checked, and search results explain _why_ a home matches.

---

## 2. Current state of the frontend — read this first

**The frontend now talks to the RentUp API** (`hauxhunt-backend`). Next rewrites `/v1/*` to `API_URL`, so the API must be running for the app to load. `src/lib/api/hydrate.ts` loads each user's records into the stores in `src/lib/*.ts` after sign-in.

Connected: login, registration, password reset, sessions and role redirects; listings and search; saved homes and searches; enquiries; viewings; property requests; messaging; application submission and decisions; maintenance; plan changes; and reads for rentals, payments, teams and properties.

Not connected yet, so these still act only in the browser: rental setup, property and listing create or edit, team invitations and assignments, independent properties, partner verification, payouts, and the "mark paid" action in Finance. FlatMat, reviews, notifications and performance wait on backend phases 11 and 12.

The table below describes the original prototype and still applies to the areas not connected:

| What you see                                                              | Where it actually comes from                                                                    |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Public listings and flatmates                                             | `src/data/hero-search-demo.ts`, `src/data/public-flatmates.ts`                                  |
| Owner, team, rental, payment and application data                         | Seed arrays in `src/lib/*.ts`, with changes saved as overrides in `sessionStorage`              |
| Login                                                                     | Four hard-coded emails, any password (see below)                                                |
| Plan (free/paid)                                                          | A demo toggle on each role's account page, stored in `sessionStorage`                           |
| Payments, payouts and one-time codes                                      | Mock actions. No payment provider or SMS/email gateway exists, and the code is shown on screen. |
| Saved homes, saved searches, viewing requests, property requests, reviews | `localStorage`                                                                                  |
| Natural-language search                                                   | A small regex parser running in the browser (`parseQuery` in `src/data/hero-search-demo.ts`)    |
| Currency conversion                                                       | Hard-coded rates in `src/components/currency/currency-selector.tsx`                             |

The only real network calls are to **OpenStreetMap** (map tiles, embedded maps, and reverse-geocoding via Nominatim for "use my location").

Most working state is in `sessionStorage`, so it is lost when the tab closes. Records already connect across roles inside one tab: for example, a payment the renter makes in rental setup appears on the owner's side. The API must keep these links, because the UI assumes every role reads the **same record**.

### Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**Demo logins** (any password of 8+ characters):

| Email               | Lands on                                   |
| ------------------- | ------------------------------------------ |
| `renter@gmail.com`  | `/renter-dashboard`                        |
| `owner@gmail.com`   | `/owner-dashboard`                         |
| `partner@gmail.com` | `/partner-dashboard` as a property manager |
| `agent@gmail.com`   | `/partner-dashboard` as an agent           |

### Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/radix UI · Framer Motion · Leaflet (maps).
Pages mix **server components** and **client components** (`"use client"`), and most dashboard pages are client components. Public listing and search pages can call your API **from the server**, while dashboards and forms will call it **from the browser**.

`src/types/index.ts` now holds only a few shared types. Most data shapes live next to their data, in `src/lib/*.ts` and `src/data/*.ts`. Treat those as the first draft of your API response shapes.

---

## 3. Screen map

### Public (no login)

| Route                  | Screen           | Purpose                                                                                              |
| ---------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `/`                    | Home             | Hero with natural-language search, categories, trending locations, featured listings, "how it works" |
| `/search?q=…`          | Search results   | Results for a typed query, with filter chips showing what was understood                             |
| `/rent`, `/properties` | Catalogue        | Browsable listing grid + map, filters in the URL                                                     |
| `/buy`                 | —                | Redirects to `/properties` (sales are not launched)                                                  |
| `/properties/[id]`     | Property detail  | Photos, price, facts, amenities, map, reviews, contact form, viewing request, save button            |
| `/flatmates`           | Flatmate browse  | Public flatmate profiles; photos need sign-in                                                        |
| `/flatmates/[id]`      | Flatmate profile | Full profile, "interested" action, and Message once matched                                          |
| `/property-request`    | Property request | "Can't find it? Tell us what you need" form                                                          |
| `/landlords`           | List a property  | Marketing page                                                                                       |
| `/feedback`            | Feedback         | Topic, rating, message and attachment form                                                           |
| `/login`, `/register`  | Auth             |                                                                                                      |

### Renter dashboard (role = renter)

| Route                                                            | Purpose                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `/renter-dashboard`                                              | Home feed with search, filters, voice search, "use my location" |
| `/renter-dashboard/properties`                                   | Same catalogue as `/properties`, renter layout                  |
| `/renter-dashboard/saved`                                        | Saved homes                                                     |
| `/renter-dashboard/saved-searches`                               | Saved searches and property requests (`?tab=requests`)          |
| `/renter-dashboard/requests`                                     | Redirects to the requests tab above                             |
| `/renter-dashboard/visits`                                       | Viewings                                                        |
| `/renter-dashboard/applications`, `/new`, `/[id]`                | Application list, 7-step form, application detail               |
| `/renter-dashboard/rental-setup/[id]`                            | Review the rental offer, sign and pay                           |
| `/renter-dashboard/rentals`, `/[id]`                             | Rentals and rental detail                                       |
| `/renter-dashboard/payments`                                     | Upcoming payments, history and payment methods                  |
| `/renter-dashboard/maintenance`, `/[id]`                         | Maintenance requests (reporting is Paid only)                   |
| `/renter-dashboard/flatmates/profile`                            | Edit and preview your flatmate profile                          |
| `/renter-dashboard/flatmates/matches`                            | Matches, received interests, sent interests                     |
| `/renter-dashboard/messages`                                     | Central inbox                                                   |
| `/renter-dashboard/notifications`                                | Notifications                                                   |
| `/renter-dashboard/account`                                      | Account, notification channels, plan (`?section=plan`)          |
| `/renter-dashboard/help`, `/[category]`, `/[category]/[article]` | Help centre                                                     |

### Owner dashboard (role = owner)

| Route                                                        | Purpose                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| `/owner-dashboard`                                           | Overview                                                |
| `/owner-dashboard/performance`                               | Listing performance and boost                           |
| `/owner-dashboard/properties`, `/new`, `/[id]`, `/[id]/edit` | Properties: list, add, detail, edit                     |
| `/owner-dashboard/listings`                                  | Listings                                                |
| `/owner-dashboard/applications`                              | Applications and decisions                              |
| `/owner-dashboard/applications/[applicationId]/rental-setup` | Create a rental offer from an approved application      |
| `/owner-dashboard/rentals`                                   | Rentals                                                 |
| `/owner-dashboard/payments`                                  | Payments; in-app collection is Paid only                |
| `/owner-dashboard/maintenance`                               | Maintenance                                             |
| `/owner-dashboard/team`, `/[memberId]`                       | Team members, invitations, assignments                  |
| `/owner-dashboard/messages`                                  | Messages                                                |
| `/owner-dashboard/notifications`                             | Notifications                                           |
| `/owner-dashboard/account`                                   | Account, payout details, notification preferences, plan |

### Partner dashboard (role = property manager or agent)

Both roles share `/partner-dashboard`, but they no longer see the same product. The sidebar and several pages differ by role:

| Route                                            | Who                  | Purpose                                                                                |
| ------------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------- |
| `/partner-dashboard`                             | Both                 | Role-specific overview                                                                 |
| `/partner-dashboard/properties`                  | Both                 | Properties from team assignments and independent authorizations                        |
| `/partner-dashboard/properties/new`              | Both                 | Submit an independently represented property                                           |
| `/partner-dashboard/properties/[id]`             | Both                 | Property detail, including boost and verified badge                                    |
| `/partner-dashboard/properties/[id]/listing/new` | Both                 | Create or edit the listing for a property                                              |
| `/partner-dashboard/performance`                 | Both                 | Views, saves, enquiries, trend chart, per-listing stats                                |
| `/partner-dashboard/applications`                | Both                 | Applications. Agents recommend; property managers can decide if authorized             |
| `/partner-dashboard/enquiries`                   | Agent nav            | Enquiries and viewings                                                                 |
| `/partner-dashboard/finance`                     | Property manager nav | Tabs: Payments, Billing Schedules, Payouts                                             |
| `/partner-dashboard/messages`                    | Both                 | Messages. For property managers it is "Messages & Maintenance", with a Maintenance tab |
| `/partner-dashboard/notifications`               | Both                 | Notifications                                                                          |
| `/partner-dashboard/verification`                | Both                 | 5-step identity/business verification                                                  |
| `/partner-dashboard/settings`                    | Both                 | Profile, business details, payout details, WhatsApp alerts, plan (`?section=plan`)     |

These old routes redirect, and existing links still rely on them:

| Old route                                       | Goes to                                                 |
| ----------------------------------------------- | ------------------------------------------------------- |
| `/partner-dashboard/listings`, `/listings/edit` | `/partner-dashboard/properties`                         |
| `/partner-dashboard/listings/new`               | `/partner-dashboard/properties?guidance=create-listing` |
| `/partner-dashboard/payments`                   | `/partner-dashboard/finance?tab=payments`               |
| `/partner-dashboard/maintenance`                | `/partner-dashboard/messages?tab=maintenance`           |

---

## 4. Features, step by step

Each feature below lists **what the user does**, then **what the backend must provide**.

### 4.1 Accounts & login

**User flow**

1. On `/register` the user picks an account type: `renter`, `owner`, `property_manager` or `agent`.
2. Fills in the registration form: full name, email, phone, country, password and terms, plus agency name for partners.
3. Sees a success screen, then continues to their dashboard, or to `?returnTo=/…` if given.
4. On `/login`: email, password, "remember me". "Forgot password?" is a dead button today.
5. After login: renters → `/renter-dashboard`; owners → `/owner-dashboard`; partners → `/partner-dashboard`, or to `?returnTo=/…` if given.
6. Logout clears the role and plan, and returns home. Each new login starts on the Free plan.

**Backend needs**

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /me`
- Password reset flow (`POST /auth/forgot-password`, `POST /auth/reset-password`)
- `GET /me` must return at least `{ id, fullName, email, role, plan, verificationStatus }`. The frontend currently reads these from browser storage.
- Route protection: dashboards must reject the wrong role. Nothing stops a renter opening `/owner-dashboard` today.
- Replace the demo identities. Pages assume one owner, one renter and a demo professional (`OWNER`, `RENTER_DEMO_NAME`, `useDemoProfessional`).

### 4.2 Search & browsing

**User flow**

1. User types a sentence, e.g. _"Quiet 2-bedroom in Kigali under USD 700"_ (or speaks it — voice search uses the browser's speech API, no backend needed).
2. The app turns it into **filter chips**: location, bedrooms, max price, purpose, amenities, availability, and an "Unclear: …" chip for words it didn't understand. The user can remove chips.
3. Results show each home with a **match %** and a one-line **"why it matches"** (e.g. _"Matches in Kigali, 2-bedroom, quiet area."_).
4. On the catalogue (`/properties`) users filter by location, type, price range, bedrooms, bathrooms, sort, page, and toggle a map.

**Rules the current parser follows** (keep them, or replace with something better):

- **Location is a hard filter** — a home in the wrong city never appears, however well it matches otherwise.
- Bedrooms and max price are hard filters too; amenities only raise the score.
- Score weights: location 2, bedrooms 2, max price 2, each amenity 1. Match % = earned / possible, minimum 40.
- If nothing could be parsed, show everything rather than an empty page.

**URL parameters the frontend already uses**

| Page                   | Params                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/search`              | `q`, `type`, `price` (`min-max`, e.g. `500-1000`), `bedrooms` (`1`…`5+`), `bathrooms`, `sort` (`price-low`, `price-high`), `category`, `source=location` |
| `/properties`, `/rent` | `location`, `type`, `price`, `bedrooms`, `bathrooms`, `sort`, `page`, `map=1`, `mapHidden=1`, `focus=<listingId>`                                        |

**Backend needs**

- `GET /listings` accepting the filters above + pagination, returning listings with coordinates for the map.
- `POST /search/parse` (or do it inside `GET /search?q=`) returning `ParsedFilter[]` + results with `matchPercentage` and `whyItMatches`.
- Categories (beach front, houses, apartments, studios, shared, villas) are hard-coded id lists today → should become a `category` filter or a property-type field.

### 4.3 Property detail

**User flow**

1. `/properties/[id]` shows gallery, title, location, verified badge, monthly price (in the user's chosen currency), bedrooms, bathrooms, floor area, type, furnishing, description, amenities, map, reviews, the manager's card, and a contact form.
2. **Save** (heart): if not logged in → login prompt; otherwise toggles saved.
3. **Contact form**: name, phone (country code UG/RW/NG + number), message → "Message sent". Free renters can contact 3 new agents or landlords per month (see 4.15).
4. **Request viewing**: date, time and note. The viewing fee is capped for Paid renters (see 4.15).
5. **Reviews and the map** are Paid only for renters.

**Backend needs**

- `GET /listings/:id` — full detail including photos, coordinates, manager public profile.
- `POST /listings/:id/save`, `DELETE /listings/:id/save`, `GET /me/saved-listings`
- `POST /listings/:id/enquiries` → creates an **Enquiry** that appears in the agent's inbox (4.9).
- `POST /listings/:id/viewing-requests`, `GET /me/viewings`
- `GET /listings/:id/reviews`, `POST /listings/:id/reviews` (see 4.16)
- Note: the contact form offers **UG** (Uganda) but the rest of the app uses **KE** (Kenya). Confirm the country list.

### 4.4 Property request and saved searches

**User flow**: renter fills purpose (rent only), country, city/district, neighbourhood, property type, bedrooms, min/max budget (USD), move-in date, furnishing, full name, phone, email, notes, consent → "request sent". The renter can see and remove requests in `/renter-dashboard/saved-searches?tab=requests`.

Renters can also save searches. **Priority alert** on a request is Paid only.

**Current gap**: no partner or owner page reads these requests yet.

**Backend needs**: `POST /property-requests`, `GET /me/property-requests`, `DELETE /property-requests/:id`; `GET /property-requests` for partners (filtered to their market); `GET`/`POST`/`DELETE /me/saved-searches`.

### 4.5 Currency

The app is **not consistent yet**:

- Public listings and property requests use **USD**. The user can display them in **USD, RWF, NGN, KES**, using fixed browser rates (1 USD = 1450 RWF, 1600 NGN, 129 KES).
- Rentals, payments, payouts and viewing fees use **RWF**, often as formatted strings such as `"RWF 850,000"`.

**Backend needs**: `GET /exchange-rates` with a date, so the frontend can drop the hard-coded rates. Store an amount and a currency code on every money field. Which currency applies outside Rwanda is an open question (section 8).

### 4.6 FlatMat — flatmate discovery (renters)

The feature has moved from a per-listing connection model to **profile browsing with mutual interest**. There is no longer a listing-specific flatmate page.

**User flow**

1. Anyone can browse `/flatmates`. Each profile shows first name, age, occupation, city, budget, move-in, areas and lifestyle tags. **Photos need sign-in.**
2. A renter must publish their own profile at `/renter-dashboard/flatmates/profile`, with a phone and desktop preview.
3. On `/flatmates/[id]` the renter marks **interest**, and can withdraw it.
4. Interest received from others appears in `/renter-dashboard/flatmates/matches` (tabs: Matches, Received, Sent). The renter can answer "I'm interested too" or dismiss with "Not for me".
5. When interest is **mutual**, they are matched and **Message** opens a chat in `/renter-dashboard/messages`.

A profile has a situation: `looking` for a place, or `has-place` with details of the room (area, flatmates wanted, contribution, available from, room, shared spaces, household size, furnishing, household style). A profile can also link to one of the renter's rentals (`selectedRentalId`).

**Rules the server must enforce**

- Do not return a profile's photo to signed-out visitors.
- Only allow messages between two matched renters.
- Never return another user's interest list. A user may see only interest sent to them or by them.

**Backend needs**

- `GET /flatmates` with filters, `GET /flatmates/:id`
- `GET /me/flatmate-profile`, `PUT /me/flatmate-profile`, `POST /me/flatmate-profile/photo`
- `POST /flatmates/:id/interest`, `DELETE /flatmates/:id/interest`, `POST /flatmates/:id/not-for-me`
- `GET /me/flatmate-interests` (returns sent, received, matches)

### 4.7 Listing a property

A **property**, its **listing** and a **rental** are three separate records. A property can exist with no public listing. Owners add one at `/owner-dashboard/properties/new`, and partners attach a listing at `/partner-dashboard/properties/[id]/listing/new`. Team-assigned partners need the "Manage listing" responsibility. Independent partners need a Verified authorization (see 4.14).

**User flow** — 5 steps in the shared listing form (`list-property-form.tsx`):

1. **About you** — full name, I am a (Property manager / Agent), email, phone, agency name.
2. **Property** — title, property type, country, city, neighbourhood, exact street address, latitude, longitude, bedrooms, bathrooms, floor area m², furnishing, amenities (multi-select from ~50 in groups), description.
3. **Pricing** — purpose (For rent only), currency (USD only), price, payment period (per month / per year), available from, minimum stay (months).
4. **Photos** — multiple image upload.
5. **Review** — confirmation checkbox → submit.

"Save as draft" is available at any step.

**Listing statuses**: `Draft`, `In Review`, `Live`, `Paused`, `Archived`. A property with no listing shows `Not Listed`.

**Backend needs**

- `POST /properties`, `GET /properties/:id`, `PATCH /properties/:id`
- `POST /properties/:id/listing`, `PATCH /listings/:id`, `DELETE /listings/:id`
- `POST /listings/:id/pause`, `POST /listings/:id/archive`, `POST /listings/:id/unarchive`
- `POST /listings/:id/photos` (multipart or pre-signed upload URLs)
- `GET /me/properties`, `GET /me/listings?status=`
- `POST /listings/:id/boost` (Paid only; today it is local page state and a reload resets it)
- An **admin/moderation** process to move `In Review → Live`. No admin UI exists.

### 4.8 Partner verification

**User flow** — 5 steps on `/partner-dashboard/verification`:

1. **Personal identity** — legal first/last name, date of birth, nationality, ID type, document number, issuing country, issue & expiry date, occupation.
2. **Partner information** — partner type (Property manager / Agent), work arrangement (Independent / Agency), property relationship (Owner / Appointed manager / Both). If **Agency**: business name, role, authority, registration number, tax ID, business email/phone, website, address, and one or more **beneficial owners** (name, ownership %, nationality, ID number, phone). Agents: licence number, issuing authority, issue/expiry dates.
3. **Contact and address** — country, city, residential address, postal code, time at address, alternative contact name & phone.
4. **Supporting documents** — uploads. Always: ID front, selfie with ID, authority document, proof of address. Optional: ID back. Agency: business registration certificate, beneficial ownership declaration, representative authorization. Agent: professional licence. The **authority document** depends on the answers: agent → owner authorization/mandate; owner → proof of ownership; appointed manager → management agreement.
5. **Review and submit** → "Submission received. Verification under review."

Progress (current step, submitted) is kept in `localStorage` today.

**Backend needs**

- `GET /me/verification`, `PUT /me/verification` (save draft per step), `POST /me/verification/submit`
- `POST /me/verification/documents` (secure upload; these are identity documents — encrypt at rest, restrict access)
- Status values: `not_started`, `in_progress`, `submitted`, `needs_more_info`, `verified`, `rejected`
- A notification when status changes.

### 4.9 Enquiries, viewings & messages

**User flow**

1. Enquiries appear in `/partner-dashboard/enquiries` with status **New / Replied / Viewing Scheduled / Closed**.
2. The agent replies, schedules a viewing or closes the enquiry.
3. Each role reads one shared conversation store (`src/lib/messages-data.ts`). A conversation has two real participants and an optional context, such as a property, application, rental, rental setup or maintenance request.

Enquiries and viewings are scoped by access. A team member needs the "Manage enquiries & viewings" responsibility on that property.

**Backend needs**

- `GET /partner/enquiries?status=`, `PATCH /partner/enquiries/:id`, `POST /partner/enquiries/:id/reply`
- `POST /partner/viewings`, `GET /partner/viewings?from=&to=`, `PATCH /partner/viewings/:id`
- `GET /me/conversations`, `POST /conversations` (get or create by participants and context), `GET`/`POST /conversations/:id/messages`, `POST /conversations/:id/read`
- Unread counts per user
- One messaging system for all roles. `src/lib/message-threads.ts` still holds a second, renter-side store, which should merge into it.

### 4.10 Tenant applications & tenant history

**User flow (renter)**

1. `/renter-dashboard/applications/new` has 7 steps: About you, Rental needs, Employment, Household, References, Documents, Review. Drafts are saved.
2. The renter follows progress on `/renter-dashboard/applications/[id]`.

**User flow (owner, property manager, agent)**

1. Each role reviews applications in their dashboard.
2. A partner moves the status using the rules below. Every move is logged. Moving backwards needs a reason.
3. An agent can **recommend** Approve or Not Selected, but cannot decide.
4. The owner decides when the application requires owner approval, or when nobody holds "Review applications" on that property.
5. **Tenant history** is Paid only. Partners see an applicant's history (months rented, on-time payment %, past stays and landlord feedback). Owners see the past tenancies of a property.

**Application statuses** (`src/lib/application-status-machine.ts`):

```
Submitted ──▶ Under Review ⇄ Action Required
                   │                │
                   ▼                ▼
             Decision Pending ──▶ Approved ──▶ Completed
                   │                         (system only)
                   └──────────▶ Not Selected
```

- Approved and Not Selected can also be reached directly from Under Review or Action Required.
- `Submitted` and `Completed` are **system-only**. `Completed` is final.
- Rollbacks: Decision Pending → Under Review or Action Required; Action Required → Under Review; Approved or Not Selected → Under Review.
- The renter side adds `Draft` and `Withdrawn`.

**Current gap**: a submitted renter application is stored only under `hauxhunt-submission-<id>`, with a hard-coded id (`HH-APP-0261`). It never reaches the owner or partner dashboards.

**Backend needs**

- `POST /listings/:id/applications`, `GET`/`PUT` a draft, `POST /applications/:id/submit`, `POST /applications/:id/withdraw`, `POST /applications/:id/documents`
- `GET /me/applications`, `GET /partner/applications?status=`, `GET /owner/applications`
- `POST /applications/:id/transition` `{ to, reason? }`. **Enforce the status rules on the server**, and reject system-only targets. Port the graph directly.
- `POST /applications/:id/recommendation`
- `GET /applications/:id/history` (append-only audit log)
- `GET /tenants/:applicantId/history` and `GET /properties/:id/tenant-history` — **return 402/403 for Free plans**.
- Applications currently identify the applicant by display name. Use a real `applicantId`.
- Where history data comes from is a product decision still open.

### 4.11 Rental setup, rentals & rent payments

**User flow**

1. From an **Approved** application, the owner opens rental setup: monthly rent, deposit, start and end dates, payment due day, and agreement.
2. Sending it creates the **Rental** and an initial **Payment** (deposit + first month), and notifies the renter.
3. The renter reviews it at `/renter-dashboard/rental-setup/[id]`, then signs and pays, or declines.
4. When complete, the rental becomes `Upcoming` or `Active` (by start date), and the application moves to `Completed` automatically. The owner is notified.
5. If the renter declines, the setup is `Cancelled` and the rental is `Ended`.

**Statuses**

- Rental setup: `Draft`, `Sent to Renter`, `Completed`, `Cancelled`
- Rental: `Upcoming`, `Active`, `Ending Soon`, `Ended`
- Payment: `Due`, `Pending`, `Paid`, `Failed`, `Overdue`

The renter's, owner's and property manager's screens must all read the same Rental and Payment records. `src/data/renter-rentals.ts` is a separate renter-side dataset that needs merging into them.

**Backend needs**

- `POST /applications/:id/rental-setup`, `PATCH /rental-setups/:id`, `POST /rental-setups/:id/send`, `POST /rental-setups/:id/complete`, `POST /rental-setups/:id/decline`
- `GET /me/rentals`, `GET /rentals/:id`, `GET /rentals/:id/payments`
- `GET /me/payments`, `POST /payments/:id/pay`, payment-method endpoints, and a provider webhook
- Lease agreement storage and e-signature

### 4.12 Finance & payouts (property managers)

**User flow**: `/partner-dashboard/finance` has three tabs:

- **Payments** — rent records for the properties the manager handles, with a property filter.
- **Billing Schedules** — active rentals and due dates. Paid only.
- **Payouts** — Paid only. Manage destinations, request a payout and follow its status.

**Payout flow**

1. Add a destination: mobile money (MTN/Airtel), local bank, SWIFT or card.
2. Request an amount. It cannot exceed the balance, which is paid payments minus non-failed payout requests.
3. See the fee, then confirm with a one-time code.
4. Status moves through `Requested`, `Processing`, `Successful` or `Failed`. A failed payout gives a reason.

**Fees in the UI**: mobile money 1% capped at RWF 1,000; local bank RWF 1,000; SWIFT RWF 15,000; card 2.5%.

**Security**: never store a full card number. The frontend keeps only the brand and last 4 digits, and the real value should go to a PCI-compliant provider as a token. Bank and mobile-money details need encryption at rest.

**Backend needs**

- `GET /partner/payments`, `GET /partner/billing-schedules`
- `GET`/`POST`/`DELETE /partner/payout-destinations`, `GET /partner/balance`
- `POST /partner/payouts/quote`, `POST /partner/payouts`, `GET /partner/payouts`
- Real one-time-code delivery by SMS or email
- Owner payout details (`/owner-dashboard/account`) need the same treatment

### 4.13 Maintenance

**User flow**

1. A Paid renter reports an issue: category, area, urgency (`Normal` or `Urgent`) and description. Free renters see an upgrade prompt.
2. The owner or property manager updates it and may schedule a visit.
3. The renter follows it at `/renter-dashboard/maintenance/[id]`, and may be asked for more information.

**Statuses**: `Submitted`, `Under Review`, `Scheduled`, `In Progress`, `Waiting for Renter`, `Resolved`, `Cancelled`.

**Current gap**: the owner page still reads an older, narrower dataset (`OWNER_MAINTENANCE`) with different statuses. The API should use one record for all roles.

**Backend needs**: `POST /maintenance-requests` (reject Free plans), `GET /me/maintenance-requests`, `GET /properties/:id/maintenance-requests`, `PATCH /maintenance-requests/:id`.

### 4.14 Teams & property access

This is the core permission model. **A professional account exists on its own.** It can belong to zero, one or several teams, and can also hold independent authorizations.

A professional gets access to a property in one of two ways, and these must stay separate records:

| Source                      | How it works                                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TEAM_ASSIGNMENT`           | Owner invites a professional → they accept → they become a team member with **no properties** → owner assigns a property → owner grants responsibilities for that property |
| `INDEPENDENT_AUTHORIZATION` | Professional submits a property with the off-platform owner's details and proof document → HauxHunt reviews it (`Under Review`, `Verified`, `Needs Attention`, `Rejected`) |

**Team rules**

- Membership and property assignment are separate. Being on a team grants no property access.
- Responsibilities are per property: Manage listing; Manage enquiries & viewings; Review applications; Manage rental setup; Manage active rentals; Track rent payments; Handle maintenance; Communicate with renters.
- A property manager with `canManageAgents` may invite agents and assign them, but only within properties they manage themselves. The agent still joins the **owner's** team.
- Record who invited and who assigned. The owner can always override.
- An owner must never see another team's people or a professional's independent work.

**Statuses**: invitation `Pending`, `Accepted`, `Declined`, `Cancelled`; membership `Active`, `Left`, `Removed`; assignment `Active`, `Removed`.

**Backend needs**

- `GET /owner/team`, `POST /owner/team/invitations`, `POST /team-invitations/:id/accept`, `POST /team-invitations/:id/decline`, `POST /team-invitations/:id/cancel`
- `GET /professionals?role=&q=` (search registered professionals)
- `PATCH`/`DELETE /team-memberships/:id`
- `POST /properties/:id/assignments`, `PATCH`/`DELETE /assignments/:id`
- `GET /me/teams`, `GET /me/property-access` (merged, computed read; do not store a third access table)
- `POST /independent-properties`, `POST /authorizations/:id/review` (admin)
- **Check property access and responsibility on every partner endpoint.** The checks are in `src/lib/pm-work.ts` and `canManageListingFor`.

### 4.15 Plans (Free / Paid)

The plan values are `free` and `paid`. All rules are in `src/lib/access-control.ts`, written so a server can reuse them. **They must be enforced on the server**, because today the user flips their own plan with a demo toggle.

| Role                     | Paid unlocks                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Renter                   | Unlimited new agent/landlord contacts (Free: 3 per calendar month; repeat contacts do not count), map view and exact location, house reviews, priority alert on requests, maintenance requests, WhatsApp alerts, viewing fee capped at RWF 5,000 |
| Owner                    | Verified badge, full tenant history for a property, in-app rent collection, bank attachment, property boost, WhatsApp alerts                                                                                                                     |
| Property manager / agent | Verified badge, applicant tenant history, in-app rent collection, bank attachment, property boost, WhatsApp alerts                                                                                                                               |

**Backend needs**

- `plan` on `GET /me`, subscription and billing endpoints, and a payment provider webhook
- Return 402/403 for locked actions, and server-side tracking of the monthly contact cap
- A real per-listing viewing fee. The UI currently derives a demo fee from the property id.
- WhatsApp delivery (a provider is needed)

### 4.16 House reviews

Paid renters can read and write a review of a home: rating 1–5 and text. Reviews are in `localStorage`. There is no moderation.

**Backend needs**: the endpoints in 4.3, a rule for who may review (the lock message says a renter who has rented or visited), and moderation.

### 4.17 Language

The UI supports **English, French and Kinyarwanda** (`en`, `fr`, `rw`). English is the fallback. The choice is stored in the browser. Public sections and the renter dashboard are translated; the owner and partner dashboards are mostly English.

**Backend needs**: return **stable codes** for statuses and errors, not display text, so the frontend can translate them. Store a language preference on the profile if emails or SMS should use it.

### 4.18 Performance, notifications, settings

- **Performance**: per period: views, saves, enquiries, trend chart and per-listing stats, for owners and partners. → `GET /partner/performance?period=`, `GET /owner/performance?period=`. You need to **record listing view and save events** to compute this.
- **Notifications**: each role has its own list with read and clear actions. Many actions create one, such as "Payment received". → `GET /me/notifications`, `POST /me/notifications/:id/read`, `DELETE /me/notifications/:id`, plus server-side creation of these events.
- **Settings**: profile, partner and agency details, payout details, notification channels and plan. → `PATCH /me`, `POST /me/avatar`, billing endpoints.
- **Feedback**: `/feedback` currently goes nowhere. → `POST /feedback`.

---

## 5. Data model (first draft)

Derived from the types in `src/lib/*.ts`, `src/data/*.ts` and the form fields. Names are suggestions.

```
User                 id, role (renter|owner|property_manager|agent), fullName, email,
                     phone, country, passwordHash, avatarUrl, plan (free|paid),
                     language, createdAt

PartnerProfile       userId, partnerType, workArrangement (independent|agency),
                     propertyRelationship (owner|appointed_manager|both), agencyName

Verification         userId, status, personal{…}, business{…}, address{…},
                     submittedAt, reviewedAt
BeneficialOwner      verificationId, name, ownershipPct, nationality, idNumber, phone
VerificationDocument verificationId, kind, fileUrl

Team                 id, name, ownerId
TeamInvitation       id, teamId, professionalId, role, status, invitedById, invitedAt
TeamMembership       id, teamId, professionalId, role, status, canManageAgents, joinedAt
PropertyAssignment   id, teamId, propertyId, professionalId, role, responsibilities[],
                     status, assignedById
OwnerAuthorization   id, propertyId, professionalId, professionalRole, ownerName,
                     ownerPhone, ownerEmail, proofDocumentUrl, status, submittedAt,
                     reviewedAt

Property             id, ownerId?, title, type, country, city, neighbourhood,
                     streetAddress, lat, lng, bedrooms, bathrooms, units, areaM2,
                     furnishing, amenities[], createdAt
Listing              id, propertyId, status (draft|in_review|live|paused|archived),
                     title, description, purpose (rent), priceAmount, currency,
                     paymentPeriod (month|year), availableFrom, minimumStayMonths,
                     viewingFee, verified, boostedUntil, createdAt, updatedAt
ListingPhoto         listingId, url, position
ListingRevision      listingId, changes, status (pending|approved|rejected)
ListingEvent         listingId, kind (view|save|enquiry), viewerId?, at
HouseReview          id, propertyId, authorId, rating (1–5), body, createdAt

SavedListing         userId, listingId
SavedSearch          id, userId, query, filters, createdAt
PropertyRequest      id, renterId?, country, city, neighbourhood, propertyType,
                     bedrooms, minBudget, maxBudget, currency, moveInDate,
                     furnishing, fullName, phone, email, notes, priorityAlert
Enquiry              id, propertyId, professionalId, renterId?, name, phone,
                     message, status (new|replied|viewing_scheduled|closed)
Viewing              id, enquiryId?, propertyId, renterId, professionalId,
                     startsAt, fee, currency, status, note

Application          id, listingId, propertyId, applicantId, status, form{…},
                     handledById, requiresOwnerApproval, recommendation,
                     recommendedById, source (team_assignment|independent_authorization),
                     submittedAt
ApplicationDocument  applicationId, kind, fileUrl
ApplicationEvent     id, applicationId, from, to, actorId, actorRole, reason, at
TenantStay           tenantId, propertyId?, propertyTitle, location, durationMonths,
                     landlordRating (1–5), landlordComment, onTimePayments

RentalSetup          id, applicationId, propertyId, initiatedById, status, monthlyRent,
                     securityDeposit, currency, startDate, endDate, paymentDueDay,
                     agreementUrl, rentalId?
Rental               id, propertyId, renterId, status, rent, currency, startDate,
                     endDate, agreementStatus, depositStatus
Payment              id, rentalId, propertyId, renterId, purpose, amount, currency,
                     status, paidAt, method, reference, managedById
MaintenanceRequest   id, propertyId, reportedById, managedById, title, category, area,
                     urgency, status, description, latestUpdate, informationNeeded,
                     resolution, scheduledVisit{…}, submittedAt, completedAt
PayoutDestination    id, professionalId, type (mobile_money|local_bank|swift|card),
                     label, details{…} (tokenized card, never a full number)
PayoutRequest        id, professionalId, destinationId, amount, fee, net, currency,
                     status (requested|processing|successful|failed), failureReason,
                     requestedAt

FlatmateProfile      userId, published, bio, occupation, city, country, situation
                     (looking|has-place), budgetMin, budgetMax, moveIn, areas[],
                     lifestyleTags[], lookingFor[], preferences{…},
                     livingArrangement{…}?, rentalId?, photoUrl
FlatmateInterest     fromUserId, toUserId, createdAt     (mutual = matched)
FlatmateDismissal    userId, targetUserId

Conversation         id, participantIds[], contextType?, contextId?, createdAt
Message              id, conversationId, senderId, text, sentAt
ConversationRead     conversationId, userId, lastReadAt
Notification         id, userId, category, title, body, actionLabel, actionHref,
                     readAt, clearedAt, createdAt
Feedback             id, userId?, topic, rating, message, attachmentUrl, createdAt
```

**Important about IDs**: many records now use real ids (`propertyId`, `professionalId`), but listings still use **slugs** (`kacyiru-2br`), and some demo code still uses display names: applicants on applications and `renter` on rentals and payments. Please give every entity a real `id`; the frontend will be updated to use it.

**Money**: rentals and payments mix formatted strings (`"RWF 850,000"`) with numeric `amountValue` fields. The API should return a number plus a currency code, and let the UI format.

---

## 6. Browser storage that the API must replace

Unless marked **local**, keys are in `sessionStorage`.

| Area                 | Keys                                                                                                                                                                                                                                                                                         | Replace with                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Session              | `hauxhunt-authenticated-role`, `hauxhunt-tier`, `hauxhunt-partner-role` (local)                                                                                                                                                                                                              | Auth session/token + `GET /me`                            |
| Testing              | `hauxhunt-preview-professional-id` (local)                                                                                                                                                                                                                                                   | Remove; it is the "Preview As" switcher                   |
| Saved items          | `hauxhunt-saved-properties` (local), `hauxhunt-saved-searches` (local), `hauxhunt:property-requests` (local)                                                                                                                                                                                 | Saved listings, saved searches and property requests APIs |
| Viewings             | `hauxhunt-viewing-requests` (local), `hauxhunt-viewings`, `hauxhunt-enquiries`                                                                                                                                                                                                               | Enquiries and viewings APIs                               |
| Reviews and limits   | `hauxhunt-house-reviews` (local), `hauxhunt-tenant-contacted-agents` (local)                                                                                                                                                                                                                 | Reviews API; server-side monthly cap                      |
| Verification         | `hauxhunt-partner-verification-step`, `-status` (local)                                                                                                                                                                                                                                      | Verification API                                          |
| Applications         | `hauxhunt-application-<propertyId>` (local draft), `hauxhunt-submission-<id>`, `hauxhunt-application-overrides`, `hauxhunt-application-status-history`, `hauxhunt-independent-applications`                                                                                                  | Applications API + audit log                              |
| Rentals and payments | `hauxhunt-rental-setup-drafts`, `hauxhunt-rental-overrides`, `hauxhunt-rental-additions`, `hauxhunt-payment-overrides`, `hauxhunt-payment-additions`                                                                                                                                         | Rental setup, rentals and payments APIs                   |
| Maintenance          | `hauxhunt-maintenance-overrides`, `hauxhunt-maintenance-additions`                                                                                                                                                                                                                           | Maintenance API                                           |
| Teams and access     | `hauxhunt-team-invitations`, `hauxhunt-team-memberships`, `hauxhunt-team-assignments`, `hauxhunt-independent-properties`, `hauxhunt-owner-authorizations`, `hauxhunt-professional-listings`, `hauxhunt-owner-property-edits`                                                                 | Team, property and authorization APIs                     |
| Flatmates            | `hauxhunt-flatmate-profile-data`, `hauxhunt-has-flatmate-profile`, `hauxhunt-flatmate-interests`, `hauxhunt-flatmate-received-interests`, `hauxhunt-flatmate-not-for-me`                                                                                                                     | FlatMat APIs                                              |
| Messages             | `hauxhunt-conversations`, `hauxhunt-messages-read-ids`, and the renter thread store in `message-threads.ts`                                                                                                                                                                                  | Conversations API                                         |
| Notifications        | `hauxhunt-notification-read-ids`, `hauxhunt-notification-cleared-ids`, `hauxhunt-renter-session-notifications`, `hauxhunt-owner-notification-read-ids`, `hauxhunt-owner-session-notifications`, `hauxhunt-professional-notification-read-ids`, `hauxhunt-professional-session-notifications` | Notifications API                                         |
| Account and payouts  | `hauxhunt-owner-personal-info`, `hauxhunt-owner-notification-preferences`, `hauxhunt-owner-payout-details`, `hauxhunt-partner-payout-details`, `hauxhunt-partner-whatsapp-alerts`, per-professional payout destinations and requests in `payouts.ts`                                         | Profile and payout APIs                                   |
| Display preferences  | `hauxhunt-display-currency` (local), `hauxhunt-locale` (local)                                                                                                                                                                                                                               | **Keep** in the browser; optionally sync to the profile   |

Keys ending in `-changed` or `-change` are browser events for same-tab updates, not stored data. They can go once the API is in place.

---

## 7. Recommended build order

Do it in this order — each step unlocks real data for a set of screens.

1. **Auth & users** — register, login, logout, `GET /me` with role and plan. Unlocks route protection and removes the demo emails.
2. **Plans & permissions** — port `access-control.ts`, and add the property access and responsibility checks. Every later endpoint depends on these.
3. **Listings (read)** — `GET /listings`, `GET /listings/:id`, with filters and coordinates. Unlocks home, catalogue, search, property detail, maps.
4. **Properties, listings (write), photo upload, moderation status.**
5. **Teams & independent authorizations** — invitations, memberships, assignments and review.
6. **Partner verification + secure document storage.**
7. **Saved items, enquiries, viewings, property requests** — unlocks the save button, contact form and agent inbox.
8. **Messaging** — one system for every role.
9. **Applications** — submission, status rules, audit log, tenant history.
10. **Rental setup, rentals, payments** — depends on a payment provider and agreement storage.
11. **Maintenance, then payouts and subscriptions.**
12. **FlatMat** — profiles, interests and matches, with its rules enforced server-side.
13. **Search parsing & ranking** on the server (move `parseQuery`/`matchListings` logic out of the browser).
14. **Analytics events → performance dashboards; notifications; WhatsApp alerts; reviews; exchange rates.**

For each step, the frontend work is: replace the seed data import from `src/data/*.ts` or `src/lib/*.ts` with an API call, and replace the browser storage helper with an API-backed one. Many `src/lib` modules already expose getters, updaters and `subscribeTo…` functions, so they are a natural seam for the API.

Useful frontend config: `NEXT_PUBLIC_SITE_URL` (see `.env.example`). Add an API base URL variable (e.g. `NEXT_PUBLIC_API_URL`) when the API exists.

---

## 8. Open questions for product / backend

1. Is the **Kenya / Uganda** country list final? (The contact form says UG, everything else says KE.)
2. **Sales**: `/buy` redirects away and some sale listings exist in data. Rent-only at launch?
3. **Currency**: which currencies apply to rent and fees in Nigeria and Kenya? Mobile money, banks, fees and the viewing cap are all Rwanda-specific today.
4. **Rental setup**: is it Owner-only? Code comments say so, but "Manage rental setup" is still a property manager responsibility.
5. **Application handling**: which applications can a property manager decide alone, and when must the owner decide?
6. Where does **tenant history** come from, and do renters consent to landlords seeing it?
7. Who **moderates** listings, verifications, independent authorizations and reviews? An admin tool is needed.
8. **Payments**: which provider for Paid subscriptions, rent collection, payouts and card tokenization (mobile money is common in these markets)? Does HauxHunt hold funds, and are the UI's payout fees final?
9. **Plans**: what are the prices and billing periods? Are all four roles on the same Free/Paid names?
10. **Viewing fees**: who sets them, who receives them, and does a Free renter pay online?
11. **Lease agreements**: who provides the template, and is an e-signature legally enough in each country?
12. **Property requests**: who should see them? No partner or owner page reads them today.
13. Is the **match %** on search results kept?

---

## 9. Where to look in the code

| Topic                                     | Files                                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Listing data + search parser              | `src/data/hero-search-demo.ts`                                                                                                                  |
| Catalogue filters & map                   | `src/components/listings/catalogue-page.tsx`, `src/components/renter/renter-map-catalogue.tsx`                                                  |
| Property detail                           | `src/app/properties/[id]/page.tsx`                                                                                                              |
| Auth                                      | `src/components/auth/authentication-form.tsx`                                                                                                   |
| Plans & paid gates                        | `src/lib/access-control.ts`, `src/hooks/use-tier.ts`, `src/components/tier/*`                                                                   |
| FlatMat                                   | `src/data/public-flatmates.ts`, `src/app/flatmates/*`, `src/app/renter-dashboard/flatmates/*`, `src/components/flatmates/*`                     |
| Listing form                              | `src/components/properties/list-property-form.tsx`                                                                                              |
| Owners, properties, rentals, payments     | `src/lib/owner-data.ts`, `src/lib/owner-property-summary.ts`                                                                                    |
| Teams                                     | `src/lib/team-data.ts`                                                                                                                          |
| Independent access                        | `src/lib/professional-properties.ts`                                                                                                            |
| Enquiries, viewings, partner applications | `src/lib/professional-work.ts`, `src/components/partner/agent-enquiries-workspace.tsx`                                                          |
| Permissions, rental setup                 | `src/lib/pm-work.ts`                                                                                                                            |
| Verification                              | `src/components/partner/partner-verification-form.tsx`                                                                                          |
| Applications                              | `src/lib/application-status-machine.ts`, `src/lib/application-workflow.ts`, `src/lib/application-history.ts`, `src/data/renter-applications.ts` |
| Tenant history                            | `src/lib/tenant-history.ts`, `src/components/partner/tenant-history-drawer.tsx`                                                                 |
| Finance & payouts                         | `src/components/partner/finance-workspace.tsx`, `src/lib/payouts.ts`                                                                            |
| Maintenance                               | `src/lib/maintenance-data.ts`                                                                                                                   |
| Messages                                  | `src/lib/messages-data.ts`, `src/lib/message-threads.ts`, `src/components/partner/agent-messages-workspace.tsx`                                 |
| Notifications                             | `src/lib/notifications.ts`, `src/lib/owner-notifications.ts`, and `src/lib/professional-work.ts`                                                |
| Performance                               | `src/components/partner/performance-dashboard.tsx`, `src/app/owner-dashboard/performance/page.tsx`                                              |
| Role helpers                              | `src/components/partner/use-partner-role.ts`, `src/components/partner/use-demo-professional.ts`                                                 |
| Language                                  | `src/lib/i18n/*`, `src/components/language/use-translation.ts`                                                                                  |
| Currency                                  | `src/components/currency/currency-selector.tsx`                                                                                                 |
