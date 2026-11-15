# Design rules

## Tokens
- Put the Plus Jakarta Sans font, the text size scale, the colors, the radius and the shadow levels in `tailwind.config.js` and `index.css`. Don't repeat them elsewhere.
- Use only tokens from the config. Never hard-code a color, a font size or a shadow value inside components.
- Use one primary color, one background and one text color, all defined as tokens.
- Use one corner radius and one spacing scale everywhere.
- Use only a small set of shadow levels, defined once.

## Typography
- Use Plus Jakarta Sans everywhere. Load it once, globally.
- One fixed text size scale, defined in one place. Use only these sizes:
  - Page title: 20px
  - Section title: 16px
  - Body and buttons: 14px
  - Helper and small text: 12px
- Never hard-code a font size anywhere else.
- Use only these font weights: 400, 500 and 600.

## Icons
- Use icons for actions such as edit, delete, add, view and download.
- Every icon-only button must have a tooltip that says what it does.
- Use one icon library only (`lucide-react`) and one icon size across the app.

## Layout and style
- Use flat cards. Never put a card inside another card. Use spacing, dividers or sections inside a card instead.
- Use a borderless design. Separate elements with soft shadows and spacing, not borders.
- Popups and modals are the exception. Use a divider line between their header, body and footer.
- Design for mobile first, then scale up to desktop.
- Build a small set of base components once and reuse them everywhere. Don't re-style the same thing on every page.
