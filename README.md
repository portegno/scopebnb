# ScopeBnB

Rent a world-class telescope under **Bortle 1** skies in **Texas**.

A remote-astrophotography platform with two product lines:

1. **Managed Imaging** (`/imaging`, `/book`) — for beginners. Pick a target by night-sky
   availability, frame it on a real image of the sky with a rotatable camera field-of-view
   overlay, and our team captures the data. Delivered as calibrated FITS within 24h.
2. **Remote Control** (`/remote-control`) — for advanced imagers. Rent the rig and drive it
   yourself with N.I.N.A.

## The rig

William Optics RedCat 91 (91mm f/4.9 APO) · ZWO AM5N mount · ZWO ASI2600MC cooled color
camera · ZWO CAA motorized rotator · Optolong L-Extreme narrowband · ZWO EAF · ASUS NUC
running N.I.N.A. Wide field of view ≈ 3.0° × 2.0°.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Storage) — clients in `src/lib/supabase/`
- **Aladin Lite** (CDS Strasbourg) for the framing tool — `public/framer/index.html`
- Deploy target: Vercel

## Project layout

```
src/
  app/            App Router pages (one folder per route)
  components/     Shared UI (header, footer, primitives)
  config/         Site config: brand, nav, footer
  data/           Demo/seed data, separated from the UI
  lib/supabase/   Browser + server Supabase clients
public/framer/    Standalone Aladin Lite framing tool (opened in a popup from /book)
```

Demo data lives in `src/data/` and is deliberately kept separate from the UI, so it can be
swapped for live Supabase queries without touching components.

## Getting started

```bash
cp .env.local.example .env.local   # fill in your Supabase project values
npm run dev                        # http://localhost:3000
```

## Status

Scaffold complete: all routes navigable, the managed-imaging booking flow drives the Aladin
Lite framer (camera rotation → RA/Dec/rotation posted back to the booking page). Auth,
bookings persistence and Stripe checkout are stubbed and come next.
