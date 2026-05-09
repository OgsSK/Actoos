import { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Phone,
  Truck,
  FileText,
  Plus,
  Minus,
  ShoppingCart,
  AlertCircle,
  Pill
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { OrdonnanceUploadSheet } from './OrdonnanceUploadSheet';
import { BottomSheet } from './BottomSheet';
import { systemConfig } from '../data/mockData';

export function PharmacyScreen({ pharmacy, onBack, onCheckout }) {
  const { cartItems, addToCart, updateQuantity, removeFromCart, getTotal } = useCart();
  const [showOrdonnance, setShowOrdonnance] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showPrescriptionWarning, setShowPrescriptionWarning] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  // Refs for category sections and nav
  const categoryRefs = useRef({});
  const navRef = useRef(null);
  const containerRef = useRef(null);

  const cartTotal = getTotal();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Set first category as active on mount
  useEffect(() => {
    if (pharmacy?.categories?.length > 0 && !activeCategory) {
      setActiveCategory(pharmacy.categories[0].id);
    }
  }, [pharmacy, activeCategory]);

  // Handle scroll to detect active category
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const navHeight = navRef.current?.offsetHeight || 0;
      const headerOffset = 300 + navHeight; // Image + info bar height + nav height
      
      for (const category of pharmacy?.categories || []) {
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
  }, [pharmacy]);

  // Scroll to category when nav item is clicked
  const scrollToCategory = (categoryId) => {
    const element = categoryRefs.current[categoryId];
    if (element && containerRef.current) {
      const navHeight = navRef.current?.offsetHeight || 0;
      const elementTop = element.offsetTop;
      
      containerRef.current.scrollTo({
        top: elementTop - navHeight - 250,
        behavior: 'smooth'
      });
      setActiveCategory(categoryId);
    }
  };

  const handleAddItem = (item) => {
    if (item.requires_prescription) {
      setShowPrescriptionWarning(true);
      return;
    }
    setSelectedItem(item);
    setQuantity(1);
  };

  const confirmAddToCart = () => {
    if (selectedItem) {
      addToCart({
        ...selectedItem,
        price_at_time: selectedItem.price,
        pharmacy_id: pharmacy.id,
        pharmacy_name: pharmacy.name,
      }, quantity);
      setSelectedItem(null);
    }
  };

  const handleOrdonnanceSuccess = () => {
    setShowOrdonnance(false);
    alert('✅ Ordonnance envoyée ! La pharmacie vous contactera sous peu.');
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gray-50 pb-32 overflow-y-auto" 
      data-testid="pharmacy-screen"
    >
      {/* Header Image */}
      <div className="relative h-48">
        <div
          className="w-full h-full bg-gray-300"
          style={{
            backgroundImage: `url(${pharmacy.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
          data-testid="pharmacy-back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{pharmacy.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-white/80 text-sm">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>{pharmacy.rating}</span>
            <span>•</span>
            <span>{pharmacy.distance}</span>
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{pharmacy.openHours}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="truncate max-w-[150px]">{pharmacy.address}</span>
            </div>
          </div>
          <a
            href={`tel:${pharmacy.phone}`}
            className="flex items-center gap-1 text-primary font-medium"
          >
            <Phone className="w-4 h-4" />
            Appeler
          </a>
        </div>

        {pharmacy.delivery_available && (
          <div className="flex items-center gap-2 mt-2 text-green-600 text-sm">
            <Truck className="w-4 h-4" />
            <span>Livraison: {pharmacy.deliveryTime} • {pharmacy.deliveryFee} FCFA</span>
          </div>
        )}
      </div>

      {/* Ordonnance Button */}
      {pharmacy.accepts_ordonnance && (
        <div className="px-4 py-3 bg-primary/5 border-b border-primary/10">
          <button
            onClick={() => setShowOrdonnance(true)}
            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 active:bg-primary/90 transition-colors"
            data-testid="upload-ordonnance-btn"
          >
            <FileText className="w-5 h-5" />
            Envoyer une ordonnance
          </button>
        </div>
      )}

      {/* Category Navigation Bar - Sticky */}
      {pharmacy.categories && pharmacy.categories.length > 0 && (
        <div 
          ref={navRef}
          className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm"
        >
          <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
            {pharmacy.categories.map((category) => (
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
      )}

      {/* Products */}
      <div className="p-4">
        {pharmacy.categories?.map((category) => (
          <div 
            key={category.id} 
            ref={(el) => categoryRefs.current[category.id] = el}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              {category.name}
            </h2>
            
            <div className="space-y-3">
              {category.items.map((item) => {
                const cartItem = cartItems.find(ci => ci.id === item.id);
                
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl p-4 flex gap-4 ${
                      !item.is_available ? 'opacity-50' : ''
                    }`}
                    data-testid={`product-${item.id}`}
                  >
                    <div
                      className="w-20 h-20 rounded-xl bg-gray-200 flex-shrink-0"
                      style={{
                        backgroundImage: `url(${item.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        
                        {item.requires_prescription && (
                          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                            Ordonnance
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-primary font-bold">
                          {item.price.toLocaleString()} {systemConfig.currency}
                        </span>
                        
                        {item.is_available ? (
                          cartItem ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (cartItem.quantity <= 1) {
                                    removeFromCart(item.id);
                                  } else {
                                    updateQuantity(item.id, cartItem.quantity - 1);
                                  }
                                }}
                                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                              >
                                <Minus className="w-4 h-4 text-gray-600" />
                              </button>
                              <span className="font-bold text-gray-900 w-6 text-center">
                                {cartItem.quantity}
                              </span>
                              <button
                                onClick={() => {
                                  if (cartItem.quantity < item.max_per_order) {
                                    updateQuantity(item.id, cartItem.quantity + 1);
                                  }
                                }}
                                disabled={cartItem.quantity >= item.max_per_order}
                                className="w-8 h-8 bg-primary rounded-full flex items-center justify-center disabled:opacity-50"
                              >
                                <Plus className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddItem(item)}
                              className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 active:bg-primary/90"
                            >
                              <Plus className="w-4 h-4" />
                              Ajouter
                            </button>
                          )
                        ) : (
                          <span className="text-gray-400 text-sm">Indisponible</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-30">
          <button
            onClick={onCheckout}
            className="w-full bg-primary text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 active:bg-primary/90 transition-colors"
            data-testid="pharmacy-checkout-btn"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Voir le panier</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">
              {cartTotal.toLocaleString()} {systemConfig.currency}
            </span>
          </button>
        </div>
      )}

      {/* Add to Cart Sheet */}
      <BottomSheet
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Ajouter au panier"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div
                className="w-24 h-24 rounded-xl bg-gray-200 flex-shrink-0"
                style={{
                  backgroundImage: `url(${selectedItem.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div>
                <h3 className="font-bold text-gray-900">{selectedItem.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedItem.description}</p>
                <p className="text-primary font-bold mt-2">
                  {selectedItem.price.toLocaleString()} {systemConfig.currency}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Quantité (max: {selectedItem.max_per_order})</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center"
                >
                  <Minus className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-2xl font-bold text-gray-900 w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(selectedItem.max_per_order, quantity + 1))}
                  className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <button
              onClick={confirmAddToCart}
              className="w-full bg-primary text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2"
              data-testid="confirm-add-product"
            >
              <span>Ajouter</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">
                {(selectedItem.price * quantity).toLocaleString()} {systemConfig.currency}
              </span>
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Prescription Warning Sheet */}
      <BottomSheet
        isOpen={showPrescriptionWarning}
        onClose={() => setShowPrescriptionWarning(false)}
        title="Ordonnance requise"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Ce médicament nécessite une ordonnance
          </h3>
          <p className="text-gray-500 mb-6">
            Pour commander ce produit, veuillez d'abord envoyer votre ordonnance à la pharmacie.
          </p>
          <button
            onClick={() => {
              setShowPrescriptionWarning(false);
              setShowOrdonnance(true);
            }}
            className="w-full bg-primary text-white font-semibold py-4 rounded-2xl"
          >
            Envoyer une ordonnance
          </button>
        </div>
      </BottomSheet>

      {/* Ordonnance Upload Sheet */}
      <OrdonnanceUploadSheet
        isOpen={showOrdonnance}
        onClose={() => setShowOrdonnance(false)}
        onSuccess={handleOrdonnanceSuccess}
        pharmacy={pharmacy}
      />
    </div>
  );
}
