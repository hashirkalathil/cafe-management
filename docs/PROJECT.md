# Project

## Goal
A simple restaurant system that handles orders, kitchen work, billing and daily operations in one place.

## People who use it
- **Admin**: manages staff, menu, tables, expenses and reports.
- **Captain**: takes orders, picks the table, sends the order to the kitchen, serves food, asks for the bill.
- **Kitchen**: sees new orders and marks them as preparing or ready.
- **Billing**: makes the bill, takes payment, gives the receipt.

## Main flow
1. Captain picks a table, adds items, sends the order to the kitchen.
2. Kitchen sees the order, cooks, marks items ready.
3. Captain serves the food and asks for the bill.
4. Billing makes the bill, takes payment, gives the receipt. The table becomes free.
5. Admin checks sales, expenses and reports.

## Features
| Feature | Who uses it |
|---|---|
| Login and roles | Everyone |
| Staff management | Admin |
| Menu (groups and items) | Admin |
| Tables | Admin |
| Orders | Captain |
| Kitchen screen | Kitchen |
| Bills, payments, receipt | Billing |
| Purchases and expenses | Admin |
| Daily and monthly reports | Admin |

## Result we want
Less paper work, fewer order mistakes, faster billing, and a clear daily picture of sales and costs.

## Not included
Kept out to stay simple. Add later only if asked.
- Stock and inventory counts
- Online or phone ordering
- Printer hardware setup (receipt is printed from the browser)
- More than one branch
- Customer accounts and offers
- Staff salary and attendance

## Tech
Vite, React, Tailwind CSS, Supabase. See [AGENTS.md](../AGENTS.md).
