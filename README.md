# Wedding Photos Selector

A mobile-first, Tinder-style web app for crowd-sourcing the best photos from a wedding (or any) photo shoot. Guests log in with a shared password, swipe right to **keep** a photo or left to **reject** it, and everyone can view a live, aggregated leaderboard of the most-loved shots.

Photos are pulled directly from a shared **Google Drive folder**, and all votes are persisted in **Supabase**. Every secret (API keys, passwords) lives server-side — nothing sensitive is ever shipped to the browser.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Authentication & Security Model](#authentication--security-model)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Google Drive Setup](#google-drive-setup)
- [Supabase Setup](#supabase-setup)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Roadmap / Ideas](#roadmap--ideas)

---

## Features

- **Shared-password login** — guests enter a name, location, and a single shared access password. No per-user accounts to manage.
- **Tinder-style swiping** — drag-to-swipe cards with spring physics (Framer Motion), KEEP/NOPE overlays, and a 3-card stack.
- **Keyboard shortcuts** — arrow keys to vote, `Ctrl/Cmd+Z` to undo.
- **Undo** — instantly revert your last vote.
- **Tap-to-zoom** — view any photo fullscreen before deciding.
- **Resume where you left off** — already-voted photos are skipped on return.
- **Paginated loading** — photos load in batches (built for 500–2000+ photos) directly from Google Drive.
- **Live results leaderboard** — visible to all voters, sortable by score, keep %, total votes, or filename.
- **Admin reset** — password-protected endpoint to wipe all votes and start fresh.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Animation | Framer Motion |
| Database | [Supabase](https://supabase.com) (Postgres) |
| Photo source | Google Drive API v3 |
| Hosting | Vercel |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Browser (Client)                     │
│   Login UI · Swipe Deck · Results Table · Admin Panel     │
│   - holds session token in sessionStorage                 │
│   - sends it as "Authorization: Bearer <token>"           │
└───────────────────────────┬──────────────────────────────┘
                            │ fetch (authFetch)
┌───────────────────────────▼──────────────────────────────┐
│                  Next.js API Routes (Server)              │
│   /api/auth/*  ·  /api/photos  ·  /api/vote               │
│   /api/votes   ·  /api/results ·  /api/admin/*            │
│   - all secrets live here (never sent to client)          │
│   - validates session token against the DB                │
│   - proxies Google Drive so the API key stays hidden      │
└──────────┬────────────────────────────┬──────────────────┘
           │                            │
┌──────────▼───────────┐    ┌───────────▼──────────────────┐
│   Supabase (Postgres)│    │   Google Drive API v3         │
│   voters · votes     │    │   (shared photo folder)       │
│   service role key   │    │   GOOGLE_API_KEY              │
└──────────────────────┘    └───────────────────────────────┘
```

**Key principle:** the browser never sees the Google API key, the Supabase service role key, or the access/admin passwords. Every privileged action is brokered by a server-side route that validates the caller's session token first.

---

## Data Model

Two Postgres tables in Supabase.

### `voters`

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` (PK) | Auto-increment voter id |
| `name` | `text` | Display name entered at login |
| `location` | `text` | Optional location entered at login |
| `session_token` | `text` (unique) | Opaque session token; rotated each login |
| `created_at` | `timestamptz` | Defaults to `now()` |

A voter is uniquely identified by the `(name, location)` pair — logging in again with the same pair reuses the existing row and refreshes the session token.

### `votes`

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` (PK) | Auto-increment vote id |
| `voter_id` | `int` (FK → voters.id) | Who cast the vote |
| `photo_filename` | `text` | The Google Drive filename voted on |
| `direction` | `int` | `1` = keep (swipe right), `-1` = reject (swipe left) |
| `created_at` | `timestamptz` | Defaults to `now()` |

A unique constraint on `(voter_id, photo_filename)` ensures one vote per photo per voter; re-voting performs an upsert.

### Row Level Security

RLS is enabled on both tables. Anonymous clients get **read-only** access (so the public anon key can never be used to tamper with data). All writes go through server routes using the **service role key**, which bypasses RLS.

> See [`scripts/001_add_session_and_rls.sql`](scripts/001_add_session_and_rls.sql) for the full migration.

---

## API Reference

All routes live under `app/api/`. Protected routes require a valid session token supplied via `Authorization: Bearer <token>`.

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Validates the access password, creates/reuses a voter, returns a session token. |
| `GET` | `/api/auth/me` | ✅ | Returns the current voter for a valid token. |
| `POST` | `/api/auth/logout` | ✅ | Acknowledges logout (session is cleared client-side). |
| `GET` | `/api/photos` | ✅ | Proxies Google Drive; returns a paginated batch of photos (`?pageToken=`). |
| `POST` | `/api/vote` | ✅ | Casts/updates a vote. Body: `{ photoFilename, direction }`. |
| `DELETE` | `/api/vote` | ✅ | Removes a vote (undo). Body: `{ photoFilename }`. |
| `GET` | `/api/votes` | ✅ | Returns the filenames the current voter has already voted on. |
| `GET` | `/api/results` | ✅ | Returns the aggregated leaderboard (score, keeps, total votes per photo). |
| `POST` | `/api/admin/reset` | 🔑 | Deletes all votes. Body: `{ adminPassword }`. |

> `✅` = requires session token · `🔑` = requires the admin password in the request body.

---

## Authentication & Security Model

This app intentionally uses a lightweight **shared-password** model rather than per-user accounts — appropriate for a trusted group like wedding guests.

1. **Login** — the client posts `name`, `location`, and `password` to `/api/auth/login`. The server compares `password` against `ACCESS_PASSWORD` (server-side only).
2. **Session token** — on success, the server generates a random token, stores it on the voter row, and returns it. The client keeps it in `sessionStorage` and sends it as a `Bearer` token on every request via the `authFetch` helper.

   > A bearer-token-in-`sessionStorage` approach is used (instead of httpOnly cookies) because the app is designed to run inside an embedded preview/iframe where cross-origin cookies are unreliable. The server also accepts a cookie fallback for standalone deployments.
3. **Validation** — protected routes resolve the token to a voter via `lib/session.ts`. No token (or an unknown token) → `401`.
4. **Secrets stay server-side** — `GOOGLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ACCESS_PASSWORD`, and `ADMIN_PASSWORD` are never exposed to the browser. The Google Drive call is fully proxied.
5. **Database protection** — RLS lets the anon key read but never write; all mutations use the service role key inside server routes.

> **Note for forkers:** for a public or untrusted audience, consider upgrading to real per-user auth (e.g. Supabase Auth) and adding rate limiting on the vote and login routes.

---

## Environment Variables

Create a `.env.local` (and add the same vars to your Vercel project settings).

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key (read-only via RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Supabase service role key — full DB access. **Keep secret.** |
| `GOOGLE_API_KEY` | server only | Google Drive API key for listing photos. **Keep secret.** |
| `GOOGLE_DRIVE_FOLDER_ID` | server only | The ID of the shared Drive folder containing the photos. |
| `ACCESS_PASSWORD` | server only | The shared password guests enter to log in. |
| `ADMIN_PASSWORD` | server only | Password required to reset all votes. |

---

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Create your environment file
cp .env.example .env.local   # then fill in the values above

# 3. Run the Supabase migration (see Supabase Setup)

# 4. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the `ACCESS_PASSWORD` you configured.

---

## Google Drive Setup

1. Place all photos in a single Google Drive folder.
2. Share the folder as **"Anyone with the link can view"** (required so the images render).
3. Grab the **folder ID** from the URL: `https://drive.google.com/drive/folders/<THIS_IS_THE_ID>` → set as `GOOGLE_DRIVE_FOLDER_ID`.
4. In [Google Cloud Console](https://console.cloud.google.com): create a project, enable the **Google Drive API**, and create an **API key** → set as `GOOGLE_API_KEY`.
5. (Recommended) Restrict the API key to the Google Drive API only.

---

## Supabase Setup

1. Create a Supabase project (or use an existing one).
2. Ensure the `voters` and `votes` tables exist with the columns described in [Data Model](#data-model).
3. Run the migration to add the session column, the unique vote constraint, and the RLS policies:

   ```sql
   -- contents of scripts/001_add_session_and_rls.sql
   ```

   You can paste it into the Supabase SQL Editor.
4. Copy your project URL, anon key, and service role key into your environment variables.

---

## Project Structure

```
app/
  api/
    auth/login/route.ts     # password check + session issuance
    auth/me/route.ts        # current voter lookup
    auth/logout/route.ts    # logout acknowledgement
    photos/route.ts         # Google Drive proxy (paginated)
    vote/route.ts           # cast / undo a vote
    votes/route.ts          # voter's already-voted filenames
    results/route.ts        # aggregated leaderboard
    admin/reset/route.ts    # wipe all votes (admin password)
  page.tsx                  # login page
  swipe/page.tsx            # swipe interface
  results/page.tsx          # leaderboard
components/
  login-form.tsx
  swipe-deck.tsx            # deck state, pagination, voting logic
  swipe-card.tsx            # individual draggable card
  photo-viewer.tsx          # fullscreen zoom
  results-table.tsx
  admin-panel.tsx
  nav-bar.tsx
lib/
  session.ts                # server-side session token resolution
  auth-fetch.ts             # client fetch wrapper (adds Bearer token)
  supabase/admin.ts         # service-role Supabase client
scripts/
  001_add_session_and_rls.sql
```

---

## Deployment

This project is built to deploy on **Vercel**:

1. Push to GitHub.
2. Import the repo into Vercel.
3. Add **all** environment variables from the table above to the Vercel project (Settings → Environment Variables).
4. Deploy. Every merge to `main` auto-deploys.

> The build will fail if required env vars are missing — make sure they are set in Vercel, not just locally.

---

## Roadmap / Ideas

- Real per-user authentication (Supabase Auth) for public use.
- Rate limiting on login and vote endpoints.
- Realtime leaderboard updates via Supabase subscriptions.
- Photo source adapter for Supabase Storage / S3 as an alternative to Google Drive.
- Export the "keep" set as a shareable album.

---

Built with [v0](https://v0.app). [Continue working on this project →](https://v0.app/chat/projects/prj_IZbrKdvWVR3eSu6c0fG78XqnZhLN)
