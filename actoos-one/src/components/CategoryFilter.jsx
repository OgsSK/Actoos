export function CategoryFilter({ categories, activeCategory, onCategoryChange }) {
  return (
    <div className="px-4 py-3" data-testid="category-filter">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
              activeCategory === category.id
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-300 active:bg-gray-700'
            }`}
            data-testid={`category-${category.id}`}
          >
            <span className="mr-1.5">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
