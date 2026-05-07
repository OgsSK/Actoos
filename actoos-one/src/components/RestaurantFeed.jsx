import { RestaurantCard, RestaurantCardSkeleton } from './RestaurantCard';

export function RestaurantFeed({ restaurants, isLoading, onRestaurantClick }) {
  if (isLoading) {
    return (
      <div className="px-4 md:px-6 lg:px-10 pb-24 md:pb-12" data-testid="restaurant-feed-loading">
        <div className="restaurant-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="px-4 py-12 text-center" data-testid="restaurant-feed-empty">
        <p className="text-gray-400">Aucun restaurant trouvé</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 lg:px-10 pb-24 md:pb-12" data-testid="restaurant-feed">
      <div className="restaurant-grid">
        {restaurants.map((restaurant, index) => (
          <div
            key={restaurant.id}
            className="fade-in restaurant-card"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <RestaurantCard
              restaurant={restaurant}
              onClick={onRestaurantClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
