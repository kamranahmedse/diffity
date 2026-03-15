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

function diffLines(original: string, suggested: string): { type: 'context' | 'delete' | 'add'; content: string }[] {
  const oldLines = original.split('\n');
  const newLines = suggested.split('\n');
  const result: { type: 'context' | 'delete' | 'add'; content: string }[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({ type: 'context', content: oldLines[oi] });
      oi++;
      ni++;
    } else {
      let found = false;
      for (let ahead = 1; ahead <= maxLen && !found; ahead++) {
        if (oi + ahead < oldLines.length && ni < newLines.length && oldLines[oi + ahead] === newLines[ni]) {
          for (let k = oi; k < oi + ahead; k++) {
            result.push({ type: 'delete', content: oldLines[k] });
          }
          oi = oi + ahead;
          found = true;
        }
        if (!found && ni + ahead < newLines.length && oi < oldLines.length && newLines[ni + ahead] === oldLines[oi]) {
          for (let k = ni; k < ni + ahead; k++) {
            result.push({ type: 'add', content: newLines[k] });
          }
          ni = ni + ahead;
          found = true;
        }
      }

      if (!found) {
        if (oi < oldLines.length) {
          result.push({ type: 'delete', content: oldLines[oi] });
          oi++;
        }
        if (ni < newLines.length) {
          result.push({ type: 'add', content: newLines[ni] });
          ni++;
        }
      }
    }
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
