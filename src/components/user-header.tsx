'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { User, Menu, Search, Truck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { useSupabase } from '@/components/supabase-provider';
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
  const { user, isLoading } = useSupabase();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!mounted) return null;

  const isHomepage = pathname === '/';
  const showAuthActions = !user;

  return (
    <header className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300 h-20 flex items-center border-b",
        scrolled || !isHomepage 
            ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-border" 
            : "bg-transparent border-transparent"
    )}>
      <div className="container mx-auto flex items-center px-4 md:px-6">
        <div className="flex items-center gap-4">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("md:hidden", isHomepage && !scrolled ? "text-white" : "text-foreground")}>
                        <Menu className="h-7 w-7" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px]">
                    <SheetHeader><SheetTitle><AppLogo onClick={() => setIsOpen(false)} /></SheetTitle></SheetHeader>
                    <nav className="flex flex-col gap-2 mt-10">
                        {navLinks.map(link => (
                            <Link 
                                key={link.href} 
                                href={link.href} 
                                onClick={() => setIsOpen(false)} 
                                className={cn(
                                    "text-lg font-black uppercase italic tracking-tighter py-4 px-4 rounded-xl transition-colors",
                                    pathname === link.href ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-6 flex flex-col gap-3">
                            {showAuthActions ? (
                                <>
                                    <Button asChild variant="outline" className="w-full h-14 font-black uppercase italic border-2"><Link href="/signin" onClick={() => setIsOpen(false)}>Sign In</Link></Button>
                                    <Button asChild className="w-full h-14 font-black uppercase italic shadow-xl bg-accent text-accent-foreground"><Link href="/signup" onClick={() => setIsOpen(false)}>Sign Up</Link></Button>
                                </>
                            ) : (
                                <Button asChild className="w-full h-14 font-black uppercase italic shadow-xl"><Link href="/account" onClick={() => setIsOpen(false)}>Go to Dashboard</Link></Button>
                            )}
                        </div>
                    </nav>
                </SheetContent>
            </Sheet>
            <AppLogo className={cn("transition-all duration-300", isHomepage && !scrolled && "grayscale invert brightness-200")} />
        </div>
        
        <nav className="ml-auto hidden md:flex items-center space-x-8">
            {navLinks.map(link => (
                <Link 
                    key={link.href} 
                    href={link.href} 
                    className={cn(
                        "text-xs font-black uppercase tracking-[0.2em] italic transition-colors hover:text-accent", 
                        isHomepage && !scrolled ? "text-white/80" : "text-muted-foreground",
                        pathname === link.href && "text-accent"
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </nav>

        <div className="flex items-center justify-end space-x-3 ml-8">
             <div className="hidden sm:block"><ThemeToggle /></div>
             {showAuthActions ? (
                <>
                    <Button asChild variant="ghost" size="sm" className={cn("font-black uppercase italic hidden lg:flex", isHomepage && !scrolled ? "text-white hover:bg-white/10" : "text-foreground")}>
                        <Link href="/signin">Sign In</Link>
                    </Button>
                    <Button asChild size="sm" className="font-black h-10 px-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 uppercase italic">
                        <Link href="/signup">Join Now</Link>
                    </Button>
                </>
             ) : (
                <Button asChild size="sm" className="font-black h-10 px-8 uppercase italic shadow-lg transition-all">
                    <Link href="/account"><User className="mr-2 h-4 w-4" /> Account</Link>
                </Button>
             )}
        </div>
      </div>
    </header>
  );
}