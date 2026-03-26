import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Tour } from '../../lib/api';
import { CompassIcon } from '../icons/compass-icon';
import { XIcon } from '../icons/x-icon';
import { SidebarIcon } from '../icons/sidebar-icon';

interface TourPanelProps {
  tour: Tour;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
  onNavigateToFile?: (path: string) => void;
  onNavigateToFileLine?: (path: string, startLine: number, endLine: number) => void;
  onScrollToHighlight?: () => void;
  onSubHighlight?: (startLine: number, endLine: number, label: string) => void;
  filePaths?: string[];
}

function resolveFilePath(text: string, filePaths: Set<string> | undefined): string | null {
  if (!filePaths || !text) {
    return null;
  }
  if (filePaths.has(text)) {
    return text;
  }
  const suffix = '/' + text;
  for (const p of filePaths) {
    if (p.endsWith(suffix)) {
      return p;
    }
  }
  return null;
}

function parseFocusHref(href: string): { startLine: number; endLine: number } | null {
  const match = href.match(/^focus:(\d+)(?:-(\d+))?$/);
  if (!match) {
    return null;
  }
  const startLine = parseInt(match[1], 10);
  const endLine = match[2] ? parseInt(match[2], 10) : startLine;
  return { startLine, endLine };
}

function parseGotoHref(href: string): { filePath: string; startLine: number; endLine: number } | null {
  const match = href.match(/^goto:(.+):(\d+)(?:-(\d+))?$/);
  if (!match) {
    return null;
  }
  const filePath = match[1];
  const startLine = parseInt(match[2], 10);
  const endLine = match[3] ? parseInt(match[3], 10) : startLine;
  return { filePath, startLine, endLine };
}

function TourMarkdown(props: { content: string; onNavigateToFile?: (path: string) => void; onNavigateToFileLine?: (path: string, startLine: number, endLine: number) => void; onSubHighlight?: (startLine: number, endLine: number, label: string) => void; filePaths?: Set<string> }) {
  const { onNavigateToFile, onNavigateToFileLine, onSubHighlight, filePaths } = props;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(url) => {
        if (url.startsWith('focus:') || url.startsWith('goto:')) {
          return url;
        }
        return defaultUrlTransform(url);
      }}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
        em: ({ children }) => <em className="text-text-secondary">{children}</em>,
        code: (codeProps) => {
          const { children, className } = codeProps;
          const isBlock = className?.startsWith('language-') || (typeof children === 'string' && children.includes('\n'));
          if (isBlock) {
            return <code className={className}>{children}</code>;
          }
          const text = typeof children === 'string' ? children : '';
          const resolved = resolveFilePath(text, filePaths);
          if (resolved && onNavigateToFile) {
            return (
              <code
                className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[10px] font-mono text-accent hover:underline cursor-pointer"
                onClick={() => onNavigateToFile(resolved)}
              >
                {children}
              </code>
            );
          }
          return (
            <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[10px] font-mono text-accent">{children}</code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-2 p-2 bg-bg-tertiary rounded text-[10px] font-mono overflow-x-auto">{children}</pre>
        ),
        ul: ({ children }) => <ul className="mb-2 pl-4 space-y-1 list-disc">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 pl-4 space-y-1 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="text-text">{children}</li>,
        a: ({ href, children }) => {
          const focus = href ? parseFocusHref(href) : null;
          if (focus && onSubHighlight) {
            const label = typeof children === 'string' ? children : String(children ?? '');
            return (
              <button
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded text-[10px] font-medium text-accent hover:bg-accent/20 cursor-pointer transition-colors"
                onClick={() => onSubHighlight(focus.startLine, focus.endLine, label)}
              >
                <svg viewBox="0 0 25 25" fill="currentColor" className="w-2.5 h-2.5 shrink-0"><path d="M22.3281 5.11816C22.3281 4.70395 21.9923 4.36816 21.5781 4.36816C21.1639 4.36816 20.8281 4.70395 20.8281 5.11816V12.7874C20.8281 13.2016 20.4923 13.5374 20.0781 13.5374L10.4197 13.5374L10.4197 8.69196C10.4197 8.38857 10.2369 8.11506 9.95658 7.999C9.67626 7.88295 9.35363 7.94721 9.13917 8.16182L3.54761 13.7573C3.25496 14.0501 3.25496 14.5247 3.54763 14.8176L9.13919 20.4127C9.35365 20.6273 9.67627 20.6916 9.95659 20.5755C10.2369 20.4594 10.4197 20.1859 10.4197 19.8825L10.4197 15.0374L20.0781 15.0374C21.3208 15.0374 22.3281 14.0301 22.3281 12.7874V5.11816Z" /></svg>
                {children}
              </button>
            );
          }
          const goto = href ? parseGotoHref(href) : null;
          if (goto && onNavigateToFileLine) {
            return (
              <code
                className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[10px] font-mono text-accent hover:underline cursor-pointer"
                onClick={() => onNavigateToFileLine(goto.filePath, goto.startLine, goto.endLine)}
              >
                {children}
              </code>
            );
          }
          return (
            <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
          );
        },
        h1: ({ children }) => <h3 className="font-semibold text-text mb-1">{children}</h3>,
        h2: ({ children }) => <h3 className="font-semibold text-text mb-1">{children}</h3>,
        h3: ({ children }) => <h3 className="font-semibold text-text mb-1">{children}</h3>,
        hr: () => <hr className="border-border my-3" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent/30 pl-2 my-2 text-text-secondary">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded border border-border">
            <table className="w-full text-[10px] border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-bg-tertiary">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-2.5 py-1.5 text-left font-semibold text-text border-b border-border">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-2.5 py-1.5 text-text border-b border-border/50">{children}</td>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-hover/50">{children}</tr>
        ),
      }}
    >
      {props.content}
    </ReactMarkdown>
  );
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 384;

