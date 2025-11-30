import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type AppLogoProps = {
  className?: string;
  isLink?: boolean;
};

export function AppLogo({ className, isLink = true }: AppLogoProps) {
  const content = (
    <>
      <Image 
        src="/logo.png" 
        alt="FromStore2Door Logo" 
        width={40} 
        height={40} 
        className="h-10 w-auto"
      />
      <h1 className="text-xl font-bold">FromStore2Door</h1>
    </>
  );

  const containerClasses = cn("flex items-center gap-2", className);

  if (isLink) {
    return (
      <Link href="/" className={containerClasses}>
        {content}
      </Link>
    );
  }

  return <div className={containerClasses}>{content}</div>;
}
