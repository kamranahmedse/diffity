import styles from './shortcut-modal.module.css';

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Keyboard shortcuts</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.body}>
          {shortcuts.map(group => (
            <div key={group.category} className={styles.group}>
              <h3 className={styles.groupTitle}>{group.category}</h3>
              <div className={styles.items}>
                {group.items.map(item => (
                  <div key={item.key} className={styles.item}>
                    <kbd className={styles.key}>{item.key}</kbd>
                    <span className={styles.desc}>{item.description}</span>
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
