import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { AuthProvider } from '@/app/context/AuthContext';
import { LanguageProvider } from '@/app/context/LanguageContext';
import { BRAND } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${BRAND.name} — Trouvez le prof idéal`,
  description:
    'La plateforme de mise en relation entre enseignants et parents au Mali.',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/logo-icon.png',
    shortcut: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased bg-slate-50 text-slate-900">
        <Providers>
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}