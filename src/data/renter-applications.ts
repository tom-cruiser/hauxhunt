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

export const RENTER_APPLICATIONS: RenterApplication[] = [];
