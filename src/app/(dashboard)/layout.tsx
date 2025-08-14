
'use client';
import { AuthProvider } from '@/lib/auth.tsx';
import DashboardLayout from '../dashboard-layout';

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
