---
name: diffity-start
description: Start the diffity diff viewer server for the current working tree or staged changes
user-invokable: true
---

# Diffity Start Skill

You are starting the diffity diff viewer so the user can see their changes in the browser.

## Instructions

1. Check that `{{binary}}` is available: run `which {{binary}}`. If not found, tell the user to run `npm run dev` from the diffity repo root to link the CLI.
2. Determine which mode to start in:
   - If the user said "staged" or there are staged changes they want to review: `{{binary}} --staged`
   - Otherwise default to: `{{binary}}`
3. Start the server using the Bash tool with `run_in_background: true`:
   - Command: `{{binary}}` (or `{{binary}} --staged`)
   - Do NOT use `&` or `--quiet` — let the Bash tool handle backgrounding
   - The browser will open automatically and the session is auto-created on startup
4. Wait 2 seconds, then verify the session exists by checking that `.diffity/current-session` file is present.
5. Tell the user diffity is running and show them what they can do next. Keep it short — don't show session IDs, hashes, or other internals. Example:

   > Diffity is running — check your browser.
   >
   > Here's what you can do:
   > - **{{slash}}review** — get a code review on your changes
   > - **{{slash}}self-review** — quick pre-push sanity check
   > - **{{slash}}summarize** — generate a PR summary
