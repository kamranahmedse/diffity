import type { SVGProps } from 'react';

export function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <polygon points="10.5,5.5 6.5,7 5.5,10.5 9.5,9 " fill="currentColor" stroke="none" />
    </svg>
  );
}
