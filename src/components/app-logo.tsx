
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type AppLogoProps = {
  className?: string;
  isLink?: boolean;
};

export function AppLogo({ className, isLink = true }: AppLogoProps) {
  const content = (
    <div className="flex items-center gap-2 text-xl font-bold text-foreground">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        {/* Globe */}
        <circle cx="10" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 4V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3.45455 8H16.5455" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3.45455 16H16.5455" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 4C12.7614 4 15 7.58172 15 12C15 16.4183 12.7614 20 10 20" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 4C7.23858 4 5 7.58172 5 12C5 16.4183 7.23858 20 10 20" stroke="currentColor" strokeWidth="1.5" />
        
        {/* Door */}
        <path d="M14 7V17C14 17.5523 14.4477 18 15 18H20C20.5523 18 21 17.5523 21 17V7C21 6.44772 20.5523 6 20 6H15C14.4477 6 14 6.44772 14 7Z" fill="currentColor" fillOpacity="0.1" />
        <path d="M14 7V17C14 17.5523 14.4477 18 15 18H20C20.5523 18 21 17.5523 21 17V7C21 6.44772 20.5523 6 20 6H15C14.4477 6 14 6.44772 14 7Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="18.5" cy="12.5" r="0.5" fill="currentColor" />
      </svg>

      <span className="hidden sm:inline-block">FromStore2Door</span>
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
