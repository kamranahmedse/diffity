---
name: diffity-diff
description: Open the diffity diff viewer in the browser to see your changes
user-invocable: true
---

# Diffity Diff Skill

You are opening the diffity diff viewer so the user can see their changes in the browser.

## Arguments

- `ref` (optional): Git ref to diff (e.g. `main..feature`, `HEAD~3`). Defaults to working tree changes.

## Instructions

1. Check that `{{binary}}` is available: run `which {{binary}}`. If not found, {{install_hint}}.
2. Run `{{binary}} <ref>` (or just `{{binary}}` if no ref) using the Bash tool with `run_in_background: true`:
   - The CLI handles everything: if an instance is already running for this repo it reuses it and opens the browser, otherwise it starts a new server and opens the browser.
   - Do NOT use `&` or `--quiet` — let the Bash tool handle backgrounding.
3. Wait 2 seconds, then run `{{binary}} list --json` to get the port.
4. Tell the user diffity is running. Print the URL and keep it short — don't show session IDs, hashes, or other internals. Example:

   > Diffity is running at http://localhost:5391
   >
   > When you're ready:
   > - Leave comments on the diff in your browser, then run **{{slash}}resolve** to fix them
   > - Or run **{{slash}}review** to get an AI code review
