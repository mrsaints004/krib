# UniNest Design System

## Why this direction

UniNest's entire product promise is: *nothing hidden, everything checked.*
So the design shouldn't look like a generic Nigerian startup site or a
generic AI-generated one — it should look like a **verification
authority**: calm, precise, document-like. Think less "flashy real
estate app," more "the interface of an institution you'd trust with
your rent money."

Two design directions currently flood AI-generated UI: (1) warm cream
background + high-contrast serif + terracotta accent, and (2) near-black
background + a single acid-green or vermilion accent. UniNest avoids
both — the palette below is built from the product's own vocabulary
(verification, inspection, disclosure), not a generic template.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `ink-950` | `#0D1015` | Darkest surfaces (footer, dark sections) |
| `ink-900` | `#12151B` | Primary text, dark cards |
| `ink-800` | `#1E222B` | Secondary dark surfaces |
| `paper-50` | `#F7F5F0` | Main background |
| `paper-100` | `#EFEBE3` | Subtle background variation |
| `verified` | `#1E6F5C` | Primary accent — buttons, links, the verification stamp |
| `verified-dark` | `#154F42` | Hover states |
| `verified-light` | `#E4EFEC` | Success/verified backgrounds |
| `clay` | `#B08968` | Secondary accent — used **sparingly**, photo borders, dividers only |
| `signal` | `#B5423A` | Alerts, defect flags, disputes — **never** decorative |

**Rule:** `verified` (emerald) is the only accent used for interactive
elements. `clay` and `signal` each have exactly one job — don't let them
bleed into buttons or navigation.

## Typography

| Role | Font | Where |
|---|---|---|
| Display | **Fraunces** (serif, italic for emphasis) | Headlines only — h1/h2 |
| Body / UI | **Inter** | Everything else — paragraphs, nav, buttons, forms |
| Data / Mono | **IBM Plex Mono** | Prices, matric numbers, verification codes, receipts |

Using mono for prices and codes isn't decoration — it visually marks
that data as *exact and verifiable*, reinforcing the product's theme.

## Signature element: the Verification Stamp

A rotated (-6°), double-weight-bordered badge with a mono uppercase
label — `<VerifiedStamp />` in `src/components/ui/`. Used on:
- The hero section (establishes the theme immediately)
- Every verified listing card
- Completed bookings / resolved maintenance tickets

This is the *one* bold element. Everything else stays quiet around it.

## Secondary motif: the Bracket Frame

Corner brackets around listing photos (`<BracketFrame />`), like a
camera viewfinder. Signals "this was actually captured on an
inspection visit," not just uploaded by a landlord.

## Restraint rules

- One signature element (the stamp) — don't add a second competing
  "big idea."
- No gradients, no drop shadows beyond `shadow-sm`, no glassmorphism.
- Border radius: `rounded-md` (6px) as the default across buttons and
  cards — consistent, not maximalist, not sharp broadsheet corners.
- Motion: keep to simple hover-state transitions (`transition-colors`).
  No scroll animations for now — they read as decoration, not function,
  at this stage of the build.
