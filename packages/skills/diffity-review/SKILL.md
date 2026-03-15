---
name: diffity-review
description: Review current diff and leave comments using diffity agent commands
user-invokable: true
---

# Diffity Review Skill

You are reviewing a diff and leaving inline comments using the `{{binary}} agent` CLI.

## Arguments

- `focus` (optional): Focus the review on a specific area. One of: `security`, `performance`, `naming`, `errors`, `types`, `logic`. If omitted, review everything.

## CLI Reference

```
{{binary}} agent list [--status open|resolved|dismissed] [--json]
{{binary}} agent comment --file <path> --line <n> [--end-line <n>] [--side new|old] --body "<text>"
{{binary}} agent resolve <id> [--summary "<text>"]
{{binary}} agent dismiss <id> [--reason "<text>"]
{{binary}} agent reply <id> --body "<text>"
```

- `--file`, `--line`, `--body` are required for `comment`
- `--end-line` defaults to `--line` (single-line comment)
- `--side` defaults to `new`
- `<id>` accepts full UUID or 8-char prefix

## Prerequisites

1. Check that `{{binary}}` is available: run `which {{binary}}`. If not found, tell the user to run `npm run dev` from the diffity repo root to link the CLI.
2. Check that a review session exists: run `cat .diffity/current-session`. If the file doesn't exist or is stale, tell the user to start diffity first (e.g. `{{binary}}` or `{{binary}} --staged`).

## Instructions

1. Read the current diff using `git diff` (for working tree changes) or `git diff --staged` (for staged changes). Check `.diffity/current-session` to determine which ref is active.
2. For each changed file, read the **entire file** (not just the diff hunks) to understand the full context. This prevents false positives from missing surrounding code.
3. Analyze the code changes thoroughly. If a `focus` argument was provided, concentrate on that area. Otherwise look for:
   - Bugs, logic errors, off-by-one errors
   - Security issues (injection, XSS, auth bypass)
   - Performance problems
   - Missing error handling at system boundaries
   - Race conditions
   - API contract violations
   - Unclear or misleading naming
4. Categorize each finding with a severity prefix in the comment body:
   - `[must-fix]` — Bugs, security issues, data loss risks. These must be addressed.
   - `[suggestion]` — Improvements that would meaningfully improve the code.
   - `[nit]` — Style or preference. Fine to ignore.
   - `[question]` — Something unclear that needs clarification from the author.
5. For each finding, leave a comment using:
   ```
   {{binary}} agent comment --file <path> --line <n> [--end-line <n>] [--side new] --body "<comment>"
   ```
   - Use `--side new` (default) for comments on added/modified code
   - Use `--side old` for comments on removed code
   - Use `--end-line` when the issue spans multiple lines
   - Be specific and actionable in your comments
6. After leaving all comments, run `{{binary}} agent list` to confirm they were created.
7. Tell the user to check the browser — comments will appear within 2 seconds via polling.
