'use client';

import { usePathname } from 'next/navigation';
import { UserHeader } from '@/components/user-header';

/**
 * @fileOverview Manages the visibility of the global header across different routes.
 * Ensures the landing page, account dashboard, and admin panel use their specialized navigation.
 */
export function AppContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  // Administrative routes (starts with /admin or /admin-login)
  const isAdminPage = pathname?.startsWith('/admin') || pathname?.startsWith('/admin-login') || false;
  
  // Logged-in user dashboard routes
  const isAccountPage = pathname?.startsWith('/account') || false;
  
  // Custom branded landing page (handled within src/app/page.tsx)
  const isLandingPage = pathname === '/';
  
  // Header should be hidden on admin, account, and landing pages
  const hideHeader = isAdminPage || isAccountPage || isLandingPage;

  return (
      <div className="flex flex-col min-h-screen">
        {!hideHeader && <UserHeader />}
        <main className="flex-1">{children}</main>
      </div>
  );
}
