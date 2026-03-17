<img src="./packages/ui/public/brand.svg" width="80" />

# diffity

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

```
# use this skill to open the browser with diff viewer
# you can review the code yourself and leave comments
/diffity-start

# once done, you can come back to the agent and use the
# below skill to ask agent to resolve your comments.
/diffity-resolve

# you can use this to have AI review your uncommitted
# changes and leave comments in the diff viewer
/diffity-review
```

The review uses severity tags so you know what matters:
- `[must-fix]` — Bugs, security issues
- `[suggestion]` — Meaningful improvements
- `[nit]` — Style preferences
- `[question]` — Needs clarification

You can focus the review on what you care about: `/diffity-review security` or `/diffity-review performance`

## Options

```
--port <port>   Custom port (default: 5391)
--no-open       Don't open browser
--dark          Dark mode
--unified       Unified view (default: split)
--quiet         Minimal terminal output
```

## License

[PolyForm Shield 1.0.0](./LICENSE) © [Kamran Ahmed](https://x.com/kamrify)
