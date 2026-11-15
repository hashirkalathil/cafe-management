# Roles

## What each role can do
V = view, C = create, E = edit, D = delete.

| Area | Admin | Captain | Kitchen | Billing |
|---|---|---|---|---|
| Staff | V C E D | – | – | – |
| Menu groups and items | V C E D | V | V | V |
| Sold-out switch | Yes | Yes | Yes | – |
| Tables | V C E D | V | – | V |
| Orders | V E | V C E (own, before sent; add items later) | V | V |
| Item status (preparing, ready) | – | – | Yes | – |
| Mark served | – | Yes | – | – |
| Ask for bill | – | Yes | – | – |
| Cancel order | Yes | Yes (before sent) | – | – |
| Bills | V | – | – | V C E |
| Payments | V | – | – | V C |
| Expenses | V C E D | – | – | – |
| Reports | V | – | – | – |
| Settings (name, tax) | V E | – | – | – |

## Where each role lands after login
| Role | Home page |
|---|---|
| Admin | Dashboard (today's sales, open orders, expenses) |
| Captain | Tables |
| Kitchen | Kitchen orders |
| Billing | Bills to make |

## Rules
- A person has one role and belongs to one cafe. Anyone can sign up and becomes the admin of their own new cafe.
- A cafe never sees another cafe's data.
- Pages a role cannot use are hidden from the menu. If opened by link, show "You can't open this page" and a button to go home.
- Admin can turn a staff account off. A turned-off person cannot log in.
- Admin can do everything other roles can, so one person can demo the whole flow.
