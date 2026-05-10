import { useState } from 'react';
import { SlidersHorizontal, Star, Tag, ShoppingBag } from 'lucide-react';

// Filter options for sorting/filtering
const FILTER_OPTIONS = [
  { id: 'pickup', label: 'Pickup', icon: ShoppingBag },
  { id: 'offers', label: 'Offres', icon: Tag },
  { id: 'top_rated', label: 'Mieux notés', icon: Star },
];

export function CategoryFilter({ 
  categories, 
  activeCategory, 
  onCategoryChange,
  activeFilters = [],
  onFilterChange 
}) {
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterToggle = (filterId) => {
    if (onFilterChange) {
      const newFilters = activeFilters.includes(filterId)
        ? activeFilters.filter(f => f !== filterId)
        : [...activeFilters, filterId];
      onFilterChange(newFilters);
    }
  };

  return (
    <div className="bg-white" data-testid="category-filter">
      {/* Categories Row */}
      <div className="px-4 py-2">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-shrink-0 px-3 py-2 rounded-2xl text-sm font-medium transition-all flex items-center gap-1.5 border ${
              showFilters || activeFilters.length > 0
                ? 'bg-[#FF5A00] text-white border-[#FF5A00]'
                : 'bg-white text-gray-700 border-gray-200 active:bg-gray-100'
            }`}
            data-testid="filter-toggle"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilters.length > 0 && (
              <span className="w-5 h-5 bg-white text-[#FF5A00] rounded-full text-xs font-bold flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* Category Pills */}
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeCategory === category.id
                  ? 'bg-[#FF5A00] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
              data-testid={`category-${category.id}`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Options Row - Expandable */}
      {showFilters && (
        <div className="px-4 pb-3 border-t border-gray-100 pt-2">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {FILTER_OPTIONS.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilters.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  onClick={() => handleFilterToggle(filter.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
                    isActive
                      ? 'bg-[#FF5A00]/10 text-[#FF5A00] border-[#FF5A00]'
                      : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
                  }`}
                  data-testid={`filter-${filter.id}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
