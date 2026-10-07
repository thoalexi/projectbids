# Return to your page after signing in

## Problem
The sign-in page always sends you to the home page after you sign in. So if you clicked "Post a project" (or "My Posts") while signed out, you lose your place and have to click again.

## Fix
Remember where you were headed, and go back there after sign-in.

1. **Sign-in page remembers the destination** — the sign-in page accepts a "return to" address (e.g. `/post`). After a successful email sign-in, it takes you there instead of the home page.
2. **Google sign-in too** — the Google sign-in button passes the same return address, so you land back on the right page after Google finishes.
3. **Every "sign in first" prompt passes its page** — the prompts on Post a project, My Posts, My Bids, and the edit-project page each tell the sign-in page where to send you back.
4. **Safety** — only return addresses inside the site are allowed (anything else falls back to the home page), so the return link can't be abused to send you to another website.

## Technical details
- `src/routes/auth.tsx`: add a validated `redirect` search param (must start with `/` and not `//`); the `useEffect` that navigates after sign-in uses it; the Google OAuth `redirect_uri` becomes `window.location.origin + redirect`.
- `src/routes/post.tsx`, `src/routes/my-posts.tsx`, `src/routes/my-bids.tsx`, `src/routes/edit.$id.tsx`: change their `<Link to="/auth">` to include `search={{ redirect: "<current path>" }}`.
- No database changes.
