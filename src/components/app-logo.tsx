import Link from 'next/link';
import { Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type AppLogoProps = {
  className?: string;
  isLink?: boolean;
};

export function AppLogo({ className, isLink = true }: AppLogoProps) {
  const content = (
    <>
      {/* 
        ** HOW TO ADD YOUR LOGO **
        1. Add your logo to the `public` folder (e.g., /public/logo.png).
        2. Replace the <Route> icon and <h1> text below with a Next.js <Image> component.
        
        Example:
        <Image src="/logo.png" alt="FromStore2Door Logo" width={40} height={40} />
        <h1 className="text-xl font-bold">FromStore2Door</h1>
      */}
      <Route className="size-7 text-primary" />
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
