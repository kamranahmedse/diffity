import { IconButton } from './ui/icon-button.js';

interface ShortcutModalProps {
  onClose: () => void;
}

const shortcuts = [
  {
    category: 'Navigation',
    items: [
      { key: 'j', description: 'Next file' },
      { key: 'k', description: 'Previous file' },
      { key: 'n', description: 'Next changed hunk' },
      { key: 'p', description: 'Previous changed hunk' },
    ],
  },
  {
    category: 'View',
    items: [
      { key: 'u', description: 'Unified view' },
      { key: 's', description: 'Split view' },
      { key: 'x', description: 'Collapse/expand file' },
      { key: 'Shift+x', description: 'Collapse/expand all files' },
    ],
  },
  {
    category: 'Other',
    items: [
      { key: '/', description: 'Focus search' },
      { key: '?', description: 'Show shortcuts' },
      { key: 'Esc', description: 'Close modal / clear' },
    ],
  },
];

export function ShortcutModal(props: ShortcutModalProps) {
  const { onClose } = props;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div
        className="bg-bg border border-border rounded-lg shadow-md w-[480px] max-w-[90vw] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
          <IconButton className="text-2xl w-8 h-8" onClick={onClose}>
            &times;
          </IconButton>
        </div>
        <div className="p-4">
          {shortcuts.map(group => (
            <div key={group.category} className="mb-4 last:mb-0">
              <h3 className="text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                {group.category}
              </h3>
              <div className="flex flex-col gap-2">
                {group.items.map(item => (
                  <div key={item.key} className="flex items-center gap-3">
                    <kbd className="inline-flex items-center justify-center min-w-7 h-6 px-1.5 bg-bg-secondary border border-border rounded font-mono text-xs font-semibold shadow-[inset_0_-1px_0_var(--color-border)]">
                      {item.key}
                    </kbd>
                    <span className="text-sm text-text-secondary">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
