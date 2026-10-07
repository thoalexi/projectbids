# Edit AI follow-up answers

## Goal
Let a homeowner revise the answers they gave to the AI-generated follow-up questions from the existing **Edit project** page. The AI-generated question text remains fixed.

## Changes
- Add the saved AI follow-up questions and answer fields to the edit form.
- Show each AI question as read-only text with an editable answer underneath.
- Save the revised answers together with the other project changes.
- Keep the existing rule that editing is available only to the homeowner and only before the first bid arrives.
- Preserve the existing AI questions when no answer is changed; do not regenerate them.

## Validation
- Confirm saved AI answers load on the edit page and remain after saving.
- Confirm question text cannot be edited.
- Confirm the edit lock still prevents changes after a bid arrives.
- Check the edit page at desktop and mobile sizes and confirm the app builds cleanly.

## Technical details
- Extend the shared project form values with the existing `ai_questions` JSON structure.
- Pass the project's saved AI questions into the edit form and include them in the existing project update.
- No database change is required because `projects.ai_questions` already stores both each question and its answer, and the edit-lock trigger already protects that field after bids arrive.
