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

For the working tree, you can leave comments, copy them into your agent with a button and ask it to resolve them. Alternatively, use the skills below to avoid this manual step and let your agent auto-solve them.

## AI code review

Install the skills for your coding agent (Claude Code, Cursor, Codex, etc.):

```bash
npx skills add kamranahmedse/diffity
```

Then use the slash commands:

### `/diffity-diff`

Opens the diff viewer in your browser. Leave comments on any line — when you're done, run `/diffity-resolve` to have your agent fix them.

### `/diffity-review`

Your agent reviews the diff and leaves comments in the viewer. Uses severity tags: `[must-fix]`, `[suggestion]`, `[nit]`, `[question]`. You can focus on a specific area:

```
/diffity-review security
/diffity-review performance
/diffity-review naming
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
