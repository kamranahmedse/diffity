---
name: diffity-tour
description: Create a guided code tour that walks through the codebase to answer a question or explain a feature. Opens in the browser with step-by-step navigation and highlighted code.
user-invocable: true
---

# Diffity Tour Skill

You are creating a guided code tour — a narrated, step-by-step walkthrough of the codebase that answers the user's question or explains how a feature works. The tour opens in the browser with a sidebar showing the narrative and highlighted code sections.

## Arguments

- `question` (required): The user's question or topic. Examples:
  - `/diffity-tour how does authentication work?`
  - `/diffity-tour explain the request lifecycle`
  - `/diffity-tour how are comments stored and retrieved?`

## CLI Reference

```
{{binary}} agent tour-start --topic "<text>" [--body "<text>"] --json
{{binary}} agent tour-step --tour <id> --file <path> --line <n> [--end-line <n>] --body "<text>" [--annotation "<text>"] --json
{{binary}} agent tour-done --tour <id> --json
{{binary}} list --json
```

## Prerequisites

1. Check that `{{binary}}` is available: run `which {{binary}}`. If not found, {{install_hint}}.
2. Ensure a tree instance is running: run `{{binary}} list --json`.
   - If no instance is running, start one: run `{{binary}} tree` using the Bash tool with `run_in_background: true`, wait 2 seconds, then run `{{binary}} list --json` to get the port.

## Instructions

### Phase 1: Research the codebase

Before creating any tour steps, you must deeply understand the answer to the user's question. This is the most important phase.

1. Read the relevant source files thoroughly. Follow the code path from entry point to completion.
2. Identify the key locations that tell the story — the files and line ranges that someone needs to see to understand the answer.
3. Plan a logical sequence of 4–8 steps that builds understanding progressively. Each step should lead naturally to the next.

**Guidelines for choosing steps:**
- Start where the flow begins (entry point, config, initialization)
- Follow the execution path in the order things actually happen
- Include only locations that are essential to understanding — skip boilerplate
- End at the final outcome (response sent, data persisted, UI rendered)
- Each step should cover a single concept or code section

### Phase 2: Create the tour

1. **Start the tour** with a topic and introductory body:
   ```
   {{binary}} agent tour-start --topic "<user's question>" --body "<2-3 sentence overview of what the tour covers and why>" --json
   ```
   Extract the tour ID from the JSON output.

2. **Add steps** in order. For each step:
   ```
   {{binary}} agent tour-step --tour <id> --file <path> --line <start> --end-line <end> --body "<narrative>" --annotation "<short label>" --json
   ```

   **Writing good step content:**
   - `--file`: Path relative to repo root (e.g. `src/server.ts`)
   - `--line` / `--end-line`: The exact line range to highlight. Keep it focused — 3 to 20 lines. Don't highlight entire functions if only a few lines matter.
   - `--body`: The narrative text shown in the tour sidebar. Write 2-4 sentences explaining what this code does and why it matters in the context of the question. Be specific — reference variable names, function calls, and patterns. Don't just describe what the code does syntactically — explain the *why*.
   - `--annotation`: A short label (3-6 words) shown above the highlighted code in the file viewer. Think of it as a chapter title. Examples: "Request entry point", "Auth middleware check", "Database query builder"

3. **Finish the tour:**
   ```
   {{binary}} agent tour-done --tour <id> --json
   ```

### Phase 3: Open in browser

1. Get the running instance port from `{{binary}} list --json`.
2. Open the tour: `open "http://localhost:<port>/tour/<tour-id>"` (or the appropriate command for the user's OS).
3. Tell the user the tour is ready:

   > Your tour is ready! Open http://localhost:<port>/tour/<tour-id>
   >
   > Use the panel on the right to navigate between steps. Click **Next**/**Prev** or click any step directly.

## Quality Checklist

Before finishing, verify your tour meets these standards:

- [ ] Steps follow the actual execution/data flow, not alphabetical file order
- [ ] Each step's `--body` explains *why*, not just *what*
- [ ] Each step's `--annotation` is a concise label (not a full sentence)
- [ ] Line ranges are precise — highlight the relevant section, not the entire file
- [ ] The intro `--body` gives enough context that someone unfamiliar can follow along
- [ ] 4–8 steps total (fewer if the topic is simple, more only if truly needed)
- [ ] No two consecutive steps point to the same file unless they cover clearly different sections
