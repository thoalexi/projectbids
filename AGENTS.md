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

- Data access uses the browser Lovable Cloud client with RLS (projects, bids, profiles are publicly readable; writes scoped to auth.uid()) — keeps the marketplace simple without server functions.
- Project photos live in the private `project-photos` bucket; `projects.image_url` stores `storage:<path>` for uploads (resolved via signed URLs) or a plain URL for seeded images — public buckets are blocked by workspace policy.
- Bids snapshot `contractor_name`/`trade` so seeded demo bids work without auth users.
- Visual tokens live in src/styles.css (`frosted`, `field`, `font-display` utilities); components use semantic tokens only.
