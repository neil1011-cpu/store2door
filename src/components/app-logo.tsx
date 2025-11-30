
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type AppLogoProps = {
  className?: string;
  isLink?: boolean;
};

export function AppLogo({ className, isLink = true }: AppLogoProps) {
  const content = (
    <Image 
      src="/logo.png" 
      alt="FromStore2Door Logo" 
      width={160} 
      height={40} 
      className="h-10 w-auto"
      priority
    />
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
