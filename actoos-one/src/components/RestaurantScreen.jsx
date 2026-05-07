import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Star, Clock, Bike, ShoppingBag, Moon, Calendar } from 'lucide-react';
import { MenuItem } from './MenuItem';
import { AddToCartSheet } from './AddToCartSheet';
import { useCart } from '../context/CartContext';
import { systemConfig } from '../data/mockData';
import { isRestaurantOpen, getNextOpeningTime } from './TimeSlotPicker';

export function RestaurantScreen({ restaurant, onBack, onCheckout }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const { getItemCount, getTotal } = useCart();
  
  // Refs for category sections and nav
  const categoryRefs = useRef({});
  const navRef = useRef(null);
  const containerRef = useRef(null);

  const itemCount = getItemCount();
  const total = getTotal();

  // Vérifier si le restaurant est ouvert
  const actuallyOpen = restaurant?.openingHours 
    ? isRestaurantOpen(restaurant.openingHours) 
    : restaurant?.isOpen;
  
  // Obtenir le prochain horaire d'ouverture si fermé
  const nextOpening = !actuallyOpen && restaurant?.openingHours 
    ? getNextOpeningTime(restaurant.openingHours) 
    : null;
  
  // Peut-on commander même fermé ?
  const canOrderWhenClosed = restaurant?.acceptOrdersWhenClosed && !actuallyOpen;

  // Set first category as active on mount
  useEffect(() => {
    if (restaurant?.categories?.length > 0 && !activeCategory) {
      setActiveCategory(restaurant.categories[0].id);
    }
  }, [restaurant, activeCategory]);

  // Handle scroll to detect active category
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const navHeight = navRef.current?.offsetHeight || 0;
      const headerOffset = 200 + navHeight; // Image height + nav height
      
      // Find which category is currently in view
      for (const category of restaurant?.categories || []) {
        const element = categoryRefs.current[category.id];
        if (element) {
          const rect = element.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top;
          
          if (relativeTop <= headerOffset + 50 && relativeTop > -rect.height + 100) {
            setActiveCategory(category.id);
            break;
          }
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [restaurant]);

  // Scroll to category when nav item is clicked
  const scrollToCategory = (categoryId) => {
    const element = categoryRefs.current[categoryId];
    if (element && containerRef.current) {
      const navHeight = navRef.current?.offsetHeight || 0;
      const elementTop = element.offsetTop;
      
      containerRef.current.scrollTo({
        top: elementTop - navHeight - 200, // Account for header image + nav
        behavior: 'smooth'
      });
      setActiveCategory(categoryId);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gray-50 pb-32 overflow-y-auto" 
      data-testid="restaurant-screen"
    >
      {/* Header avec image */}
      <div className="relative">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Bouton retour */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>

        {/* Info restaurant */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white" data-testid="restaurant-title">
            {restaurant.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-white/90 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>{restaurant.rating}</span>
            </div>
            <span>•</span>
            <span>{restaurant.cuisine}</span>
          </div>
        </div>
      </div>

      {/* Info livraison */}
      <div className="bg-white px-4 py-3 flex items-center gap-4 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-primary" />
          <span>{restaurant.deliveryTime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Bike className="w-4 h-4 text-primary" />
          <span>{restaurant.deliveryFee} {systemConfig.currency} livraison</span>
        </div>
      </div>

      {/* Banner Fermé - si restaurant fermé */}
      {!actuallyOpen && (
        <div className={`px-4 py-4 ${canOrderWhenClosed ? 'bg-[#FF5A00]/10' : 'bg-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              canOrderWhenClosed ? 'bg-[#FF5A00]/20' : 'bg-gray-200'
            }`}>
              <Moon className={`w-6 h-6 ${canOrderWhenClosed ? 'text-[#FF5A00]' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${canOrderWhenClosed ? 'text-gray-900' : 'text-gray-700'}`}>
                Fermé actuellement
              </p>
              {nextOpening && (
                <p className="text-sm text-gray-500">
                  Ouvre {nextOpening.dayLabel} à {nextOpening.time}
                </p>
              )}
            </div>
            {canOrderWhenClosed && nextOpening && (
              <button
                onClick={() => {
                  // L'utilisateur peut toujours ajouter au panier
                  // Le checkout gérera la programmation
                }}
                className="px-4 py-2 bg-[#FF5A00] text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                data-testid="order-when-closed-btn"
              >
                <Calendar className="w-4 h-4" />
                Commander
              </button>
            )}
          </div>
          {canOrderWhenClosed && (
            <p className="text-xs text-[#FF5A00] mt-2">
              Vous pouvez commander maintenant pour {nextOpening?.dayLabel || 'plus tard'}
            </p>
          )}
        </div>
      )}

      {/* Category Navigation Bar - Sticky */}
      <div 
        ref={navRef}
        className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm"
      >
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
          {restaurant.categories.map((category) => (
            <button
              key={category.id}
              onClick={() => scrollToCategory(category.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === category.id
                  ? 'bg-[#FF5A00] text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
              data-testid={`nav-category-${category.id}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu par catégories */}
      <div className="px-4 py-4">
        {restaurant.categories.map((category) => (
          <div 
            key={category.id} 
            ref={(el) => categoryRefs.current[category.id] = el}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3" data-testid={`category-${category.id}`}>
              {category.name}
            </h2>
            <div className="space-y-3">
              {category.items.map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sheet ajout panier */}
      <AddToCartSheet
        isOpen={!!selectedItem}
        item={selectedItem}
        restaurant={restaurant}
        onClose={() => setSelectedItem(null)}
      />

      {/* Barre panier fixe */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg" data-testid="cart-bar">
          <button
            onClick={onCheckout}
            className="w-full bg-primary text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-between active:bg-primary/90 transition-colors"
            data-testid="view-cart-btn"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>{itemCount} article{itemCount > 1 ? 's' : ''}</span>
            </div>
            <span className="text-lg">{total.toLocaleString()} {systemConfig.currency}</span>
          </button>
        </div>
      )}
    </div>
  );
}
