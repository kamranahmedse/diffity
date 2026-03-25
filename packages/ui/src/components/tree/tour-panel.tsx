import { useState, useRef, useEffect } from 'react';
import type { Tour } from '../../lib/api';
import { CompassIcon } from '../icons/compass-icon';
import { XIcon } from '../icons/x-icon';
import { SidebarIcon } from '../icons/sidebar-icon';

interface TourPanelProps {
  tour: Tour;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
}

export function TourPanel(props: TourPanelProps) {
  const { tour, currentStepIndex, onStepChange, onClose } = props;

  const [collapsed, setCollapsed] = useState(false);
  const activeStepRef = useRef<HTMLButtonElement>(null);

  const steps = tour.steps;
  const hasPrev = currentStepIndex > 0;
  const hasNext = currentStepIndex < steps.length - 1;

  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [currentStepIndex]);

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

  return (
    <aside className="w-80 min-w-80 border-l border-border bg-bg-secondary flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-xs font-medium text-text-secondary flex items-center gap-2 uppercase tracking-wider">
          <CompassIcon className="w-3.5 h-3.5" />
          Tour
        </span>
        <div className="flex items-center gap-0.5">
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

      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text leading-snug">{tour.topic}</h2>
        {tour.body && (
          <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{tour.body}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const lineRange = step.startLine === step.endLine
            ? `${step.startLine}`
            : `${step.startLine}-${step.endLine}`;

          return (
            <button
              key={step.id}
              ref={isActive ? activeStepRef : undefined}
              className={`w-full text-left px-4 py-2.5 border-b border-border/50 cursor-pointer transition-colors ${
                isActive
                  ? 'bg-accent/5'
                  : 'hover:bg-hover'
              }`}
              onClick={() => onStepChange(index)}
            >
              <div className={`flex gap-2 ${isActive ? 'items-start' : 'items-center'}`}>
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-bg-tertiary text-text-muted'
                }`}>
                  {index + 1}
                </span>
                <span className={`text-[11px] font-medium ${
                  isActive ? 'text-accent' : 'text-text-secondary truncate'
                }`}>
                  {step.annotation || step.filePath.split('/').pop()}
                </span>
              </div>

              {isActive && (
                <div className="pl-7">
                  <p className="text-xs text-text leading-relaxed mb-1.5">{step.body}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-text-muted font-mono">
                    {step.filePath}:{lineRange}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-border">
        <button
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-border bg-bg hover:bg-hover cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
          onClick={() => onStepChange(currentStepIndex - 1)}
          disabled={!hasPrev}
        >
          Prev
        </button>
        <span className="text-[10px] text-text-muted tabular-nums">
          {currentStepIndex + 1} / {steps.length}
        </span>
        <button
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-border bg-bg hover:bg-hover cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
          onClick={() => onStepChange(currentStepIndex + 1)}
          disabled={!hasNext}
        >
          Next
        </button>
      </div>
    </aside>
  );
}
