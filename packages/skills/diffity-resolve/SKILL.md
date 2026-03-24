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
{{binary}} agent diff
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
2. Check that a review session exists: run `{{binary}} agent list`. If this fails with "No active review session", tell the user to start diffity first (e.g. `{{binary}}` or **{{slash}}diff**).

## Instructions

1. List open comment threads with full details:
   ```
   {{binary}} agent list --status open --json
   ```
   If a `thread-id` argument was provided, filter to just that thread. The JSON output includes the full comment body, file path, line numbers, and side for each thread.
2. If there are no open threads, tell the user there's nothing to resolve.
3. For each open thread, check the `comments` array and the `author.type` field (`"user"` or `"agent"`) on each comment:
   a. **Skip** general comments (filePath `__general__`) — these are summaries, not actionable code changes.
   b. **Skip** threads where the last comment is an agent reply that asks the user a question (e.g. "Could you clarify...?") and the user hasn't responded yet — the agent is waiting for user input. Still process threads where the agent left the original comment (code suggestion, review feedback, etc.) — those are actionable.
   c. **`[nit]` comments** — these are minor suggestions but still actionable. Resolve them like any other comment.
   d. **`[question]` comments** (from the user) — read the question, examine the relevant code, and reply with an answer:
      ```
      {{binary}} agent reply <thread-id> --body "Your answer here"
      ```
      Then resolve the thread with a summary of your answer.
   e. Comments phrased as questions without an explicit `[question]` tag (e.g. "should we add X?" or "can we rename this?") are suggestions — treat them as actionable requests and make the change.
   f. Read the comment body from the JSON output and understand what change is requested. Interpret the intent:
      - If the comment suggests a code change, make the change.
      - If the comment suggests adding documentation, add or update the relevant docs.
      - If the comment asks a question that implies an action (e.g. "should we add X?"), treat it as a request to do that action.
      - If the comment is genuinely unclear and you cannot determine what action to take, reply asking for clarification instead of silently skipping:
        ```
        {{binary}} agent reply <thread-id> --body "Could you clarify what change you'd like here?"
        ```
   g. Read the relevant source file to understand the full context around the commented lines, then make the requested change using the Edit tool.
   h. After making the change, resolve the thread with a summary:
      ```
      {{binary}} agent resolve <thread-id> --summary "Fixed: <brief description of what was changed>"
      ```
4. After resolving all applicable threads, run `{{binary}} agent list` to confirm status.
5. Tell the user to check the browser — resolved status will appear within 2 seconds via polling.
