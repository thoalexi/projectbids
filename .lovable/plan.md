# Sign-in reliability fix

Targeted fix of sign-in only. No changes to branding, layout, bidding, payments, roles or the database. Existing accounts, projects and bids are untouched.

## What the audit found
1. **Signed-in people briefly look signed out.** The header and several pages (job page, Get Verified, both admin pages) show "Sign in" before the saved session finishes loading, then flip. Post / My Posts / My Bids show a blank screen instead.
2. **Full page reloads after sign-in.** The sign-in page and the Google return both force a hard reload to go to the next page, which causes the flash and feels slow.
3. **Google return path is fragile.** The "where to go next" note is only saved when the destination isn't the home page, and is read inside the session listener, which can fire before the page is ready — occasionally leaving people on the home page or the sign-in page.
4. **Google button gives no feedback.** No loading state, can be clicked twice, and a cancelled Google window shows a generic error.
5. **Email errors are raw.** Sign-up shows the system's raw message (e.g. rate limits, weak password).
6. **No "Forgot password".** There is no way to reset a password today.
7. **Form details.** No show-password toggle, no autofill hints for password managers, no inline errors.

## Fixes
1. **One sign-in state for the whole site** with three states: checking, signed in, signed out. Pages and the header show a quiet placeholder while checking instead of "Sign in" or a blank screen.
2. **Smooth return after sign-in.** Use in-app navigation (no reload) to send people back to the page they came from — Post a project, the job they were bidding on, Get Verified, My Posts, etc. Return paths stay validated (must start with "/", not "//").
3. **Google flow made dependable.** Always save the return path before leaving; handle the return once the session is confirmed; button shows "Connecting…" and is disabled while working; cancelling just resets the button quietly.
4. **Friendly error messages** for wrong password, already-registered email (worded without revealing whether an account exists), too many attempts, network problems, and expired links.
5. **Forgot password + reset page.** "Forgot password?" link on the sign-in form sends a reset email; a new "Set a new password" page finishes it.
6. **Form polish.** Show/hide password, proper autofill/password-manager hints, inline error under the form, entered email kept after a failed attempt, buttons disabled while sending.
7. **Sign out** returns to the home page cleanly without a reload.

## What I'll test (and report honestly)
- Tested in the preview: email sign-in, sign-out and back in, refresh while signed in, return to Post a project and to a job page, wrong password message, reset-password page loads, narrow/mobile width.
- Cannot be fully tested automatically: real Google account selection, Google cancel, iPhone Safari, reset email arrival. I'll list these for you to try.
- Nothing to configure in Google Cloud — Google sign-in is managed for you, and projectbids.app is already supported.

## Technical details
- `src/lib/auth.tsx`: expose `status: "loading" | "authed" | "anon"`; single `onAuthStateChange` listener (SIGNED_IN / SIGNED_OUT / USER_UPDATED / PASSWORD_RECOVERY); post-OAuth redirect consumed after `getSession` resolves, via router `navigate` instead of `window.location.assign`.
- `src/routes/auth.tsx`: router navigation, busy state for Google, error mapping helper, forgot-password mode (`resetPasswordForEmail` with `redirectTo: origin + "/reset-password"`), `autocomplete` attributes, password toggle.
- New `src/routes/reset-password.tsx` (public, `updateUser({ password })`, no current password), excluded from sitemap, own head().
- `SiteHeader`, `projects.$id`, `verify`, `admin.*`, `post`, `my-posts`, `my-bids`, `edit.$id`: render a small skeleton while status is loading.
- No database, policy, or payment changes.
