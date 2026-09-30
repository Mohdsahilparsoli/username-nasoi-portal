# NASOI – School Data Entry Portal (Frontend)

Next.js frontend for the NASOI data entry workflow: DEO registration (multi-step), login for three roles, and dashboards for Data Entry Operator, Verifier and Super Admin.

## Stack

| Purpose | Library |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS v4, shadcn-style components (Radix UI) |
| Icons | lucide-react |
| Server state | TanStack Query |
| Client state | Zustand (sessions, sidebar) |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Recharts |
| Toasts | Sonner |

All libraries are open source (MIT / ISC / Apache-2.0).

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Demo logins

| Role | ID | Password |
|---|---|---|
| DEO | `DEO126` (or `9717323761`) | `Abcd@2026` |
| Verifier | `VR101` | `Abcd@2026` |
| Super Admin | `ADMIN` | `Admin@2026` |

DEO, Verifier and Admin can stay logged in together in one browser (one tab each); changes sync live between tabs.

## Structure

```
src/
├── app/
│   ├── (public)/        home, about, services, terms, login, register
│   ├── deo/             DEO dashboard, profile, work, entries, earnings
│   ├── verifier/        verify queue, approved, rejected, profile
│   └── admin/           overview, operators, assign, assignments, entries, payouts, settings
├── features/            per-feature hooks and components
│   ├── registration/    6-step registration wizard + Zod schemas
│   ├── auth/  entries/  assignments/  users/  settings/
├── components/ui        buttons, form controls, dialog, data table, badges…
├── components/layout    site header/footer, dashboard shell (sidebar + role guard)
├── lib/api              API layer (see below)
├── lib/mock             temporary browser database
├── stores               Zustand stores
└── types                shared types
```

## Backend hand-off

Every page gets data through React Query hooks that call `src/lib/api/index.ts`.
Today those functions use a mock database in `localStorage` (`src/lib/mock/db.ts`).
When the Express backend is ready, replace each function body with a `fetch()` to the endpoint written above it (e.g. `POST /api/v1/entries`). Pages and components do not need to change.
