
'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { Route } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';

const navLinks = [
    { href: '/tracking', label: 'Tracking' },
    { href: '/services', label: 'Services' },
    { href: '/rates', label: 'Rates' },
    { href: '/contact', label: 'Contact' },
];


const AppLogo = () => (
  <Link href="/" className="flex items-center gap-2">
    <Route className="size-6 text-primary" />
    <h1 className="text-lg font-bold">SwiftRoute</h1>
  </Link>
);


export function UserHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4 md:px-6">
        <AppLogo />
        <nav className="ml-10 hidden md:flex items-center space-x-6 text-sm font-medium">
            {navLinks.map(link => (
                <Link 
                    key={link.href}
                    href={link.href}
                    className={cn(
                        "transition-colors hover:text-primary",
                        pathname === link.href ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
             <ThemeToggle />
             <Button asChild>
                <Link href="/admin">Sign In</Link>
             </Button>
        </div>
      </div>
    </header>
  );
}

