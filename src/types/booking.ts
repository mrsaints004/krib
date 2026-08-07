export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "disputed";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export interface Booking {
  id: string;
  listingId: string;
  studentId: string;
  landlordId: string;
  facilitationFee: number; // kobo, capped and transparent
  rentAmount: number; // kobo
  totalAmount: number; // kobo — facilitationFee + rentAmount
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paystackReference?: string;
  physicalInspectionRequested: boolean;
  physicalInspectionDate?: string;
  moveInDate?: string;
  createdAt: string;
  updatedAt: string;
}
