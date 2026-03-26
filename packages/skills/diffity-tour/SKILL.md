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
   - If no instance is running, start one: run `{{binary}} tree --no-open` using the Bash tool with `run_in_background: true`, wait 2 seconds, then run `{{binary}} list --json` to get the port.

## Instructions

### Phase 1: Research the codebase

Before creating any tour steps, you must deeply understand the answer to the user's question. This is the most important phase.

1. Read the relevant source files thoroughly. Follow the code path from entry point to completion.
2. Identify the key locations that tell the story — the files and line ranges that someone needs to see to understand the answer.
3. Plan a logical sequence of steps that builds understanding progressively. Each step should lead naturally to the next. Let the complexity of the topic determine the number of steps — a focused question might need 3, a system-wide flow might need 15+.

**Guidelines for choosing steps:**
- Start where the flow begins (entry point, config, initialization)
- Follow the execution path in the order things actually happen
- Include only locations that are essential to understanding — skip boilerplate
- End at the final outcome (response sent, data persisted, UI rendered)
- Each step should cover a single concept or code section
- Include concrete examples where possible (e.g. "when the user runs `diffity main`, this becomes...")

### Phase 2: Create the tour

The tour UI has a dedicated explanation panel. The intro (from `tour-start --body`) is displayed as **step 0** — the first thing the reader sees, filling the full panel. Each subsequent step shows its narrative in the same panel alongside the highlighted code. Since the panel has generous space, write rich, detailed explanations.

1. **Start the tour** with a short topic title and introductory body:
   ```
   {{binary}} agent tour-start --topic "<short title>" --body "<intro>" --json
   ```

   The `--topic` is displayed in the tour panel header — keep it to **3–6 words** (e.g. "Authentication Flow", "How Routing Works", "Comment System Architecture"). Do NOT use the user's full question as the topic.

   **Writing the intro body (step 0):**
   This is the first thing the reader sees and it fills the entire explanation panel. Use this space for a thorough architectural overview that sets up everything the reader needs before diving into code. Include:
   - The key components/packages/modules involved and their responsibilities
   - How they connect — data flow, call chains, or dependency relationships
   - Key abstractions or patterns the reader should know about
   - A summary flow diagram using bold text (e.g. **CLI args → git diff → parser → JSON API → React render**)

   Use rich markdown formatting — paragraphs, bold, `code`, tables, code blocks. This is not a table of contents of what the tour will cover; it's a standalone overview that orients the reader.

   Extract the tour ID from the JSON output.

2. **Add steps** in order. For each step:
   ```
   {{binary}} agent tour-step --tour <id> --file <path> --line <start> --end-line <end> --body "<narrative>" --annotation "<short label>" --json
   ```

   **Writing step content:**

   - `--file`: Path relative to repo root (e.g. `src/server.ts`)
   - `--line` / `--end-line`: The exact line range to highlight. Keep it focused on the relevant section.
   - `--annotation`: A short label (3-6 words) shown as the step title. Think of it as a chapter heading.
   - `--body`: The narrative shown in the explanation panel. This has generous space — use it to write thorough explanations using markdown:

   **Do:**
   - Write in prose paragraphs, supplemented by structured content where it helps
   - Use `code` for function names, variables, refs, commands. When referencing a function, class, or code symbol that lives in a **known file and line**, make it a **goto link** so the reader can click to jump there. Syntax: `` [`symbolName`](goto:path/to/file.ts:startLine-endLine) `` or `` [`symbolName`](goto:path/to/file.ts:line) `` for a single line. These render as clickable inline code that navigates to the file and highlights the target lines. Example: `` [`handleDragEnd`](goto:src/KanbanContent.jsx:42-58) ``. Use plain backtick code for generic terms, CLI commands, or symbols you haven't located in the codebase.
   - Use **bold** for key concepts being introduced
   - Explain *why* the code exists and the design decisions behind it, not just what it does
   - Use concrete examples: "When you run `diffity main`, this line calls `normalizeRef('main')` which computes `git merge-base main HEAD`"
   - Use tables for mappings (input → output, ref → git command)
   - Use code blocks for data structures or command outputs
   - Connect each step to the bigger picture from the intro
   - For large highlighted ranges, use **sub-highlight links** to focus on specific sub-sections within the step. Syntax: `[label](focus:startLine-endLine)`. These render as clickable chips that shift the highlight to the specified lines. Example:

     ```markdown
     First, the function validates its parameters:
     [Parameter validation](focus:15-22)

     Then the core transform processes each entry:
     [Core transform](focus:25-40)

     Finally, results are cached before returning:
     [Result caching](focus:42-48)
     ```

     Use sub-highlights when a step covers 30+ lines and the narrative naturally breaks into distinct sections. The line ranges must be within the step's `--line` / `--end-line` range.

   **Don't:**
   - Write a wall of bullet points — use prose paragraphs with formatting
   - Just describe the syntax — explain the design decisions
   - Repeat information visible in the highlighted code
   - Use headers in step bodies (the annotation serves as the title)

3. **Finish the tour:**
   ```
   {{binary}} agent tour-done --tour <id> --json
   ```

### Phase 3: Open in browser

1. Get the running instance port from `{{binary}} list --json`.
2. Open the tour: `open "http://localhost:<port>/tour/<tour-id>"` (or the appropriate command for the user's OS).
3. Tell the user the tour is ready:

   > Your tour is ready — check your browser.

## Quality Checklist

Before finishing, verify:

- [ ] Intro (step 0) gives a thorough architectural overview, not a table of contents
- [ ] Steps follow the actual execution/data flow, not alphabetical file order
- [ ] No two consecutive steps highlight the same lines in the same file
