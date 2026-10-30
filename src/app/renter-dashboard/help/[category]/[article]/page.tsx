"use client";

import Link from "next/link";
import { use } from "react";
import { ChevronRight, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { RenterCatalogueTopBar } from "@/components/renter/renter-catalogue-top-bar";

// Article content keyed by "category/article"
const ARTICLES: Record<
  string,
  { title: string; category: string; categorySlug: string; body: { heading?: string; text: string }[] }
> = {
  "getting-started/create-account": {
    title: "How to create a RentUp account",
    category: "Getting Started",
    categorySlug: "getting-started",
    body: [
      { text: "Creating a RentUp account takes less than two minutes. Follow the steps below to get started." },
      { heading: "Step 1 — Go to the registration page", text: "Visit hauxhunt.com and click Sign Up in the top navigation, or go directly to /register." },
      { heading: "Step 2 — Choose Renter", text: "Select the Renter option when prompted to choose your account type." },
      { heading: "Step 3 — Enter your details", text: "Provide your full name, email address, phone number, and a secure password. Your password must be at least 8 characters." },
      { heading: "Step 4 — Verify your email", text: "Check your inbox for a 6-digit verification code and enter it on the verification screen." },
      { heading: "Step 5 — Complete your profile", text: "Add your location preferences, budget, and move-in date so RentUp can show you the most relevant listings." },
    ],
  },
  "getting-started/complete-profile": {
    title: "Completing your renter profile",
    category: "Getting Started",
    categorySlug: "getting-started",
    body: [
      { text: "A complete profile helps RentUp surface the most relevant listings and makes your applications more compelling to landlords." },
      { heading: "Step 1 — Go to your profile settings", text: "Open your dashboard and click Account in the sidebar, then select Personal Information." },
      { heading: "Step 2 — Add your location preferences", text: "Enter the cities or neighbourhoods you're interested in. You can add multiple areas." },
      { heading: "Step 3 — Set your budget", text: "Enter your monthly rent budget. This is used to filter listings and match you with compatible flatmates." },
      { heading: "Step 4 — Choose your move-in date", text: "Select when you're looking to move. Landlords use this to assess whether your timeline fits their availability." },
      { heading: "Step 5 — Upload a profile photo", text: "A clear photo builds trust with landlords and property managers. It also appears on your flatmate profile if you create one." },
      { heading: "Step 6 — Save your changes", text: "Click Save at the bottom of the page. Your profile is updated immediately." },
    ],
  },
  "getting-started/verify-identity": {
    title: "Verifying your identity",
    category: "Getting Started",
    categorySlug: "getting-started",
    body: [
      { text: "Identity verification helps keep RentUp safe for everyone. Verified renters are more likely to have their applications accepted." },
      { heading: "Why we verify renters", text: "Verification confirms you are who you say you are, which builds trust with landlords and reduces fraud on the platform." },
      { heading: "What you'll need", text: "A government-issued photo ID — such as a national ID card, passport, or driver's licence." },
      { heading: "Step 1 — Open verification", text: "Go to Account → Verification in your dashboard and click Start Verification." },
      { heading: "Step 2 — Upload your ID", text: "Take a clear photo of the front (and back if required) of your ID and upload it. Make sure all four corners are visible and the text is legible." },
      { heading: "Step 3 — Wait for review", text: "Verification is usually completed within 24 hours. You'll receive a notification once your identity has been confirmed." },
      { heading: "Step 4 — Get your badge", text: "Once verified, a badge will appear on your profile, signalling to landlords that your identity has been confirmed." },
    ],
  },
  "getting-started/download-app": {
    title: "Downloading the RentUp app",
    category: "Getting Started",
    categorySlug: "getting-started",
    body: [
      { text: "The RentUp mobile app lets you search for properties, track applications, and pay rent from your phone." },
      { heading: "Step 1 — Download the app", text: "On iPhone or iPad, open the App Store and search for RentUp, then tap Get. On Android, open the Google Play Store and tap Install. The app requires iOS 15 or Android 9 and above." },
      { heading: "Step 2 — Open the app and sign in", text: "Once installed, open RentUp and sign in with the same email and password you use on the website. All your data — saved properties, applications, and messages — will sync automatically." },
      { heading: "Step 3 — Enable notifications", text: "When prompted, allow notifications so you don't miss new listings, application updates, or messages from landlords." },
    ],
  },
  "getting-started/set-currency": {
    title: "Changing your display currency",
    category: "Getting Started",
    categorySlug: "getting-started",
    body: [
      { text: "RentUp supports multiple currencies so you can view prices in the currency that makes most sense to you. Supported options are Rwandan Franc (RWF), US Dollar (USD), Nigerian Naira (NGN), and Kenyan Shilling (KES)." },
      { heading: "Step 1 — Open the currency selector", text: "On the website, click the currency selector in the top navigation bar. In the app, tap the profile icon and go to Settings → Display Currency." },
      { heading: "Step 2 — Choose your currency", text: "Select your preferred currency from the list. The change applies immediately across all listings." },
      { heading: "How conversion works", text: "Prices are converted using live exchange rates. The original listing currency is always shown alongside the converted amount so there's no ambiguity." },
      { heading: "Note on payments", text: "Your display currency is for reference only. Actual payments are processed in the currency agreed with your landlord." },
    ],
  },
  "getting-started/notifications": {
    title: "Setting up notifications",
    category: "Getting Started",
    categorySlug: "getting-started",
    body: [
      { text: "Notifications keep you informed about new listings, application updates, messages, and payment reminders." },
      { heading: "Step 1 — Open notification preferences", text: "In your dashboard, navigate to Account → Notifications." },
      { heading: "Step 2 — Turn on email alerts", text: "Toggle on the types of email alerts you want — new listings matching your saved searches, application status changes, and rent payment reminders." },
      { heading: "Step 3 — Enable push notifications", text: "In the RentUp app, go to Settings → Notifications and enable push alerts. You can control each notification type individually." },
      { heading: "Step 4 — Set up SMS alerts", text: "Enter and verify your phone number to receive SMS alerts for urgent updates such as application decisions and payment confirmations." },
      { heading: "Turning off notifications", text: "You can disable any notification type at any time from the same Notifications settings page. Turning off all notifications is not recommended as you may miss important updates about your rental." },
    ],
  },
  "getting-started/dashboard-overview": {
    title: "Overview of your renter dashboard",
    category: "Getting Started",
    categorySlug: "getting-started",
    body: [
      { text: "Your renter dashboard is the central hub for everything related to your home search and active rental. Here's a quick tour." },
      { heading: "Home", text: "The main overview page shows your active rental, upcoming payments, and any pending actions that need your attention." },
      { heading: "Search & Listings", text: "Browse all available properties, apply filters, and switch between list and map views." },
      { heading: "Applications", text: "Track the status of every application you've submitted — from pending review to accepted or declined." },
      { heading: "My Rentals", text: "View details of your current and past rentals, including lease terms, rent amounts, and your property manager's contact information." },
      { heading: "Payments", text: "See upcoming and past rent payments, download receipts, and manage your payment methods." },
      { heading: "Maintenance", text: "Submit and track repair requests for your rental property." },
      { heading: "Messages", text: "All your conversations with landlords, agents, and property managers in one place." },
      { heading: "Saved", text: "Properties you've saved to favourites and searches you've set up for alerts." },
      { heading: "Find a Flatmate", text: "Browse flatmate profiles and manage your own flatmate listing." },
      { heading: "Account", text: "Update your personal information, security settings, and notification preferences." },
    ],
  },
  "getting-started/delete-account": {
    title: "Deleting your account",
    category: "Getting Started",
    categorySlug: "getting-started",
    body: [
      { text: "You can permanently delete your RentUp account at any time. Please read the information below before proceeding — this action cannot be undone." },
      { heading: "Before you delete", text: "Resolve any active rentals or pending applications, and settle any outstanding payments. Your profile, saved properties, saved searches, and message history will all be permanently removed." },
      { heading: "Step 1 — Go to account settings", text: "Navigate to Account → Settings in your dashboard." },
      { heading: "Step 2 — Click Delete Account", text: "Scroll to the bottom of the page and click Delete Account." },
      { heading: "Step 3 — Confirm deletion", text: "Read the confirmation message carefully, then enter your password to confirm. Your account will be permanently deleted." },
      { heading: "Need a break instead?", text: "If you just need a temporary break, consider deactivating your account instead. Your data will be preserved and you can reactivate at any time by signing back in." },
    ],
  },
  "search-and-listings/search-properties": {
    title: "How to search for properties",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "RentUp gives you several ways to find your ideal home — filters, keyword search, voice search, and a map view." },
      { heading: "Step 1 — Go to Search", text: "Click Search in the top navigation or go to /rent to open the listings page." },
      { heading: "Step 2 — Enter a location", text: "Type a city, neighbourhood, or area into the search bar. You can also use the voice button to speak your search." },
      { heading: "Step 3 — Apply filters", text: "Use the filter bar to narrow results by price range, number of bedrooms, move-in date, and property type." },
      { heading: "Step 4 — Browse results", text: "Scroll through the listing cards. Each card shows the price, location, key features, and photos." },
      { heading: "Step 5 — Switch to map view", text: "Click the Map button to see results plotted on an interactive map. Click any pin to preview that listing." },
    ],
  },
  "search-and-listings/save-property": {
    title: "How to save a property to favourites",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "Saving a property lets you quickly return to listings you're interested in without searching again." },
      { heading: "Step 1 — Save from the listings page", text: "Click the heart icon on any listing card. The icon turns solid to confirm the property has been saved." },
      { heading: "Step 2 — Or save from the property page", text: "Open a listing and click the Save button near the top of the page. Click it again at any time to unsave." },
      { heading: "Step 3 — View your saved properties", text: "Go to Saved in your dashboard sidebar, or navigate to /renter-dashboard/saved." },
      { heading: "Synced across devices", text: "Your favourites are tied to your account, so they'll appear on any device you sign in to." },
    ],
  },
  "search-and-listings/save-search": {
    title: "Saving a search for alerts",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "Save a search to get notified whenever a new property matching your criteria is listed." },
      { heading: "Step 1 — Run a search", text: "Apply the filters you want — location, price, bedrooms, move-in date — on the listings page." },
      { heading: "Step 2 — Save the search", text: "Click Save Search at the top of the results. Give it a name so you can identify it later." },
      { heading: "Step 3 — Choose alert frequency", text: "Select how often you want to be notified — instantly, daily, or weekly." },
      { heading: "Step 4 — Manage saved searches", text: "View and edit all your saved searches under Saved → Saved Searches in your dashboard." },
    ],
  },
  "search-and-listings/request-viewing": {
    title: "Requesting a property viewing",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "You can request a viewing directly through RentUp without needing to call or email the landlord separately." },
      { heading: "Step 1 — Open the listing", text: "Go to the property detail page for the home you'd like to visit." },
      { heading: "Step 2 — Click Request a Viewing", text: "Select the Request a Viewing button on the listing page." },
      { heading: "Step 3 — Choose a date and time", text: "Pick your preferred date and time slot from the available options." },
      { heading: "Step 4 — Add a note (optional)", text: "Include any questions or special requests for the landlord or agent." },
      { heading: "Step 5 — Submit the request", text: "Confirm your request. The landlord will be notified and will accept, decline, or propose an alternative time." },
      { heading: "Track your viewing requests", text: "Go to Visits in your dashboard to see the status of all your viewing requests." },
    ],
  },
  "search-and-listings/property-details": {
    title: "Understanding a property listing",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "Each listing page contains everything you need to evaluate a property before applying or requesting a viewing." },
      { heading: "Photos and gallery", text: "Swipe through the photo gallery to see the interior and exterior of the property." },
      { heading: "Price and billing", text: "The monthly rent is shown in your selected display currency. Some listings also show a security deposit amount." },
      { heading: "Property details", text: "Key facts including the number of bedrooms and bathrooms, floor area, furnishing status, and available date." },
      { heading: "Location", text: "The neighbourhood and city are listed. Some listings include a map pin showing the approximate location." },
      { heading: "Description", text: "The landlord or agent's description of the property, including any rules or special conditions." },
      { heading: "Landlord or agent info", text: "The listing shows who posted it. Verified landlords display a badge next to their name." },
    ],
  },
  "search-and-listings/map-view": {
    title: "Using the map view",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "The map view lets you browse properties by location, which is useful when proximity to a specific area matters." },
      { heading: "Step 1 — Switch to map view", text: "On the listings page, click the Map button in the top-right corner of the results area." },
      { heading: "Step 2 — Browse the map", text: "Drag and zoom the map to explore different areas. Each pin represents a listing." },
      { heading: "Step 3 — Preview a listing", text: "Click a pin to see a quick preview card with the price, bedrooms, and a thumbnail photo." },
      { heading: "Step 4 — Open the full listing", text: "Click the preview card to open the full property detail page." },
      { heading: "Filters apply to map view too", text: "Any filters you've set — price, bedrooms, move-in date — are reflected in the pins shown on the map." },
    ],
  },
  "search-and-listings/property-request": {
    title: "Creating a property request",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "A property request lets you describe what you're looking for so that landlords and agents can come to you with matching properties." },
      { heading: "Step 1 — Go to Property Request", text: "Navigate to /property-request or click Post a Request in the navigation." },
      { heading: "Step 2 — Describe your requirements", text: "Enter your preferred location, budget, number of bedrooms, move-in date, and any other requirements." },
      { heading: "Step 3 — Submit your request", text: "Click Submit. Your request will be visible to verified landlords and agents on RentUp." },
      { heading: "Receiving responses", text: "When a landlord or agent has a matching property, they'll send you a message through RentUp. You'll be notified by email and push notification." },
    ],
  },
  "search-and-listings/listing-unavailable": {
    title: "What to do if a listing is unavailable",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "If a property you're interested in is no longer available, here are your options." },
      { heading: "Check the listing status", text: "A listing marked as Unavailable or Let Agreed has already been taken. The landlord may re-list it in the future if circumstances change." },
      { heading: "Save a similar search", text: "Set up a saved search with the same filters. You'll be notified as soon as a comparable property is listed." },
      { heading: "Browse similar listings", text: "Scroll down on the unavailable listing page to see similar properties in the same area and price range." },
      { heading: "Post a property request", text: "Submit a property request describing what you need. Landlords with matching properties can reach out to you directly." },
      { heading: "Report incorrect availability", text: "If you believe a listing is incorrectly marked as available when it isn't, use the Report button on the listing page to flag it." },
    ],
  },
  "search-and-listings/currency-display": {
    title: "Viewing prices in your currency",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "You can view all listing prices in your preferred currency at any time." },
      { heading: "Step 1 — Open the currency selector", text: "Click the currency selector in the top navigation bar on the website, or go to Settings → Display Currency in the app." },
      { heading: "Step 2 — Choose your currency", text: "Select from RWF, USD, NGN, or KES. All prices on the page update immediately." },
      { heading: "How rates are calculated", text: "Prices are converted using live exchange rates updated daily. The original listing currency is always shown so you can verify the conversion." },
    ],
  },
  "search-and-listings/trending-locations": {
    title: "Trending locations on RentUp",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "RentUp highlights trending locations based on search activity and new listings. Here's what's popular right now." },
      { heading: "Kigali, Rwanda", text: "Kigali is RentUp's primary market. Popular neighbourhoods include Kimihurura, Kacyiru, Nyarutarama, and Remera, which offer a mix of furnished apartments and family homes." },
      { heading: "Lagos, Nigeria", text: "Lagos listings are concentrated in Lekki, Victoria Island, and Ikeja — areas popular with young professionals and expats." },
      { heading: "Nairobi, Kenya", text: "Nairobi listings cover Westlands, Kilimani, and Lavington, known for their proximity to business districts and amenities." },
      { heading: "How trending is determined", text: "Trending locations are updated weekly based on the volume of searches, saved properties, and new listings in each area." },
      { heading: "Browse a trending location", text: "Click any trending location on the homepage or search page to instantly filter listings to that area." },
    ],
  },
  "search-and-listings/furnished-vs-unfurnished": {
    title: "Furnished vs unfurnished listings",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "Understanding the difference between furnished and unfurnished listings will help you plan your move and budget accurately." },
      { heading: "Furnished", text: "A furnished property includes essential furniture — beds, sofas, dining table, wardrobes — and often white goods like a fridge and washing machine. It's ideal if you're moving without your own furniture or relocating from abroad." },
      { heading: "Unfurnished", text: "An unfurnished property is empty or has only fixed fittings like kitchen units and bathroom fixtures. You'll need to bring or buy your own furniture." },
      { heading: "Semi-furnished", text: "Some listings are semi-furnished, meaning they include some items but not a full set. The listing description will specify what's included." },
      { heading: "How to filter by furnishing", text: "Use the Furnishing filter on the search page to show only furnished, unfurnished, or semi-furnished listings." },
    ],
  },
  "search-and-listings/contact-landlord": {
    title: "Contacting a landlord or agent",
    category: "Search & Listings",
    categorySlug: "search-and-listings",
    body: [
      { text: "You can contact a landlord or agent directly from any listing page." },
      { heading: "Step 1 — Open the listing", text: "Go to the property detail page for the home you're interested in." },
      { heading: "Step 2 — Click Contact", text: "Click the Contact Landlord or Message Agent button on the listing." },
      { heading: "Step 3 — Write your message", text: "Introduce yourself and ask any questions you have about the property — availability, viewing times, or lease terms." },
      { heading: "Step 4 — Send", text: "Click Send. The landlord or agent will receive your message and can reply through RentUp Messages." },
      { heading: "Keep communication on RentUp", text: "For your safety, keep all conversations within RentUp. This protects you if a dispute arises and ensures our support team can assist if needed." },
    ],
  },
  "applications/submit-application": {
    title: "How to submit a rental application",
    category: "Apply to Rentals",
    categorySlug: "applications",
    body: [
      { text: "Submitting an application through RentUp is straightforward. Here's what to expect." },
      { heading: "Step 1 — Find a property", text: "Browse listings and open the property detail page for the home you're interested in." },
      { heading: "Step 2 — Click Apply", text: "Select the Apply button on the listing. You'll be taken to the application form." },
      { heading: "Step 3 — Fill in the form", text: "Provide your personal details, employment information, and any documents the landlord has requested, such as proof of income or a copy of your ID." },
      { heading: "Step 4 — Review and submit", text: "Check all your details carefully before submitting. Once submitted, the landlord will be notified immediately." },
      { heading: "Step 5 — Track your application", text: "Go to Applications in your dashboard to monitor the status of your submission." },
    ],
  },
  "applications/application-status": {
    title: "Checking your application status",
    category: "Apply to Rentals",
    categorySlug: "applications",
    body: [
      { text: "You can check the status of any application at any time from your dashboard." },
      { heading: "Step 1 — Go to Applications", text: "Navigate to Applications in your dashboard sidebar." },
      { heading: "Step 2 — Find your application", text: "Each application is listed with the property name, submission date, and current status." },
      { heading: "What the statuses mean", text: "Pending means the landlord hasn't reviewed it yet. Under Review means they're actively considering it. Accepted means you've been approved. Declined means the landlord has chosen another applicant." },
      { heading: "Getting notified", text: "You'll receive an email and push notification whenever your application status changes. Make sure notifications are enabled in your account settings." },
    ],
  },
  "applications/documents-required": {
    title: "Documents required for an application",
    category: "Apply to Rentals",
    categorySlug: "applications",
    body: [
      { text: "The documents required vary by landlord, but here's what's commonly asked for on RentUp." },
      { heading: "Proof of identity", text: "A government-issued photo ID such as a national ID card, passport, or driver's licence." },
      { heading: "Proof of income", text: "Recent payslips, a bank statement, or an employment letter confirming your salary. Self-employed applicants may need to provide tax returns or business bank statements." },
      { heading: "References", text: "Some landlords ask for a reference from a previous landlord or employer. RentUp lets you upload reference letters directly to your application." },
      { heading: "How to upload documents", text: "During the application process, you'll see an upload section for each required document. Accepted formats are PDF, JPG, and PNG." },
      { heading: "Keep documents ready", text: "Having your documents prepared before you apply speeds up the process and improves your chances of being accepted." },
    ],
  },
  "applications/withdraw-application": {
    title: "Withdrawing an application",
    category: "Apply to Rentals",
    categorySlug: "applications",
    body: [
      { text: "You can withdraw a pending application at any time before the landlord makes a decision." },
      { heading: "Step 1 — Go to Applications", text: "Navigate to Applications in your dashboard sidebar." },
      { heading: "Step 2 — Open the application", text: "Click on the application you want to withdraw." },
      { heading: "Step 3 — Click Withdraw", text: "Select the Withdraw Application button and confirm when prompted." },
      { heading: "After withdrawal", text: "The landlord will be notified that you've withdrawn. The application will be marked as Withdrawn in your dashboard and can no longer be reinstated." },
      { heading: "Already accepted?", text: "If your application has already been accepted, withdrawing it is treated as declining the offer. Contact support if you need help with this situation." },
    ],
  },
  "applications/multiple-applications": {
    title: "Applying to multiple properties",
    category: "Apply to Rentals",
    categorySlug: "applications",
    body: [
      { text: "Yes, you can apply to more than one property at the same time on RentUp." },
      { heading: "Why apply to multiple properties?", text: "The rental market moves quickly. Applying to several properties at once increases your chances of securing a home within your timeline." },
      { heading: "Tracking multiple applications", text: "All your active applications are listed in the Applications section of your dashboard, each with its current status." },
      { heading: "Once you're accepted", text: "When a landlord accepts your application, you should withdraw any other pending applications promptly as a courtesy to other renters and landlords." },
      { heading: "No limit on applications", text: "RentUp does not cap the number of applications you can have open at once." },
    ],
  },
  "applications/application-declined": {
    title: "What to do if your application is declined",
    category: "Apply to Rentals",
    categorySlug: "applications",
    body: [
      { text: "A declined application is disappointing, but it's not the end of your search. Here's what to do next." },
      { heading: "Check for a reason", text: "Some landlords include a reason for declining. If one is provided, use it to strengthen future applications — for example by adding missing documents or adjusting your budget." },
      { heading: "Keep your other applications active", text: "If you applied to multiple properties, your other applications are still live. Check their status in your Applications dashboard." },
      { heading: "Apply to similar properties", text: "Use your saved search or browse similar listings in the same area and price range." },
      { heading: "Complete your profile", text: "A fully completed profile with a verified identity and uploaded documents makes future applications more compelling." },
      { heading: "Contact support", text: "If you believe your application was declined unfairly or in violation of RentUp's policies, contact our support team." },
    ],
  },
  "applications/rental-invitation": {
    title: "Accepting a rental invitation",
    category: "Apply to Rentals",
    categorySlug: "applications",
    body: [
      { text: "A rental invitation means a landlord has approved your application and is offering you the property. Here's how to accept it." },
      { heading: "Step 1 — Check your notification", text: "You'll receive an email and push notification when a landlord sends you a rental invitation." },
      { heading: "Step 2 — Review the offer", text: "Go to Applications in your dashboard and open the invitation. Review the lease terms, start date, rent amount, and any conditions." },
      { heading: "Step 3 — Accept or decline", text: "Click Accept Invitation to confirm you want the property, or Decline if you've changed your mind or found somewhere else." },
      { heading: "Step 4 — Complete rental setup", text: "After accepting, you'll be guided through the rental setup process — signing the lease, paying the security deposit, and setting up your first rent payment." },
      { heading: "Invitation expiry", text: "Rental invitations expire after 48 hours if not responded to. If yours has expired, contact the landlord through Messages to ask if the offer still stands." },
    ],
  },
  "payments/pay-rent": {
    title: "How to pay rent through RentUp",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "RentUp makes it easy to pay rent securely from your dashboard." },
      { heading: "Step 1 — Go to Payments", text: "Navigate to Payments in your dashboard sidebar." },
      { heading: "Step 2 — Select the payment due", text: "Find the upcoming rent payment and click Pay Now." },
      { heading: "Step 3 — Choose a payment method", text: "Select from your saved payment methods — mobile money, card, or bank transfer — or add a new one." },
      { heading: "Step 4 — Confirm the payment", text: "Review the amount and due date, then confirm. You'll receive a receipt by email and in your dashboard." },
      { heading: "Processing times", text: "Mobile money payments are typically instant. Card and bank transfers may take 1–2 business days to process." },
    ],
  },
  "payments/payment-methods": {
    title: "Supported payment methods",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "RentUp supports several payment methods so you can pay rent in the way that's most convenient for you." },
      { heading: "Mobile money", text: "Pay using MTN Mobile Money, Airtel Money, or M-Pesa depending on your country. Payments are typically instant." },
      { heading: "Debit and credit cards", text: "Visa and Mastercard are accepted. Card payments are processed securely and usually reflect within 1–2 business days." },
      { heading: "Bank transfer", text: "Transfer directly from your bank account. Processing times vary by bank but are usually 1–3 business days." },
      { heading: "Adding a payment method", text: "Go to Payments → Payment Methods in your dashboard to add or manage your payment options." },
    ],
  },
  "payments/add-payment-method": {
    title: "Adding a payment method",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "You can add a payment method at any time from your dashboard." },
      { heading: "Step 1 — Go to Payment Methods", text: "Navigate to Payments → Payment Methods in your dashboard." },
      { heading: "Step 2 — Click Add Method", text: "Select Add Payment Method and choose the type you want to add — mobile money, card, or bank account." },
      { heading: "Step 3 — Enter your details", text: "For mobile money, enter your phone number and provider. For a card, enter the card number, expiry, and CVV. For a bank account, enter your account number and bank name." },
      { heading: "Step 4 — Verify", text: "Some methods require a verification step — for example, a small test transaction or a one-time code sent to your phone." },
      { heading: "Step 5 — Set as default (optional)", text: "Mark the new method as your default so it's pre-selected when you make future payments." },
    ],
  },
  "payments/payment-failed": {
    title: "What to do if a payment fails",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "If a rent payment fails, don't panic. Here's how to resolve it quickly." },
      { heading: "Check your payment method", text: "Make sure your mobile money account has sufficient balance, or that your card hasn't expired and has enough credit." },
      { heading: "Try again", text: "Go to Payments in your dashboard, find the failed payment, and click Retry." },
      { heading: "Try a different payment method", text: "If the same method keeps failing, switch to an alternative — for example, use a card instead of mobile money." },
      { heading: "Check for network issues", text: "Mobile money payments can fail due to temporary network outages. Wait a few minutes and try again." },
      { heading: "Contact support", text: "If the payment continues to fail and your due date is approaching, contact RentUp support immediately so we can help you avoid a late payment fee." },
    ],
  },
  "payments/receipts": {
    title: "Downloading payment receipts",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "A receipt is generated automatically for every successful rent payment on RentUp." },
      { heading: "Step 1 — Go to Payments", text: "Navigate to Payments in your dashboard sidebar." },
      { heading: "Step 2 — Open the payment", text: "Click on any completed payment to open its details." },
      { heading: "Step 3 — Download the receipt", text: "Click Download Receipt to save a PDF copy to your device." },
      { heading: "Receipts by email", text: "A receipt is also sent to your registered email address after every successful payment. Check your inbox or spam folder if you can't find it." },
    ],
  },
  "payments/payment-history": {
    title: "Viewing your payment history",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "Your full payment history is available in your dashboard at any time." },
      { heading: "Step 1 — Go to Payments", text: "Navigate to Payments in your dashboard sidebar." },
      { heading: "Step 2 — View the history tab", text: "Click the History tab to see a list of all past payments, including the date, amount, property, and status." },
      { heading: "Filtering history", text: "Use the date filter to narrow down payments by month or year." },
      { heading: "Downloading a statement", text: "Click Download Statement to export your payment history as a PDF — useful for tax records or proof of payment." },
    ],
  },
  "payments/late-payment": {
    title: "Late payment fees and policies",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "Paying rent on time is important. Here's what happens if a payment is late." },
      { heading: "Due date reminders", text: "RentUp sends you a reminder 3 days before your rent is due and again on the due date. Make sure notifications are enabled." },
      { heading: "Grace period", text: "Most landlords on RentUp allow a grace period of 1–5 days after the due date. The grace period for your rental is shown in your lease details." },
      { heading: "Late fees", text: "If payment is not received within the grace period, a late fee may be applied as specified in your lease agreement. The fee will appear as a separate charge in your Payments dashboard." },
      { heading: "Avoiding late payments", text: "Enable auto-pay in your payment settings to have rent deducted automatically on the due date." },
      { heading: "If you can't pay on time", text: "Contact your landlord or property manager through RentUp Messages as early as possible to discuss your situation." },
    ],
  },
  "payments/refunds": {
    title: "Requesting a refund",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "Refunds on RentUp are handled on a case-by-case basis depending on the circumstances." },
      { heading: "Duplicate payments", text: "If you were charged twice for the same payment, contact support immediately with the payment details. Duplicate charges are refunded within 3–5 business days." },
      { heading: "Overpayments", text: "If you paid more than the amount due, the excess will be credited to your next payment or refunded on request." },
      { heading: "Cancelled rentals", text: "If your rental is cancelled before you move in, any payments made through RentUp are subject to the cancellation policy agreed in your lease." },
      { heading: "How to request a refund", text: "Go to Payments, open the relevant payment, and click Request Refund. Provide a brief explanation and submit. Our team will review and respond within 2 business days." },
    ],
  },
  "payments/currency-conversion": {
    title: "Currency conversion and exchange rates",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "RentUp supports multi-currency display, but payments are always processed in the currency agreed with your landlord." },
      { heading: "Display currency vs payment currency", text: "Your display currency is for reference only — it helps you understand prices in a familiar currency. The actual payment is charged in the landlord's listed currency." },
      { heading: "Exchange rates", text: "Display prices are converted using live exchange rates updated daily. Rates are sourced from a reliable financial data provider." },
      { heading: "Foreign transaction fees", text: "If you pay with a card in a currency different from your card's home currency, your bank may charge a foreign transaction fee. Check with your bank for details." },
      { heading: "Changing your display currency", text: "Click the currency selector in the top navigation to switch between RWF, USD, NGN, and KES at any time." },
    ],
  },
  "payments/security-deposit": {
    title: "Security deposits on RentUp",
    category: "Pay Rent Online",
    categorySlug: "payments",
    body: [
      { text: "A security deposit is a one-time payment made at the start of a tenancy to protect the landlord against damage or unpaid rent." },
      { heading: "How much is the deposit?", text: "The deposit amount is set by the landlord and shown on the listing. It's typically equivalent to one or two months' rent." },
      { heading: "When is it paid?", text: "The deposit is paid during the rental setup process, after your application has been accepted and before you move in." },
      { heading: "How to pay the deposit", text: "Go to Rental Setup in your dashboard and follow the prompts to pay the deposit using your preferred payment method." },
      { heading: "Getting your deposit back", text: "At the end of your tenancy, the landlord will inspect the property. If there's no damage beyond normal wear and tear, your deposit will be returned within the timeframe specified in your lease." },
      { heading: "Deposit disputes", text: "If you disagree with a deduction from your deposit, contact RentUp support. We can help mediate between you and your landlord." },
    ],
  },
  "maintenance/report-issue": {
    title: "How to report a maintenance issue",
    category: "Maintenance",
    categorySlug: "maintenance",
    body: [
      { text: "If something in your rental needs fixing, you can report it directly from your dashboard." },
      { heading: "Step 1 — Go to Maintenance", text: "Navigate to Maintenance in your dashboard sidebar." },
      { heading: "Step 2 — Click Report an Issue", text: "Select the Report an Issue button at the top of the page." },
      { heading: "Step 3 — Fill in the details", text: "Choose the affected rental, select a category (e.g. Plumbing, Electrical), give the issue a title, and describe the problem." },
      { heading: "Step 4 — Add photos (optional)", text: "Attach photos to help the property manager understand the issue faster." },
      { heading: "Step 5 — Set urgency and access preferences", text: "Indicate whether the issue is urgent and whether someone can enter the property if you're not home." },
      { heading: "Step 6 — Submit the request", text: "Review your details and submit. The property manager will be notified immediately." },
    ],
  },
  "maintenance/track-request": {
    title: "Tracking a maintenance request",
    category: "Maintenance",
    categorySlug: "maintenance",
    body: [
      { text: "Once you've submitted a maintenance request, you can follow its progress from your dashboard." },
      { heading: "Step 1 — Go to Maintenance", text: "Navigate to Maintenance in your dashboard sidebar." },
      { heading: "Step 2 — Open the request", text: "Click on the request you want to track. You'll see its current status and any updates from the property manager." },
      { heading: "What the statuses mean", text: "Open means the request has been submitted and is awaiting review. In Progress means a repair has been scheduled or is underway. Resolved means the issue has been fixed. Closed means the request has been completed and signed off." },
      { heading: "Getting updates", text: "You'll receive a notification whenever the status of your request changes. You can also add comments or photos to the request at any time." },
    ],
  },
  "maintenance/urgent-issues": {
    title: "Reporting urgent maintenance issues",
    category: "Maintenance",
    categorySlug: "maintenance",
    body: [
      { text: "Some maintenance issues require immediate attention. Here's how to escalate them." },
      { heading: "What counts as urgent?", text: "Urgent issues include flooding, gas leaks, total loss of electricity, broken locks, or anything that poses a safety risk to you or the property." },
      { heading: "Step 1 — Submit a request and mark it urgent", text: "Go to Maintenance → Report an Issue and toggle the Urgent switch before submitting. This flags the request for immediate attention." },
      { heading: "Step 2 — Message your property manager", text: "Send a direct message to your property manager through RentUp Messages to make sure they're aware of the urgency." },
      { heading: "Step 3 — In a life-threatening emergency", text: "If there is an immediate risk to life — such as a fire or gas explosion — call your local emergency services first before contacting RentUp." },
    ],
  },
  "maintenance/add-photos": {
    title: "Adding photos to a maintenance request",
    category: "Maintenance",
    categorySlug: "maintenance",
    body: [
      { text: "Photos help your property manager understand the issue quickly and arrange the right repair." },
      { heading: "Step 1 — When submitting a new request", text: "On the Report an Issue form, scroll to the Photos section and tap Add Photos. Select images from your device or take a new photo." },
      { heading: "Step 2 — On an existing request", text: "Open the request from your Maintenance dashboard, scroll to the bottom, and click Add Photos to attach additional images." },
      { heading: "Tips for good photos", text: "Take photos in good lighting and make sure the issue is clearly visible. Include a wide shot for context and a close-up of the specific problem." },
      { heading: "Accepted formats", text: "JPG and PNG images are accepted. Each photo must be under 10 MB." },
    ],
  },
  "maintenance/cancel-request": {
    title: "Cancelling a maintenance request",
    category: "Maintenance",
    categorySlug: "maintenance",
    body: [
      { text: "If an issue has resolved itself or you no longer need a repair, you can cancel the request." },
      { heading: "Step 1 — Go to Maintenance", text: "Navigate to Maintenance in your dashboard sidebar." },
      { heading: "Step 2 — Open the request", text: "Click on the request you want to cancel." },
      { heading: "Step 3 — Click Cancel Request", text: "Select Cancel Request and confirm when prompted. The property manager will be notified." },
      { heading: "Already in progress?", text: "If a repair is already underway, contact your property manager through Messages before cancelling to avoid any unnecessary costs." },
    ],
  },
  "maintenance/contact-manager": {
    title: "Contacting your property manager about maintenance",
    category: "Maintenance",
    categorySlug: "maintenance",
    body: [
      { text: "You can message your property manager directly from within a maintenance request." },
      { heading: "Step 1 — Open the request", text: "Go to Maintenance in your dashboard and click on the relevant request." },
      { heading: "Step 2 — Use the message thread", text: "Each request has a built-in message thread. Type your message and click Send to communicate directly with your property manager." },
      { heading: "Or use Messages", text: "You can also go to Messages in your dashboard and find the conversation with your property manager to send a message outside of a specific request." },
      { heading: "Response times", text: "Property managers are expected to respond to maintenance messages within 24 hours. For urgent issues, mark the request as urgent to prompt a faster response." },
    ],
  },
  "flatmates/create-profile": {
    title: "How to create a flatmate profile",
    category: "Flatmates",
    categorySlug: "flatmates",
    body: [
      { text: "A flatmate profile lets other renters find you when they're looking for someone to share a home with." },
      { heading: "Step 1 — Go to Find a Flatmate", text: "Navigate to Find a Flatmate → My Flatmate Profile in your dashboard." },
      { heading: "Step 2 — Fill in your details", text: "Add your name, age, occupation, city, budget, and preferred areas." },
      { heading: "Step 3 — Add lifestyle tags", text: "Select tags that describe your lifestyle — such as Early riser, Pet-friendly, or Non-smoker — to help find compatible matches." },
      { heading: "Step 4 — Upload a profile photo", text: "A photo increases the chances of other renters reaching out to you." },
      { heading: "Step 5 — Publish your profile", text: "Click Publish to make your profile visible in the flatmate directory. You can unpublish at any time." },
    ],
  },
  "flatmates/browse-flatmates": {
    title: "Browsing flatmate profiles",
    category: "Flatmates",
    categorySlug: "flatmates",
    body: [
      { text: "The flatmate directory shows renters who are actively looking for someone to share a home with." },
      { heading: "Step 1 — Go to Find a Flatmate", text: "Navigate to Find a Flatmate in your dashboard sidebar, or go to /flatmates." },
      { heading: "Step 2 — Browse profiles", text: "Scroll through the profile cards. Each card shows the person's name, age, occupation, city, budget, and lifestyle tags." },
      { heading: "Step 3 — Filter results", text: "Use the filters to narrow profiles by location, budget, move-in date, gender, and lifestyle preferences." },
      { heading: "Step 4 — Open a profile", text: "Click on a card to see the full profile, including areas of interest and a short bio." },
      { heading: "Match scores", text: "If you have a published flatmate profile, each person will show a match score based on how compatible your budgets, areas, and lifestyle tags are." },
    ],
  },
  "flatmates/match-score": {
    title: "Understanding your match score",
    category: "Flatmates",
    categorySlug: "flatmates",
    body: [
      { text: "The match score gives you a quick sense of how compatible you are with another renter as a potential flatmate." },
      { heading: "How it's calculated", text: "The score is based on three factors: budget overlap (40%), area overlap (35%), and lifestyle tag overlap (25%)." },
      { heading: "Budget overlap", text: "The closer your monthly budgets are, the higher the budget score. A large difference in budget lowers this component." },
      { heading: "Area overlap", text: "If you and the other person have listed the same preferred neighbourhoods or cities, your area score will be higher." },
      { heading: "Lifestyle tags", text: "The more lifestyle tags you share — such as Non-smoker, Early riser, or Pet-friendly — the higher the tag score." },
      { heading: "Improving your score", text: "Keep your flatmate profile up to date with accurate budget, areas, and lifestyle tags to get the most relevant match scores." },
    ],
  },
  "flatmates/contact-flatmate": {
    title: "Contacting a potential flatmate",
    category: "Flatmates",
    categorySlug: "flatmates",
    body: [
      { text: "When you find someone you'd like to share a home with, you can reach out to them directly through RentUp." },
      { heading: "Step 1 — Open their profile", text: "Click on the flatmate's card to open their full profile." },
      { heading: "Step 2 — Click Message", text: "Select the Message button on their profile page." },
      { heading: "Step 3 — Write your message", text: "Introduce yourself, mention what you're looking for, and explain why you think you'd be a good match." },
      { heading: "Step 4 — Send", text: "Click Send. The conversation will appear in your Messages dashboard. You'll be notified when they reply." },
    ],
  },
  "flatmates/remove-profile": {
    title: "Removing your flatmate profile",
    category: "Flatmates",
    categorySlug: "flatmates",
    body: [
      { text: "Once you've found a flatmate or no longer need one, you can unpublish your profile so it no longer appears in the directory." },
      { heading: "Step 1 — Go to My Flatmate Profile", text: "Navigate to Find a Flatmate → My Flatmate Profile in your dashboard." },
      { heading: "Step 2 — Click Unpublish", text: "Select the Unpublish button. Your profile will be removed from the directory immediately." },
      { heading: "Your data is kept", text: "Unpublishing does not delete your profile data. If you want to be listed again in the future, simply click Publish and your details will be restored." },
    ],
  },
  "messages/send-message": {
    title: "Sending a message on RentUp",
    category: "Messages",
    categorySlug: "messages",
    body: [
      { text: "RentUp Messages lets you communicate with landlords, agents, and property managers all in one place." },
      { heading: "Step 1 — Start from a listing", text: "The easiest way to start a conversation is from a property listing. Click Contact Landlord or Message Agent on the listing page." },
      { heading: "Step 2 — Or open Messages directly", text: "Go to Messages in your dashboard sidebar to start a new conversation or continue an existing one." },
      { heading: "Step 3 — Write and send", text: "Type your message and click Send. The recipient will be notified by email and push notification." },
      { heading: "Keep it on RentUp", text: "For your protection, keep all conversations within RentUp. This ensures our support team can assist if a dispute arises." },
    ],
  },
  "messages/message-notifications": {
    title: "Message notifications",
    category: "Messages",
    categorySlug: "messages",
    body: [
      { text: "RentUp notifies you whenever you receive a new message so you never miss an important update." },
      { heading: "Email notifications", text: "A notification email is sent to your registered address whenever you receive a new message. Check your spam folder if you're not receiving them." },
      { heading: "Push notifications", text: "If you have the RentUp app installed and notifications enabled, you'll receive a push alert on your phone for every new message." },
      { heading: "In-app badge", text: "The Messages icon in your dashboard shows an unread count badge so you can see at a glance when there are new messages." },
      { heading: "Adjusting notification settings", text: "Go to Account → Notifications to control how and when you're notified about new messages." },
    ],
  },
  "messages/block-user": {
    title: "Blocking a user",
    category: "Messages",
    categorySlug: "messages",
    body: [
      { text: "If someone is sending you unwanted or inappropriate messages, you can block them to stop further contact." },
      { heading: "Step 1 — Open the conversation", text: "Go to Messages in your dashboard and open the conversation with the person you want to block." },
      { heading: "Step 2 — Open options", text: "Click the three-dot menu at the top of the conversation." },
      { heading: "Step 3 — Click Block", text: "Select Block User and confirm. The person will no longer be able to send you messages." },
      { heading: "After blocking", text: "Blocked users are not notified that they've been blocked. You can unblock someone at any time from Account → Privacy Settings." },
    ],
  },
  "messages/report-message": {
    title: "Reporting an inappropriate message",
    category: "Messages",
    categorySlug: "messages",
    body: [
      { text: "If you receive a message that violates RentUp's community guidelines, please report it so our team can take action." },
      { heading: "Step 1 — Open the message", text: "Go to Messages and open the conversation containing the message you want to report." },
      { heading: "Step 2 — Select the message", text: "Long-press or hover over the specific message and click the flag icon or Report option." },
      { heading: "Step 3 — Choose a reason", text: "Select the reason for reporting — such as harassment, spam, fraud, or offensive content." },
      { heading: "Step 4 — Submit", text: "Click Submit. Our trust and safety team will review the report and take appropriate action, usually within 24 hours." },
      { heading: "Block the sender too", text: "If you feel unsafe, block the user as well to prevent further contact while the report is being reviewed." },
    ],
  },
  "trust-and-safety/avoid-fraud": {
    title: "How to avoid rental fraud",
    category: "Trust & Safety",
    categorySlug: "trust-and-safety",
    body: [
      { text: "Rental fraud is a real risk in any property market. Here's how to protect yourself on RentUp." },
      { heading: "Only pay through RentUp", text: "Never transfer money directly to a landlord's personal account before signing a lease. All legitimate payments on RentUp are processed through the platform." },
      { heading: "Watch for prices that seem too good", text: "If a listing is significantly cheaper than comparable properties in the same area, treat it with caution. Fraudsters often use unrealistically low prices to attract victims." },
      { heading: "Verify the landlord", text: "Look for the Verified badge on a landlord's profile. Verified landlords have had their identity and property ownership confirmed by RentUp." },
      { heading: "Never pay before viewing", text: "Avoid paying a deposit or rent before you've viewed the property in person or via a verified video tour." },
      { heading: "Keep communication on RentUp", text: "If someone asks you to move the conversation to WhatsApp, email, or another platform before you've signed a lease, be cautious. Legitimate landlords are happy to communicate through RentUp." },
      { heading: "Report suspicious listings", text: "If something feels off, use the Report button on the listing page to flag it for our team to review." },
    ],
  },
  "trust-and-safety/report-listing": {
    title: "Reporting a suspicious listing",
    category: "Trust & Safety",
    categorySlug: "trust-and-safety",
    body: [
      { text: "If you come across a listing that seems fraudulent, misleading, or in violation of RentUp's policies, please report it." },
      { heading: "Step 1 — Open the listing", text: "Go to the property detail page for the listing you want to report." },
      { heading: "Step 2 — Click Report", text: "Scroll to the bottom of the listing and click Report this Listing, or use the three-dot menu near the top of the page." },
      { heading: "Step 3 — Choose a reason", text: "Select the most appropriate reason — such as Fraudulent, Inaccurate information, Already rented, or Inappropriate content." },
      { heading: "Step 4 — Add details and submit", text: "Optionally add a note explaining your concern, then click Submit. Our team will review the report within 24 hours." },
    ],
  },
  "trust-and-safety/report-user": {
    title: "Reporting a user",
    category: "Trust & Safety",
    categorySlug: "trust-and-safety",
    body: [
      { text: "If another user has behaved inappropriately, you can report them to our trust and safety team." },
      { heading: "Step 1 — Go to their profile or conversation", text: "Open the user's profile page or the message thread where the behaviour occurred." },
      { heading: "Step 2 — Click Report", text: "Select the three-dot menu and click Report User." },
      { heading: "Step 3 — Choose a reason", text: "Select the reason — such as harassment, fraud, impersonation, or spam." },
      { heading: "Step 4 — Submit", text: "Add any relevant details and click Submit. Our team will review the report and take action if the behaviour violates our policies." },
      { heading: "Your report is confidential", text: "The reported user will not be told who reported them." },
    ],
  },
  "trust-and-safety/safe-payments": {
    title: "Making safe payments",
    category: "Trust & Safety",
    categorySlug: "trust-and-safety",
    body: [
      { text: "Paying through RentUp is the safest way to handle rent and deposits. Here's why and how." },
      { heading: "Always pay through the platform", text: "RentUp processes all payments securely. Never send money via bank transfer, mobile money, or cash directly to a landlord before your rental is set up on the platform." },
      { heading: "Receipts for every payment", text: "Every payment made through RentUp generates a receipt, giving you a clear record of what was paid and when." },
      { heading: "Dispute protection", text: "Payments made through RentUp are covered by our dispute resolution process. If a landlord fails to deliver on their obligations, our team can investigate and assist." },
      { heading: "Secure payment processing", text: "All card and mobile money transactions are encrypted and processed by certified payment providers. RentUp never stores your full card details." },
    ],
  },
  "trust-and-safety/data-privacy": {
    title: "Your data and privacy",
    category: "Trust & Safety",
    categorySlug: "trust-and-safety",
    body: [
      { text: "RentUp takes your privacy seriously. Here's a summary of how we handle your personal information." },
      { heading: "What we collect", text: "We collect the information you provide when registering and using RentUp — such as your name, email, phone number, and payment details — as well as usage data to improve the platform." },
      { heading: "How we use it", text: "Your data is used to operate the platform, match you with relevant listings, process payments, and communicate with you about your account and rentals." },
      { heading: "Who we share it with", text: "We share necessary information with landlords and agents when you apply for a property or request a viewing. We do not sell your personal data to third parties." },
      { heading: "Your rights", text: "You can request a copy of your data, ask us to correct inaccurate information, or request deletion of your account and data at any time from Account → Privacy Settings." },
      { heading: "Full privacy policy", text: "For complete details, read our Privacy Policy at hauxhunt.com/privacy." },
    ],
  },
  "trust-and-safety/account-security": {
    title: "Keeping your account secure",
    category: "Trust & Safety",
    categorySlug: "trust-and-safety",
    body: [
      { text: "Follow these best practices to keep your RentUp account safe." },
      { heading: "Use a strong password", text: "Choose a password that's at least 8 characters and includes a mix of letters, numbers, and symbols. Don't reuse passwords from other sites." },
      { heading: "Enable two-factor authentication", text: "Go to Account → Security and turn on two-factor authentication (2FA). This adds a second verification step when you sign in from a new device." },
      { heading: "Review active sessions", text: "Go to Account → Active Sessions to see all devices currently signed in to your account. Log out of any you don't recognise." },
      { heading: "Watch for phishing", text: "RentUp will never ask for your password by email or phone. If you receive a suspicious message claiming to be from us, do not click any links — report it to support@hauxhunt.com." },
      { heading: "Sign out on shared devices", text: "Always sign out of RentUp when using a shared or public device." },
    ],
  },
  "support/contact-support": {
    title: "How to contact support",
    category: "Customer Support",
    categorySlug: "support",
    body: [
      { text: "Our support team is available to help with any issue you can't resolve through the Help Center." },
      { heading: "Live chat", text: "Click the chat icon in the bottom-right corner of any page to start a live chat with a support agent. Available Monday to Friday, 8am–6pm (CAT)." },
      { heading: "Email", text: "Send an email to support@hauxhunt.com. Include your account email address and a clear description of the issue." },
      { heading: "In-app support", text: "In the RentUp app, go to Account → Help → Contact Support to send a message directly from the app." },
      { heading: "From your dashboard", text: "Go to Help → Customer Support in your renter dashboard and click Contact Support to open a support ticket." },
    ],
  },
  "support/response-times": {
    title: "Support response times",
    category: "Customer Support",
    categorySlug: "support",
    body: [
      { text: "Here's what to expect when you reach out to the RentUp support team." },
      { heading: "Live chat", text: "Live chat responses are typically within a few minutes during business hours (Monday to Friday, 8am–6pm CAT)." },
      { heading: "Email", text: "Email enquiries are usually responded to within 24 hours on business days. Complex issues may take up to 48 hours." },
      { heading: "Urgent issues", text: "If your issue is urgent — such as a failed payment on a due date or a security concern — use live chat for the fastest response." },
      { heading: "Outside business hours", text: "Messages sent outside business hours will be picked up on the next business day. For urgent out-of-hours issues, check the Help Center for self-service guidance." },
    ],
  },
  "support/submit-complaint": {
    title: "Submitting a complaint",
    category: "Customer Support",
    categorySlug: "support",
    body: [
      { text: "If you have a serious concern about RentUp or a landlord on the platform, here's how to formally raise it." },
      { heading: "Step 1 — Try to resolve it first", text: "For issues with a landlord or property manager, try messaging them directly through RentUp first. Many issues can be resolved quickly through direct communication." },
      { heading: "Step 2 — Contact support", text: "If the issue isn't resolved, contact our support team via live chat or email at support@hauxhunt.com. Describe the issue clearly and include any relevant screenshots or evidence." },
      { heading: "Step 3 — Submit a formal complaint", text: "For serious matters, go to Help → Contact Support in your dashboard and select Submit a Complaint. Fill in the complaint form with full details." },
      { heading: "What happens next", text: "Our team will acknowledge your complaint within 24 hours and aim to resolve it within 5 business days. You'll be kept updated throughout the process." },
    ],
  },
  "support/feedback": {
    title: "Sending product feedback",
    category: "Customer Support",
    categorySlug: "support",
    body: [
      { text: "We love hearing from renters. Your feedback helps us improve RentUp for everyone." },
      { heading: "In-app feedback", text: "In the RentUp app, go to Account → Help → Send Feedback. Rate your experience and leave a comment." },
      { heading: "From the dashboard", text: "Go to Help → Customer Support in your dashboard and click Send Feedback." },
      { heading: "Email", text: "You can also email your ideas and suggestions directly to feedback@hauxhunt.com." },
      { heading: "What we do with feedback", text: "All feedback is reviewed by our product team. While we can't respond to every submission individually, popular requests are regularly considered for upcoming releases." },
    ],
  },
  "account/update-profile": {
    title: "Updating your personal information",
    category: "Account & Settings",
    categorySlug: "account",
    body: [
      { text: "You can update your name, email, phone number, and country at any time from your account settings." },
      { heading: "Step 1 — Go to Personal Information", text: "Navigate to Account → Personal Information in your dashboard." },
      { heading: "Step 2 — Edit your details", text: "Click the field you want to update and enter the new information." },
      { heading: "Step 3 — Verify changes if required", text: "Changing your email or phone number requires verification. A code will be sent to the new address or number to confirm the change." },
      { heading: "Step 4 — Save", text: "Click Save. Your profile is updated immediately." },
    ],
  },
  "account/change-password": {
    title: "Changing your password",
    category: "Account & Settings",
    categorySlug: "account",
    body: [
      { text: "You should change your password if you think your account has been compromised or as a regular security practice." },
      { heading: "Step 1 — Go to Security", text: "Navigate to Account → Security in your dashboard." },
      { heading: "Step 2 — Click Change Password", text: "Select Change Password." },
      { heading: "Step 3 — Enter your current password", text: "Type your existing password to confirm your identity." },
      { heading: "Step 4 — Enter a new password", text: "Choose a new password of at least 8 characters. Use a mix of letters, numbers, and symbols for a stronger password." },
      { heading: "Step 5 — Save", text: "Click Save. You'll be signed out of other devices for security." },
    ],
  },
  "account/two-factor": {
    title: "Setting up two-factor authentication",
    category: "Account & Settings",
    categorySlug: "account",
    body: [
      { text: "Two-factor authentication (2FA) adds an extra layer of security by requiring a second verification step when you sign in from a new device." },
      { heading: "Step 1 — Go to Security", text: "Navigate to Account → Security in your dashboard." },
      { heading: "Step 2 — Enable 2FA", text: "Click Enable Two-Factor Authentication." },
      { heading: "Step 3 — Choose your method", text: "Select SMS (a code sent to your phone) or an authenticator app such as Google Authenticator or Authy." },
      { heading: "Step 4 — Verify setup", text: "Enter the code sent to your phone or shown in your authenticator app to confirm 2FA is working." },
      { heading: "Step 5 — Save backup codes", text: "Download or note your backup codes. These let you access your account if you lose access to your phone." },
    ],
  },
  "account/active-sessions": {
    title: "Managing active sessions",
    category: "Account & Settings",
    categorySlug: "account",
    body: [
      { text: "Active sessions shows every device currently signed in to your RentUp account." },
      { heading: "Step 1 — Go to Security", text: "Navigate to Account → Security in your dashboard." },
      { heading: "Step 2 — View active sessions", text: "Scroll to the Active Sessions section. Each session shows the device type, browser, location, and last active time." },
      { heading: "Step 3 — Log out a session", text: "Click Log Out next to any session you don't recognise or no longer use." },
      { heading: "Log out of all devices", text: "Click Log Out of All Devices to sign out everywhere at once. You'll need to sign back in on your current device." },
      { heading: "Unrecognised session?", text: "If you see a session you don't recognise, log it out immediately and change your password." },
    ],
  },
  "account/notification-preferences": {
    title: "Notification preferences",
    category: "Account & Settings",
    categorySlug: "account",
    body: [
      { text: "Control exactly which alerts you receive and how you receive them." },
      { heading: "Step 1 — Go to Notifications", text: "Navigate to Account → Notifications in your dashboard." },
      { heading: "Email notifications", text: "Toggle on or off email alerts for new listings, application updates, payment reminders, and messages." },
      { heading: "Push notifications", text: "Control push alerts in the RentUp app under Settings → Notifications. You can enable or disable each type individually." },
      { heading: "SMS notifications", text: "Enter and verify your phone number to receive SMS alerts for urgent updates. You can turn these off at any time." },
      { heading: "Changes save automatically", text: "Your preferences are saved as you toggle each setting — no need to click Save." },
    ],
  },
  "account/change-language": {
    title: "Changing your language",
    category: "Account & Settings",
    categorySlug: "account",
    body: [
      { text: "RentUp is available in English, French, and Kinyarwanda." },
      { heading: "Step 1 — Go to Preferences", text: "Navigate to Account → Preferences in your dashboard." },
      { heading: "Step 2 — Select a language", text: "Choose your preferred language from the Language dropdown." },
      { heading: "Step 3 — Save", text: "Click Save. The interface will update to your chosen language immediately." },
    ],
  },
  "account/change-currency": {
    title: "Changing your display currency",
    category: "Account & Settings",
    categorySlug: "account",
    body: [
      { text: "Your display currency controls how prices are shown across RentUp. You can change it at any time." },
      { heading: "Step 1 — Use the currency selector", text: "Click the currency selector in the top navigation bar and choose your preferred currency. This is the quickest way." },
      { heading: "Or go to Preferences", text: "Navigate to Account → Preferences and select your currency from the Display Currency dropdown, then click Save." },
      { heading: "Supported currencies", text: "RWF (Rwandan Franc), USD (US Dollar), NGN (Nigerian Naira), and KES (Kenyan Shilling)." },
    ],
  },
  "account/privacy-settings": {
    title: "Privacy settings",
    category: "Account & Settings",
    categorySlug: "account",
    body: [
      { text: "Privacy settings let you control what information is visible to landlords, agents, and other renters on RentUp." },
      { heading: "Step 1 — Go to Privacy Settings", text: "Navigate to Account → Privacy Settings in your dashboard." },
      { heading: "Profile visibility", text: "Control whether your renter profile is visible to landlords when you haven't applied to their property." },
      { heading: "Flatmate profile visibility", text: "Toggle your flatmate profile on or off without deleting it. When off, it won't appear in the flatmate directory." },
      { heading: "Data and personalisation", text: "Choose whether RentUp can use your activity data to personalise listing recommendations." },
      { heading: "Download your data", text: "Click Download My Data to request a copy of all the personal information RentUp holds about you." },
    ],
  },
  "account/delete-account": {
    title: "Deleting your account",
    category: "Account & Settings",
    categorySlug: "account",
    body: [
      { text: "You can permanently delete your RentUp account at any time. This action cannot be undone." },
      { heading: "Before you delete", text: "Resolve any active rentals or pending applications, and settle any outstanding payments. Your profile, saved properties, saved searches, and message history will all be permanently removed." },
      { heading: "Step 1 — Go to account settings", text: "Navigate to Account → Settings in your dashboard." },
      { heading: "Step 2 — Click Delete Account", text: "Scroll to the bottom of the page and click Delete Account." },
      { heading: "Step 3 — Confirm deletion", text: "Read the confirmation message carefully, then enter your password to confirm. Your account will be permanently deleted." },
      { heading: "Need a break instead?", text: "If you just need a temporary break, consider deactivating your account instead. Your data will be preserved and you can reactivate at any time by signing back in." },
    ],
  },
};

