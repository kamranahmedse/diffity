<img src="./packages/ui/public/brand.svg" width="80" />

# diffity

[![npm version](https://img.shields.io/npm/v/diffity)](https://www.npmjs.com/package/diffity)
[![license](https://img.shields.io/npm/l/diffity)](https://github.com/kamranahmedse/diffity/blob/main/LICENSE)

Diffity is an agent-agnostic, GitHub-style diff viewer and code review tool.

```bash
npm install -g diffity
```

It works with Claude Code, Cursor, Codex, and any AI coding agent.

## See your diffs

Run `diffity` inside any git repo — your browser opens with a GitHub-style, syntax-highlighted diff.

```bash
diffity                    # working tree changes
diffity HEAD~1             # last commit
diffity HEAD~3             # last 3 commits
diffity main..feature      # compare branches
diffity v1.0.0..v2.0.0     # compare tags
```

New to git refs? Here's what the syntax means:

- `HEAD` is your current commit. `HEAD~1` means "one commit back", `HEAD~3` means "three commits back".
- `main..feature` means "what's in feature that's not in main" — exactly what a PR would show.
- `main..HEAD` means "what will my PR look like" — committed changes on your branch vs main.
- `diffity main` (no dots) compares main against your working tree, including uncommitted changes.

You can leave comments on any diff — working tree changes, branch comparisons, commit ranges. Copy them into your agent with a button and ask it to resolve them, or use the skills below to let your agent auto-review and auto-solve them.

## AI code review

Install the skills for your coding agent (Claude Code, Cursor, Codex, etc.):

```bash
npx skills add kamranahmedse/diffity
```

Then use the slash commands:

### `/diffity-diff`

Opens the diff viewer in your browser. Optionally pass a ref:

```
/diffity-diff                          # working tree changes
/diffity-diff main..feature            # branch diff
/diffity-diff last 3 commits           # natural language works too
```

Leave comments on any line — when you're done, run `/diffity-resolve` to have your agent fix them.

### `/diffity-review`

Your agent reviews the diff and leaves comments in the viewer. Uses severity tags: `[must-fix]`, `[suggestion]`, `[nit]`, `[question]`. Supports refs, focus areas, and natural language:

```
/diffity-review                             # review working tree
/diffity-review main..feature               # review branch diff
/diffity-review security                    # focus on security
/diffity-review main to feature             # natural language
/diffity-review what I'm merging into main  # also works
```

### `/diffity-resolve`

Reads all open comments and makes the requested code changes. Works with both your comments and AI review comments.

## Multiple projects

Diffity supports running multiple projects simultaneously. Each gets its own port automatically:

```bash
# Terminal 1 — starts on :5391
cd ~/projects/app && diffity

# Terminal 2 — starts on :5392
cd ~/projects/api && diffity
```

If you run `diffity` in a repo that already has a running instance, it opens the existing one instead of starting a new server. Use `--new` to kill the existing instance and start fresh.

```bash
diffity list               # show all running instances
diffity list --json        # machine-readable output
```

## Options

```
--port <port>   Custom port (default: auto-assigned from 5391)
--no-open       Don't open browser
--dark          Dark mode
--unified       Unified view (default: split)
--quiet         Minimal terminal output
--new           Stop existing instance and start fresh
```

## License

MIT
