# diffity

A git diff viewer that runs in your browser. Split or unified view, syntax highlighting, and inline code review with AI agent support.

## Install

```bash
npm install -g diffity
```

Install the AI review skills for your coding agent (Claude Code, Cursor, Codex, etc.):

```bash
npx skills add kamrify/diffity
```

Verify everything works:

```bash
diffity doctor
```

## Usage

Run `diffity` inside any git repository:

```bash
# Working tree changes
diffity

# Staged changes
diffity --staged

# Last commit
diffity HEAD~1

# Last 3 commits
diffity HEAD~3

# Compare branches
diffity main..feature

# Compare tags
diffity v1.0.0..v2.0.0
```

Your browser opens automatically with a GitHub-style diff view.

### Options

```
--staged        Show staged changes
--port <port>   Custom port (default: 5391)
--no-open       Don't open browser
--dark          Dark mode
--unified       Unified view (default: split)
--quiet         Minimal terminal output
```

## Code Review

Diffity has a built-in review system. Comments are stored locally in SQLite and appear in the browser in real time.

### With AI agents

Use the slash commands inside Claude Code, Cursor, or any supported agent:

**`/diffity-start`** — Launch diffity and open the browser

**`/diffity-review`** — AI reviews your diff and leaves inline comments with severity tags:
- `[must-fix]` — Bugs, security issues
- `[suggestion]` — Meaningful improvements
- `[nit]` — Style preferences
- `[question]` — Needs clarification

You can focus the review: `/diffity-review security` or `/diffity-review performance`

**`/diffity-resolve`** — AI reads the review comments, makes the code fixes, and marks threads as resolved

The typical workflow:

```
/diffity-start          # open the diff viewer
/diffity-review         # get a code review
                        # read comments in browser, decide what to fix
/diffity-resolve        # AI fixes the flagged issues
```

### With the CLI

You can also manage comments directly from the terminal:

```bash
# List open threads
diffity agent list --status open

# Leave a comment
diffity agent comment --file src/app.ts --line 42 --body "[must-fix] Missing null check"

# Leave a general comment (not tied to a line)
diffity agent general-comment --body "Looks good overall, one issue to fix"

# Reply to a thread
diffity agent reply abc123 --body "Good catch, fixed"

# Mark as resolved
diffity agent resolve abc123 --summary "Added null check"

# Mark as won't fix
diffity agent dismiss abc123 --reason "Intentional behavior"

# Get full JSON output for scripting
diffity agent list --json
```

Thread IDs accept 8-character prefixes — you don't need to type the full UUID.

## Other Commands

```bash
# Check for issues
diffity doctor

# Update to latest version
diffity update

# Remove all diffity data (~/.diffity)
diffity prune
```

## How It Works

Diffity starts a local HTTP server that serves a React app. The server reads git data from your repository and the browser renders the diff with syntax highlighting (via Shiki).

Review comments are stored in a SQLite database at `~/.diffity/`. The browser polls for new comments every 2 seconds, so comments from the CLI or AI agents appear almost instantly.

Each `diffity` session is tied to a specific git HEAD hash. If you make new commits, start a new session to get a fresh review context.

## License

MIT
