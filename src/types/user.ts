export type UserRole = "student" | "landlord" | "admin";

export interface BaseUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: string; // ISO date string
}

export interface StudentProfile extends BaseUser {
  role: "student";
  // Optional: many real users (pre-admission, awaiting JAMB placement)
  // won't have these yet. Never required to use the platform.
  matricNumber?: string;
  university?: UniversityCode;
  isVerified: boolean; // true only once an admin approves a submitted document
}

export type DocumentType =
  | "jamb_admission_letter"
  | "school_id"
  | "acceptance_letter"
  | "other";

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface VerificationDocument {
  id: string;
  profileId: string;
  documentType: DocumentType;
  fileUrl: string;
  note?: string;
  status: VerificationStatus;
  reviewedBy?: string; // admin's profile id
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface LandlordProfile extends BaseUser {
  role: "landlord";
  isPremium: boolean; // premium listing tier
  verifiedProperties: number;
}

export interface AdminProfile extends BaseUser {
  role: "admin";
  permissions: AdminPermission[];
}

export type AdminPermission =
  | "verify_properties"
  | "manage_disputes"
  | "reconcile_finance"
  | "dispatch_maintenance";

export type UniversityCode = "FUOYE" | "EKSU" | "FUTES" | "BOUESTI";

export type User = StudentProfile | LandlordProfile | AdminProfile;
