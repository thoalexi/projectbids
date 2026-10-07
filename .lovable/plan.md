# Plan: Smarter bids, AI help, Atlanta focus

## 1. Atlanta + 5 categories
- Categories become: Interior/exterior painting, Flooring, Landscaping, Pressure washing, Junk removal.
- City is fixed to the Atlanta area (pick a neighborhood/suburb, e.g. Decatur, Midtown, Marietta). Homepage copy: "Post it once. Local Atlanta pros compete for your business."
- The three sample projects get moved to Atlanta-area places and new categories (the sink project becomes junk removal or is replaced).

## 2. Optional budget
- New optional "Budget range (optional)" field on post/edit: a min and a max in dollars, which can both be left blank.
- If a homeowner fills it in, cards show it, e.g. "Painting • Decatur • ~$150–250 • Nov 14". If not, nothing about budget appears.
- The earlier "no budget" note gets updated to "budget is optional, never required".

## 3. AI follow-up questions before going live
- After the homeowner presses "Post project", the AI reads the project and asks 2–4 short questions about anything missing (e.g. "Are stairs included?", "Roughly how high is the deck?").
- The homeowner answers them (or skips one), then the project goes live. The questions and answers show on the project page for contractors.
- Projects stay as "draft" until this step is done.

## 4. Itemized bids
- The bid form asks for: total, materials, labor, disposal (each optional except total), how many days the job takes, earliest start date, warranty (e.g. "2 yr"), and a note.
- Bid cards show this breakdown with "Final quote subject to site inspection."

## 5. Sealed bids + 5-bid limit
- Only the homeowner sees bid prices, names and notes.
- A contractor sees only their own bid, plus "4 of 5 bid spots taken".
- Visitors see only the count.
- When a project has 5 bids it closes to new bids ("Bidding full").

## 6. AI side-by-side comparison (homeowner only)
- Once there are 2+ bids, the homeowner gets a "Compare bids" button.
- It shows a table: total, materials, demo, disposal, timeline, earliest start, warranty, with one column per contractor.
- Below it, warnings such as "Contractor B's bid does not include disposal."
- The comparison is saved and redone automatically when a bid changes.

## Not in this round
Contractor ratings/"verified" badges, success-fee payments, and price insights from past jobs. These need real job history first.

## Technical details
- Migration: `projects` gets `budget_min/max numeric null`, `status` adds `'draft'`, `ai_questions jsonb default '[]'`, `comparison jsonb null`, `comparison_bid_hash text`. `bids` gets `materials, labor, disposal numeric null`, `duration_days int`, `earliest_start date`, `warranty text`.
- Sealed bids: replace the public bids SELECT policy with one that allows reads only by the project owner or the bid's contractor. Add a security-definer `bid_count(project_id)` function (or a `project_bid_counts` view) for public counts. Update `projectsQuery` to use it.
- 5-bid limit: a BEFORE INSERT trigger on bids rejects a 6th bid. The insert policy also requires the project status to be `open` (drafts excluded).
- Drafts are hidden from public listings; only the owner can read them.
- AI: two `createServerFn` functions using `requireSupabaseAuth` and the Lovable AI Gateway (`openai/gpt-6-astra` via Responses, streamed, strict JSON schema): `askFollowUps(projectId)` and `compareBids(projectId)`. Each one checks that the caller is the owner. Its results are saved on the project row.
- Edit-lock trigger stays as it is, and also covers the budget fields.
- Update AGENTS.md (server functions now exist for AI) and memory (Atlanta focus, optional budget, sealed bids, 5-bid cap).
