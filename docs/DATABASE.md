# Database

Supabase (Postgres). The SQL itself goes in `supabase/schema.sql` when we build. This file describes the structure only.

## Rules for every table
- Has `id` (unique id) and `created_at`.
- Row Level Security is on.
- Money uses 2 decimals. Names are short, lowercase, with underscores.
- Nothing important is deleted for real. Menu items, tables, categories and staff are turned off (`is_active = false`) so old orders still make sense.

## Tables

### `cafes`
One row per cafe: `id`, `name`, `created_at`. Every other table has a `cafe_id` and each cafe only sees its own rows. Made by the `create_cafe` function when someone signs up.

### `profiles`
One row per person who can log in. Linked to Supabase Auth.
| Column | Type | Notes |
|---|---|---|
| id | uuid | Same as the login user id |
| full_name | text | Required |
| role | text | `admin`, `captain`, `kitchen`, `billing`. Empty until admin sets it |
| is_active | boolean | Default true. False = cannot log in. A person with no role cannot use the app |
| created_at | timestamp | |

### `settings`
Always one row.
| Column | Type | Notes |
|---|---|---|
| restaurant_name | text | Shown on bill |
| address | text | Shown on bill |
| phone | text | Shown on bill |
| tax_percent | numeric | Default 5 |

### `dining_tables`
| Column | Type | Notes |
|---|---|---|
| name | text | "T1", "T2"… unique |
| seats | integer | Default 4 |
| status | text | `free`, `busy`, `bill_asked`. Default `free` |
| is_active | boolean | Default true |

### `categories`
| Column | Type | Notes |
|---|---|---|
| name | text | "Starters", "Drinks"… unique |
| sort_order | integer | Order on screen |
| is_active | boolean | Default true |

### `menu_items`
| Column | Type | Notes |
|---|---|---|
| category_id | uuid | → categories |
| name | text | Required |
| price | numeric | 0 or more |
| is_veg | boolean | Default true |
| is_available | boolean | Sold-out switch. Default true |
| is_active | boolean | Default true |

### `orders`
| Column | Type | Notes |
|---|---|---|
| order_no | integer | Auto number, shown to people |
| table_id | uuid | → dining_tables |
| captain_id | uuid | → profiles |
| status | text | `open`, `sent`, `preparing`, `ready`, `served`, `bill_asked`, `paid`, `cancelled` |
| note | text | Optional |
| updated_at | timestamp | |

Only one order per table can be active (not `paid` or `cancelled`) at a time.

### `order_items`
| Column | Type | Notes |
|---|---|---|
| order_id | uuid | → orders |
| menu_item_id | uuid | → menu_items |
| item_name | text | Copied at order time |
| price | numeric | Copied at order time |
| quantity | integer | 1 or more |
| note | text | "Less spicy" etc. |
| status | text | `new`, `preparing`, `ready`, `served`, `cancelled` |

### `bills`
| Column | Type | Notes |
|---|---|---|
| bill_no | integer | Auto number |
| order_id | uuid | → orders. Unique: one bill per order |
| subtotal | numeric | Sum of items, not cancelled |
| tax_percent | numeric | Copied from settings |
| tax_amount | numeric | |
| discount | numeric | Default 0. Not more than subtotal |
| total | numeric | subtotal + tax − discount |
| status | text | `unpaid`, `paid` |
| created_by | uuid | → profiles |

### `payments`
| Column | Type | Notes |
|---|---|---|
| bill_id | uuid | → bills |
| method | text | `cash`, `card`, `upi` |
| amount | numeric | |
| received_by | uuid | → profiles |
| paid_at | timestamp | |

### `expense_categories`
| Column | Type | Notes |
|---|---|---|
| name | text | Groceries, Gas, Salary, Rent, Repairs, Other. Unique |

### `expenses`
Covers both purchases (groceries, supplies) and other costs (rent, salary).
| Column | Type | Notes |
|---|---|---|
| expense_date | date | Default today |
| category_id | uuid | → expense_categories |
| title | text | "Vegetables", "Gas cylinder" |
| amount | numeric | Greater than 0 |
| supplier | text | Optional |
| quantity | numeric | Optional |
| unit | text | Optional: kg, litre, piece |
| note | text | Optional |
| created_by | uuid | → profiles |

## How tables connect
```
profiles ──< orders >── dining_tables
               │
               ├──< order_items >── menu_items >── categories
               │
               └── bills ──< payments

expense_categories ──< expenses
settings (one row per cafe)
```

## Automatic actions
These run in the database so screens stay simple.
| When | What happens |
|---|---|
| Someone signs up | `create_cafe` makes the cafe, their admin profile, settings and starting expense groups |
| Admin adds staff | The `create-staff` function makes the login and a profile in the admin's cafe |
| First order is sent | Table becomes `busy` |
| Item status changes | Order status is updated (see [WORKFLOW.md](WORKFLOW.md)) |
| Captain asks for bill | Order and table become `bill_asked` |
| Payment saved | Bill, order become `paid`; table becomes `free` |
| Any row changes | `updated_at` refreshes where the column exists |

## Reports (read-only views, no new tables)
Only counts bills with status `paid`.
| View | Gives |
|---|---|
| `daily_sales` | Date, number of bills, total sales, tax, discount |
| `monthly_sales` | Month, number of bills, total sales |
| `top_items` | Item name, quantity sold, amount |
| `sales_by_method` | Cash, card, UPI totals for a date range |
| `expenses_by_category` | Category totals for a date range |
| `daily_profit` | Date, sales, expenses, difference |

## Access rules (Row Level Security)
A small helper returns the current user's role. Policies use it.
| Table | Admin | Captain | Kitchen | Billing |
|---|---|---|---|---|
| profiles | All | Own row read | Own row read | Own row read |
| settings | Read, edit | Read | Read | Read |
| dining_tables | All | Read, update status | – | Read |
| categories | All | Read | Read | Read |
| menu_items | All | Read, change `is_available` | Read, change `is_available` | Read |
| orders | All | Read all; create; edit own before paid | Read | Read; update to `paid` |
| order_items | All | Add; edit own while `new`; mark `served` | Read; change to `preparing` / `ready` | Read |
| bills | Read | – | – | Read, create, update |
| payments | Read | – | – | Read, create |
| expense_categories | All | – | – | – |
| expenses | All | – | – | – |
| Report views | Read | – | – | – |

Every policy also checks that the person is active. Turned-off staff get nothing.

## Indexes (speed)
Add on: `orders(status)`, `orders(table_id)`, `order_items(order_id)`, `bills(created_at)`, `expenses(expense_date)`.
