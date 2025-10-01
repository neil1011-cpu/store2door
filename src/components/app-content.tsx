
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
  const hideHeader = isAdminPage || pathname.startsWith('/account') || pathname.startsWith('/admin-login');


  return (
      <div className="flex flex-col min-h-screen">
        {!hideHeader && <UserHeader />}
        <main className="flex-1">{children}</main>
      </div>
  );
}
