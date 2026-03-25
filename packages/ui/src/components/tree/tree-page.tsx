import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import NProgress from 'nprogress';
import { treePathsOptions, treeInfoOptions, treeFileContentOptions, treeEntriesOptions, tourOptions } from '../../queries/tree';
import { useTheme } from '../../hooks/use-theme';
import { useReviewThreads } from '../../hooks/use-review-threads';
import { useCommentActions } from '../../hooks/use-comment-actions';
import { isThreadResolved, GENERAL_THREAD_FILE_PATH } from '../comments/types';
import type { CommentThread } from '../comments/types';
import type { CommentAuthor } from '../comments/types';
import { TreeSidebar } from './tree-sidebar';
import { FolderViewer } from './folder-viewer';
import { FileViewer } from './file-viewer';
import { MarkdownPreview } from './markdown-preview';
import { SvgPreview } from './svg-preview';
import { PathComments } from '../comments/path-comments';
import { CommentToolbarActions } from '../comments/comment-toolbar-actions';
import { PageLoader } from '../layout/skeleton';
import { OptionsMenu } from '../layout/options-menu';
import { GitBranchIcon } from '../icons/git-branch-icon';
import { StaleDiffBanner } from '../layout/stale-diff-banner';
import { useTreeStaleness } from '../../hooks/use-tree-staleness';
import { isRenderableFile, isMarkdownFile } from '../../lib/file-types';
import { CodeIcon } from '../icons/code-icon';
import { FileIcon } from '../icons/file-icon';
import { TourPanel } from './tour-panel';

interface TreePageProps {
  initialTheme?: 'light' | 'dark' | null;
}

function getPathFromUrl(): { path: string; type: 'file' | 'dir' } {
  const params = new URLSearchParams(window.location.search);
  const path = params.get('path') || '';
  const type = (params.get('type') || 'dir') as 'file' | 'dir';
  return { path, type };
}

function updateUrl(path: string, type: 'file' | 'dir') {
  const params = new URLSearchParams(window.location.search);
  if (path) {
    params.set('path', path);
  } else {
    params.delete('path');
  }
  if (type === 'file') {
    params.set('type', 'file');
  } else {
    params.delete('type');
  }
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, '', url);
}

function formatTreeThreadsForCopy(threads: CommentThread[]): string {
  const unresolvedThreads = threads.filter(t => !isThreadResolved(t) && t.filePath !== GENERAL_THREAD_FILE_PATH);
  if (unresolvedThreads.length === 0) {
    return '';
  }

  const parts: string[] = [];

  for (const thread of unresolvedThreads) {
    if (thread.filePath.startsWith('__path__:')) {
      const pathLabel = thread.filePath.slice('__path__:'.length);
      parts.push(`## Comment on ${pathLabel === '__root__' ? 'root' : pathLabel}`);
    } else {
      const lineRange = thread.startLine === thread.endLine
        ? `${thread.startLine}`
        : `${thread.startLine}-${thread.endLine}`;
      parts.push(`## ${thread.filePath}:${lineRange}`);
    }

    if (thread.anchorContent) {
      parts.push('```');
      parts.push(thread.anchorContent);
      parts.push('```');
    }

    const uniqueAuthors = new Set(thread.comments.map(c => c.author.name));
    const singleAuthor = uniqueAuthors.size === 1;

    for (const comment of thread.comments) {
      if (singleAuthor) {
        parts.push(comment.body);
      } else {
        const authorName = comment.author.name === 'You' ? 'User' : comment.author.name;
        parts.push(`**${authorName}:** ${comment.body}`);
      }
    }
    parts.push('');
  }

  return parts.join('\n');
}

