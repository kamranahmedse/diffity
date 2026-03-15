---
name: diffity-start
description: Start the diffity diff viewer server for the current working tree or staged changes
user_invocable: true
---

# Diffity Start Skill

You are starting the diffity diff viewer so the user can see their changes in the browser.

## Instructions

1. Check that `diffity` is installed: run `which diffity`. If not found, run `npm install -g diffity`.
2. Determine which mode to start in:
   - If the user said "staged" or there are staged changes they want to review: `diffity --staged`
   - Otherwise default to: `diffity`
3. Start diffity in the background: run `diffity --no-open --quiet &` (or `diffity --staged --no-open --quiet &`). Use `--no-open` so the browser doesn't pop up automatically — the user likely wants the agent to work first. Use `--quiet` to reduce noise. The session is auto-created on startup.
4. Wait briefly (1-2 seconds) for the server to start, then verify `.diffity/current-session` exists.
5. Tell the user the server is running and give them the URL (default `http://localhost:5391/?ref=work` or `http://localhost:5391/?ref=staged`).
