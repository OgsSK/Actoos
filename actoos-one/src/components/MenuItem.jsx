import { systemConfig } from '../data/mockData';

export function MenuItem({ item, onClick }) {
  const isAvailable = item.is_available;

  return (
    <button
      onClick={() => isAvailable && onClick()}
      disabled={!isAvailable}
      className={`w-full bg-white rounded-2xl p-3 flex gap-3 border transition-all ${
        isAvailable
          ? 'border-gray-100 shadow-sm active:scale-[0.98] active:shadow-none'
          : 'border-gray-200 opacity-60 cursor-not-allowed'
      }`}
      data-testid={`menu-item-${item.id}`}
    >
      {/* Image */}
      <div className="relative w-24 h-24 flex-shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className={`w-full h-full object-cover rounded-xl ${!isAvailable ? 'grayscale' : ''}`}
        />
        {/* Badge Rupture */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
            <span className="bg-danger text-white text-[10px] font-semibold px-2 py-1 rounded-full">
              Rupture
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-left flex flex-col justify-between py-0.5">
        <div>
          <h3 className={`font-semibold ${isAvailable ? 'text-gray-900' : 'text-gray-500'}`}>
            {item.name}
          </h3>
          <p className={`text-xs mt-0.5 line-clamp-2 ${isAvailable ? 'text-gray-500' : 'text-gray-400'}`}>
            {item.description}
          </p>
        </div>
        <p className={`font-semibold ${isAvailable ? 'text-primary' : 'text-gray-400'}`}>
          {item.price.toLocaleString()} {systemConfig.currency}
        </p>
      </div>
    </button>
  );
}
