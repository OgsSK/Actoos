import { useState } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  Star, 
  Clock, 
  MapPin,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

export function FavoritesScreen({ onBack, onSelectPartner }) {
  const { favorites, removeFavorite } = useFavorites();
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleRemove = (id) => {
    removeFavorite(id);
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="favorites-screen">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          data-testid="favorites-back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Mes Favoris</h1>
          <p className="text-sm text-gray-500">
            {favorites.length} établissement{favorites.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Favorites List */}
      <div className="p-4 space-y-3">
        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Aucun favori</p>
            <p className="text-sm text-gray-400 mt-1">
              Ajoutez vos restaurants préférés ici
            </p>
          </div>
        ) : (
          favorites.map((partner) => (
            <div
              key={partner.id}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100"
            >
              <button
                onClick={() => onSelectPartner && onSelectPartner(partner)}
                className="w-full p-4 flex items-center gap-4 active:bg-gray-50"
                data-testid={`favorite-${partner.id}`}
              >
                {/* Image */}
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <img 
                    src={partner.image} 
                    alt={partner.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-semibold text-gray-900 truncate">{partner.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{partner.cuisine}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">{partner.rating}</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>

              {/* Remove button */}
              <div className="px-4 pb-4 flex justify-end">
                {confirmDelete === partner.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Supprimer ?</span>
                    <button
                      onClick={() => handleRemove(partner.id)}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg"
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(partner.id)}
                    className="flex items-center gap-1.5 text-red-500 text-sm font-medium"
                    data-testid={`remove-favorite-${partner.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Retirer
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
