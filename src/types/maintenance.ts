export type MaintenanceStatus =
  | "submitted"
  | "acknowledged"
  | "technician_assigned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "disputed";

export type MaintenanceCategory =
  | "plumbing"
  | "electrical"
  | "carpentry"
  | "structural"
  | "appliance"
  | "other";

export interface MaintenanceRequest {
  id: string;
  bookingId: string;
  studentId: string;
  listingId: string;
  category: MaintenanceCategory;
  description: string;
  photoUrls: string[];
  videoUrl?: string;
  status: MaintenanceStatus;
  isStudentCaused: boolean; // determines who covers repair cost
  assignedTechnicianId?: string;
  createdAt: string;
  resolvedAt?: string;
}
