
'use client';
import DashboardLayout from '../dashboard-layout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <DashboardLayout>{children}</DashboardLayout>
  );
}
