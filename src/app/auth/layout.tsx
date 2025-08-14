
'use client';

import { AuthProvider } from "@/lib/auth.tsx";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
        <div className="min-h-screen">{children}</div>
    </AuthProvider>
  );
}
