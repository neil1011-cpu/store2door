
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type AppLogoProps = {
  className?: string;
  isLink?: boolean;
  onClick?: () => void;
};

export function AppLogo({ className, isLink = true, onClick }: AppLogoProps) {
  const content = (
    <div className="flex items-center gap-2 text-xl font-black text-foreground cursor-pointer" onClick={onClick}>
      <svg
        width="38"
        height="38"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-primary/20" />
        <path
          d="M20 50C20 33.4315 33.4315 20 50 20C66.5685 20 80 33.4315 80 50"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className="text-primary"
        />
        <path
          d="M20 50L80 50"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className="text-primary"
        />
        <path
          d="M50 20V80"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="2 4"
          className="text-primary/40"
        />
        <path
          d="M65 35L85 50L65 65"
          fill="currentColor"
          className="text-orange-500"
        />
      </svg>
      <span className="inline-block italic uppercase tracking-tighter">FromStore2Door</span>
    </div>
  );

  const containerClasses = cn("flex items-center", className);

  if (isLink) {
    return (
      <Link href="/" className={containerClasses} aria-label="FromStore2Door Home">
        {content}
      </Link>
    );
  }

  return <div className={containerClasses}>{content}</div>;
}
