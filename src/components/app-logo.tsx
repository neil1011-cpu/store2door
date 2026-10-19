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
        width="40"
        height="40"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Globe (Cyan) */}
        <circle cx="35" cy="45" r="30" stroke="#00FFFF" strokeWidth="2" />
        <path
          d="M20 30C22 25 30 22 35 22C40 22 45 25 45 35C45 45 35 50 30 55"
          stroke="#00FFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M15 45C15 45 25 40 35 45C45 50 55 45 55 45"
          stroke="#00FFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M35 15C35 15 40 30 35 45C30 60 35 75 35 75"
          stroke="#00FFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Door Frame (Cyan) */}
        <path
          d="M65 30V85H95V30C95 18 65 18 65 30Z"
          fill="#00FFFF"
          fillOpacity="0.1"
        />
        <path
          d="M65 30V85H95V30C95 18 65 18 65 30ZM65 85H90V35C90 35 85 30 80 30"
          stroke="#00FFFF"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="88" cy="58" r="1.5" fill="#00FFFF" />

        {/* Number 2 with Arrow (Gold) */}
        <path
          d="M30 75C30 55 55 50 55 35C55 25 45 22 38 22C30 22 25 28 25 35"
          stroke="#DAA520"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M25 75L75 55"
          stroke="#DAA520"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M65 45L78 55L62 65"
          fill="#DAA520"
        />
      </svg>
      <span className="hidden sm:inline-block italic uppercase tracking-tighter">FromStore2Door</span>
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