# UniNest — Folder Structure & Arrangement Guide

## The rule of thumb

Group by **feature/domain**, not by file type. When you're deep in the
booking flow, everything you need — page, types, logic — should be
findable without jumping across ten unrelated folders. This is the
difference between a codebase that stays navigable at 50 files vs. one
that turns to spaghetti.

## Current tree (what's already built)

```
uninest/
├── DESIGN_SYSTEM.md          → color/type/component rules — read before styling anything
├── FOLDER_STRUCTURE.md       → this file
├── README.md                 → Termux setup steps
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.mjs
└── src/
    ├── app/                              → routes (Next.js App Router — folder = URL path)
    │   ├── layout.tsx                    → root HTML shell, fonts loaded here
    │   ├── globals.css
    │   │
    │   ├── (marketing)/                  → public pages. Parens = doesn't affect the URL
    │   │   └── page.tsx                  → landing page → "/"
    │   │
    │   ├── (auth)/                       → not-logged-in flows
    │   │   ├── login/page.tsx            → "/login"
    │   │   ├── register/page.tsx         → "/register"
    │   │   └── verify/page.tsx           → "/verify" (matric no. + school email KYC)
    │   │
    │   └── (dashboard)/                  → logged-in flows, split by role
    │       ├── student/
    │       │   ├── listings/page.tsx     → browse/search listings
    │       │   ├── bookings/page.tsx     → student's own bookings
    │       │   └── maintenance/page.tsx  → maintenance requests
    │       ├── landlord/
    │       │   └── listings/page.tsx     → manage own properties
    │       └── admin/
    │           └── verification-queue/page.tsx  → approve/reject listings
    │
    ├── components/
    │   ├── ui/                → design-system primitives, reused everywhere
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── VerifiedStamp.tsx     → the signature element
    │   │   └── BracketFrame.tsx      → verified-photo frame motif
    │   └── layout/             → navbar, sidebar, footer (shared page chrome)
    │
    ├── types/                  → shared TypeScript types, one file per domain
    │   ├── user.ts             → User, StudentProfile, LandlordProfile, AdminProfile
    │   ├── listing.ts          → Listing, DefectItem
    │   ├── booking.ts          → Booking, BookingStatus, PaymentStatus
    │   └── maintenance.ts      → MaintenanceRequest, MaintenanceStatus
    │
    └── lib/                    → currently empty — see "what comes next" below
```

## What goes in `lib/` next (as we build features)

```
src/lib/
├── db.ts                → database client (Postgres via Supabase/Neon)
├── auth.ts              → session handling, matric/school-email verification logic
├── paystack.ts           → Paystack payment integration
└── validation/
    ├── listing.ts        → zod schema: what makes a listing valid before save
    ├── booking.ts
    └── user.ts
```

## What comes after that — `server/` (business logic layer)

As features grow, route files (`page.tsx`, `route.ts`) should stay
**thin** — they call into a `server/` layer, not touch the database
directly. This is the single habit that keeps a multi-module app (auth
+ listings + bookings + payments + maintenance + admin, all touching
the same data) from turning into duplicated logic scattered across
routes.

```
src/server/
├── services/            → business logic — "book a listing," "flag a defect"
│   ├── bookingService.ts
│   ├── listingService.ts
│   └── maintenanceService.ts
└── repositories/         → raw DB queries only, nothing else
    ├── bookingRepository.ts
    ├── listingRepository.ts
    └── userRepository.ts
```

**Flow:** route handler → service (business rules) → repository (DB
query). A route never queries the database directly — that's what
keeps "who can see this," "what counts as a valid booking," etc. in
one place instead of copy-pasted across every route that touches
bookings.

## Naming conventions to keep consistent

- Components: PascalCase (`VerifiedStamp.tsx`)
- Types/interfaces: PascalCase, one concept per file (`Listing`, not `Types.ts` with everything dumped in)
- Route folders: lowercase, kebab-case if multi-word (`verification-queue`)
- Functions in `services/`/`repositories/`: verbNoun (`createBooking`, `findListingById`)
