# FitTrack

A private, mobile-first workout tracker built with **Next.js (App Router) + TypeScript + Tailwind CSS + Supabase** (Auth, Postgres, Row Level Security).

Every user only ever sees their own data — enforced in the database, not just the UI — with two opt-in ways to share: invite a friend by email, or create a password-protected read-only link.

## Features

- Email/password accounts via Supabase Auth
- Start a workout in one tap, add exercises (searchable library + create your own with muscle groups)
- Log sets with weight and reps using big tap-friendly steppers; sets that beat your previous best get a live **PR** badge
- Workout history grouped by month, with full session detail
- Personal records page: heaviest set per exercise + estimated 1RM (Epley formula)
- **Friend sharing by email**: invite a friend, choose whether they see workouts, records, or both; friend accepts/declines; you can toggle permissions or remove access any time
- **Password-protected links**: share a read-only snapshot with anyone (no account needed); passwords are bcrypt-hashed, links are revocable
- Dark, gym-floor UI with oversized tabular numerals; bottom tab bar on mobile, top nav on desktop

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, then open the **SQL Editor** and run the entire contents of:

```
supabase/migrations/001_init.sql
```

This creates all tables, the PR view, the sharing functions, and every RLS policy.

> Optional: in **Authentication → Providers → Email**, you can disable "Confirm email" during development so signups log in immediately. The app handles both modes.

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Project Settings → API**. No service-role key is needed anywhere in this app.

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, create an account, and start logging.

## Security model (how "only see their own data" is enforced)

All privacy is enforced by **Postgres Row Level Security**, so even a buggy or malicious client using the anon key cannot read or write another user's rows.

| Table | Read | Write |
|---|---|---|
| `workouts`, `sets`, `exercises` | Owner, **or** a friend with an *accepted* `friend_shares` row whose scope allows it | Owner only |
| `friend_shares` | Owner + the invited email | Owner creates/edits/revokes; the friend can only accept/decline via the `respond_to_invite()` function |
| `share_links` | Owner only | Owner only |
| `profiles` | Self + sharing counterparties (so names render) | Self |

Key details:

- Friend identity is matched on the **email in the verified JWT** (`auth.jwt() ->> 'email'`), not anything the client sends.
- Public link viewing never touches the tables directly. Anonymous visitors call `get_shared_snapshot(token, password)`, a `SECURITY DEFINER` function that verifies the password against a **bcrypt hash** (`pgcrypto`) and returns only the JSON the owner allowed. A single generic error is returned whether the token or password is wrong.
- `personal_records` is a `security_invoker` view, so it inherits the RLS of the underlying tables.
- Note: because records are derived from sets, a friend granted *records-only* access can read raw set rows, but not workout titles, dates, or notes. Tighten the `sets_select` policy if you want records visible only in aggregate.
- Share-link tokens are 128-bit random hex; revoking deletes the row, killing access instantly.

## Project structure

```
supabase/migrations/001_init.sql   Schema + RLS + sharing functions
src/middleware.ts                  Session refresh + route protection
src/lib/supabase/                  Browser & server Supabase clients
src/app/(auth)/                    Login, signup
src/app/(app)/dashboard            Weekly stats + start workout
src/app/(app)/workouts/[id]        Set logger (the core screen)
src/app/(app)/history              Workouts grouped by month
src/app/(app)/records              PRs + estimated 1RM
src/app/(app)/sharing              Invites, permissions, share links
src/app/(app)/friends/[ownerId]    Read-only friend view
src/app/shared/[token]             Public password-gated view
```

## Notes & next steps

- **Invite emails**: invites currently appear in-app when the friend signs in with the invited address. To also send an email notification, add a Supabase Edge Function triggered on `friend_shares` inserts using Resend or similar.
- **Units**: the UI displays pounds; switch the labels (and stepper increment) to kg if you prefer — stored numbers are unit-agnostic.
- Workout dates default to today; edit `workout_date` support is a small addition if you want backdated logging.
