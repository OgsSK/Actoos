import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { LanguageProvider } from './context/LanguageContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Header from './components/Header';
import Footer from './components/Footer';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    'Boutique en ligne de maillots, chaussures et équipements de football. Authenticité vérifiée.',
  metadataBase: new URL(`https://${BRAND.domain}`),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased font-sans bg-white text-slate-900 min-h-screen flex flex-col">
        <LanguageProvider>
          <CurrencyProvider>
            <AuthProvider>
              <CartProvider>
                <FavoritesProvider>
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}