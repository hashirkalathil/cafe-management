# Workflow and wording rules

## Workflow first
- Before building any feature, think about the easiest workflow for the client. Aim for the fewest clicks and the fewest decisions.
- Pick sensible defaults so the user doesn't have to fill in everything.
- Make the app work well on mobile and desktop.

## States and messages
- Every list needs a friendly empty state with one clear action.
- Show a loading state while waiting.
- Show a short success or failure message (toast) after every action.
- Ask for confirmation before deleting. Offer undo where it's easy.
- Show errors next to the field that has the problem, in plain words.

## Text and descriptions
- Never add descriptions or subtitles under page headers or section headers.
- Add a description only when it is absolutely necessary for the user to understand.
- Keep all labels short, 1–3 words where possible.
- Use everyday words. Say "Couldn't save. Please try again" instead of "500 server error".

## Create and edit
- If a form has about 10 fields or fewer and fits comfortably, use a popup modal.
- If a form has more than 10 fields, or is long or hard to use in a popup, use a separate page.
- Keep create and edit forms consistent: same layout, same fields, same buttons in the same places.
