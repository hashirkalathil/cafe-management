# Workflow

## Order steps
| Status | Shown as | Set by | When |
|---|---|---|---|
| `open` | Draft | Captain | Captain is still adding items |
| `sent` | New | Captain | Sent to kitchen |
| `preparing` | Preparing | Kitchen | Kitchen started any item |
| `ready` | Ready | Kitchen | All items ready |
| `served` | Served | Captain | Food is on the table |
| `bill_asked` | Bill asked | Captain | Guest wants the bill |
| `paid` | Paid | Billing | Payment done |
| `cancelled` | Cancelled | Captain / Admin | Order dropped |

Order of steps: Draft > New > Preparing > Ready > Served > Bill asked > Paid.

## Item steps
`new` > `preparing` > `ready` > `served`. An item can also be `cancelled`.
- Kitchen changes items to preparing and ready.
- Captain changes items to served, and can cancel an item that is still `new`.
- The order status follows its items: any item preparing = Preparing; all items ready = Ready; all items served = Served. Cancelled items are ignored.

## Adding more food later
Captain can add items to a table that is already eating. New items start as `new` and go to the kitchen. The order goes back to New or Preparing until they are ready.

## Table status
| Status | Shown as | Changes when |
|---|---|---|
| `free` | Free | Payment is done |
| `busy` | Busy | First order is sent |
| `bill_asked` | Bill asked | Captain asks for bill |

## Billing rules
- A bill can be made only when the order is `bill_asked`.
- Bill = sum of items (not cancelled) + tax − discount.
- Tax rate comes from Settings. Discount is an amount typed by Billing.
- One bill per order.
- Payment methods: cash, card, UPI. The amount must equal the total.
- After payment: bill is `paid`, order is `paid`, table is `free`, and nothing in them can be edited.
- Item names and prices are copied into the order when added, so later menu changes never change old bills.

## Screens that refresh by themselves
- Kitchen orders (new orders appear without reload).
- Captain tables (colors change when food is ready).
- Billing list (new bill requests appear).

## Edge cases
| Case | What happens |
|---|---|
| Item sold out | Captain cannot add it. Kitchen or Admin can switch it off in one tap. |
| Wrong item after sent | Captain cancels the item only if still `new`. Otherwise Admin does it. |
| Table has no items | Order is not sent. Show "Add at least one item". |
| Two captains open the same table | Both work on the same open order. |
| Staff account turned off while logged in | Next action shows "Please log in again". |
