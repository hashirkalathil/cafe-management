# AGENTS.md

Follow these rules in every task, without exception.

## Detail files
- [Visual rules](docs/DESIGN.md)
- [Workflow and wording rules](docs/UX.md)
- [Build discipline](docs/SCOPE.md)
- [4-hour plan and progress](docs/TASKS.md)
- [Project overview](docs/PROJECT.md)
- [Roles and permissions](docs/ROLES.md)
- [Order, table and billing workflow](docs/WORKFLOW.md)
- [Database structure](docs/DATABASE.md)
- [Pages, routes and services](docs/PAGES.md)
- [Build phases](docs/PHASES.md)
- [Sample data](docs/SAMPLE_DATA.md)

## Who we build for
- The end user is not a developer. Every screen, label and message must make sense to a non-technical person.
- Use simple, everyday words everywhere: UI text, error messages and your own explanations to me.
- Avoid technical terms. Say "Couldn't save. Please try again" instead of "500 server error".

## Communication
- Keep replies short and in simple language. Say what you did, and what I need to check.
- If something is unclear, ask one short question instead of guessing.
- Don't write long explanations or summaries unless I ask.

## Tech stack
- Vite with React (JavaScript), Tailwind CSS and Supabase.
- Don't add any other framework or UI library without asking me first.
- Use `lucide-react` for icons. Ask me before adding any other package.

## Project structure
- `src/pages/`: one file per page.
- `src/components/`: reusable pieces (Button, Modal, IconButton, Tooltip, EmptyState, Toast, ConfirmDialog).
- `src/lib/supabase.js`: the single Supabase client.
- `src/services/`: all database calls, one file per feature (for example `clients.js`). Pages and components never call Supabase directly.
- `src/hooks/`: shared hooks.
- Keep each file small and focused on one thing.

## Supabase
- Keep keys in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never commit `.env`. Provide a `.env.example`.
- Never use the service role key in the frontend.
- Turn on Row Level Security for every table, with a simple policy. Keep the SQL for tables and policies in `supabase/schema.sql`.
- Use Supabase Auth for login. Keep it simple (email and password) unless I say otherwise.
- Every service call must handle errors. Show a plain-language message to the user and never show raw error text.

## Data and state
- Keep state simple. Use React state and context. Don't add Redux or any other state library.
- Load data in one place per page, with a loading state and an empty state.
- After a create, edit or delete, refresh the list automatically so the user never has to reload.

## Routing
- Use `react-router-dom`. Keep the route list short, in one file.
- Protect pages that need login.

## Quality checks
- Make sure `pnpm dev` and `pnpm build` both work before saying a task is done.
- No console errors or warnings.
- Test the main flow once on mobile width before finishing a task.
