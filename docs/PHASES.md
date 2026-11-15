# Phases

Fits the 4-hour plan in [TASKS.md](TASKS.md). Main flow first (login > order > kitchen > bill), extras after. Keep the app runnable after every phase.

## Phase 0 — Setup (0:00–0:30)
**Tasks**
- Ask before installing: `react`, `react-dom`, `react-router-dom`, `lucide-react`, and the Vite React plugin.
- Move the Vite starter files into the structure from [AGENTS.md](../AGENTS.md).
- Put font, text sizes, colors, radius and shadows in the config ([DESIGN.md](DESIGN.md)).
- One Supabase client, `.env` filled in.
- Build base components: Button, Modal, IconButton, Tooltip, EmptyState, Toast, ConfirmDialog.
- Create the Supabase project and run `supabase/schema.sql` (structure in [DATABASE.md](DATABASE.md)).

**Done when:** the app opens with an empty shell and the database has all tables.

## Phase 1 — Login and roles (0:30–1:00)
**Tasks**
- Login page and logout.
- Protected routes and role-based home ([ROLES.md](ROLES.md)).
- Side bar / bottom bar showing only allowed links.
- Staff page (list, set name and role, turn off). Logins are made in the Supabase dashboard.

**Tables:** `profiles`
**Test:** log in as each of the 4 sample users; each lands on its own home page. A turned-off user can't log in.

## Phase 2 — Menu and tables (1:00–1:30)
**Tasks**
- Menu page: groups and items, popup forms, sold-out switch.
- Tables page: add, edit, turn off.
- Settings page (name, address, phone, tax %).
- Load sample menu and tables ([SAMPLE_DATA.md](SAMPLE_DATA.md)).

**Tables:** `categories`, `menu_items`, `dining_tables`, `settings`
**Test:** admin adds an item, switches it to sold out, it shows greyed for the captain.

## Phase 3 — Orders, Captain (1:30–2:15)
**Tasks**
- Tables page for Captain with status colors.
- New order page: menu groups, search, quantity, notes.
- Send to kitchen (table becomes busy).
- Add more items later, mark served, ask for bill, cancel.

**Tables:** `orders`, `order_items`
**Test:** captain sends an order for T3; T3 turns Busy; order has the right items and prices.

## Phase 4 — Kitchen (2:15–2:35)
**Tasks**
- Kitchen page with New, Preparing, Ready tabs.
- Mark item or whole order Preparing / Ready.
- Auto refresh. Order status follows items.

**Tables:** `orders`, `order_items`
**Test:** order shows in Kitchen without reload; after "Ready", captain sees the Ready badge.

## Phase 5 — Billing (2:35–3:05)
**Tasks**
- Bills page: To bill and Paid today.
- Bill page: tax, discount, total.
- Take payment (cash, card, UPI), change for cash.
- Print receipt from the browser.
- Table becomes free; paid order is locked.

**Tables:** `bills`, `payments`
**Test:** captain asks for bill; billing pays it; T3 is Free again; receipt prints with right totals.

## Phase 6 — Expenses and reports (3:05–3:30)
**Tasks**
- Expenses page with date filter and popup form.
- Dashboard (today at a glance).
- Reports: daily, monthly, top items, by payment method, expenses by category, profit.

**Tables:** `expense_categories`, `expenses`, report views
**Test:** totals match the sample data; adding an expense changes profit.

## Phase 7 — Polish and demo (3:30–4:00)
**Tasks**
- Empty, loading and error state on every list.
- Toast after every action; confirm before delete.
- Check phone width on every page.
- Sample data looks real.
- `pnpm dev` and `pnpm build` both work; no console errors or warnings.
- Run the full demo once with 3 browser windows (captain, kitchen, billing).

**Done when:** the demo script below runs with no stops.

## Demo script
1. Admin: show dashboard, menu, staff.
2. Captain: open T4, add 4 items, send.
3. Kitchen: mark Preparing, then Ready.
4. Captain: mark served, ask for bill.
5. Billing: add discount, pay by UPI, print receipt.
6. Admin: dashboard and reports show the new sale. Add an expense; profit changes.

## If time runs out
Drop in this order: monthly report, sales by method, receipt print, search in menu. Never drop the main flow.

## Decision: staff logins
Admin creates each login (email and password) in the Supabase dashboard. Then the Staff page sets the person's name and role, and turns them on or off. The app never creates logins, so no service key is needed.
