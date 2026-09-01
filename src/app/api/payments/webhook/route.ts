import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseServer";

/**
 * Paystack webhook handler.
 * Verifies the webhook signature and updates booking status on successful payment.
 *
 * Configure this URL in your Paystack dashboard:
 *   https://yourdomain.com/api/payments/webhook
 */
export async function POST(req: NextRequest) {
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  // Verify Paystack signature
  const signature = req.headers.get("x-paystack-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const expectedSignature = createHmac("sha512", paystackSecretKey)
    .update(rawBody)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle successful charges
  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference = event.data.reference as string | undefined;
  const metadata = event.data.metadata as { booking_id?: string } | undefined;

  if (!reference || !metadata?.booking_id) {
    console.error("Webhook missing reference or booking_id for event:", event.event);
    return NextResponse.json({ received: true });
  }

  const bookingId = metadata.booking_id;

  // Verify the payment amount matches the booking
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, total_amount, payment_status")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    console.error("Webhook: booking not found:", bookingId);
    return NextResponse.json({ received: true });
  }

  // Prevent double-processing
  if (booking.payment_status === "paid") {
    return NextResponse.json({ received: true });
  }

  // Verify amount matches (Paystack amount is in kobo)
  const rawAmount = event.data.amount;
  const paidAmount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
  if (!Number.isFinite(paidAmount) || paidAmount !== booking.total_amount) {
    console.error(
      `Amount mismatch: expected ${booking.total_amount}, got ${paidAmount}. Booking ${bookingId} NOT confirmed.`
    );
    // Do NOT mark as paid — acknowledge the webhook but skip the update
    return NextResponse.json({ received: true });
  }

  // Atomic update: only mark paid if currently unpaid (prevents race conditions)
  const { error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      payment_status: "paid",
      status: "confirmed",
      paystack_reference: reference,
    })
    .eq("id", bookingId)
    .eq("payment_status", "unpaid");

  if (updateError) {
    console.error("Failed to update booking:", updateError.message);
    // Return 500 so Paystack retries
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
