---
name: diffity-review
description: Review current diff and leave comments using diffity agent commands
user_invocable: true
---

# Diffity Review Skill

You are reviewing a diff and leaving inline comments using the `diffity agent` CLI.

## Prerequisites

1. Check that `diffity` is installed: run `which diffity`. If not found, run `npm install -g diffity`.
2. Check that a review session exists: run `cat .diffity/current-session`. If the file doesn't exist or is stale, tell the user to start diffity first (e.g. `diffity` or `diffity --staged`).

## Instructions

1. Read the current diff using `git diff` (for working tree changes) or `git diff --staged` (for staged changes). Check `.diffity/current-session` to determine which ref is active.
2. Analyze the code changes thoroughly. Look for:
   - Bugs, logic errors, off-by-one errors
   - Security issues (injection, XSS, auth bypass)
   - Performance problems
   - Missing error handling at system boundaries
   - Race conditions
   - API contract violations
   - Unclear or misleading naming
3. For each finding, leave a comment using:
   ```
   diffity agent comment --file <path> --line <n> [--end-line <n>] [--side new] --body "<comment>"
   ```
   - Use `--side new` (default) for comments on added/modified code
   - Use `--side old` for comments on removed code
   - Be specific and actionable in your comments
   - Include code suggestions using markdown code blocks when appropriate:
     ````
     --body "This could cause a null pointer. Consider:
     \`\`\`suggestion
     if (value != null) {
       process(value);
     }
     \`\`\`"
     ````
4. After leaving all comments, run `diffity agent list` to confirm they were created.
5. Tell the user to check the browser — comments will appear within 2 seconds via polling.
