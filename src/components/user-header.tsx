'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { User, Menu, Facebook, Instagram, Twitter, ArrowRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { useSupabase } from '@/components/supabase-provider';
import { AppLogo } from './app-logo';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const navLinks = [
    { href: '/customs-calculator', label: 'Calculator' },
    { href: '/rates', label: 'Rates' },
    { href: '/services', label: 'Sea Freight' },
    { href: '/contact', label: 'Contact' },
];

const socialLinks = [
    { icon: <Twitter className="h-4 w-4" />, href: '#' },
    { icon: <Facebook className="h-4 w-4" />, href: '#' },
    { icon: <Instagram className="h-4 w-4" />, href: '#' },
];

export function UserHeader() {
  const pathname = usePathname();
  const { user } = useSupabase();
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
        "fixed top-0 z-50 w-full transition-all duration-500 h-20 flex items-center",
        scrolled || !isHomepage 
            ? "bg-background/95 backdrop-blur-md border-b" 
            : "bg-transparent border-transparent"
    )}>
      <div className="container mx-auto flex items-center px-4 md:px-6">
        <div className="flex items-center gap-6">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="h-7 w-7" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] bg-background border-r">
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
                            <div className="flex items-center justify-between px-4 py-2 border rounded-xl mb-4">
                                <span className="text-xs font-bold uppercase opacity-60">Appearance</span>
                                <ThemeToggle />
                            </div>
                            {showAuthActions ? (
                                <>
                                    <Button asChild variant="outline" className="w-full h-14 font-black uppercase italic border-2"><Link href="/signin" onClick={() => setIsOpen(false)}>Login</Link></Button>
                                    <Button asChild className="w-full h-14 font-black uppercase italic rocket-gradient border-none text-white"><Link href="/signup" onClick={() => setIsOpen(false)}>Sign Up</Link></Button>
                                </>
                            ) : (
                                <Button asChild className="w-full h-14 font-black uppercase italic rocket-gradient border-none text-white"><Link href="/account" onClick={() => setIsOpen(false)}>Dashboard</Link></Button>
                            )}
                        </div>
                    </nav>
                </SheetContent>
            </Sheet>
            <AppLogo />
        </div>
        
        <div className="hidden lg:flex items-center ml-8 gap-4 opacity-60">
            {socialLinks.map((s, i) => (
                <Link key={i} href={s.href} className="hover:text-primary transition-colors">
                    {s.icon}
                </Link>
            ))}
        </div>

        <nav className="ml-auto hidden md:flex items-center space-x-6">
            {navLinks.map(link => (
                <Link 
                    key={link.href} 
                    href={link.href} 
                    className={cn(
                        "text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-primary", 
                        pathname === link.href ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </nav>

        <div className="flex items-center justify-end space-x-4 ml-8">
             <ThemeToggle />
             {showAuthActions ? (
                <>
                    <Button asChild variant="ghost" size="sm" className="font-bold uppercase tracking-tight hidden sm:flex">
                        <Link href="/signup">Sign Up</Link>
                    </Button>
                    <Button asChild size="sm" className="font-black h-10 px-6 bg-primary text-primary-foreground rounded-full uppercase italic shadow-lg">
                        <Link href="/signin">Login <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </>
             ) : (
                <Button asChild size="sm" className="font-black h-10 px-6 rocket-gradient text-white rounded-full uppercase italic border-none shadow-lg">
                    <Link href="/account"><User className="mr-2 h-4 w-4" /> Account</Link>
                </Button>
             )}
        </div>
      </div>
    </header>
  );
}