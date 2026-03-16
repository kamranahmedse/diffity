---
name: diffity-review
description: Review current diff and leave comments using diffity agent commands
user-invocable: true
---

# Diffity Review Skill

You are reviewing a diff and leaving inline comments using the `{{binary}} agent` CLI.

## Arguments

- `focus` (optional): Focus the review on a specific area. One of: `security`, `performance`, `naming`, `errors`, `types`, `logic`. If omitted, review everything.

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

1. Check that `{{binary}}` is available: run `which {{binary}}`. If not found, {{install_hint}}.
2. Check that a review session exists: run `{{binary}} agent list`. If this fails with "No active review session", tell the user to start diffity first (e.g. `{{binary}}` or **{{slash}}start**).

## Instructions

1. Read the current diff using `git diff`. Check `.diffity/current-session` to determine which ref is active.
2. For each changed file, read the **entire file** (not just the diff hunks) to understand the full context. This prevents false positives from missing surrounding code.
3. Analyze the code changes thoroughly. If a `focus` argument was provided, concentrate on that area. Otherwise look for:
   - Bugs, logic errors, off-by-one errors
   - Security issues (injection, XSS, auth bypass)
   - Performance problems
   - Missing error handling at system boundaries
   - Race conditions
   - API contract violations
   - Unclear or misleading naming
4. **Only comment on code that was changed in the diff.** Do not flag pre-existing issues in unchanged code — this is a review of the diff, not an audit of the entire file. The only exception is if a change in the diff introduces a bug in combination with existing code.
5. **Prioritize signal over volume.** A clean diff should get a clean review. Do not manufacture findings to appear thorough. If a diff with 5 changed lines only has 1 real issue, leave 1 comment.
6. **Do not repeat the same issue across files.** If the same pattern appears in multiple places, leave one inline comment on the first occurrence and mention it in the general summary instead of commenting on every instance.
7. Categorize each finding with a severity prefix in the comment body:
   - `[must-fix]` — Bugs, security issues, data loss risks. These must be addressed.
   - `[suggestion]` — Improvements that would meaningfully improve the code.
   - `[nit]` — Style or preference. Fine to ignore.
   - `[question]` — Something unclear that needs clarification from the author.
8. For each finding, leave a comment using:
   ```
   {{binary}} agent comment --file <path> --line <n> [--end-line <n>] [--side new] --body "<comment>"
   ```
   - Use `--side new` (default) for comments on added/modified code
   - Use `--side old` for comments on removed code
   - Use `--end-line` when the issue spans multiple lines
   - Be specific and actionable in your comments
9. After leaving all inline comments, write a general comment that summarizes your overall assessment of the diff. This should cover:
   - Overall quality verdict (e.g. "Looks good with minor issues" or "Needs significant changes before merging")
   - Cross-cutting concerns that don't belong on any single line (architecture, naming consistency across files, missing tests, etc.)
   - A count of findings by severity (e.g. "2 must-fix, 3 suggestions, 1 nit")
   ```
   {{binary}} agent general-comment --body "<overall review summary>"
   ```
   If there are no inline findings, still leave a general comment with your assessment (e.g. "Clean diff — no issues found").
10. Run `{{binary}} agent list` to confirm all comments were created.
11. Tell the user to check the browser — comments will appear within 2 seconds via polling.
