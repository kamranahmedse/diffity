import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { toast } from 'sonner';
import { GitHubIcon } from './icons/github-icon';
import { UploadIcon } from './icons/upload-icon';
import { DownloadIcon } from './icons/download-icon';
import { XIcon } from './icons/x-icon';
import { pushCommentsToGitHub, pullCommentsFromGitHub, type GitHubDetails, type PrCommentPayload } from '../lib/api';
import type { CommentThread } from '../types/comment';
import { GENERAL_THREAD_FILE_PATH, isThreadResolved } from '../types/comment';

dayjs.extend(relativeTime);

interface GitHubDialogProps {
  details: GitHubDetails;
  threads: CommentThread[];
  sessionId: string | null;
  onPulled: () => void;
  onClose: () => void;
}

export function GitHubDialog(props: GitHubDialogProps) {
  const { details, threads, sessionId, onPulled, onClose } = props;
  const [commentCount, setCommentCount] = useState(details.commentCount);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);

  const unresolvedFileThreads = threads.filter(
    t => !isThreadResolved(t) && t.filePath !== GENERAL_THREAD_FILE_PATH,
  );
  const localCount = unresolvedFileThreads.length;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handlePush = async () => {
    if (localCount === 0) {
      return;
    }
    setPushing(true);
    try {
      const comments: PrCommentPayload[] = unresolvedFileThreads.map(t => ({
        filePath: t.filePath,
        side: t.side === 'old' ? 'LEFT' as const : 'RIGHT' as const,
        startLine: t.startLine !== t.endLine ? t.startLine : null,
        endLine: t.endLine,
        body: t.comments.map(c => {
          if (t.comments.length === 1) {
            return c.body;
          }
          const name = c.author.name === 'You' ? 'User' : c.author.name;
          return `**${name}:** ${c.body}`;
        }).join('\n\n'),
      }));
      const result = await pushCommentsToGitHub(comments);
      if (result.failed > 0) {
        const pushedMsg = result.pushed > 0 ? `${result.pushed} pushed, ` : '';
        toast.error(`${pushedMsg}${result.failed} failed`, {
          description: result.errors.join('\n'),
        });
      } else if (result.pushed === 0 && result.skipped > 0) {
        toast.info('All comments already exist on the PR');
      } else {
        const skippedMsg = result.skipped > 0 ? ` (${result.skipped} already existed)` : '';
        toast.success(`Pushed ${result.pushed} comment${result.pushed !== 1 ? 's' : ''} to PR${skippedMsg}`);
      }
      setCommentCount(prev => prev + result.pushed);
    } catch (err) {
      toast.error('Failed to push comments', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    if (!sessionId || commentCount === 0) {
      return;
    }
    setPulling(true);
    try {
      const result = await pullCommentsFromGitHub(sessionId);
      if (result.pulled === 0 && result.skipped > 0) {
        toast.info('All GitHub comments already exist locally');
      } else if (result.pulled > 0) {
        toast.success(`Pulled ${result.pulled} comment${result.pulled !== 1 ? 's' : ''} from PR`);
        onPulled();
      }
    } catch (err) {
      toast.error('Failed to pull comments', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-bg rounded-xl shadow-lg w-full max-w-sm mx-4 font-sans"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <GitHubIcon className="w-4 h-4 text-text shrink-0" />
              <span className="text-sm font-semibold text-text truncate">{details.prTitle}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted pl-6">
              <span>#{details.prNumber}</span>
              <span>&middot;</span>
              <span>opened {dayjs(details.prCreatedAt).fromNow()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-hover transition-colors cursor-pointer shrink-0 mt-0.5"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 pb-4 pt-2 space-y-2">
          <div className="flex items-center justify-between py-2.5 px-3 bg-bg-secondary rounded-lg">
            <div>
              <div className="text-xs font-medium text-text">
                {localCount} local comment{localCount !== 1 ? 's' : ''}
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">
                {localCount > 0 ? 'Unresolved, ready to push' : 'No comments to push'}
              </div>
            </div>
            {localCount > 0 && (
              <button
                onClick={handlePush}
                disabled={pushing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {pushing ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UploadIcon className="w-3 h-3" />
                )}
                Push to PR
              </button>
            )}
          </div>

          <div className="flex items-center justify-between py-2.5 px-3 bg-bg-secondary rounded-lg">
            <div>
              <div className="text-xs font-medium text-text">
                {commentCount} comment{commentCount !== 1 ? 's' : ''} on GitHub
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">Review comments on the PR</div>
            </div>
            {commentCount > 0 && sessionId && (
              <button
                onClick={handlePull}
                disabled={pulling}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-bg-tertiary text-text-secondary hover:text-text transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {pulling ? (
                  <span className="w-3 h-3 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                ) : (
                  <DownloadIcon className="w-3 h-3" />
                )}
                Pull from PR
              </button>
            )}
          </div>

          <a
            href={details.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-text-muted hover:text-text transition-colors"
          >
            Open on GitHub
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h7v7" />
              <path d="M13 3L6 10" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
