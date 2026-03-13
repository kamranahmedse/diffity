import type { DiffLine } from '@diffity/parser';

interface WordDiffProps {
  line: DiffLine;
}

export function WordDiff(props: WordDiffProps) {
  const { line } = props;

  if (!line.wordDiff || line.wordDiff.length === 0) {
    return <span>{line.content || '\n'}</span>;
  }

  return (
    <>
      {line.wordDiff.map((seg, i) => {
        if (seg.type === 'equal') {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === 'delete' && line.type === 'delete') {
          return (
            <span key={i} className="bg-diff-del-word rounded-sm">
              {seg.text}
            </span>
          );
        }
        if (seg.type === 'insert' && line.type === 'add') {
          return (
            <span key={i} className="bg-diff-add-word rounded-sm">
              {seg.text}
            </span>
          );
        }
        return null;
      })}
    </>
  );
}
