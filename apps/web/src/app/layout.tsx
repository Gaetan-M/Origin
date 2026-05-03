import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const SITE_URL = 'https://my-origin-tree.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Origin — Arbre généalogique africain en ligne | African Family Tree',
    template: '%s | Origin',
  },
  description:
    "Origin est la première plateforme généalogique pensée pour les familles africaines. Documente ton arbre généalogique, retrouve tes ancêtres au Cameroun et préserve l'histoire de ta famille. Gratuit, en français et en anglais.",
  keywords: [
    'arbre généalogique',
    'arbre généalogique africain',
    'arbre généalogique en ligne',
    'arbre généalogique gratuit',
    'généalogie Cameroun',
    'généalogie afrique',
    'recherche ancêtres Cameroun',
    'patrimoine familial Afrique',
    'diaspora camerounaise',
    'documenter sa famille',
    'family tree',
    'African genealogy',
    'Cameroonian genealogy',
    'African family heritage',
    'Bantu genealogy',
    'family tree online',
    'free family tree',
    'diaspora family heritage',
  ],
  authors: [{ name: 'Origin' }],
  creator: 'Origin',
  publisher: 'Origin',
  applicationName: 'Origin',
  category: 'Genealogy',
  alternates: {
    canonical: '/',
    languages: {
      'fr-FR': '/',
      'en-US': '/',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    alternateLocale: ['en_US'],
    siteName: 'Origin',
    title: 'Origin — Arbre généalogique africain en ligne',
    description:
      "La première plateforme généalogique pensée pour les familles africaines. Documente ton arbre, retrouve tes ancêtres et préserve l'histoire de ta famille.",
    url: SITE_URL,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Origin — Plateforme généalogique africaine',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Origin — Arbre généalogique africain en ligne',
    description:
      "Documente ton arbre généalogique, retrouve tes ancêtres et préserve l'histoire de ta famille africaine.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#2C5F4D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
