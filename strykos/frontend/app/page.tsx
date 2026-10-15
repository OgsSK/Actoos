import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Truck,
  RotateCcw,
  CreditCard,
  FileText,
  Barcode,
  Scale,
  Camera,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { first, asArray } from '@/lib/supabase/helpers';
import ProductCard from './components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();

  // ==================== FETCH ====================

  // Catégories principales
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name, description, image_url')
    .is('parent_id', null)
    .eq('is_active', true)
    .order('order_index')
    .limit(4);

  // Sous-catégories populaires
  const { data: subcategories } = await supabase
    .from('categories')
    .select('id, slug, name, image_url, parent:categories!parent_id(slug)')
    .not('parent_id', 'is', null)
    .eq('is_active', true)
    .order('order_index')
    .limit(6);

  // Marques
  const { data: brands } = await supabase
    .from('brands')
    .select('id, slug, name, logo_url')
    .eq('is_active', true)
    .order('name')
    .limit(8);

  // Nouveautés
  const { data: newProducts } = await supabase
    .from('products')
    .select(`
      id, slug, name, short_description, created_at,
      brand:brands(id, slug, name),
      variants:product_variants(price_eur, is_active),
      media:product_media(url, is_primary, order_index)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8);

  // Meilleures ventes (approximation : les plus anciens)
  const { data: bestSellers } = await supabase
    .from('products')
    .select(`
      id, slug, name, short_description, created_at,
      brand:brands(id, slug, name),
      variants:product_variants(price_eur, is_active),
      media:product_media(url, is_primary, order_index)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(8);

  // Helper pour normaliser un produit
  const normalizeProduct = (p: any, badge?: string) => {
    const media = asArray(p.media);
    const variants = asArray(p.variants);
    const brand = first(p.brand) as any;

    const primaryMedia = media.find((m: any) => m.is_primary) || media[0] || null;
    const activeVariants = variants.filter((v: any) => v.is_active);
    const minPrice =
      activeVariants.length > 0
        ? Math.min(...activeVariants.map((v: any) => v.price_eur || 0))
        : 0;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brandName: brand?.name || null,
      imageUrl: primaryMedia?.url || null,
      priceEur: minPrice,
      badge,
    };
  };

  const newProductsCards = (newProducts || []).map((p: any) =>
    normalizeProduct(p, 'Nouveau')
  );
  const bestSellersCards = (bestSellers || []).map((p: any) => normalizeProduct(p));

  // ==================== RENDER ====================

  return (
    <div className="bg-white">

      {/* 1. HERO */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        <div className="relative min-h-[500px] sm:min-h-[600px] lg:min-h-[700px] flex items-center">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div
            aria-hidden
            className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0) 70%)',
            }}
          />

          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-bold mb-5">
                Nouvelle collection 2026
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[1.02] mb-6">
                Les maillots qui font la différence.
              </h1>
              <p className="text-base sm:text-lg text-white/80 leading-relaxed mb-8 max-w-[52ch]">
                Authenticité vérifiée. Toutes les marques, la même exigence de provenance.
                Nike, adidas, PUMA — et plus encore.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/c/maillots"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
                >
                  Découvrir la collection
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>
                <Link
                  href="/c/chaussures"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-bold hover:bg-white/20 transition-colors"
                >
                  Voir les chaussures
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BANDEAU CONFIANCE */}
      <section className="border-b border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 lg:gap-0 lg:divide-x lg:divide-slate-100">
            {[
              { icon: Shield, title: 'Authenticité vérifiée', desc: 'Provenance documentée' },
              { icon: Truck, title: 'Livraison rapide', desc: 'Belgique & Mali' },
              { icon: RotateCcw, title: 'Retours 14 jours', desc: 'Satisfait ou remboursé' },
              { icon: CreditCard, title: 'Paiement sécurisé', desc: 'Stripe · Cartes bancaires' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="group flex items-center gap-3 lg:gap-4 px-2 lg:px-6"
                >
                  <div className="w-11 h-11 rounded-full border border-emerald-100 bg-emerald-50/60 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all duration-300">
                    <Icon
                      size={18}
                      className="text-emerald-600 group-hover:text-white transition-colors"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. CATÉGORIES PRINCIPALES */}
      {categories && categories.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-2">
                  Boutique
                </p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Parcourir par catégorie
                </h2>
              </div>
              <Link
                href="/c/maillots"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-emerald-600"
              >
                Tout voir <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {categories.map((cat: any) => (
                <Link
                  key={cat.id}
                  href={`/c/${cat.slug}`}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100"
                >
                  {cat.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <h3 className="text-white font-bold text-base sm:text-lg">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-white/70 text-xs mt-0.5 line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. NOUVEAUTÉS */}
      {newProductsCards.length > 0 && (
        <section className="py-12 sm:py-16 bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-2">
                  Nouveautés
                </p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Derniers arrivages
                </h2>
              </div>
              <Link
                href="/search?q="
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-emerald-600"
              >
                Tout voir <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {newProductsCards.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. SOUS-CATÉGORIES POPULAIRES */}
      {subcategories && subcategories.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-2">
                Sélection
              </p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Parcourez nos univers
              </h2>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {subcategories.map((sub: any) => (
                <Link
                  key={sub.id}
                  href={`/c/${sub.slug}`}
                  className="group flex flex-col items-center text-center p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-slate-100 mb-3 overflow-hidden">
                    {sub.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sub.image_url}
                        alt={sub.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-slate-100" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-emerald-600 line-clamp-2">
                    {sub.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. MEILLEURES VENTES */}
      {bestSellersCards.length > 0 && (
        <section className="py-12 sm:py-16 bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-2">
                  Populaire
                </p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Meilleures ventes
                </h2>
              </div>
              <Link
                href="/search?q="
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-emerald-600"
              >
                Tout voir <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {bestSellersCards.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. MARQUES */}
      {brands && brands.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-2">
                Marques disponibles
              </p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Toutes traitées avec la même exigence
              </h2>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-4 sm:gap-6">
              {brands.map((brand: any) => (
                <Link
                  key={brand.id}
                  href={`/brand/${brand.slug}`}
                  className="group flex items-center justify-center aspect-square rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all p-3"
                >
                  {brand.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all"
                    />
                  ) : (
                    <span className="text-sm font-black text-slate-400 group-hover:text-slate-900 transition-colors">
                      {brand.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. ÉDITORIAL — "Notre engagement" */}
      <section className="py-16 sm:py-24 bg-slate-900 text-white relative overflow-hidden">
        {/* Motif de fond */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '56px 56px',
          }}
        />
        <div
          aria-hidden
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0) 70%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Colonne gauche — texte */}
            <div className="lg:col-span-5">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-bold mb-4">
                Notre engagement
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-6">
                Aucune marque n'est mise en avant pour son origine.
              </h2>
              <p className="text-white/70 leading-relaxed mb-8 text-base">
                STRYKOS est une boutique indépendante. Chaque produit passe par le même
                contrôle : provenance documentée, droits visuels validés, photos vérifiées.
              </p>
              <Link
                href="/authenticite"
                className="group inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-semibold text-sm transition-colors"
              >
                Découvrir notre processus
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>

            {/* Colonne droite — 4 cartes */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  num: '01',
                  icon: FileText,
                  title: 'Facture fournisseur',
                  desc: 'Chaque lot acheté est tracé et archivé.',
                },
                {
                  num: '02',
                  icon: Barcode,
                  title: 'Code produit vérifié',
                  desc: 'Contrôle à réception, produit par produit.',
                },
                {
                  num: '03',
                  icon: Scale,
                  title: 'Droits visuels validés',
                  desc: 'Accord écrit avec les marques distribuées.',
                },
                {
                  num: '04',
                  icon: Camera,
                  title: 'Photos authentiques',
                  desc: 'Nos propres photos, jamais de catalogue.',
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] hover:border-emerald-400/40 transition-all duration-300"
                  >
                    {/* Numéro en filigrane */}
                    <span
                      className="absolute top-4 right-5 text-5xl font-black text-white/[0.06] leading-none select-none"
                      aria-hidden
                    >
                      {item.num}
                    </span>

                    {/* Icône */}
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all duration-300">
                      <Icon
                        size={20}
                        className="text-emerald-400 group-hover:text-white transition-colors"
                      />
                    </div>

                    {/* Texte */}
                    <h3 className="font-bold text-base text-white mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 9. NEWSLETTER */}
      <section className="py-14 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
            Restez informé des nouveautés
          </h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Nouvelles collections, promos exclusives. Pas de spam, désinscription en 1 clic.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="votre@email.com"
              className="flex-1 border border-slate-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
            <button
              type="submit"
              className="bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              S'inscrire
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}