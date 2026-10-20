'use client';

import { usePathname } from 'next/navigation';
import { UserHeader } from '@/components/user-header';

export function AppContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  // Hide global header on Admin, Account, Login, and now the custom branded landing page
  const hideHeader = isAdminPage || pathname === '/' || pathname.startsWith('/account') || pathname.startsWith('/signin') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password');

  return (
      <div className="flex flex-col min-h-screen">
        {!hideHeader && <UserHeader />}
        <main className="flex-1">{children}</main>
      </div>
  );
}
