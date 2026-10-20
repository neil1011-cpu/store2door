import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { AppContent } from '@/components/app-content';
import { Sora, DM_Sans } from 'next/font/google';
import SupabaseProvider from '@/components/supabase-provider';
import { CookieConsent } from '@/components/cookie-consent';

const sora = Sora({ 
  subsets: ['latin'], 
  variable: '--font-sora',
  weight: ['400', '600', '700', '800'] 
});

const dmSans = DM_Sans({ 
  subsets: ['latin'], 
  variable: '--font-dm-sans',
  weight: ['400', '500', '700'] 
});

export const metadata: Metadata = {
    title: 'FromStore2Door - Shipping from US to Jamaica',
    description: 'Your Bridge Between Florida & Jamaica for seamless, reliable, and affordable shipping services.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sora.variable} ${dmSans.variable} font-body antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseProvider>
            <AppContent>
              {children}
            </AppContent>
            <CookieConsent />
          </SupabaseProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
