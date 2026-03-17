---
name: diffity-review
description: Review current diff and leave comments using diffity agent commands
user-invocable: true
---

# Diffity Review Skill

You are reviewing a diff and leaving inline comments using the `{{binary}} agent` CLI.

## Arguments

- `ref` (optional): Git ref to review (e.g. `main..feature`, `HEAD~3`). Defaults to working tree changes. When both `ref` and `focus` are provided, use both (e.g. `/diffity-review main..feature security`).
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

## Instructions

### Step 1: Ensure diffity is running (without opening browser)

The review needs a running session to add comments to, but we don't want to open the browser until comments are ready.

1. Run `{{binary}} list --json` to check if diffity is already running for this repo.
2. If already running, note the port and continue to Step 2.
3. If not running, start it in the background **without opening the browser**:
   - Command: `{{binary}} <ref> --no-open` (or `{{binary}} --no-open` if no ref)
   - Use Bash tool with `run_in_background: true`
   - Wait 2 seconds, then verify with `{{binary}} list --json` and note the port.

### Step 2: Review the diff

1. Read the current diff using `git diff` (or `git diff <ref>` when a ref was provided).
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

### Step 3: Leave comments

1. Categorize each finding with a severity prefix in the comment body:
   - `[must-fix]` — Bugs, security issues, data loss risks. These must be addressed.
   - `[suggestion]` — Improvements that would meaningfully improve the code.
   - `[nit]` — Style or preference. Fine to ignore.
   - `[question]` — Something unclear that needs clarification from the author.
2. For each finding, leave an inline comment using:
   ```
   {{binary}} agent comment --file <path> --line <n> [--end-line <n>] [--side new] --body "<comment>"
   ```
   - Use `--side new` (default) for comments on added/modified code
   - Use `--side old` for comments on removed code
   - Use `--end-line` when the issue spans multiple lines
   - Be specific and actionable — lead with the point, skip filler
3. After leaving all inline comments, write a general comment summarizing the diff. **Do not use severity prefixes in the general comment** — prefixes are only for inline findings. The general comment should:
   - **Lead with the verdict** (e.g. "LGTM", "Needs changes before merging", "Looks good with minor issues")
   - Use separate paragraphs or bullets when covering multiple points — no walls of text
   - Mention cross-cutting concerns that don't belong on any single line (architecture, naming consistency, missing tests, etc.)
   - Include a count of findings by severity if there are any (e.g. "1 must-fix, 2 suggestions")
   - Be direct and concise — no compliments, no filler, no narrating what the code does
   ```
   {{binary}} agent general-comment --body "<overall review summary>"
   ```
   If there are no inline findings, still leave a general comment with your assessment (e.g. "LGTM — clean diff, no issues found").

### Step 4: Open the browser

1. Run `{{binary}} agent list` to confirm all comments were created.
2. Open the browser now that comments are ready:
   ```
   {{binary}} open <ref>
   ```
   Pass the ref argument if one was provided (e.g. `{{binary}} open HEAD~3`). Omit it to open the default view.
3. Tell the user the review is ready and they can check the browser. Example:

   > Review complete — check your browser.
   >
   > Found: 2 must-fix, 3 suggestions, 1 nit
   >
   > When you're ready, run **{{slash}}resolve** to fix them.
