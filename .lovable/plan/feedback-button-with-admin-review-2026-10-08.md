# Feedback button with admin review

Anyone on the site — signed in or not — can click "Feedback" in the header, write a note, and optionally leave an email so you can reply. Feedback is private: only you (the site owner) can read it, from a new admin page.

## What gets built

**1. Feedback form (header, on every page)**
- A "Feedback" link in the top navigation, next to "How it works" — visible to signed-in members and signed-out visitors alike.
- Clicking it opens a small dialog (no page change):
  - Message box (required, up to 2,000 characters, with a character counter).
  - Email field (optional, up to 255 characters). For signed-in members it starts filled with their account email; they can clear it or change it. Anyone signed out must leave it blank or type one — submitting works either way.
  - The dialog also quietly records which page the person was on when they wrote in, so the note has context.
- Submitting shows a confirmation and closes the dialog. No account, no payment, no waiting.

**2. Database table (one new table, fully locked down)**
- New `feedback` table: message, optional email, optional link to the member's account, the page it was written on, an open/resolved status, and a timestamp.
- Anyone (including signed-out visitors) can insert a row. Nobody except admins can read or change any row — the rules are enforced at the database level, not just hidden in the interface.
- Length limits on message and email are enforced by the database as well, not only in the form.

**3. Admin review page (`/admin/feedback`)**
- A new admin-only page listing every piece of feedback, newest first: the message, the email (or "a signed-in member" when they left no email), the page it came from, the date, and an open/resolved badge.
- Each entry has a "Mark resolved" / "Reopen" toggle so the queue only shows what still needs attention (with an option to show all).
- Admin access uses the same role check as the existing Review page — no new admin setup needed.

**4. Navigation**
- Header gains the always-visible "Feedback" link.
- When you're signed in as admin, the header also gains a "Feedback queue" link next to "Review".
- The admin page is excluded from the sitemap and marked noindex, like the existing Review page.

## Technical notes

- Migration applied through the standard database migration flow; it creates the table, grants, RLS, and policies in one pass: `INSERT` for `anon` + `authenticated` with length checks, `SELECT`/`UPDATE` only through the existing `has_role(...,'admin')` security-definer check. `service_role` gets full access.
- No server functions needed: the form writes directly through the browser client, and the RLS insert policy is the gate.
- The dialog component uses the project's existing dialog and textarea pieces and the `frosted`/`field` styling tokens.
- After the migration, the generated database types refresh automatically; if that step fails, regenerate them before writing code.

## What I'll verify

- Submitting feedback while signed out and while signed in (with and without an email).
- The feedback never appears to anyone but an admin; signed-in non-admins can't fetch it.
- The admin queue lists, resolves, and reopens entries.
- Build passes and the preview behaves correctly.