export function TourPanel(props: TourPanelProps) {
  const { tour, currentStepIndex, onStepChange, onClose, onNavigateToFile, onNavigateToFileLine, onScrollToHighlight, onSubHighlight, filePaths } = props;

  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const contentRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLButtonElement>(null);
  const draggingRef = useRef(false);

  const filePathSet = useMemo(() => new Set(filePaths ?? []), [filePaths]);

  const steps = tour.steps;
  const totalSteps = steps.length + 1;
  const isIntro = currentStepIndex === 0;
  const currentStep = isIntro ? null : (steps[currentStepIndex - 1] ?? null);
  const hasPrev = currentStepIndex > 0;
  const hasNext = currentStepIndex < totalSteps - 1;

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    if (activeStepRef.current && stepsRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentStepIndex]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingRef.current) {
        return;
      }
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width]);

  if (collapsed) {
    return (
      <div className="w-10 min-w-10 border-l border-border bg-bg-secondary flex items-start justify-center pt-3">
        <button
          className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-hover cursor-pointer"
          onClick={() => setCollapsed(false)}
          title="Show tour panel"
        >
          <CompassIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const lineRange = currentStep
    ? currentStep.startLine === currentStep.endLine
      ? `${currentStep.startLine}`
      : `${currentStep.startLine}-${currentStep.endLine}`
    : '';

  return (
    <aside className="border-l border-border bg-bg-secondary flex flex-col overflow-hidden relative" style={{ width, minWidth: MIN_WIDTH }}>
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 opacity-0 hover:opacity-100 bg-border transition-opacity"
        onMouseDown={handleResizeStart}
      />

      <div className="px-3 pt-2.5 pb-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-medium text-text truncate">{tour.topic}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-hover cursor-pointer"
              onClick={() => setCollapsed(true)}
              title="Collapse tour panel"
            >
              <SidebarIcon className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-hover cursor-pointer"
              onClick={onClose}
              title="Close tour"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
        <button
          className="p-1 rounded text-text-muted hover:text-text cursor-pointer disabled:opacity-30 disabled:cursor-default shrink-0"
          onClick={() => onStepChange(currentStepIndex - 1)}
          disabled={!hasPrev}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M9.78 12.78a.75.75 0 01-1.06 0L4.47 8.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L6.06 8l3.72 3.72a.75.75 0 010 1.06z" /></svg>
        </button>
        <div ref={stepsRef} className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
          {Array.from({ length: totalSteps }, (_, index) => (
            <button
              key={index}
              ref={index === currentStepIndex ? activeStepRef : undefined}
              className={`w-6 h-6 rounded-full text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center shrink-0 ${
                index === currentStepIndex
                  ? 'bg-accent text-white'
                  : 'bg-bg-tertiary text-text-muted hover:bg-hover hover:text-text'
              }`}
              onClick={() => onStepChange(index)}
            >
              {index}
            </button>
          ))}
        </div>
        <button
          className="p-1 rounded text-text-muted hover:text-text cursor-pointer disabled:opacity-30 disabled:cursor-default shrink-0"
          onClick={() => onStepChange(currentStepIndex + 1)}
          disabled={!hasNext}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" /></svg>
        </button>
        </div>
      </div>

      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-3">
        {isIntro ? (
          <>
            <h2 className="text-sm font-semibold text-text leading-snug mb-3">{tour.topic}</h2>
            {tour.body && (
              <div className="text-xs text-text leading-relaxed">
                <TourMarkdown content={tour.body} onNavigateToFile={onNavigateToFile} onNavigateToFileLine={onNavigateToFileLine} filePaths={filePathSet} />
              </div>
            )}
          </>
        ) : currentStep ? (
          <>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-[10px] font-medium text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full shrink-0">
                {currentStepIndex}/{totalSteps - 1}
              </span>
              <h3 className="text-xs font-semibold text-text leading-snug">
                {currentStep.annotation || `Step ${currentStepIndex}`}
              </h3>
            </div>

            <div className="text-xs text-text leading-relaxed">
              <TourMarkdown content={currentStep.body} onNavigateToFile={onNavigateToFile} onNavigateToFileLine={onNavigateToFileLine} onSubHighlight={onSubHighlight} filePaths={filePathSet} />
            </div>

            <div className="mt-4 pt-2">
              <button
                className="text-[10px] text-text-muted font-mono truncate hover:text-accent cursor-pointer transition-colors"
                onClick={() => onScrollToHighlight?.()}
              >
                {currentStep.filePath}:{lineRange}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
