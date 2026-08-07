# UniNest — Database Architecture & Anti-Disintermediation Design

## Where this lives

```
supabase/migrations/
├── 0001_schema.sql            → tables, constraints
├── 0002_rls.sql                → row-level security policies
└── 0003_signup_trigger.sql     → auto-create profile on signup

src/lib/
└── messageFilter.ts            → server-side content scanning
```

Run these in order in the Supabase SQL Editor (or `supabase db push`
once you're set up with the CLI).

## Honest framing

You can't make it *impossible* for a landlord and student to exchange
a phone number and go deal directly on WhatsApp. Every marketplace
(Upwork, Airbnb, Turo) fights this and none of them have solved it
completely. What the schema below does is make bypassing the platform
**structurally inconvenient and strictly worse** for both sides — so
staying on-platform is the easy, obviously-better choice.

## Verification model: document review, not matric-number matching

Early design assumed a matric number as proof of enrollment. Dropped
that — a real chunk of users (pre-admission, awaiting JAMB placement,
between JAMB and matriculation) have no matric number yet, and
shouldn't be locked out of the platform for it.

Instead: `verification_documents` holds user-submitted proof (JAMB
admission letter, school ID, acceptance letter, or "other" + a note).
`profiles.is_verified` only flips to `true` when an admin approves a
submission — never automatically. This also means verification is a
**queue**, not a one-time signup gate, which matters since admin
review won't stay a one-person job forever.

`university` and `matric_number` on `profiles` are both optional —
self-declared, never required to sign up or use most of the platform.

## Architecture mechanisms, mapped to the schema

**1. Contact info is never queryable by the other party**
`profiles` holds `phone` (raw). The `public_profile` view excludes it
entirely. Any part of the UI showing "the landlord" to a student
queries the view, never the table. There's no code path where a
student's browser receives a landlord's phone number before a booking
exists.

**2. Exact address is hidden until booking**
`listings.exact_address` vs `listings.area_description` — students
browse and decide based on the area/photos/defects, not a precise
address they could visit and negotiate at directly. Address unlocks
functionally once a booking is created (for physical inspection
scheduling).

**3. All messaging is server-mediated, filtered, and un-bypassable**
This is the one I'd point to as the most important: there is
**deliberately no RLS insert policy** for `messages` on the
`authenticated` role. A student or landlord's browser *cannot* insert
a message directly into Supabase, no matter what the client code says
— the database itself refuses it. The only way a message gets created
is through your `/api/messages` server route, which runs
`filterMessageContent()` first, then inserts using the service-role
key. This closes the obvious loophole where someone opens dev tools
and calls the Supabase client directly to skip the filter.

**4. Escrow-style payment, not instant release**
`bookings.funds_released_at` stays null even after `payment_status =
'paid'`. The platform holds the money (via Paystack) until the student
confirms move-in matches what was disclosed. This is the actual
economic lever: leaving the platform after first contact means giving
up this protection entirely — cash paid directly to a landlord has
zero recourse if the room doesn't match the listing.

**5. Reputation only accrues on-platform**
`profiles.verified_properties_count` only increments through completed,
on-platform bookings. A landlord who convinces students to pay direct
gains nothing toward their visibility/premium ranking — so they have
an active incentive to keep deals in-app, not just a fee to tolerate.

## What I'd still want built (next steps, in order)

1. `/api/messages` route — calls `filterMessageContent()`, then
   inserts via service-role client
2. A "safety" banner in the chat UI reminding users why contact info
   is withheld (turns the restriction into a trust signal, not a
   frustration)
3. Admin view of `was_flagged = true` messages, for spotting repeat
   offenders (a landlord who keeps trying to share a number is a
   pattern worth knowing about, even if each individual message gets
   caught)

## What I will NOT recommend

- Trying to detect this via account bans on "suspicious" behavior
  before you have real usage data — you'll get false positives and
  frustrate legitimate users before you understand real patterns.
- Blocking phone numbers in listing photos (OCR on images) — real
  overhead for a problem that's better solved by the incentive design
  above, not brute-force detection.
