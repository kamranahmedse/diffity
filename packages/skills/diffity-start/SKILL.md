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
3. Start diffity in the background: run `{{binary}} --quiet &` (or `{{binary}} --staged --quiet &`). Use `--quiet` to reduce noise. The browser will open automatically. The session is auto-created on startup.
4. Wait briefly (1-2 seconds) for the server to start, then verify `.diffity/current-session` exists.
5. Tell the user the server is running.
