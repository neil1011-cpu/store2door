
'use client';
import DashboardLayout from '../dashboard-layout';
import { AuthProvider } from '@/lib/auth';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <AuthProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </AuthProvider>
  );
}
