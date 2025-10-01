
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Route, User } from 'lucide-react';
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
    <Route className="size-7 text-primary" />
    <h1 className="text-xl font-bold">SwiftRoute</h1>
  </Link>
);


export function UserHeader() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    try {
      const storedDetails = localStorage.getItem('accountDetails');
      if (storedDetails) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Could not read from local storage", error);
      setIsLoggedIn(false);
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
             {isLoggedIn ? (
                 <Button asChild>
                    <Link href="/account">
                        <User className="mr-2 h-4 w-4" />
                        My Account
                    </Link>
                 </Button>
             ) : (
                 <>
                    <Button asChild variant="ghost">
                        <Link href="/signin">Sign In</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/signup">Sign Up</Link>
                    </Button>
                </>
             )}
        </div>
      </div>
    </header>
  );
}
