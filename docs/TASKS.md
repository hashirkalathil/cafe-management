# Tasks

Update this file after every step. Mark `[x]` when done. Details for each phase are in [PHASES.md](PHASES.md).

## Phase 0 — Setup (0:00–0:30)
- [x] Ask before installing React, router, icons
- [x] Add font, text sizes, colors, radius and shadows to `tailwind.config.js` and `index.css`
- [x] Add Supabase client and `.env.example`
- [x] Build base components: Button, Modal, IconButton, Tooltip, EmptyState, Toast, ConfirmDialog
- [x] `supabase/schema.sql` with tables and Row Level Security

## Phase 1 — Login and roles (0:30–1:00)
- [x] Email and password login
- [x] Protected routes and role-based home
- [x] Staff page

## Phase 2 — Menu and tables (1:00–1:30)
- [x] Menu page (groups, items, sold-out switch)
- [x] Tables page
- [x] Settings page

## Phase 3 — Orders, Captain (1:30–2:15)
- [x] Tables with status colors
- [x] New order, send to kitchen
- [x] Add items, mark served, ask for bill, cancel

## Phase 4 — Kitchen (2:15–2:35)
- [x] Kitchen page with auto refresh
- [x] Mark Preparing and Ready

## Phase 5 — Billing (2:35–3:05)
- [x] Bills list
- [x] Bill page with tax and discount
- [x] Take payment and print receipt

## Phase 6 — Expenses and reports (3:05–3:30)
- [x] Expenses page
- [x] Dashboard
- [x] Daily and monthly reports

## Phase 7 — Polish and demo (3:30–4:00)
- [x] Empty, loading and error states on every list
- [x] Toasts after every action
- [x] Check on mobile width
- [x] Realistic sample data
- [x] `pnpm dev` and `pnpm build` both work
- [x] No console errors or warnings
- [x] Run through the demo once

## Done
All 8 phases built. Waiting for the owner to run `supabase/demo_data.sql` and do the final demo run.
