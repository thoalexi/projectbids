<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Data access uses the browser Lovable Cloud client with RLS; only AI features run in authenticated server functions (src/lib/ai.functions.ts) — keeps the AI key server-side.
- Bids are sealed by RLS (only the bidder and project owner can read them); public counts come from the security-definer `bid_count(projects)` computed column, and a trigger enforces the max-bids cap.
- New projects start as `draft` (owner-only) and go `open` after the AI follow-up step.
- Project photos live in the private `project-photos` bucket; `projects.image_url` stores `storage:<path>` for uploads (resolved via signed URLs) or a plain URL for seeded images — public buckets are blocked by workspace policy.
- Bids snapshot `contractor_name`/`trade` so seeded demo bids work without auth users.
- Visual tokens live in src/styles.css (`frosted`, `field`, `font-display` utilities); components use semantic tokens only.
- Contractor success fees use authenticated server functions and a signature-verified payment webhook; project awards require a paid bid record so clients cannot bypass payment.
- Contractor verification lives in `contractor_verifications` (writes only via server functions in src/lib/verification.functions.ts; admins via `has_role`); verified-only bidding is enforced in the `enforce_bid_limit` trigger so the UI can't be bypassed.
