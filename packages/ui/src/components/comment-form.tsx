import { useState, useRef, useEffect } from 'react';

interface CommentFormProps {
  onSubmit: (body: string) => void;
  onCancel: () => void;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  lineLabel?: string;
}

export function CommentForm(props: CommentFormProps) {
  const { onSubmit, onCancel, placeholder = 'Leave a comment', submitLabel = 'Comment', autoFocus = true, lineLabel } = props;
  const [body, setBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setBody('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="rounded-lg overflow-hidden bg-bg-tertiary">
      {lineLabel && (
        <div className="px-3 py-1.5">
          <span className="text-xs text-text-secondary font-medium">{lineLabel}</span>
        </div>
      )}
      <div className="mx-1.5 mb-1.5 rounded-md overflow-hidden">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 text-sm bg-bg text-text resize-y outline-none placeholder:text-text-muted min-h-[80px] font-mono"
        />
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium rounded-md text-text-secondary hover:bg-hover transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!body.trim()}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
