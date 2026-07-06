import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from './components/CookieConsent';
import { ProjectProvider } from './context/ProjectContext';
import { LanguageProvider } from './context/LanguageContext';

export const metadata: Metadata = {
  title: 'ACTOOS - Empowering Action. Delivering Progress.',
  description: 'Créateur de solutions logicielles sur mesure. Nous concevons et développons des applications, plateformes web et logiciels personnalisés pour les entreprises.',
  keywords: ['ACTOOS', 'logiciel sur mesure', 'développement', 'application mobile', 'plateforme web'],
  authors: [{ name: 'ACTOOS Group' }],
  creator: 'ACTOOS Group',
  publisher: 'ACTOOS Group',
  metadataBase: new URL('https://actoos.com'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://actoos.com',
    siteName: 'ACTOOS',
    title: 'ACTOOS - Empowering Action. Delivering Progress.',
    description: 'Créateur de solutions logicielles sur mesure. Applications, plateformes web, logiciels personnalisés.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ACTOOS - Créateur de solutions logicielles',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ACTOOS - Empowering Action. Delivering Progress.',
    description: 'Créateur de solutions logicielles sur mesure',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <ProjectProvider>
            {children}
            <CookieConsent />
          </ProjectProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}