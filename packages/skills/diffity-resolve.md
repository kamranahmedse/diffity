---
name: diffity-resolve
description: Read open review comments and resolve them by making code fixes
user_invocable: true
---

# Diffity Resolve Skill

You are reading open review comments and resolving them by making the requested code changes.

## Prerequisites

1. Check that `diffity` is installed: run `which diffity`. If not found, run `npm install -g diffity`.
2. Check that a review session exists: run `cat .diffity/current-session`. If the file doesn't exist or is stale, tell the user to start diffity first.

## Instructions

1. List all open comment threads:
   ```
   diffity agent list --status open
   ```
2. If there are no open threads, tell the user there's nothing to resolve.
3. For each open thread:
   a. Read the comment body and understand what change is requested.
   b. Read the relevant source file to understand the full context around the commented lines.
   c. Make the requested code change using the Edit tool.
   d. After making the change, resolve the thread with a summary:
      ```
      diffity agent resolve <thread-id> --summary "Fixed: <brief description of what was changed>"
      ```
4. After resolving all threads, run `diffity agent list` to confirm all are resolved.
5. Tell the user to check the browser — resolved status will appear within 2 seconds via polling.
