'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { User, LogIn, UserPlus, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { useUser } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { AppLogo } from './app-logo';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isUserLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          <AppLogo />
          <div className="flex flex-1 items-center justify-end space-x-4">
             <Skeleton className="h-9 w-20" />
             <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </header>
    );
  }

  const isHomepage = pathname === '/';
  const showAuthActions = isHomepage || !user;

  const authActions = (
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

  const accountAction = (
    <Button asChild size="sm" className="font-bold shadow-md">
        <Link href="/account">
            <User className="mr-2 h-4 w-4" />
            Account
        </Link>
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-0">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                    <SheetHeader className="mb-8">
                        <SheetTitle><AppLogo onClick={() => setIsOpen(false)} /></SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col gap-4">
                        {navLinks.map(link => (
                            <Link 
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "text-lg font-bold uppercase tracking-widest py-2 border-b transition-colors hover:text-primary",
                                    pathname === link.href ? "text-primary border-primary" : "text-muted-foreground border-transparent"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-4 flex flex-col gap-3">
                            {showAuthActions ? (
                                <>
                                    <Button asChild variant="outline" className="w-full h-12 font-bold border-2">
                                        <Link href="/signin" onClick={() => setIsOpen(false)}>Sign In</Link>
                                    </Button>
                                    <Button asChild className="w-full h-12 font-bold shadow-lg">
                                        <Link href="/signup" onClick={() => setIsOpen(false)}>Sign Up</Link>
                                    </Button>
                                </>
                            ) : (
                                <Button asChild className="w-full h-12 font-bold shadow-md">
                                    <Link href="/account" onClick={() => setIsOpen(false)}>My Dashboard</Link>
                                </Button>
                            )}
                        </div>
                    </nav>
                </SheetContent>
            </Sheet>
            <AppLogo />
        </div>
        
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

        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
             <div className="hidden sm:block">
                <ThemeToggle />
             </div>
             {showAuthActions ? authActions : accountAction}
        </div>
      </div>
    </header>
  );
}
