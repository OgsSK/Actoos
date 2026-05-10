/**
 * ACTOOS ONE - Order Tracking Map
 * 
 * Carte en temps réel avec position du livreur.
 * Utilise Leaflet (gratuit, open source)
 */

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, Navigation, Clock } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const createIcon = (color, emoji) => L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: ${color};
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    ">${emoji}</div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const restaurantIcon = createIcon('#FF5A00', '🍽️');
const driverIcon = createIcon('#10B981', '🏍️');
const customerIcon = createIcon('#3B82F6', '📍');

// Component to auto-center map on driver
function MapUpdater({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  
  return null;
}

// Simulate driver movement along route
function useDriverSimulation(route, isActive) {
  const [position, setPosition] = useState(route?.[0] || null);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isActive || !route || route.length < 2) {
      if (route?.[0]) setPosition(route[0]);
      return;
    }

    // Simulate movement every 2 seconds
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 0.02; // 2% per update
        if (newProgress >= 1) {
          clearInterval(intervalRef.current);
          return 1;
        }
        
        // Calculate position along route
        const totalPoints = route.length;
        const exactIndex = newProgress * (totalPoints - 1);
        const index = Math.floor(exactIndex);
        const fraction = exactIndex - index;
        
        if (index >= totalPoints - 1) {
          setPosition(route[totalPoints - 1]);
        } else {
          const lat = route[index][0] + fraction * (route[index + 1][0] - route[index][0]);
          const lng = route[index][1] + fraction * (route[index + 1][1] - route[index][1]);
          setPosition([lat, lng]);
        }
        
        return newProgress;
      });
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [route, isActive]);

  return { position, progress };
}

export function OrderTrackingMap({ 
  order,
  driverPosition: externalDriverPosition,
  restaurantLocation,
  customerLocation,
  status,
  driver,
  estimatedTime,
  onCallDriver
}) {
  // Default locations (Bamako, Mali)
  const defaultCenter = [12.6392, -8.0029];
  
  // Use provided locations or defaults
  const restaurant = restaurantLocation || [12.6450, -8.0100];
  const customer = customerLocation || [12.6350, -7.9950];
  
  // Generate a simple route between restaurant and customer
  const generateRoute = () => {
    const steps = 10;
    const route = [];
    for (let i = 0; i <= steps; i++) {
      const lat = restaurant[0] + (customer[0] - restaurant[0]) * (i / steps);
      const lng = restaurant[1] + (customer[1] - restaurant[1]) * (i / steps);
      // Add some randomness for more realistic path
      const jitterLat = (Math.random() - 0.5) * 0.002;
      const jitterLng = (Math.random() - 0.5) * 0.002;
      route.push([lat + jitterLat, lng + jitterLng]);
    }
    return route;
  };

  const [route] = useState(generateRoute);
  
  // Simulate driver if no external position and driver is en route
  const isDriverEnRoute = ['picked_up', 'on_the_way'].includes(status);
  const { position: simulatedPosition, progress } = useDriverSimulation(
    route, 
    isDriverEnRoute && !externalDriverPosition
  );
  
  const driverPosition = externalDriverPosition || simulatedPosition;
  
  // Calculate ETA based on progress
  const remainingMinutes = estimatedTime 
    ? Math.round(estimatedTime * (1 - progress))
    : Math.round(15 * (1 - progress));

  // Determine map center based on status
  const getMapCenter = () => {
    if (driverPosition && isDriverEnRoute) return driverPosition;
    if (status === 'preparing' || status === 'ready') return restaurant;
    return customer;
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <MapContainer
        center={getMapCenter() || defaultCenter}
        zoom={15}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        
        <MapUpdater center={getMapCenter()} />
        
        {/* Restaurant Marker */}
        <Marker position={restaurant} icon={restaurantIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-bold">{order?.partners?.name || 'Restaurant'}</p>
              <p className="text-sm text-gray-500">Point de retrait</p>
            </div>
          </Popup>
        </Marker>
        
        {/* Customer Marker */}
        <Marker position={customer} icon={customerIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-bold">Votre adresse</p>
              <p className="text-sm text-gray-500">{order?.delivery_address || 'Livraison'}</p>
            </div>
          </Popup>
        </Marker>
        
        {/* Driver Marker - Only show when driver is assigned and en route */}
        {driverPosition && isDriverEnRoute && (
          <Marker position={driverPosition} icon={driverIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">{driver?.name || 'Livreur'}</p>
                <p className="text-sm text-gray-500">En route vers vous</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Route line */}
        <Polyline
          positions={route}
          color="#FF5A00"
          weight={4}
          opacity={0.7}
          dashArray="10, 10"
        />
        
        {/* Completed route (where driver has been) */}
        {driverPosition && isDriverEnRoute && (
          <Polyline
            positions={route.slice(0, Math.ceil(progress * route.length))}
            color="#10B981"
            weight={5}
            opacity={1}
          />
        )}
      </MapContainer>
      
      {/* Driver Info Overlay */}
      {driver && !driver.isPlaceholder && isDriverEnRoute && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-lg p-4 z-[1000]">
          <div className="flex items-center gap-3">
            {/* Driver Photo */}
            <div className="relative">
              {driver.photo ? (
                <img 
                  src={driver.photo} 
                  alt={driver.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-green-500"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500">
                  <span className="text-2xl">🏍️</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Navigation className="w-3 h-3 text-white" />
              </div>
            </div>
            
            {/* Driver Info */}
            <div className="flex-1">
              <p className="font-bold text-gray-900">{driver.name}</p>
              <p className="text-sm text-gray-500">{driver.vehicle || 'Moto'}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-[#FF5A00]" />
                <span className="text-sm font-medium text-[#FF5A00]">
                  {remainingMinutes > 0 ? `${remainingMinutes} min` : 'Arrivée imminente'}
                </span>
              </div>
            </div>
            
            {/* Call Button */}
            {driver.phone && (
              <button
                onClick={() => onCallDriver?.(driver.phone)}
                className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center active:bg-green-600"
              >
                <Phone className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#FF5A00] to-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Status Badge */}
      <div className="absolute top-4 left-4 z-[1000]">
        <div className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
          status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
          status === 'ready' ? 'bg-blue-100 text-blue-800' :
          status === 'picked_up' || status === 'on_the_way' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status === 'preparing' && '👨‍🍳 En préparation'}
          {status === 'ready' && '📦 Prêt'}
          {(status === 'picked_up' || status === 'on_the_way') && '🏍️ En route'}
          {status === 'delivered' && '✅ Livré'}
        </div>
      </div>
    </div>
  );
}

export default OrderTrackingMap;
