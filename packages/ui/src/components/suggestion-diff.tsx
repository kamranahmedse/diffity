import { useMemo } from 'react';
import type { CommentThread } from '../types/comment';
import { useHighlighter } from '../hooks/use-highlighter';
import { getTheme } from '../hooks/use-theme';

interface SuggestionDiffProps {
  originalCode: string;
  suggestion: string;
  filePath: string;
  canApply?: boolean;
  onApply?: () => void;
  thread: CommentThread;
}

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

function diffLines(original: string, suggested: string): { type: 'context' | 'delete' | 'add'; content: string }[] {
  const oldLines = original.split('\n');
  const newLines = suggested.split('\n');
  const dp = lcs(oldLines, newLines);
  const result: { type: 'context' | 'delete' | 'add'; content: string }[] = [];

  let i = oldLines.length;
  let j = newLines.length;

  const reversed: typeof result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      reversed.push({ type: 'context', content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ type: 'add', content: newLines[j - 1] });
      j--;
    } else {
      reversed.push({ type: 'delete', content: oldLines[i - 1] });
      i--;
    }
  }

  for (let k = reversed.length - 1; k >= 0; k--) {
    result.push(reversed[k]);
  }

  return result;
}

export function SuggestionDiff(props: SuggestionDiffProps) {
  const { originalCode, suggestion, filePath, canApply, onApply, thread } = props;
  const { highlight, ready } = useHighlighter();
  const lines = diffLines(originalCode, suggestion);

  const syntaxMap = useMemo(() => {
    if (!ready) {
      return null;
    }

    const allCode = lines.map((l) => l.content).join('\n');
    const result = highlight(allCode, filePath, getTheme());
    if (!result) {
      return null;
    }

    return result.map((line) => line.tokens);
  }, [lines, filePath, highlight, ready]);

  return (
    <div className="border border-border rounded-md overflow-hidden my-2">
      <div className="bg-bg-secondary px-3 py-1.5 border-b border-border flex items-center justify-between">
        <span className="text-[11px] text-text-muted font-medium">Suggested change</span>
        {canApply && thread.status !== 'resolved' && thread.status !== 'dismissed' && onApply && (
          <button
            onClick={onApply}
            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-added/20 text-added hover:bg-added/30 transition-colors cursor-pointer"
          >
            Apply
          </button>
        )}
      </div>
      <div className="font-mono text-xs leading-5 overflow-x-auto">
        {lines.map((line, i) => {
          const bgClass = line.type === 'delete'
            ? 'bg-diff-del-bg'
            : line.type === 'add'
              ? 'bg-diff-add-bg'
              : '';
          const prefix = line.type === 'delete' ? '−' : line.type === 'add' ? '+' : ' ';
          const prefixColor = line.type === 'delete'
            ? 'text-deleted'
            : line.type === 'add'
              ? 'text-added'
              : 'text-text-muted';

          const tokens = syntaxMap ? syntaxMap[i] : null;

          return (
            <div key={i} className={`px-3 ${bgClass}`}>
              <span className={`select-none mr-2 ${prefixColor}`}>{prefix}</span>
              {tokens ? (
                tokens.map((token, j) => (
                  <span key={j} style={token.color ? { color: token.color } : undefined}>
                    {token.text}
                  </span>
                ))
              ) : (
                <span className="text-text">{line.content}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
