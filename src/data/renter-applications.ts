export type ApplicationStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Action Required"
  | "Decision Pending"
  | "Approved"
  | "Not Selected"
  | "Completed"
  | "Withdrawn";

export type RenterApplication = {
  id: string;
  propertyId: string;
  title: string;
  location: string;
  status: ApplicationStatus;
  date: string;
  representative: string;
  role: string;
  progress: number;
  message: string;
};

export const RENTER_APPLICATIONS: RenterApplication[] = [
  {
    id: "HH-APP-0241",
    propertyId: "kacyiru-2br",
    title: "Kacyiru Residence",
    location: "Kacyiru, Kigali",
    status: "Under Review",
    date: "Submitted 10 August 2026",
    representative: "Jean Mugisha",
    role: "Verified Property Manager",
    progress: 72,
    message: "Your application is currently being reviewed.",
  },
  {
    id: "HH-APP-0248",
    propertyId: "nyarutarama-2br",
    title: "Nyarutarama Garden Apartment",
    location: "Nyarutarama, Kigali",
    status: "Action Required",
    date: "Submitted 13 August 2026",
    representative: "Aline Uwase",
    role: "Verified Agent",
    progress: 64,
    message: "An updated reference document is needed.",
  },
  {
    id: "HH-APP-0250",
    propertyId: "remera-3br",
    title: "Remera Family House",
    location: "Remera, Kigali",
    status: "Decision Pending",
    date: "Submitted 14 August 2026",
    representative: "Sarah Uwase",
    role: "Verified Agent",
    progress: 90,
    message: "Your review is complete. A decision is pending.",
  },
  {
    id: "HH-APP-0239",
    propertyId: "kibagabaga-modern-family-home",
    title: "Modern Family Home",
    location: "Kibagabaga, Kigali",
    status: "Submitted",
    date: "Submitted 15 August 2026",
    representative: "Julien Mugisha",
    role: "Verified Property Manager",
    progress: 42,
    message: "Your application has been received.",
  },
  {
    id: "HH-DRAFT-018",
    propertyId: "remera-3br",
    title: "Kimihurura Modern Apartment",
    location: "Kimihurura, Kigali",
    status: "Draft",
    date: "Started 14 August 2026",
    representative: "Sarah Uwase",
    role: "Verified Agent",
    progress: 60,
    message: "Continue where you left off.",
  },
  {
    id: "HH-APP-0212",
    propertyId: "nyarutarama-garden-penthouse",
    title: "Nyarutarama Family Home",
    location: "Nyarutarama, Kigali",
    status: "Approved",
    date: "Approved 12 August 2026",
    representative: "Jean Mugisha",
    role: "Verified Property Manager",
    progress: 100,
    message: "Congratulations — your application has been approved.",
  },
  {
    id: "HH-APP-0198",
    propertyId: "kibagabaga-modern-family-home",
    title: "Kibagabaga Apartment",
    location: "Kibagabaga, Kigali",
    status: "Not Selected",
    date: "Decision 8 August 2026",
    representative: "Julien Mugisha",
    role: "Property Manager",
    progress: 100,
    message: "This application was not selected for this property.",
  },
  {
    id: "HH-APP-0174",
    propertyId: "gisenyi-lakefront-residence",
    title: "Gisenyi Lakefront Residence",
    location: "Gisenyi, Rwanda",
    status: "Withdrawn",
    date: "Withdrawn 4 August 2026",
    representative: "Aline Uwase",
    role: "Agent",
    progress: 100,
    message: "You withdrew this application.",
  },
];
