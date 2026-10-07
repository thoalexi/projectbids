# Fix bid submission after adding a card + simplify the Hire button

## 1. Bids lost after saving a card (bug)
What happened: no new bid was saved after you entered your card. The card screen can send the browser away for a security check and then back to the project page. When it comes back, the bid you typed is gone, so nothing gets submitted and the form looks blank.

Fix:
- Save the bid you typed (price, breakdown, message, answers, photos) on your device the moment you tap Continue, so it survives the security check.
- When you come back from the check, finish submitting the bid automatically and show "Your bid was sent to the homeowner."
- If something still fails, keep your bid filled in and show a clear message explaining what to try, instead of clearing the form.
- Clear the saved copy only after the bid is accepted, or if you cancel.

## 2. Hire button wording
- On the homeowner's bid list, "Hire & charge fee" becomes "Hire".
- While a hire is processing, "Charging…" becomes "Hiring…".
- What the button does stays the same: the job is awarded only after the contractor's fee clears.

## Technical notes
- src/routes/projects.$id.tsx: persist `pendingBid` + form fields to sessionStorage keyed by project id before opening the card dialog; on mount, read `setup_intent` / `redirect_status` query params, restore the draft, call `submitBidWithPaymentMethod`, then strip params from the URL. Do not reset form state on error.
- PaymentMethodSetup: return_url includes the project path; surface server errors in the dialog.
- Button label text change at the owner bid card (line ~379).
- Add both tasks to roadmap.md.
- Verify in the preview with a test card (including one that requires a security check) that a bid is saved and appears in My Bids.
