/**
 * ACTOOS ONE - Dynamic Promo Banner
 * 
 * Affiche les promotions depuis Supabase.
 * Fallback sur données locales si Supabase non disponible.
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Zap, Gift, Clock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getFeaturedPromotions as getMockFeaturedPromotions, getActiveFlashDeals as getMockFlashDeals } from '../data/promotionsData';

export function PromoBanner({ onPromoClick }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [promos, setPromos] = useState([]);
  const [flashDeals, setFlashDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les promotions depuis Supabase
  useEffect(() => {
    const loadPromotions = async () => {
      setIsLoading(true);
      
      if (!isSupabaseConfigured()) {
        // Fallback sur données mock
        console.log('[PromoBanner] Supabase non configuré, utilisation des données mock');
        setPromos(getMockFeaturedPromotions());
        setFlashDeals(getMockFlashDeals());
        setIsLoading(false);
        return;
      }

      try {
        // Charger les promos featured depuis Supabase
        const { data: promoData, error: promoError } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (promoError) {
          console.log('[PromoBanner] Erreur Supabase, fallback mock:', promoError.message);
          setPromos(getMockFeaturedPromotions());
        } else if (promoData && promoData.length > 0) {
          // Mapper les données Supabase vers le format attendu
          const mappedPromos = promoData.map(p => ({
            id: p.id,
            title: p.description || `Code: ${p.code}`,
            description: getPromoDescription(p),
            code: p.code,
            type: p.discount_type === 'percentage' ? 'percentage' : 
                  p.discount_type === 'free_delivery' ? 'free_delivery' : 'fixed_amount',
            discount_value: p.discount_value,
            discount_type: p.discount_type,
            min_order: p.min_order_amount,
            image: getPromoImage(p.discount_type),
            is_featured: true,
          }));
          setPromos(mappedPromos);
          console.log('✅ Promos chargées depuis Supabase:', mappedPromos.length);
        } else {
          // Aucune promo en base, utiliser mock
          setPromos(getMockFeaturedPromotions());
        }

        // Charger les flash deals (promos avec date limite proche)
        const now = new Date().toISOString();
        const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        
        const { data: flashData } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('is_active', true)
          .gte('valid_until', now)
          .lte('valid_until', twoHoursLater)
          .limit(3);

        if (flashData && flashData.length > 0) {
          const mappedFlash = flashData.map(f => ({
            id: f.id,
            title: `Flash Deal - ${f.discount_type === 'percentage' ? f.discount_value + '%' : f.discount_value + ' FCFA'}`,
            description: f.description || 'Offre limitée !',
            remaining_uses: f.usage_limit ? f.usage_limit - (f.usage_count || 0) : 99,
          }));
          setFlashDeals(mappedFlash);
        } else {
          // Pas de flash deals actifs en base
          setFlashDeals([]);
        }

      } catch (err) {
        console.error('[PromoBanner] Erreur:', err);
        setPromos(getMockFeaturedPromotions());
        setFlashDeals(getMockFlashDeals());
      } finally {
        setIsLoading(false);
      }
    };

    loadPromotions();
    
    // Rafraîchir périodiquement
    const interval = setInterval(loadPromotions, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-slide
  useEffect(() => {
    if (promos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [promos.length]);

  const goToSlide = (index) => setCurrentSlide(index);

  if (isLoading || promos.length === 0) return null;

  return (
    <div className="px-4 md:px-8 mb-4">
      {/* Flash Deal Alert */}
      {flashDeals.length > 0 && (
        <div className="mb-3 bg-red-500 text-white rounded-2xl p-3 flex items-center gap-3 animate-pulse">
          <Zap className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">{flashDeals[0].title}</p>
            <p className="text-xs text-white/80">{flashDeals[0].description}</p>
          </div>
          <div className="bg-white/20 rounded-lg px-2 py-1">
            <p className="text-xs font-bold">{flashDeals[0].remaining_uses} restants</p>
          </div>
        </div>
      )}

      {/* Promo Carousel */}
      <div className="relative overflow-hidden rounded-2xl">
        <div 
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {promos.map((promo) => (
            <div
              key={promo.id}
              className="w-full flex-shrink-0"
              onClick={() => onPromoClick?.(promo)}
            >
              <div 
                className="relative h-36 rounded-2xl overflow-hidden"
                style={{
                  background: promo.image 
                    ? `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.3)), url(${promo.image}) center/cover`
                    : 'linear-gradient(135deg, #FF5A00 0%, #FF8A00 100%)',
                }}
              >
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div>
                    {promo.type === 'first_order' && (
                      <div className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-1 mb-2">
                        <Gift className="w-3 h-3 text-white" />
                        <span className="text-xs text-white font-medium">Nouveaux clients</span>
                      </div>
                    )}
                    <h3 className="text-white text-xl font-bold">{promo.title}</h3>
                    <p className="text-white/80 text-sm mt-1">{promo.description}</p>
                  </div>
                  
                  {promo.code && (
                    <div className="flex items-center gap-2">
                      <div className="bg-white rounded-lg px-3 py-1.5">
                        <span className="text-[#FF5A00] font-bold text-sm">{promo.code}</span>
                      </div>
                      <span className="text-white/70 text-xs">Appliquer à la caisse</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        {promos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {promos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentSlide ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helpers
function getPromoDescription(promo) {
  if (promo.discount_type === 'percentage') {
    return `-${promo.discount_value}% sur votre commande`;
  } else if (promo.discount_type === 'free_delivery') {
    return 'Livraison gratuite !';
  } else {
    return `-${promo.discount_value?.toLocaleString()} FCFA de réduction`;
  }
}

function getPromoImage(discountType) {
  const images = {
    percentage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    free_delivery: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
    fixed: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
  };
  return images[discountType] || images.percentage;
}
