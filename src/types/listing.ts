import type { UniversityCode } from "./user";

export type ListingStatus =
  | "draft"
  | "pending_verification"
  | "approved"
  | "rejected"
  | "archived";

export type RentPeriod = "monthly" | "quarterly" | "annual" | "custom";

export interface DefectItem {
  id: string;
  description: string;
  severity: "minor" | "moderate" | "major";
  photoUrls: string[];
}

export interface Listing {
  id: string;
  landlordId: string;
  title: string;
  description: string;
  university: UniversityCode;
  distanceToCampusKm: number;
  address: string;
  rentAmount: number; // in kobo, to avoid float rounding issues
  rentPeriod: RentPeriod;
  amenities: string[];
  genderPreference: "male" | "female" | "any";
  photoUrls: string[];
  videoWalkthroughUrl?: string;
  defects: DefectItem[]; // mandatory disclosure — can be empty, never omitted
  isPremium: boolean;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}
