# Intake — receipt & invoice capture

A Dext-style capture tool: drop in receipts/invoices, Claude reads the key
fields, you review and confirm. Built on React/Vite/TypeScript/Tailwind +
Supabase + Cloudflare Pages, matching the rest of the Abacus internal apps.

## What's here

- **Upload** (`/`) — drag-and-drop or click-to-browse, multiple files at once.
  Each file lands in a private Supabase Storage bucket and gets a `documents`
  row with status `pending`.
- **Extraction** (`functions/api/extract.ts`) — a Cloudflare Pages Function,
  fired automatically after each upload. It downloads the file, sends it to
  Claude with a prompt asking for supplier/date/net/VAT/total/category as
  JSON, and writes the result to `extractions`. Document status moves to
  `needs_review`.
- **Queue** (`/queue`) — the ledger view: every document, filterable by
  status (Needs review / Confirmed / Exported / All).
- **Document detail** (`/document/:id`) — original file on the left, editable
  extracted fields on the right. "Confirm & save" marks it `confirmed`.
- Auth is Supabase email/password, same pattern as the onboarding form and
  company register — nothing renders until signed in.

## Setup

### 1. Supabase

Run `supabase/schema.sql` in the SQL editor of whichever Supabase project
this should live in (a new one, or shared with another app the way the
onboarding form shares with the timesheet app — your call on cost).

This creates:
- `documents` and `extractions` tables
- a private `receipts` storage bucket
- RLS policies restricting everything to authenticated users

Create at least one user under Authentication > Users so there's someone to
sign in as.

### 2. Environment variables

**Frontend (Cloudflare Pages build env):**
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Function (Cloudflare Pages > Settings > Environment variables — server-side,
not exposed to the browser):**
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # service role key, not the anon key
ANTHROPIC_API_KEY=...
```

For local dev, copy `.env.example` to `.env` and fill in the first two.

### 3. Deploy

Same as the other apps: `npm run build`, upload the project (or connect the
repo) to Cloudflare Pages, output directory `dist`. Cloudflare auto-detects
the `functions/api/extract.ts` file and serves it at `/api/extract` — no
separate deployment step needed.

## Not built yet (from the original plan)

- Email-in capture (a Cloudflare Email Routing address forwarding attachments
  into the same bucket) — the biggest addition once this is working
- Export to Xero/QuickBooks as a draft bill — the MCP connectors already
  available can push a confirmed document once you're ready to wire it up
- Line-item level detail (currently net/VAT/total only, not itemised)
- Bulk actions on the queue (approve several at once)

## Notes

- Extraction runs once per upload and isn't retried automatically — a
  `failed` status just means it needs manual entry on the detail page.
- The AI call uses `claude-sonnet-4-6`; adjust the model string in
  `functions/api/extract.ts` if you want to try a different one.
