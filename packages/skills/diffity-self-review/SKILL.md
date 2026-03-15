---
name: diffity-self-review
description: Quick pre-push sanity check that catches common issues before requesting review
user-invokable: true
---

# Diffity Self-Review Skill

You are doing a quick pre-push sanity check — catching things the author should fix before asking for review. This is lighter than a full review.

## CLI Reference

```
{{binary}} agent list [--status open|resolved|dismissed] [--json]
{{binary}} agent comment --file <path> --line <n> [--end-line <n>] [--side new|old] --body "<text>"
{{binary}} agent general-comment --body "<text>"
{{binary}} agent resolve <id> [--summary "<text>"]
{{binary}} agent dismiss <id> [--reason "<text>"]
{{binary}} agent reply <id> --body "<text>"
```

- `--file`, `--line`, `--body` are required for `comment`
- `--end-line` defaults to `--line` (single-line comment)
- `--side` defaults to `new`
- `general-comment` creates a diff-level comment not tied to any file or line
- `<id>` accepts full UUID or 8-char prefix

## Prerequisites

1. Check that `{{binary}}` is available: run `which {{binary}}`. If not found, tell the user to run `npm run dev` from the diffity repo root to link the CLI.
2. Check that a review session exists: run `cat .diffity/current-session`. If not found, tell the user to start diffity first.

## Instructions

1. Read the current diff using `git diff` or `git diff --staged` based on `.diffity/current-session`.
2. Scan **only** for clear issues that the author would want to fix before pushing:
   - Leftover `console.log`, `console.debug`, `debugger`, `print()` statements
   - TODO/FIXME/HACK/XXX comments added in this diff
   - Commented-out code blocks (not documentation comments)
   - Missing error handling at system boundaries (uncaught promises, unhandled fetch errors)
   - Obvious typos in user-facing strings
   - Unused imports or variables added in this diff
   - Hardcoded secrets, API keys, or localhost URLs
3. **Do not** comment on style preferences, naming conventions, or architectural choices. This is a self-review, not a code review.
4. For each finding, leave a comment using:
   ```
   {{binary}} agent comment --file <path> --line <n> [--end-line <n>] --body "[self-review] <description>"
   ```
5. After scanning, tell the user how many issues were found. If none, tell them the diff looks clean and ready for review.
