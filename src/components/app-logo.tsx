
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type AppLogoProps = {
  className?: string;
  isLink?: boolean;
  onClick?: () => void;
};

/**
 * @fileOverview Authoritative App Logo component using official FromStore2Door branding.
 */
export function AppLogo({ className, isLink = true, onClick }: AppLogoProps) {
  const content = (
    <div className="flex items-center gap-3 cursor-pointer" onClick={onClick}>
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
        <Image 
          src="/images/logo.png" 
          alt="FromStore2Door" 
          fill
          className="object-contain"
          priority
        />
      </div>
      <span className="text-xl font-black italic uppercase tracking-tighter text-foreground hidden sm:inline-block">
        FromStore2Door
      </span>
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
