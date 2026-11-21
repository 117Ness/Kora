'use client';

interface BotanicalSvgProps {
  className?: string;
  size?: number;
}

/**
 * Lightweight custom fine-line olive sprig SVG accent for editorial cookbook cards
 */
export function OliveSprigSvg({ className = 'h-5 w-5 text-[#7A7463]', size = 24 }: BotanicalSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 21C7 16 12 10 20 4" />
      <path d="M7 14c-2.2-1.5-1.5-4.5.5-5.5s4.5.8 4.5 3-1.8 3.5-5 2.5z" />
      <path d="M13 9c-1.5-2.2-.2-4.5 1.8-5s4 .5 4 2.5-1.5 3.5-5.8 2.5z" />
      <path d="M11 18c-2-.8-2.5-3.5-.8-4.8s4-.2 4.5 1.8c.4 1.5-.7 3.5-3.7 3z" />
    </svg>
  );
}

/**
 * Lightweight custom fine-line rosemary / herb sprig SVG accent
 */
export function HerbSprigSvg({ className = 'h-4 w-4 text-[#7A7463]', size = 20 }: BotanicalSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22V3" />
      <path d="M12 7c2.5-1.8 4.5-1 5 .8s-1.2 3.2-5 1.7" />
      <path d="M12 11c-2.5-1.8-4.5-1-5 .8s1.2 3.2 5 1.7" />
      <path d="M12 15c2.5-1.8 4.5-1 5 .8s-1.2 3.2-5 1.7" />
      <path d="M12 19c-2.5-1.8-4.5-1-5 .8s1.2 3.2 5 1.7" />
    </svg>
  );
}

/**
 * Lightweight custom fine-line botanical laurel / flourish
 */
export function BotanicalFlourishSvg({ className = 'h-3.5 w-16 text-[#C8BFA8]', size = 64 }: BotanicalSvgProps) {
  return (
    <svg
      width={size}
      height={16}
      viewBox="0 0 64 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 8h24" />
      <path d="M38 8h24" />
      <circle cx="32" cy="8" r="3" />
      <path d="M20 5c2 1.5 2 4.5 0 6" />
      <path d="M44 5c-2 1.5-2 4.5 0 6" />
    </svg>
  );
}
