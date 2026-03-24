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

## Instructions

### Step 1: Ensure diffity is running for the correct ref (without opening browser)

The review needs a running session whose ref matches the requested ref. A ref mismatch causes "file not in current diff" errors when adding comments.

1. Run `{{binary}} list --json` to get all running instances. Parse the JSON output and find the entry whose `repoRoot` matches the current repo.
2. If a matching entry exists, compare its `ref` field against the requested ref:
   - The registry stores `"work"` for working-tree sessions and the user-provided ref string (e.g. `"main"`, `"HEAD~3"`) for named refs.
   - If refs **match** → reuse the session, note the port, and continue to Step 2.
   - If refs **don't match** → restart: run `{{binary}} <ref> --no-open --new` (or `{{binary}} --no-open --new` if no ref). The `--new` flag kills the old session and starts a fresh one. Use Bash tool with `run_in_background: true`. Wait 2 seconds, then verify with `{{binary}} list --json` and note the port.
   - If **no ref was requested** and the running session's ref is not `"work"` → restart with `{{binary}} --no-open --new` (the running session is for a named ref, but we need working-tree).
3. If **no session is running** for this repo, start one in the background:
   - Command: `{{binary}} <ref> --no-open` (or `{{binary}} --no-open` if no ref)
   - Use Bash tool with `run_in_background: true`
   - Wait 2 seconds, then verify with `{{binary}} list --json` and note the port.

### Step 2: Review the diff

1. **Get the unified diff** directly from diffity — this handles merge-base resolution, untracked files, and all ref types automatically:
   ```
   {{binary}} agent diff
   ```
   This outputs the full unified diff for the current session. Line numbers are in the `@@` hunk headers.
2. Find and read all relevant CLAUDE.md files — the root CLAUDE.md and any CLAUDE.md files in directories containing modified files. These define project-specific rules that the diff must follow.

#### Understand the change before reviewing it

3. **Summarize the change first.** Before looking for problems, build a mental model of the diff:
   - What is this change trying to accomplish? (new feature, bug fix, refactor, config change)
   - Which files are structural changes vs. the core logic change?
   - What is the author's intent? Read commit messages (`git log --oneline <args>`) and any linked issues or PR descriptions for context.
   - What are the key decisions the author made, and what constraints were they working within?

   Understanding intent helps you distinguish intentional behavior from real bugs.

4. For each changed file, read the **entire file** (not just the diff hunks) to understand the full context.
5. **Cross-reference callers and dependents.** For any changed function signature, renamed export, modified return type, or altered behavior: grep for usages across the codebase. A function that looks correct in isolation can break every caller. Check:
   - Who calls this function? Will they handle the new return value / error / null case?
   - Who imports this module? Will the changed export name resolve?
   - Does this type change propagate correctly to consumers?
6. Analyze the code changes using the techniques below. If a `focus` argument was provided, concentrate on that area. Otherwise, apply all analysis passes and the signal threshold.

#### How to analyze

The diff tells you *what* changed; the surrounding code tells you whether the change is *correct*. Apply these analysis passes:

**Data flow analysis** — Trace values through the changed code. Where does each variable come from? Where does it go? Check:
- Can a value be null/undefined where the changed code assumes it isn't?
- Does the changed code handle all branches of an upstream conditional?
- If a function's return type changed, do all callers handle the new shape?
- Are there narrowing checks (e.g. `if (x)`) that the diff accidentally moved outside of?

**State and lifecycle analysis** — For stateful code (React state, database transactions, streams, event listeners):
- Does the change create a state that can't be reached or can't be exited?
- Are resources (listeners, subscriptions, file handles) still cleaned up on all paths?
- Can concurrent access corrupt shared state?
- Does the ordering of operations still satisfy invariants (e.g. init before use)?

**Contract analysis** — Check the changed code against the contracts it must satisfy:
- Does the function still satisfy what its callers expect? (Read the callers, don't guess.)
- If it implements an interface or overrides a base method, does it still conform?
- Are pre-conditions and post-conditions preserved?
- For API endpoints: does the response shape match what clients send/expect?

**Boundary analysis** — For code at system boundaries (user input, network, file I/O, IPC):
- Is user-controlled input validated before use?
- Can malformed external data crash the process or corrupt state?
- Are there injection vectors (SQL, shell, XSS, path traversal)?

**Edge case analysis** — Only for cases that *will* happen in practice, not theoretical ones:
- Empty arrays/strings, zero, negative numbers — does the code handle them?
- Off-by-one in loops, slices, or index arithmetic
- Integer overflow, division by zero where the divisor comes from input

#### What to flag

Flag real problems that would affect correctness, security, or reliability:
- Code that will fail to compile, parse, or run (syntax errors, type errors, missing imports, unresolved references)
- Logic errors that will produce wrong results (clear bugs, off-by-one errors, broken conditions)
- Security vulnerabilities in changed code (injection, XSS, auth bypass, data exposure)
- Race conditions or data loss risks you can demonstrate with a concrete scenario
- CLAUDE.md violations where you can quote the exact rule being broken
- Broken contracts — a changed function that no longer satisfies what its callers expect

Skip style concerns, linter-catchable issues, and pre-existing problems in unchanged code. Focus on the diff, not the whole file.

#### Validate before commenting

For each finding, verify it's real before posting:
- Re-read the surrounding code — many apparent bugs disappear in full context
- For "missing import" or "undefined variable" claims, grep to confirm
- For broken callers, read the actual call sites
- For CLAUDE.md violations, confirm the rule is scoped to this file

If a repeated pattern appears across files, comment on the first occurrence and mention the pattern in the general summary instead of duplicating comments.

### Step 3: Leave comments

1. Categorize each finding with a severity prefix in the comment body:
   - `[must-fix]` — Bugs, security issues, data loss risks. Code that will break or produce wrong results.
   - `[suggestion]` — Concrete improvements with a clear reason. Not style preferences — real improvements.
   - `[question]` — Something unclear that needs clarification from the author.

2. For each finding, leave an inline comment using:
   ```
   {{binary}} agent comment --file <path> --line <n> [--end-line <n>] [--side new] --body "<comment>"
   ```
   - Use `--side new` (default) for comments on added/modified code
   - Use `--side old` for comments on removed code
   - Use `--end-line` when the issue spans multiple lines
   - **Lead with the problem**, not background. Be specific and actionable.
   - For small, self-contained fixes, include a code suggestion showing the fix
   - For larger fixes (structural changes, multi-location), describe the issue and suggested approach without a full code block
   - If flagging a CLAUDE.md violation, quote the exact rule being broken
3. After leaving all inline comments, decide whether a general comment is needed:
   - **No findings → leave a general comment:** "No issues found. Checked for bugs and CLAUDE.md compliance."
   - **1-2 findings → skip the general comment** unless there's a cross-cutting concern the inline comments don't cover.
   - **3+ findings → leave a general comment** summarizing the themes.
   - **Do not use severity prefixes in the general comment** — prefixes are only for inline findings.
   - Lead with the verdict, be direct and concise — no compliments, no filler, no narrating what the code does.
   ```
   {{binary}} agent general-comment --body "<overall review summary>"
   ```

### Step 4: Open the browser

1. Open the browser now that comments are ready:
   ```
   {{binary}} open <ref>
   ```
   Pass the ref argument if one was provided (e.g. `{{binary}} open HEAD~3`). Omit it to open the default view.
2. Tell the user the review is ready and they can check the browser. Example:

   > Review complete — check your browser.
   >
   > Found: 2 must-fix, 1 suggestion
   >
   > When you're ready, run **{{slash}}resolve** to fix them.
