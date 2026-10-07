# Homeowner questions for bidders + My Posts / My Bids

## 1. Homeowner questions for contractors
- The post and edit forms get a new "Questions for contractors (optional)" section. The homeowner can add up to 5 questions, such as "Will you provide the shims for the door replacement?"
- The questions appear on the project page under the project details.
- The bid form gets a section called "Please answer the following questions the homeowner had", with one answer box per question. Each answer is required before the contractor can send the bid.
- The homeowner sees each bid's answers under that bid. The answers are sealed like the price: only the homeowner and that contractor can see them.
- The questions lock once the first bid arrives, like the other project details, so every contractor answers the same questions.
- "Compare bids" also uses the answers, so it can point out things like "Bid 2 doesn't supply shims."

## 2. "My Posts" and "My Bids" tabs
- When signed in, the top bar shows "My Posts" and "My Bids" next to "Browse jobs". On phones they show up in a compact row.
- **My Posts** lists every project you posted, including unfinished drafts. Each one shows its status (Draft / Open / Hired), how many bids it has, and the lowest bid. Click a project to open it.
- **My Bids** lists every bid you placed, split into three groups:
  - **Hired:** the homeowner accepted your bid.
  - **Pending:** the project is still open.
  - **Not selected:** the homeowner hired someone else.
  Each bid shows the project, your amount and the date.
- If you're signed out, these pages send you to sign in.

## Technical details
- Migration: add `projects.owner_questions jsonb default '[]'` (array of strings) and `bids.question_answers jsonb default '[]'` (array of `{question, answer}`). Extend `lock_project_details_after_bids` to cover `owner_questions`. Current RLS already covers both columns.
- `ProjectForm`: an editable list of questions (each up to 200 characters), checked with zod.
- `projects.$id.tsx`: the bid form requires every answer (up to 500 characters each), and the owner's bid card shows the answers. `compareBids` puts the answers in the prompt.
- New routes `src/routes/my-posts.tsx` and `src/routes/my-bids.tsx`. They query through the browser client, filtered by `owner_id` / `contractor_id` with `projects(...)` joined. Hired = `project.accepted_bid_id === bid.id`. Each gets its own head() metadata.
- `SiteHeader`: show the two links only when signed in.
