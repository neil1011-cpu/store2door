'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { useUser } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { AppLogo } from './app-logo';


const navLinks = [
    { href: '/tracking', label: 'Tracking' },
    { href: '/services', label: 'Services' },
    { href: '/rates', label: 'Rates' },
    { href: '/contact', label: 'Contact' },
];


export function UserHeader() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <AppLogo />
        <nav className="ml-10 hidden md:flex items-center space-x-6 text-sm font-medium">
            {navLinks.map(link => (
                <Link 
                    key={link.href}
                    href={link.href}
                    className={cn(
                        "transition-colors hover:text-primary text-base",
                        pathname === link.href ? "text-primary font-semibold" : "text-muted-foreground"
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
             <ThemeToggle />
             {isUserLoading ? (
                 <Skeleton className="h-9 w-24" />
             ) : user ? (
                <Button asChild>
                    <Link href="/account">
                        <User className="mr-2 h-4 w-4" />
                        My Account
                    </Link>
                </Button>
            ) : (
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/signin">Sign In</Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link href="/signup">Sign Up</Link>
                    </Button>
                </div>
            )}
        </div>
      </div>
    </header>
  );
}
