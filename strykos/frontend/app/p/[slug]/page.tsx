import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Shield, Truck, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { first, asArray } from '@/lib/supabase/helpers';
import ProductDetail from './ProductDetail';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export default async function ProductPage({ params }: PageProps) {
  const supabase = await createClient();

  // Récupère le produit
  const { data: product } = await supabase
    .from('products')
    .select(`
      id, slug, name, short_description, description, product_type, surface, audience,
      brand:brands(id, slug, name),
      category:categories(id, slug, name),
      variants:product_variants(id, sku, size, color, price_eur, price_xof, is_active),
      media:product_media(id, url, alt, is_primary, order_index)
    `)
    .eq('slug', params.slug)
    .eq('status', 'active')
    .maybeSingle();

  if (!product) notFound();

  const brand = first(product.brand) as any;
  const category = first(product.category) as any;
  const variants = asArray(product.variants).filter((v: any) => v.is_active);
  const media = asArray(product.media).sort(
    (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  // Récupère le stock par variante
  const variantIds = variants.map((v: any) => v.id);
  const { data: inventory } = variantIds.length > 0
    ? await supabase
        .from('inventory')
        .select('variant_id, quantity, reserved')
        .in('variant_id', variantIds)
    : { data: [] };

  const stockByVariant = new Map<string, number>();
  (inventory || []).forEach((inv: any) => {
    const current = stockByVariant.get(inv.variant_id) || 0;
    stockByVariant.set(inv.variant_id, current + (inv.quantity - (inv.reserved || 0)));
  });

  const variantsWithStock = variants.map((v: any) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    price_eur: v.price_eur,
    price_xof: v.price_xof,
    stock: stockByVariant.get(v.id) || 0,
  }));

  // Prix mini pour affichage
  const minPrice = variantsWithStock.length > 0
    ? Math.min(...variantsWithStock.map(v => v.price_eur || 0))
    : 0;

  // Image principale
  const mainImage = media.find((m: any) => m.is_primary) || media[0];

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-900">Accueil</Link>
            <ChevronRight size={12} />
            {category && (
              <>
                <Link href={`/c/${category.slug}`} className="hover:text-slate-900">
                  {category.name}
                </Link>
                <ChevronRight size={12} />
              </>
            )}
            <span className="text-slate-900 font-medium truncate">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product detail (client component pour l'interaction panier + devise) */}
      <ProductDetail
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          shortDescription: product.short_description,
          description: product.description,
          productType: product.product_type,
          surface: product.surface,
          audience: product.audience,
          brand: brand ? { id: brand.id, slug: brand.slug, name: brand.name } : null,
          category: category ? { slug: category.slug, name: category.name } : null,
          variants: variantsWithStock,
          media: media.map((m: any) => ({
            id: m.id,
            url: m.url,
            alt: m.alt || product.name,
            isPrimary: m.is_primary,
          })),
          minPrice,
          mainImage: mainImage?.url || null,
        }}
      />

      {/* Trust bandeau */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Authenticité vérifiée</p>
              <p className="text-xs text-slate-500">Provenance documentée</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Truck size={20} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Livraison rapide</p>
              <p className="text-xs text-slate-500">Belgique & Mali</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RotateCcw size={20} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Retours 14 jours</p>
              <p className="text-xs text-slate-500">Satisfait ou remboursé</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}