export function TreePage(props: TreePageProps) {
  const { initialTheme } = props;
  const { theme, toggleTheme } = useTheme(initialTheme);
  const queryClient = useQueryClient();
  const { isStale, resetStaleness } = useTreeStaleness();

  const [nav, setNav] = useState(getPathFromUrl);
  const [focusedThreadId, setFocusedThreadId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourScrollTick, setTourScrollTick] = useState(0);
  const [tourLoading, setTourLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const nprogressActive = useRef(false);

  const tourId = useMemo(() => {
    return new URLSearchParams(window.location.search).get('tour');
  }, []);

  useEffect(() => {
    const handler = () => {
      setNav(getPathFromUrl());
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  useEffect(() => {
    NProgress.configure({ showSpinner: false, minimum: 0.2, trickleSpeed: 100 });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const { data: treeData, isLoading: treeLoading } = useQuery(treePathsOptions());
  const { data: info, isLoading: infoLoading } = useQuery(treeInfoOptions());
  const sessionId = info?.sessionId ?? null;
  const { data: threads = [] } = useReviewThreads(sessionId);
  const commentActions = useCommentActions(sessionId, !!sessionId);

  const { data: tourData } = useQuery({
    ...tourOptions(tourId!),
    enabled: !!tourId,
  });

  const isFileMode = nav.type === 'file' && !!nav.path;
  const isDirMode = !isFileMode;

  const { data: fileContent, isFetching: fileFetching } = useQuery({
    ...treeFileContentOptions(nav.path),
    enabled: isFileMode,
    placeholderData: keepPreviousData,
  });

  const { data: entriesData, isFetching: entriesFetching } = useQuery({
    ...treeEntriesOptions(nav.path || undefined),
    enabled: isDirMode,
    placeholderData: keepPreviousData,
  });

  const contentFetching = isFileMode ? fileFetching : entriesFetching;

  useEffect(() => {
    if (contentFetching && !nprogressActive.current) {
      nprogressActive.current = true;
      NProgress.start();
    } else if (!contentFetching && nprogressActive.current) {
      nprogressActive.current = false;
      NProgress.done();
    }
  }, [contentFetching]);

  const commentCountsByFile = useMemo(() => {
    const map = new Map<string, number>();
    for (const thread of threads) {
      if (isThreadResolved(thread)) {
        continue;
      }
      let key = thread.filePath;
      if (key.startsWith('__path__:')) {
        key = key.slice('__path__:'.length);
        if (key === '__root__') {
          continue;
        }
      }
      const count = map.get(key) ?? 0;
      map.set(key, count + 1);
    }
    return map;
  }, [threads]);

  const paths = treeData?.paths ?? [];

  const handleFileClick = useCallback((path: string) => {
    queryClient.ensureQueryData(treeFileContentOptions(path));
    updateUrl(path, 'file');
    setNav({ path, type: 'file' });
    setPreviewMode('preview');
  }, [queryClient]);

  const handleDirClick = useCallback((path: string) => {
    queryClient.ensureQueryData(treeEntriesOptions(path || undefined));
    updateUrl(path, 'dir');
    setNav({ path, type: 'dir' });
  }, [queryClient]);

  const handleNavigate = useCallback((path: string, type: 'file' | 'dir') => {
    if (type === 'file') {
      handleFileClick(path);
    } else {
      handleDirClick(path);
    }
  }, [handleFileClick, handleDirClick]);

  const scrollToThreadElement = useCallback((threadId: string) => {
    const el = document.querySelector(`[data-thread-id="${threadId}"]`);
    if (el) {
      el.dispatchEvent(new CustomEvent('diffity:focus-thread', { bubbles: false }));
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash-thread');
      setTimeout(() => el.classList.remove('flash-thread'), 1500);
    }
  }, []);

  const handleScrollToThread = useCallback(async (threadId: string, filePath: string) => {
    const isPathComment = filePath.startsWith('__path__:');
    let targetPath = filePath;
    let targetType: 'file' | 'dir' = 'file';

    if (isPathComment) {
      setFocusedThreadId(threadId);
      const rawPath = filePath.slice('__path__:'.length);
      targetPath = rawPath === '__root__' ? '' : rawPath;
      const isFile = paths.includes(targetPath);
      targetType = isFile ? 'file' : 'dir';
    }

    const needsNavigation = targetPath !== nav.path || (targetType === 'file' && nav.type !== 'file') || (targetType === 'dir' && nav.type !== 'dir');

    if (needsNavigation) {
      if (targetType === 'file') {
        await queryClient.ensureQueryData(treeFileContentOptions(targetPath));
      } else {
        await queryClient.ensureQueryData(treeEntriesOptions(targetPath || undefined));
      }
      updateUrl(targetPath, targetType);
      setNav({ path: targetPath, type: targetType });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToThreadElement(threadId);
        });
      });
      return;
    }

    scrollToThreadElement(threadId);
  }, [nav, queryClient, paths, scrollToThreadElement]);

  const handleRefreshTree = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tree-paths'] });
    queryClient.invalidateQueries({ queryKey: ['tree-entries'] });
    queryClient.invalidateQueries({ queryKey: ['tree-file-content'] });
    resetStaleness();
  }, [queryClient, resetStaleness]);

  const handleTourStepChange = useCallback(async (index: number) => {
    if (!tourData) {
      return;
    }
    const step = tourData.steps[index];
    if (!step) {
      return;
    }
    const isSameFile = step.filePath === nav.path && nav.type === 'file';
    if (isSameFile) {
      setTourStepIndex(index);
      setTourScrollTick(t => t + 1);
      return;
    }
    setTourLoading(true);
    await queryClient.ensureQueryData(treeFileContentOptions(step.filePath));
    updateUrl(step.filePath, 'file');
    setNav({ path: step.filePath, type: 'file' });
    setPreviewMode('preview');
    setTourStepIndex(index);
    setTourScrollTick(t => t + 1);
    setTourLoading(false);
  }, [tourData, nav, queryClient]);

  const handleTourClose = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete('tour');
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', url);
    window.location.reload();
  }, []);

  const tourHighlight = useMemo(() => {
    if (!tourData) {
      return null;
    }
    const step = tourData.steps[tourStepIndex];
    if (!step) {
      return null;
    }
    return {
      filePath: step.filePath,
      startLine: step.startLine,
      endLine: step.endLine,
      annotation: step.annotation,
      scrollTick: tourScrollTick,
    };
  }, [tourData, tourStepIndex, tourScrollTick]);

  useEffect(() => {
    if (!tourData || tourData.steps.length === 0) {
      return;
    }
    const firstStep = tourData.steps[0];
    handleFileClick(firstStep.filePath);
  }, [tourData]);

  const formatForCopy = useCallback(() => {
    return formatTreeThreadsForCopy(threads);
  }, [threads]);

  const breadcrumbs = useMemo(() => {
    if (!nav.path) {
      return [];
    }
    const parts = nav.path.split('/');
    return parts.map((part, i) => ({
      name: part,
      path: parts.slice(0, i + 1).join('/'),
      isLast: i === parts.length - 1,
    }));
  }, [nav.path]);

  if (treeLoading || infoLoading) {
    return <PageLoader />;
  }

  const pathKey = nav.path || '__root__';
  const fileThreads = threads.filter(t => t.filePath === nav.path);
  const pathThreads = threads.filter(t => t.filePath === `__path__:${pathKey}` );
  const entries = entriesData?.entries ?? [];

  return (
    <div className="flex flex-col h-screen bg-bg text-text">
      <div className="flex items-center gap-3 px-4 py-1.5 bg-bg-secondary border-b border-border font-sans text-xs">
        <div className="flex items-center gap-2.5 min-w-0 shrink">
          {info?.name && (
            <button
              className="font-semibold text-text text-sm truncate hover:text-accent transition-colors cursor-pointer"
              onClick={() => handleDirClick('')}
            >
              {info.name}
            </button>
          )}
          {info?.branch && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-diff-hunk-bg text-diff-hunk-text rounded font-mono text-[11px] shrink-0">
              <GitBranchIcon className="w-3 h-3" />
              {info.branch}
            </span>
          )}
          <span className="text-text-muted truncate hidden lg:inline">Repository browser</span>
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <CommentToolbarActions
            threads={threads}
            onScrollToThread={handleScrollToThread}
            onDeleteAllComments={commentActions.deleteAllThreads}
            formatForCopy={formatForCopy}
          />
          <OptionsMenu theme={theme} onToggleTheme={toggleTheme} />
        </div>
      </div>

      {isStale && (
        <StaleDiffBanner
          onRefresh={handleRefreshTree}
          message="Files have changed since this tree was loaded"
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <TreeSidebar
          ref={searchInputRef}
          paths={paths}
          activeFile={isFileMode ? nav.path : null}
          commentCountsByFile={commentCountsByFile}
          onFileClick={handleFileClick}
          onDirClick={handleDirClick}
        />

        <main ref={mainRef} className="relative flex-1 overflow-y-auto p-6">
          {tourLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/60">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}
          <PathComments
            pathKey={pathKey}
            threads={pathThreads}
            commentActions={commentActions}
            label={nav.path ? nav.path.split('/').pop()! : info?.name ?? 'root'}
            focusedThreadId={focusedThreadId}
          >
            <button
              className={breadcrumbs.length > 0 ? 'text-accent hover:underline cursor-pointer' : 'text-text font-medium'}
              onClick={() => handleDirClick('')}
            >
              {info?.name ?? 'root'}
            </button>
            {breadcrumbs.map(crumb => (
              <span key={crumb.path} className="flex items-center gap-1">
                <span className="text-text-muted">/</span>
                {crumb.isLast ? (
                  <span className="text-text font-medium">{crumb.name}</span>
                ) : (
                  <button
                    className="text-accent hover:underline cursor-pointer"
                    onClick={() => handleDirClick(crumb.path)}
                  >
                    {crumb.name}
                  </button>
                )}
              </span>
            ))}
            {isFileMode && fileContent && isRenderableFile(nav.path) && (
              <div className="flex items-center ml-2 border border-border rounded-md overflow-hidden text-xs">
                <button
                  className={`flex items-center gap-1 px-2 py-1 transition-colors cursor-pointer ${previewMode === 'code' ? 'bg-bg-tertiary text-text' : 'text-text-muted hover:text-text'}`}
                  onClick={() => setPreviewMode('code')}
                >
                  <CodeIcon className="w-3 h-3" />
                  Code
                </button>
                <button
                  className={`flex items-center gap-1 px-2 py-1 transition-colors cursor-pointer ${previewMode === 'preview' ? 'bg-bg-tertiary text-text' : 'text-text-muted hover:text-text'}`}
                  onClick={() => setPreviewMode('preview')}
                >
                  <FileIcon className="w-3 h-3" />
                  Preview
                </button>
              </div>
            )}
          </PathComments>

          {isFileMode ? (
            fileContent ? (
              isRenderableFile(nav.path) && previewMode === 'preview' ? (
                isMarkdownFile(nav.path) ? (
                  <MarkdownPreview content={fileContent} filePath={nav.path} />
                ) : (
                  <SvgPreview content={fileContent} />
                )
              ) : (
                <FileViewer
                  filePath={nav.path}
                  content={fileContent}
                  theme={theme}
                  threads={fileThreads}
                  commentActions={commentActions}
                  sessionId={sessionId}
                  tourHighlight={tourHighlight}
                />
              )
            ) : fileFetching ? null : (
              <div className="flex items-center justify-center h-32 text-xs text-text-muted">
                File not found
              </div>
            )
          ) : entries.length > 0 ? (
            <FolderViewer
              entries={entries}
              onNavigate={handleNavigate}
            />
          ) : entriesFetching ? null : (
            <div className="flex items-center justify-center h-32 text-xs text-text-muted">
              Empty directory
            </div>
          )}
        </main>

        {tourData && (
          <TourPanel
            tour={tourData}
            currentStepIndex={tourStepIndex}
            onStepChange={handleTourStepChange}
            onClose={handleTourClose}
          />
        )}
      </div>
    </div>
  );
}
