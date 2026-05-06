'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { User, LogIn, UserPlus } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { useUser } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { AppLogo } from './app-logo';
import { useEffect, useState } from 'react';

const navLinks = [
    { href: '/tracking', label: 'Tracking' },
    { href: '/services', label: 'Services' },
    { href: '/rates', label: 'Rates' },
    { href: '/contact', label: 'Contact' },
];

export function UserHeader() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use a strictly controlled display for auth-dependent items
  const userActions = !mounted || isUserLoading ? (
    <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
    </div>
  ) : user ? (
    <div className="flex items-center gap-2">
        <Button asChild className="font-bold shadow-md">
            <Link href="/account">
                <User className="mr-2 h-4 w-4" />
                My Account
            </Link>
        </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="hidden sm:flex font-bold border-2">
            <Link href="/signin">
                <LogIn className="mr-2 h-4 w-4" /> Sign In
            </Link>
        </Button>
        <Button asChild size="sm" className="font-bold shadow-lg">
            <Link href="/signup">
                <UserPlus className="mr-2 h-4 w-4" /> Sign Up
            </Link>
        </Button>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <AppLogo />
        <nav className="ml-10 hidden md:flex items-center space-x-6">
            {navLinks.map(link => (
                <Link 
                    key={link.href}
                    href={link.href}
                    className={cn(
                        "text-sm font-bold uppercase tracking-widest transition-colors hover:text-primary",
                        pathname === link.href ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
             <div className="hidden sm:block">
                <ThemeToggle />
             </div>
             {userActions}
        </div>
      </div>
    </header>
  );
}
