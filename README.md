# SpendWise

A dark black/purple personal finance dashboard starter.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Supabase Auth + Postgres
- Recharts
- Lucide React

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Supabase setup

1. Create a Supabase project.
2. Copy the project URL and publishable key into `.env.local`.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. In Supabase Auth, enable Google.
5. In Google Cloud, create a Web OAuth client.
6. Add your local app origin and the callback URL required by Supabase.
7. Set the Supabase Site URL to `http://localhost:3000` while developing.
8. Start the app and create/sign in to a user.

The current dashboard includes demo financial data so the UI can be reviewed before wiring every module to database queries.

## Next implementation steps

- Persist onboarding into `user_profiles`
- Persist expense modal writes into `expenses`
- Build real EMI installment calculation from `emis`
- Add budget pages backed by `budgets`
- Add investments backed by `investments`
- Generate monthly/yearly reports server-side
- Add badge-awarding jobs/functions
- Add an AI insight service that only receives aggregated financial data
