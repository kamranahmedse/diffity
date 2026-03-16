---
name: diffity-resolve
description: Read open review comments and resolve them by making code fixes
user-invocable: true
---

# Diffity Resolve Skill

You are reading open review comments and resolving them by making the requested code changes.

## Arguments

- `thread-id` (optional): Resolve a specific thread by ID instead of all open threads. Example: `/diffity-resolve abc123`

## CLI Reference

```
diffity agent list [--status open|resolved|dismissed] [--json]
diffity agent comment --file <path> --line <n> [--end-line <n>] [--side new|old] --body "<text>"
diffity agent general-comment --body "<text>"
diffity agent resolve <id> [--summary "<text>"]
diffity agent dismiss <id> [--reason "<text>"]
diffity agent reply <id> --body "<text>"
```

- `--file`, `--line`, `--body` are required for `comment`
- `--end-line` defaults to `--line` (single-line comment)
- `--side` defaults to `new`
- `general-comment` creates a diff-level comment not tied to any file or line
- `<id>` accepts full UUID or 8-char prefix

## Prerequisites

1. Check that `diffity` is available: run `which diffity`. If not found, install it with `npm install -g diffity`.
2. Check that a review session exists: run `cat .diffity/current-session`. If the file doesn't exist or is stale, tell the user to start diffity first.

## Instructions

1. List open comment threads with full details:
   ```
   diffity agent list --status open --json
   ```
   If a `thread-id` argument was provided, filter to just that thread. The JSON output includes the full comment body, file path, line numbers, and side for each thread.
2. If there are no open threads, tell the user there's nothing to resolve.
3. For each open thread:
   a. **Skip** general comments (filePath `__general__`) — these are summaries, not actionable code changes.
   b. **Skip** threads tagged `[question]` or `[nit]` — these don't require code changes. Tell the user you skipped them and why.
   c. Read the comment body from the JSON output and understand what change is requested.
   d. Read the relevant source file to understand the full context around the commented lines, then make the requested code change using the Edit tool.
   e. After making the change, resolve the thread with a summary:
      ```
      diffity agent resolve <thread-id> --summary "Fixed: <brief description of what was changed>"
      ```
4. After resolving all applicable threads, run `diffity agent list` to confirm status.
5. Tell the user to check the browser — resolved status will appear within 2 seconds via polling.
