---
name: diffity-start
description: Start the diffity diff viewer server for the current working tree or staged changes
user-invocable: true
---

# Diffity Start Skill

You are starting the diffity diff viewer so the user can see their changes in the browser.

## Instructions

1. Check that `{{binary}}` is available: run `which {{binary}}`. If not found, {{install_hint}}.
2. Check if diffity is already running for this repo: run `{{binary}} list --json`. If it shows an entry for this repo, diffity is already running — skip to step 5.
3. Start the server using the Bash tool with `run_in_background: true`:
   - Command: `{{binary}}`
   - Do NOT use `&` or `--quiet` — let the Bash tool handle backgrounding
   - The browser will open automatically and the session is auto-created on startup
   - If diffity detects an existing instance for this repo, it will reuse it automatically
4. Wait 2 seconds, then verify it's running with `{{binary}} list`.
5. Tell the user diffity is running and show them what they can do next. Keep it short — don't show session IDs, hashes, or other internals. Example:

   > Diffity is running — check your browser.
   >
   > When you're ready:
   > - Leave comments on the diff in your browser, then run **{{slash}}resolve** to fix them
   > - Or run **{{slash}}review** to get an AI code review
