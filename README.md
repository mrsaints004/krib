# Krib

A trusted platform for Nigerian university students to find, book, and manage verified off-campus housing.

**Nothing hidden, everything checked** — all listings are physically inspected with defects disclosed upfront. Contact details are hidden until a booking is confirmed, and all messaging is server-mediated to prevent off-platform scams.

## Features

- **Verified listings** with mandatory defect disclosure
- **Role-based dashboards** for students, landlords, and admins
- **Server-mediated messaging** with content filtering (phone numbers, emails, platform handles are redacted before booking)
- **Multi-step registration** with school selection and email verification
- **Admin verification queue** for approving listings and users
- **Booking system** with facilitation fee calculation
- **Maintenance request tracking** for tenants
- **Google OAuth** and email/password authentication
- **Mobile-first responsive design**

## Tech Stack

- **Framework:** Next.js 14 (App Router, React 18, TypeScript)
- **Database & Auth:** Supabase (PostgreSQL, RLS, Auth, Storage, Realtime)
- **Styling:** Tailwind CSS with custom design tokens
- **Animation:** Framer Motion
- **Validation:** Zod, custom validators
- **Testing:** Vitest
- **CI/CD:** GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/krib.git
   cd krib
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file from the example:
   ```bash
   cp .env.local.example .env.local
   ```

4. Fill in your Supabase credentials in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   SUPABASE_SECRET_KEY=your-service-role-key
   ```

5. Run the database migrations in your Supabase project (files in `supabase/migrations/`, apply in order).

6. Set up Supabase Storage buckets (see [Supabase Storage Setup](#supabase-storage-setup) below).

6. Start the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |

## Project Structure

```
src/
  app/            # Next.js App Router pages and API routes
    (marketing)/  # Landing page
    (auth)/       # Login, register, email verification
    (dashboard)/  # Student, landlord, and admin dashboards
    api/          # Server-side API routes (message filtering)
    auth/         # OAuth callback handler
  components/     # Reusable UI components and layouts
  lib/            # Auth provider, Supabase clients, validation, utilities
  types/          # Shared TypeScript domain types
  __tests__/      # Unit tests

supabase/
  migrations/     # SQL schema, RLS policies, triggers
```

## Supabase Storage Setup

Create two storage buckets in your Supabase project (Storage > New bucket):

| Bucket | Public? | Purpose |
|--------|---------|---------|
| `listing-photos` | Yes (public) | Listing images, maintenance request photos |
| `verification-documents` | No (private) | ID documents, proof of ownership uploads |

For `listing-photos`, enable public access so images can be served directly. `verification-documents` should remain private — files are accessed via signed URLs generated server-side.

## Auth Rate Limiting

The app includes client-side rate limiting (5 failures → 30-second lockout) on login and registration forms. For production, also configure server-side rate limits in your Supabase dashboard:

- **Supabase Dashboard > Authentication > Rate Limits** — set limits for sign-in, sign-up, and password reset requests per hour.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details on the anti-disintermediation design, verification model, and security approach.

## Supported Schools

- Federal University Oye-Ekiti (FUOYE) — active
- Ekiti State University (EKSU) — coming soon
- Federal University of Technology, Akure (FUTES) — coming soon
- Bamidele Olumilua University, Ikere-Ekiti (BOUESTI) — coming soon

## License

All rights reserved.
