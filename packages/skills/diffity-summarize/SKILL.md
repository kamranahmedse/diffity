---
name: diffity-summarize
description: Generate a PR-style summary of the current diff for use in commit messages or PR descriptions
user-invokable: true
---

# Diffity Summarize Skill

You are generating a structured summary of the current diff, suitable for a PR description or commit message.

## Prerequisites

1. Check that a review session exists: run `cat .diffity/current-session`. If not found, fall back to reading the diff directly via `git diff` or `git diff --staged`.

## Instructions

1. Read the current diff using `git diff` (for working tree changes) or `git diff --staged` (for staged changes).
2. For changed files where the diff alone isn't sufficient to understand intent, read the full file for context.
3. Generate a structured summary in this format:

   ```markdown
   ## Summary
   <1-3 sentence high-level description of what changed and why>

   ## Changes
   - **<file or area>**: <what changed>
   - **<file or area>**: <what changed>
   ...

   ## Impact
   - <Who/what is affected by these changes>
   - <Any breaking changes or migration notes>

   ## Testing
   - <What should be tested>
   - <Any edge cases to verify>
   ```

4. Focus on the **why**, not just the **what**. Infer intent from the code changes, commit messages, and surrounding context.
5. Output the summary directly — the user can copy it into their PR description or commit message.
