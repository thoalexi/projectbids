# Simplify the hire button label

## Goal
On the homeowner's project page, the button next to each bid reads "Hire & charge fee". It should read just "Hire".

## What changes
- The bid card button label becomes "Hire" (src/routes/projects.$id.tsx, line 379).
- Everything the button does stays exactly as it is: it still charges the winning contractor's saved card and awards the job only after payment clears.
- The disabled behavior while a payment is in flight is unchanged, so the homeowner cannot double-hire.

## Also worth deciding (say yes or no)
- While a hire is processing, the same button currently reads "Charging…" on the homeowner's screen. Changing it to "Hiring…" keeps the fee talk off the homeowner's side entirely.
- The confirmation message after a successful hire currently reads "Payment confirmed — the contractor is hired." It could read "You're hired — the contractor is confirmed." (or similar) instead.

These two are not part of your request; I'll leave them as-is unless you say otherwise.

## Technical notes
- One text literal in the button's label expression; no logic, styling, or server-side change.
- Contractor-side wording that explains the success fee (the bid form's "Nothing is charged now…" and the bid-form footer) is untouched — that audience does need it.
- Verify the build is clean and the button reads "Hire" and still hires in the preview.
