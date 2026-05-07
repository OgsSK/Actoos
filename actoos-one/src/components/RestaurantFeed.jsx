import { RestaurantCard, RestaurantCardSkeleton } from './RestaurantCard';

export function RestaurantFeed({ restaurants, isLoading, onRestaurantClick }) {
  if (isLoading) {
    return (
      <div className="px-4 pb-24 space-y-4" data-testid="restaurant-feed-loading">
        {[1, 2, 3].map((i) => (
          <RestaurantCardSkeleton key={i} />
        ))}
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
    <div className="px-4 pb-24 space-y-4" data-testid="restaurant-feed">
      {restaurants.map((restaurant, index) => (
        <div
          key={restaurant.id}
          className="fade-in"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <RestaurantCard
            restaurant={restaurant}
            onClick={onRestaurantClick}
          />
        </div>
      ))}
    </div>
  );
}
