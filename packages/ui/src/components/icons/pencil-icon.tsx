import type { SVGProps } from 'react';

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M16.293 2.293a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-13 13A1 1 0 0 1 8 21H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 .293-.707l13-13ZM14 7.414l-9 9V19h2.586l9-9L14 7.414Zm3 1.172 2.586-2.586-2.586-2.586L14.414 6 17 8.586Z" fill="currentColor" />
    </svg>
  );
}
