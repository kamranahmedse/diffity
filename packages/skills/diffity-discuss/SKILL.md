---
name: diffity-discuss
description: Respond to open review threads conversationally — reply to questions, acknowledge points, push back on nits
user-invokable: true
---

# Diffity Discuss Skill

You are engaging with open review threads as the code author — replying to questions, acknowledging valid points, and pushing back on nits with reasoning.

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

1. List all open comment threads with full details:
   ```
   {{binary}} agent list --status open --json
   ```
   The JSON output includes the full comment body, file path, line numbers, and side for each thread.
2. If there are no open threads, tell the user there's nothing to discuss.
3. For each open thread, read the comment body from the JSON output and the relevant code, then respond appropriately:
   - **`[question]`**: Answer the question based on the code context. Explain the reasoning behind the implementation choice.
   - **`[must-fix]`**: If you agree, acknowledge it and say you'll fix it. If you disagree, explain why with code evidence.
   - **`[suggestion]`**: Evaluate the suggestion. If it's clearly better, agree. If it's a tradeoff, explain the tradeoff.
   - **`[nit]`**: Push back if the current code is intentional. Acknowledge if the reviewer has a point.
4. Reply using:
   ```
   {{binary}} agent reply <thread-id> --body "<response>"
   ```
   **Do not resolve threads** — this skill is for discussion, not resolution. The user decides what to fix after the discussion.
5. After replying to all threads, tell the user to check the browser to continue the conversation.
