import { useState } from 'react';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown,
  X,
  Truck,
  Clock,
  Package,
  Smile,
  Meh,
  Frown,
  CheckCircle
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';

// Pre-defined feedback tags
const RESTAURANT_TAGS = {
  positive: [
    { id: 'quality', label: 'Bonne qualité', icon: '🍽️' },
    { id: 'quantity', label: 'Quantité généreuse', icon: '📦' },
    { id: 'fast', label: 'Rapide', icon: '⚡' },
    { id: 'packaging', label: 'Bon emballage', icon: '📦' },
    { id: 'fresh', label: 'Frais', icon: '🌿' },
  ],
  negative: [
    { id: 'cold', label: 'Froid', icon: '❄️' },
    { id: 'missing', label: 'Article manquant', icon: '❌' },
    { id: 'wrong', label: 'Mauvaise commande', icon: '🔄' },
    { id: 'late_prep', label: 'Préparation lente', icon: '🐢' },
    { id: 'taste', label: 'Goût décevant', icon: '😕' },
  ],
};

const DRIVER_TAGS = {
  positive: [
    { id: 'polite', label: 'Poli', icon: '😊' },
    { id: 'fast_delivery', label: 'Livraison rapide', icon: '⚡' },
    { id: 'careful', label: 'Soigneux', icon: '🤲' },
    { id: 'communication', label: 'Bonne communication', icon: '💬' },
  ],
  negative: [
    { id: 'rude', label: 'Impoli', icon: '😤' },
    { id: 'late', label: 'En retard', icon: '⏰' },
    { id: 'damaged', label: 'Commande abîmée', icon: '💥' },
    { id: 'wrong_address', label: 'Problème d\'adresse', icon: '📍' },
  ],
};

