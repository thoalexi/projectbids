# Contractor value message and job filters

## Goal
Make Beam Bids’ core promise unmistakable to contractors: bidding is free, and they only pay when a homeowner hires them. Help contractors quickly narrow available jobs by homeowner readiness, location, and requested completion timing.

## Changes

### 1. Reinforce the “pay only when hired” promise
- Add a prominent contractor-focused message at the top of **Browse jobs**: “Bid for free. Only pay when you get hired.”
- Support it with concise copy contrasting Beam Bids with paid-lead marketplaces: no charge for sending a bid and no paying for leads that never become customers.
- Repeat the promise beside the bid form, where contractors make the decision to submit.
- Add the same principle to **How it works** so it is part of the product explanation, not a one-off notice.
- Keep this change informational only; no payment collection or fee logic will be added yet.

### 2. Add practical filters to Browse jobs
- Keep the existing category choices and add filters for:
  - **Hiring process:** All, Ready to hire, Planning & budgeting, Just comparing prices. This uses the homeowner’s existing answer to “Where are you in the hiring process?”
  - **Location:** All Atlanta areas plus the existing Atlanta metro location list.
  - **Done by:** Any date, This week, Next 30 days, Later.
- Combine all active filters so contractors can narrow by category, hiring process, location, and timing together.
- Add a clear-filters action and an empty state that reflects the full filter selection rather than mentioning category alone.
- Keep filtering on the already-loaded jobs, so no database change is needed.

### 3. Keep the browsing state useful
- Store filter choices in the page URL so selections survive refreshes and can be shared or revisited.
- Validate URL values and safely fall back to “All” or “Any date” for invalid values.
- Preserve existing job cards and bidding behavior.

## Technical details
- Extend the `/projects` route’s validated search parameters and derive the filtered list from `project.category`, `project.location`, `project.desired_date`, and `project.answers.stage`.
- Use calendar-day comparisons for the quick date choices to avoid time-of-day inconsistencies.
- Use the project’s existing controls, tokens, and mobile layout patterns; no schema or migration is required.
- Update the touched page’s Beam Bids metadata and verify the filter combinations and bidder messaging at desktop and mobile sizes.
