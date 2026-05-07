import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Zap, Gift, Clock } from 'lucide-react';
import { getFeaturedPromotions, getActiveFlashDeals } from '../data/promotionsData';

export function PromoBanner({ onPromoClick }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [flashDeals, setFlashDeals] = useState([]);
  const promos = getFeaturedPromotions();

  // Check for flash deals
  useEffect(() => {
    const checkFlashDeals = () => {
      setFlashDeals(getActiveFlashDeals());
    };
    checkFlashDeals();
    const interval = setInterval(checkFlashDeals, 60000); // Check every minute
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
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + promos.length) % promos.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % promos.length);

  if (promos.length === 0) return null;

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

        {/* Dots only - no arrows */}
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
