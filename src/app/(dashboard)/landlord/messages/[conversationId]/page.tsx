"use client";

// Landlords use the same message thread component as students.
// The thread auto-detects who's "me" and who's "the other party"
// via useAuth(), so the same code works for both roles.
export { default } from "@/app/(dashboard)/student/messages/[conversationId]/page";
