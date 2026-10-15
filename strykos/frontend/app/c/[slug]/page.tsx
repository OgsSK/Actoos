import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { first, asArray } from '@/lib/supabase/helpers';
import { formatPrice } from '@/lib/format';
import FavoriteButton from '@/app/components/FavoriteButton';
import ProductPrice from '@/app/components/ProductPrice';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export default async function CategoryPage({ params }: PageProps) {
  const supabase = await createClient();

  // Récupère la catégorie
  const { data: category } = await supabase
    .from('categories')
    .select('id, slug, name, description')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!category) notFound();

  // Récupère les sous-catégories
  const { data: subcategories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('parent_id', category.id)
    .eq('is_active', true)
    .order('order_index');

  // Récupère les produits
  const { data: products } = await supabase
    .from('products')
    .select(`
      id, slug, name, short_description,
      brand:brands(id, slug, name),
      variants:product_variants(id, price_eur, price_xof, size, is_active),
      media:product_media(url, is_primary, order_index)
    `)
    .eq('category_id', category.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // Pour chaque produit : image principale + prix mini + brand normalisé
  const productCards = (products || []).map((p: any) => {
    const media = asArray(p.media);
    const variants = asArray(p.variants);

    const primaryMedia =
      media.find((m: any) => m.is_primary) || media[0] || null;

    const activeVariants = variants.filter((v: any) => v.is_active);
    const minPrice =
      activeVariants.length > 0
        ? Math.min(...activeVariants.map((v: any) => v.price_eur || 0))
        : 0;

    const brand = first(p.brand) as any;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.short_description,
      brand,
      image: primaryMedia?.url ?? null,
      price: minPrice,
    };
  });

  return (
    <div className="min-h-screen">
      {/* Breadcrumb + Header */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-900">Accueil</Link>
            <ChevronRight size={14} />
            <span className="text-slate-900 font-medium">{category.name}</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-slate-500 mt-2 max-w-2xl">{category.description}</p>
          )}
        </div>
      </div>

      {/* Sous-catégories (onglets) */}
      {subcategories && subcategories.length > 0 && (
        <div className="border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto">
              {subcategories.map((sub: any) => (
                <Link
                  key={sub.id}
                  href={`/c/${sub.slug}`}
                  className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-900 whitespace-nowrap"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grille produits */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">
            {productCards.length} produit{productCards.length !== 1 ? 's' : ''}
          </p>
          <button className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50">
            <SlidersHorizontal size={14} /> Filtres
          </button>
        </div>

        {productCards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500">
              Aucun produit dans cette catégorie pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {productCards.map((p) => (
              <Link key={p.id} href={`/p/${p.slug}`} className="group block">
                <div className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden mb-3">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                      Pas d'image
                    </div>
                  )}

                  {/* Bouton favori (apparaît au hover) */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FavoriteButton
                      product={{
                        id: p.id,
                        slug: p.slug,
                        name: p.name,
                        brandName: p.brand?.name || null,
                        imageUrl: p.image,
                        priceEur: p.price,
                      }}
                    />
                  </div>
                </div>

                {p.brand?.name && (
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                    {p.brand.name}
                  </p>
                )}
                <h3 className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:underline">
                  {p.name}
                </h3>
                                <ProductPrice
                  priceEur={p.price}
                  className="text-sm font-bold text-slate-900 mt-1 block"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}