// Fallback for articles not explicitly defined
function getFallbackArticle(category: string, article: string) {
  const title = article
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const categoryTitle = category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return {
    title,
    category: categoryTitle,
    categorySlug: category,
    body: [
      { text: "This article is coming soon. In the meantime, our support team is happy to help." },
    ],
  };
}

export default function HelpArticlePage({
  params,
}: {
  params: Promise<{ category: string; article: string }>;
}) {
  const { category, article } = use(params);
  const key = `${category}/${article}`;
  const data = ARTICLES[key] ?? getFallbackArticle(category, article);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  return (
    <>
      <RenterCatalogueTopBar />
      <main className="bg-carbon-50 min-h-svh pt-16 text-black">
        <div className="mx-auto max-w-[860px] px-5 py-10 sm:px-6 lg:px-11 xl:px-[52px]">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-black/45">
            <Link href="/renter-dashboard/help" className="hover:text-black">Help Center</Link>
            <ChevronRight className="size-3.5" />
            <Link href={`/renter-dashboard/help/${data.categorySlug}`} className="hover:text-black">
              {data.category}
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-black">{data.title}</span>
          </nav>

          {/* Article */}
          <article className="mt-8 rounded-2xl bg-white px-7 py-9 shadow-[0_8px_24px_rgba(0,0,0,0.05)] sm:px-10 sm:py-11">
            <h1 className="font-bricolage text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
              {data.title}
            </h1>
            <div className="mt-8 space-y-6 text-sm leading-7">
              {data.body.map(({ heading, text }, i) => (
                <div key={i}>
                  {heading && (
                    <h2 className="font-bricolage mb-2 text-base font-medium">{heading}</h2>
                  )}
                  <p className="text-carbon-700">{text}</p>
                </div>
              ))}
            </div>

            {/* Feedback */}
            <div className="mt-12 border-t border-black/10 pt-8">
              {feedback ? (
                <p className="text-carbon-500 text-sm">Thanks for your feedback!</p>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-sm font-medium">Was this article helpful?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFeedback("up")}
                      className="flex h-9 items-center gap-2 rounded-full border border-black/15 px-4 text-sm transition-colors hover:bg-black/[0.04]"
                    >
                      <ThumbsUp className="size-4" /> Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedback("down")}
                      className="flex h-9 items-center gap-2 rounded-full border border-black/15 px-4 text-sm transition-colors hover:bg-black/[0.04]"
                    >
                      <ThumbsDown className="size-4" /> No
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* Back link */}
          <div className="mt-6">
            <Link
              href={`/renter-dashboard/help/${data.categorySlug}`}
              className="text-sm text-black/50 hover:text-black"
            >
              ← Back to {data.category}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
