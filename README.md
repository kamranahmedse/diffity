<img src="./packages/ui/public/brand.svg" width="80" />

# diffity

[![npm version](https://img.shields.io/npm/v/diffity)](https://www.npmjs.com/package/diffity)

Diffity is an agent-agnostic, GitHub-style diff viewer and code review tool.

```bash
npm install -g diffity
```

It works with Claude Code, Cursor, Codex, and any AI coding agent.

## See your diffs

Run `diffity` inside any git repo — your browser opens with a GitHub-style, syntax-highlighted diff.

```bash
# everyday use
diffity                                    # review all uncommitted changes
diffity HEAD~1                             # review your last commit
diffity HEAD~3                             # review your last 3 commits

# branch workflows
diffity main                               # compare current branch against main
diffity main..feature                      # compare feature branch against main
diffity main feature                       # same as above, shorthand syntax
diffity --base main --compare feature      # same as above, explicit flags

# releases and tags
diffity v1.0.0 v2.0.0                     # compare two releases
diffity v1.0.0                             # what changed since v1.0.0

# specific commits
diffity abc1234                            # changes since a specific commit
diffity abc1234..def5678                   # changes between two commits
```

The `--base`/`--compare` flags use the same terminology as GitHub PRs — base is what you're comparing against, compare is the branch with changes. You can also use range syntax (`main..feature`) or just pass two positional args (`diffity main feature`).

You can leave comments on any diff — working tree changes, branch comparisons, commit ranges. Copy them into your agent with a button and ask it to resolve them, or use the skills below to let your agent auto-review and auto-solve them.

## AI code review

Install the skills for your coding agent (Claude Code, Cursor, Codex, etc.):

```bash
npx skills add kamranahmedse/diffity
```

Then use the slash commands:

### `/diffity-diff`

Opens the diff viewer in your browser. Accepts the same refs as the CLI, plus natural language:

```
/diffity-diff                          # working tree changes
/diffity-diff main..feature            # branch diff
/diffity-diff HEAD~1                   # last commit
/diffity-diff last 3 commits           # natural language works too
```

Leave comments on any line — when you're done, run `/diffity-resolve` to have your agent fix them.

### `/diffity-review`

Your agent reviews the diff and leaves inline comments in the viewer. Uses severity tags (`[must-fix]`, `[suggestion]`, `[nit]`, `[question]`) so you can triage by importance. Supports refs, focus areas, and natural language:

```
/diffity-review                             # review working tree changes
/diffity-review main..feature               # review what you're merging into main
/diffity-review security                    # focus on security issues
/diffity-review performance in src/lib      # focus on performance in specific dir
/diffity-review last 3 commits              # natural language works too
```

### `/diffity-resolve`

Reads all open comments and makes the requested code changes. Works with both your comments and AI review comments:

```
/diffity-resolve                       # resolve all open comments
/diffity-resolve abc123                # resolve a specific thread by ID
```

A typical workflow: run `/diffity-review` to get AI feedback, check the comments in the browser, then run `/diffity-resolve` to apply the fixes.

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
--base <ref>       Base ref to compare from (e.g. main, HEAD~3, v1.0.0)
--compare <ref>    Ref to compare against base (default: working tree)
--port <port>      Custom port (default: auto-assigned from 5391)
--no-open          Don't open browser
--dark             Dark mode
--unified          Unified view (default: split)
--quiet            Minimal terminal output
--new              Stop existing instance and start fresh
```

## License

[PolyForm Shield 1.0.0](./LICENSE) © [Kamran Ahmed](https://x.com/kamrify)
