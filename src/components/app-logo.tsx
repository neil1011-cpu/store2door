
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Route } from 'lucide-react';

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
        <path
          d="M4 10V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 10L12 3L22 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 21V15C12 13.8954 12.8954 13 14 13H15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
         <path 
          d="M9 16L15 10" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M12 10H15V13" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
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
