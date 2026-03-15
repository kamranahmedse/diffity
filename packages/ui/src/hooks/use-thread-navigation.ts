import { useState, useCallback } from 'react';
import type { CommentThread } from '../types/comment';
import { isThreadResolved } from '../types/comment';

export function useThreadNavigation(threads: CommentThread[]) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const unresolvedThreads = threads.filter(t => !isThreadResolved(t));
  const count = unresolvedThreads.length;

  const scrollToThread = useCallback((index: number) => {
    const thread = unresolvedThreads[index];
    if (!thread) {
      return;
    }

    const element = document.querySelector(`[data-thread-id="${thread.id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [unresolvedThreads]);

  const goToPrevious = useCallback(() => {
    if (count === 0) {
      return;
    }
    const nextIndex = currentIndex <= 0 ? count - 1 : currentIndex - 1;
    setCurrentIndex(nextIndex);
    scrollToThread(nextIndex);
  }, [currentIndex, count, scrollToThread]);

  const goToNext = useCallback(() => {
    if (count === 0) {
      return;
    }
    const nextIndex = currentIndex >= count - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(nextIndex);
    scrollToThread(nextIndex);
  }, [currentIndex, count, scrollToThread]);

  return {
    currentIndex,
    count,
    goToPrevious,
    goToNext,
  };
}
