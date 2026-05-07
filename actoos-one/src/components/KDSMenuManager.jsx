import { Minus, Plus, Check, X, AlertCircle } from 'lucide-react';

export function KDSMenuManager({ items, onToggleAvailability, onUpdateMaxPerOrder }) {
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4" data-testid="kds-menu-manager">
      <div className="mb-4">
        <h2 className="text-white font-bold text-xl">Gestion du Menu</h2>
        <p className="text-gray-400 text-sm mt-1">
          Activez/désactivez les articles et gérez les quantités maximales
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4">
          <p className="text-2xl font-bold text-green-400">
            {items.filter(i => i.is_available).length}
          </p>
          <p className="text-xs text-green-400">Articles disponibles</p>
        </div>
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
          <p className="text-2xl font-bold text-red-400">
            {items.filter(i => !i.is_available).length}
          </p>
          <p className="text-xs text-red-400">En rupture</p>
        </div>
      </div>

      {/* Liste par catégorie */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category}>
            <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wider mb-3">
              {category}
            </h3>
            <div className="space-y-3">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-gray-800 rounded-2xl p-4 border border-gray-700 ${
                    !item.is_available ? 'opacity-60' : ''
                  }`}
                  data-testid={`menu-item-row-${item.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">{item.name}</p>
                        {!item.is_available && (
                          <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Rupture
                          </span>
                        )}
                      </div>
                      <p className="text-[#FF5A00] font-medium text-sm mt-0.5">
                        {item.price.toLocaleString()} FCFA
                      </p>
                    </div>

                    <button
                      onClick={() => onToggleAvailability(item.id)}
                      className={`w-14 h-8 rounded-full flex items-center transition-colors ${
                        item.is_available ? 'bg-green-500 justify-end' : 'bg-gray-600 justify-start'
                      }`}
                      data-testid={`toggle-${item.id}`}
                    >
                      <div className="w-6 h-6 bg-white rounded-full mx-1 flex items-center justify-center shadow">
                        {item.is_available ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Max par commande</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateMaxPerOrder(item.id, item.max_per_order - 1)}
                          disabled={item.max_per_order <= 1}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            item.max_per_order <= 1
                              ? 'bg-gray-700 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                          }`}
                          data-testid={`max-minus-${item.id}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-white font-bold text-lg w-8 text-center">
                          {item.max_per_order}
                        </span>
                        <button
                          onClick={() => onUpdateMaxPerOrder(item.id, item.max_per_order + 1)}
                          className="w-8 h-8 rounded-lg bg-gray-700 text-gray-300 flex items-center justify-center active:bg-gray-600 transition-colors"
                          data-testid={`max-plus-${item.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
