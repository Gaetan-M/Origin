import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Origin',
  description: 'Plateforme de documentation des arbres genealogiques',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-off-white font-sans antialiased" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
              <Toaster position="top-center" richColors />
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
