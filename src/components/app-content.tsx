
'use client';

import { usePathname } from 'next/navigation';
import { UserHeader } from '@/components/user-header';

export function AppContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminOrAccountPage = pathname.startsWith('/admin') || pathname.startsWith('/account');

  return (
      <div className="flex flex-col min-h-screen">
        {!isAdminOrAccountPage && <UserHeader />}
        <main className="flex-1">{children}</main>
      </div>
  );
}
