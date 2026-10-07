# Contractor card-on-file and hired-job fee

## Goal
Require each contractor to add a payment method before submitting a bid. No funds are reserved and losing bidders pay nothing. When a homeowner chooses a bid, Beam Bids charges the winning contractor **13% of the accepted bid total**; the job is awarded only after that payment succeeds.

## User experience
- Replace the current “This bid is free” wording with a precise promise: submitting a bid costs nothing, a card is required, and only the hired contractor pays 13%.
- During bid submission, collect and securely save the contractor’s payment method through Lovable’s built-in Stripe payment screen. Beam Bids will never store card details.
- Show the bidder whether their payment method is ready before allowing the bid to be submitted.
- Keep losing bids at $0. Because funds are not authorized, there is no bank hold to release when another contractor wins or the done-by date passes.
- When the homeowner selects a contractor, show a pending state while the success fee is charged. Mark the project as hired only after confirmed payment.
- If payment fails, leave the project open, do not award the bid, and tell the contractor to update their payment method. The homeowner can retry after it is resolved or select another bidder.
- Show payment status and the 13% fee amount in **My Bids** for the contractor, without exposing payment details to the homeowner or other bidders.

## Payments setup
- Enable Lovable’s built-in Stripe payments in test mode first. The workspace is already on an active Pro plan, and Stripe is the supported provider for this marketplace.
- Use Stripe’s saved-payment-method flow for bidder cards and an off-session charge for the success fee.
- Configure verified Stripe webhook handling so payment success or failure, rather than a browser response, is the source of truth.
- Keep live payments disabled until the Stripe account is claimed and verified; test the complete flow without real money first.

## Data and security
- Add a private payment record linked to each bid, recording only provider IDs, calculated fee amount, currency, and status; never store card numbers or security codes.
- Restrict payment records so contractors can read only their own and homeowners can see only whether the selected bid is ready/paid—not provider secrets or card data.
- Move bid submission and bid acceptance into authenticated server-side operations. Recalculate the 13% fee from the stored bid amount on the server, verify project ownership, verify the bid belongs to that project, prevent duplicate charges, and make acceptance safe to retry.
- Replace the current direct “Accept bid” update with a pending-payment workflow. Webhook confirmation completes the project award atomically.
- Preserve sealed bids and the five-bid limit.

## Expiration behavior
- If another contractor is hired, mark all losing payment records as closed with no charge.
- If the project’s done-by date passes without a hire, expire all open bids and their payment obligations with no charge.
- Add a scheduled cleanup path for expired projects and also enforce expiration when relevant pages or actions are opened, so stale bids cannot later be charged.

## Validation
- Test: card setup and bid submission, losing bidder charged $0, successful 13% charge and award, failed charge leaves the project open, duplicate clicks do not double-charge, withdrawal closes the obligation, and date expiration prevents later charging.
- Verify the homeowner, winner, losing bidders, and signed-out views separately, plus desktop and phone layouts.

## Technical notes
- Payment actions will use authenticated server functions; the external Stripe webhook will use a signature-verified public server endpoint.
- Database changes will be additive, with explicit grants and row-level access policies in the same migration.
- Existing already-awarded demo jobs will remain historical and will not be retroactively charged.
