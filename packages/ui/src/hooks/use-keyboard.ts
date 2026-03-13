import { useEffect, useCallback, useRef } from 'react';

interface KeyboardActions {
  onNextFile: () => void;
  onPrevFile: () => void;
  onNextHunk: () => void;
  onPrevHunk: () => void;
  onToggleCollapse: () => void;
  onCollapseAll: () => void;
  onUnifiedView: () => void;
  onSplitView: () => void;
  onShowHelp: () => void;
  onFocusSearch: () => void;
  onEscape: () => void;
}

export function useKeyboard(actions: KeyboardActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
          actionsRef.current.onEscape();
        }
        return;
      }

      switch (e.key) {
        case 'j':
          e.preventDefault();
          actionsRef.current.onNextFile();
          break;
        case 'k':
          e.preventDefault();
          actionsRef.current.onPrevFile();
          break;
        case 'n':
          e.preventDefault();
          actionsRef.current.onNextHunk();
          break;
        case 'p':
          e.preventDefault();
          actionsRef.current.onPrevHunk();
          break;
        case 'x':
          e.preventDefault();
          if (e.shiftKey) {
            actionsRef.current.onCollapseAll();
          } else {
            actionsRef.current.onToggleCollapse();
          }
          break;
        case 'u':
          e.preventDefault();
          actionsRef.current.onUnifiedView();
          break;
        case 's':
          e.preventDefault();
          actionsRef.current.onSplitView();
          break;
        case '?':
          e.preventDefault();
          actionsRef.current.onShowHelp();
          break;
        case '/':
          e.preventDefault();
          actionsRef.current.onFocusSearch();
          break;
        case 'Escape':
          actionsRef.current.onEscape();
          break;
      }
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
