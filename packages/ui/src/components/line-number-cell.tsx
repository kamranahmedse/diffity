import { cn } from '../lib/cn.js';

interface LineNumberCellProps {
  lineNumber: number | null;
  className?: string;
}

const baseClass = 'w-12.5 min-w-12.5 px-2 text-right text-text-muted select-none cursor-pointer align-top text-xs';

export function LineNumberCell(props: LineNumberCellProps) {
  const { lineNumber, className } = props;

  return (
    <td className={cn(baseClass, className)}>
      {lineNumber ?? ''}
    </td>
  );
}