// Star rating input component
function StarRating({ rating, onRatingChange, size = 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRatingChange(star)}
          className="p-1 transition-transform active:scale-110"
          data-testid={`star-${star}`}
        >
          <Star 
            className={`${sizeClasses[size]} transition-colors ${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// Rating label based on score
function RatingLabel({ rating }) {
  const labels = {
    0: { text: 'Touchez pour noter', color: 'text-gray-400' },
    1: { text: 'Très mauvais', color: 'text-red-500' },
    2: { text: 'Mauvais', color: 'text-orange-500' },
    3: { text: 'Moyen', color: 'text-yellow-600' },
    4: { text: 'Bien', color: 'text-green-500' },
    5: { text: 'Excellent !', color: 'text-green-600 font-semibold' },
  };

  const { text, color } = labels[rating] || labels[0];
  return <p className={`text-center mt-2 ${color}`}>{text}</p>;
}

// Feedback tags selection
function FeedbackTags({ tags, selectedTags, onToggle, type }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => onToggle(tag.id)}
            className={`px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
              isSelected
                ? type === 'positive' 
                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                  : 'bg-red-100 text-red-700 border-2 border-red-500'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent'
            }`}
            data-testid={`tag-${tag.id}`}
          >
            <span>{tag.icon}</span>
            <span>{tag.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Complete Rating Sheet for post-order feedback
export function RatingSheet({ 
  isOpen, 
  onClose, 
  order,
  onSubmit 
}) {
  const [step, setStep] = useState('restaurant'); // 'restaurant', 'driver', 'thanks'
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [restaurantTags, setRestaurantTags] = useState([]);
  const [driverTags, setDriverTags] = useState([]);
  const [comment, setComment] = useState('');

  const toggleTag = (tagId, isRestaurant = true) => {
    if (isRestaurant) {
      setRestaurantTags(prev => 
        prev.includes(tagId) 
          ? prev.filter(t => t !== tagId) 
          : [...prev, tagId]
      );
    } else {
      setDriverTags(prev => 
        prev.includes(tagId) 
          ? prev.filter(t => t !== tagId) 
          : [...prev, tagId]
      );
    }
  };

  const handleContinue = () => {
    if (step === 'restaurant' && order?.driver) {
      setStep('driver');
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const feedback = {
      orderId: order?.id,
      restaurantId: order?.restaurant?.id,
      driverId: order?.driver?.id,
      restaurantRating,
      driverRating,
      restaurantTags,
      driverTags,
      comment,
      submittedAt: new Date().toISOString(),
    };
    
    console.log('Rating submitted:', feedback);
    setStep('thanks');
    
    setTimeout(() => {
      if (onSubmit) onSubmit(feedback);
      onClose();
      // Reset state
      setStep('restaurant');
      setRestaurantRating(0);
      setDriverRating(0);
      setRestaurantTags([]);
      setDriverTags([]);
      setComment('');
    }, 2000);
  };

  const currentTags = step === 'restaurant' 
    ? (restaurantRating >= 4 ? RESTAURANT_TAGS.positive : RESTAURANT_TAGS.negative)
    : (driverRating >= 4 ? DRIVER_TAGS.positive : DRIVER_TAGS.negative);

  const currentRating = step === 'restaurant' ? restaurantRating : driverRating;
  const setCurrentRating = step === 'restaurant' ? setRestaurantRating : setDriverRating;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'thanks' 
          ? 'Merci !' 
          : step === 'restaurant' 
            ? 'Notez le restaurant' 
            : 'Notez le livreur'
      }
    >
      <div className="py-4">
        {step === 'thanks' ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Merci pour votre avis !</h3>
            <p className="text-gray-500">Votre retour nous aide à améliorer le service.</p>
          </div>
        ) : (
          <>
            {/* Entity info */}
            <div className="flex flex-col items-center mb-6">
              {step === 'restaurant' ? (
                <>
                  <img 
                    src={order?.restaurant?.image || 'https://via.placeholder.com/80'}
                    alt={order?.restaurant?.name}
                    className="w-20 h-20 rounded-2xl object-cover mb-3"
                  />
                  <h3 className="font-semibold text-gray-900">{order?.restaurant?.name}</h3>
                </>
              ) : (
                <>
                  <img 
                    src={order?.driver?.photo || 'https://via.placeholder.com/80'}
                    alt={order?.driver?.name}
                    className="w-20 h-20 rounded-full object-cover mb-3 border-4 border-[#FF5A00]"
                  />
                  <h3 className="font-semibold text-gray-900">{order?.driver?.name}</h3>
                  <p className="text-sm text-gray-500">{order?.driver?.vehicle}</p>
                </>
              )}
            </div>

            {/* Star Rating */}
            <StarRating 
              rating={currentRating} 
              onRatingChange={setCurrentRating}
            />
            <RatingLabel rating={currentRating} />

            {/* Feedback Tags */}
            {currentRating > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 text-center mb-3">
                  {currentRating >= 4 ? 'Qu\'avez-vous apprécié ?' : 'Qu\'est-ce qui n\'allait pas ?'}
                </p>
                <FeedbackTags
                  tags={currentTags}
                  selectedTags={step === 'restaurant' ? restaurantTags : driverTags}
                  onToggle={(tagId) => toggleTag(tagId, step === 'restaurant')}
                  type={currentRating >= 4 ? 'positive' : 'negative'}
                />
              </div>
            )}

            {/* Comment (optional) */}
            {currentRating > 0 && step === 'driver' && (
              <div className="mt-6">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ajouter un commentaire (optionnel)"
                  className="w-full bg-gray-100 rounded-2xl p-4 text-gray-900 resize-none outline-none focus:ring-2 focus:ring-[#FF5A00]"
                  rows={3}
                  data-testid="rating-comment"
                />
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleContinue}
                disabled={currentRating === 0}
                className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
                  currentRating > 0 
                    ? 'bg-[#FF5A00] text-white' 
                    : 'bg-gray-200 text-gray-400'
                }`}
                data-testid="rating-continue-btn"
              >
                {step === 'restaurant' && order?.driver ? 'Continuer' : 'Envoyer'}
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-3 text-gray-500 font-medium"
              >
                Plus tard
              </button>
            </div>

            {/* Progress dots */}
            {order?.driver && (
              <div className="flex justify-center gap-2 mt-4">
                <div className={`w-2 h-2 rounded-full ${step === 'restaurant' ? 'bg-[#FF5A00]' : 'bg-gray-300'}`} />
                <div className={`w-2 h-2 rounded-full ${step === 'driver' ? 'bg-[#FF5A00]' : 'bg-gray-300'}`} />
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

// Simple inline rating display
export function RatingDisplay({ rating, count, size = 'sm' }) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
      <Star className={`${iconSizes[size]} text-yellow-400 fill-yellow-400`} />
      <span className="font-medium text-gray-700">{rating.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-gray-400">({count})</span>
      )}
    </div>
  );
}

// Quick rating prompt that appears after delivery
export function QuickRatingPrompt({ order, onRate, onDismiss }) {
  const [rating, setRating] = useState(0);

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl p-4 shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img 
              src={order?.restaurant?.image}
              alt=""
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Comment était votre commande ?</p>
              <p className="text-xs text-gray-500">{order?.restaurant?.name}</p>
            </div>
          </div>
          <button onClick={onDismiss} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => {
                setRating(star);
                setTimeout(() => onRate(star), 300);
              }}
              className="p-1"
            >
              <Star 
                className={`w-8 h-8 transition-all ${
                  star <= rating 
                    ? 'text-yellow-400 fill-yellow-400 scale-110' 
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
