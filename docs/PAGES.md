# Pages

## Routes
All routes live in one file. Every page except Login and Sign up needs a login. Opening a page the role can't use shows "You can't open this page".

| Route | Page | Roles |
|---|---|---|
| `/login` | Login | Everyone |
| `/signup` | Sign up (makes a new cafe) | Everyone |
| `/` | Goes to the role's home page | Everyone |
| `/dashboard` | Dashboard | Admin |
| `/tables` | Tables | Admin, Captain, Billing |
| `/orders/new/:tableId` | New order | Admin, Captain |
| `/orders/:id` | Order details | Admin, Captain, Billing |
| `/kitchen` | Kitchen | Admin, Kitchen |
| `/bills` | Bills | Admin, Billing |
| `/bills/:id` | Bill and payment | Admin, Billing |
| `/menu` | Menu | Admin (view for others) |
| `/expenses` | Expenses | Admin |
| `/reports` | Reports | Admin |
| `/staff` | Staff | Admin |
| `/settings` | Settings | Admin |

Menu on screen: bottom bar on phone, side bar on desktop. Only links the role can use.

## Page details

### Sign up
Fields: cafe name, your name, email, password. Makes the login, then the cafe, with this person as its admin. Then goes to the Dashboard.

### Login
Email, password, one button. Wrong details: "Email or password is wrong". Turned-off account: "This account is turned off. Ask your admin".

### Dashboard
Today's sales, bills count, open orders, today's expenses, last 5 bills. Link to Reports.
Data: reports, orders, expenses.

### Tables
Grid of table cards with colors for Free, Busy, Bill asked. Tap a free table = start order. Tap a busy table = open its order. A small badge shows "Ready" when food is waiting. Admin sees add/edit/turn-off for tables here (popup form: name, seats).
Data: `dining_tables`, `orders`.

### New order (and Order details)
Same page. Left: menu groups and search. Right (bottom sheet on phone): list of items with + / − and a note. Sold-out items are greyed. Buttons: **Send to kitchen**. On an existing order: add items, mark served, **Ask for bill**, cancel.
Data: `menu_items`, `categories`, `orders`, `order_items`.

### Kitchen
Cards in order of time, oldest first. Each card: table, time waiting, items with quantity and note. Buttons per item or "All": Preparing, Ready. Tabs: New, Preparing, Ready. Refreshes by itself.
Data: `orders`, `order_items`.

### Bills
Two tabs: **To bill** (orders that asked for the bill) and **Paid today**. Tap to open.
Data: `orders`, `bills`.

### Bill and payment
Item list, subtotal, tax, discount field, total. Choose method (cash, card, UPI), enter amount received for cash (shows change). Button **Take payment**. After payment: **Print receipt** and **Done**. Receipt layout: restaurant name, bill number, date, table, items, totals, method.
Data: `bills`, `payments`, `settings`.

### Menu
Groups on top, items below. Popup forms (fewer than 10 fields): group (name), item (name, group, price, veg, available). Toggle for sold out on every row.
Data: `categories`, `menu_items`.

### Expenses
Date filter (today, this week, this month). List with category chips and total. Popup form: date, category, title, amount, supplier, quantity, unit, note.
Data: `expenses`, `expense_categories`.

### Reports
Tabs: Daily, Monthly. Totals on top, then a list by date. Below: top items, sales by payment method, expenses by category, profit. Date picker for range.
Data: report views.

### Staff
List with name, role, on/off switch. Popup form: name and role only. Admin adds staff here (email and password); they join this cafe only.
Data: `profiles`.

### Settings
Restaurant name, address, phone, tax %. One Save button.
Data: `settings`.

## Services (`src/services/`)
One file per feature. Pages never call Supabase directly. Every call handles errors with a plain message.
| File | Does |
|---|---|
| `auth.js` | Sign up, login, logout, current person and role |
| `staff.js` | List, add, edit, turn on/off |
| `menu.js` | Groups and items, sold-out switch |
| `tables.js` | List, add, edit, turn off |
| `orders.js` | Create, add items, send, cancel, serve, ask for bill, list by status |
| `kitchen.js` | Active items, set preparing/ready |
| `bills.js` | Make bill, take payment, list |
| `expenses.js` | List, add, edit, delete, categories |
| `reports.js` | Daily, monthly, top items, by method, profit |
| `settings.js` | Read, save |

## Base components (`src/components/`)
Button, Modal, IconButton, Tooltip, EmptyState, Toast, ConfirmDialog (from [AGENTS.md](../AGENTS.md)). Anything else must be asked first.

## Shared hooks (`src/hooks/`)
`useAuth` (person and role) and `useAutoRefresh` (reload a list every few seconds, for Kitchen, Tables and Bills).

## Words to use on screen
| Say | Not |
|---|---|
| Send to kitchen | Submit order |
| Ask for bill | Request invoice |
| Take payment | Process transaction |
| Couldn't save. Please try again | Error 500 |
| Turn off | Deactivate |
