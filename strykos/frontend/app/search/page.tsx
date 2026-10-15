import Link from 'next/link';
import { Search as SearchIcon, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/format';
import FavoriteButton from '@/app/components/FavoriteButton';
import ProductPrice from '../components/ProductPrice';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { q?: string };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const query = (searchParams.q || '').trim();
  const supabase = await createClient();

  let results: any[] = [];

  if (query.length >= 2) {
    const { data, error } = await supabase.rpc('search_products', {
      p_query: query,
      p_limit: 40,
    });

    if (error) {
      console.warn('[Search] rpc error:', error.message);
    } else {
      results = data || [];
    }
  }

  return (
    <div className="min-h-screen">
      {/* En-tête */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-900">Accueil</Link>
            <ChevronRight size={14} />
            <span className="text-slate-900 font-medium">Recherche</span>
          </nav>

          {query ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Résultats pour « {query} »
              </h1>
              <p className="text-slate-500 mt-2">
                {results.length} résultat{results.length !== 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Rechercher un produit
              </h1>
              <p className="text-slate-500 mt-2">
                Tapez au moins 2 caractères dans la barre de recherche ci-dessus.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {query.length > 0 && query.length < 2 ? (
          <div className="text-center py-20">
            <SearchIcon size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              Tapez au moins 2 caractères pour lancer la recherche.
            </p>
          </div>
        ) : query && results.length === 0 ? (
          <div className="text-center py-20">
            <SearchIcon size={48} className="text-slate-300 mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-2">Aucun résultat</h2>
            <p className="text-slate-500 mb-6">
              Nous n'avons rien trouvé pour « {query} ».
            </p>
            <Link
              href="/c/maillots"
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-800"
            >
              Voir tous les produits
            </Link>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {results.map((p: any) => (
              <Link key={p.id} href={`/p/${p.slug}`} className="group block">
                <div className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden mb-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                      Pas d'image
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FavoriteButton
                      product={{
                        id: p.id,
                        slug: p.slug,
                        name: p.name,
                        brandName: p.brand_name,
                        imageUrl: p.image_url,
                        priceEur: p.min_price_eur || 0,
                      }}
                    />
                  </div>
                </div>

                {p.brand_name && (
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                    {p.brand_name}
                  </p>
                )}
                <h3 className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:underline">
                  {p.name}
                </h3>
                                <ProductPrice
                  priceEur={p.min_price_eur || 0}
                  className="text-sm font-bold text-slate-900 mt-1 block"
                />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}