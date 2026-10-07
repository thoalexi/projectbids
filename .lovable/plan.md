# Bid form: cost breakdown, insurance, website, reviews, past-work photos

## What changes for contractors (bid form)
1. **Cost breakdown first, total below.** Materials, Labor and Disposal appear first, each labelled "(optional)". Estimated total sits underneath them.
2. **Auto-sum.** Typing in any of the three fills the Estimated total with their sum, and the total becomes read-only (shown as "Calculated from breakdown"). Clearing all three unlocks the total so it can be typed directly.
3. **Total-only bids.** If only the total is entered, the homeowner sees "–" for Materials, Labor and Disposal.
4. **Insured toggle.** A yes/no switch: "I'm licensed & insured" (defaults to off).
5. **Business website** (optional link).
6. **Reviews links** (optional): separate fields for Google, Yelp and Thumbtack profile links.
7. **Past work photos** (optional): upload up to 6 photos of similar jobs, with thumbnails and remove buttons.
8. To save retyping, website, review links and insured status are pre-filled from the contractor's previous bid.

## What the homeowner sees on each bid
- Breakdown rows always shown: Materials / Labor / Disposal, with "–" when not given, then the total.
- An "Insured" or "Not insured" badge.
- Links: Website, Google, Yelp, Thumbtack (only those provided, open in a new tab).
- A row of past-work thumbnails; tapping one opens it larger.
- These stay sealed like the rest of the bid (only the homeowner and the bidder see them).

## Technical details
- Migration (additive): `bids` gains `insured boolean NOT NULL DEFAULT false`, `website text`, `google_url text`, `yelp_url text`, `thumbtack_url text`, `portfolio_images jsonb NOT NULL DEFAULT '[]'`. Existing RLS covers them.
- Storage: portfolio photos go in the private `project-photos` bucket under `portfolio/<contractor_id>/...`, stored as `storage:<path>` and shown with signed URLs (existing `resolveImage`). Add a storage policy letting authenticated users upload under their own `portfolio/<uid>/` folder and letting the project owner read photos referenced by bids on their projects (simplest: authenticated read of `portfolio/*`, paths are unguessable).
- `src/routes/projects.$id.tsx`: reorder fields, derived total = sum of filled breakdown fields; zod: URLs validated with `z.string().url()` optional, max lengths; https-only links rendered with `rel="noopener noreferrer"`; prefill from the user's latest bid via the browser client.
- Comparison AI input includes insured status so it can flag uninsured bids.
