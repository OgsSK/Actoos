import { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  MapPin,
  Navigation,
  Car,
  Clock,
  Zap,
  Star,
  Users,
  Briefcase,
  Crown,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { getSurgeDetails, calculateVTCPriceWithSurge } from '../services/surgeService';
import { systemConfig } from '../data/mockData';

// Types de véhicules
const VEHICLE_TYPES = [
  {
    id: 'standard',
    name: 'Standard',
    icon: Car,
    description: '4 places • Économique',
    pricePerKm: 150,
    eta: '3-5 min',
  },
  {
    id: 'confort',
    name: 'Confort',
    icon: Briefcase,
    description: '4 places • Climatisé',
    pricePerKm: 250,
    eta: '5-8 min',
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: Crown,
    description: '4 places • Luxe',
    pricePerKm: 400,
    eta: '8-12 min',
  },
];

// Destinations populaires mockées
const POPULAR_DESTINATIONS = [
  { id: 'dest-1', name: 'Aéroport Bamako-Sénou', distance: 15 },
  { id: 'dest-2', name: 'Gare routière Sogoniko', distance: 8 },
  { id: 'dest-3', name: 'Centre Commercial ACI', distance: 5 },
  { id: 'dest-4', name: 'Hôpital du Point G', distance: 7 },
];

export function BlackScreen({ onBack }) {
  const { balance, hasEnoughBalance } = useWallet();
  const [step, setStep] = useState('destination'); // destination, vehicle, confirm, booking, success
  const [pickup, setPickup] = useState('Ma position actuelle');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [surge, setSurge] = useState(null);
  const [priceDetails, setPriceDetails] = useState(null);

  // Charger les détails du surge au montage
  useEffect(() => {
    const surgeDetails = getSurgeDetails();
    setSurge(surgeDetails);
  }, []);

  // Recalculer le prix quand le véhicule ou la distance change
  useEffect(() => {
    if (selectedVehicle && distance > 0) {
      const price = calculateVTCPriceWithSurge(distance, selectedVehicle.id);
      setPriceDetails(price);
    }
  }, [selectedVehicle, distance]);

  const handleSelectDestination = (dest) => {
    setDestination(dest.name);
    setDistance(dest.distance);
    setStep('vehicle');
  };

  const handleCustomDestination = () => {
    if (destination.trim()) {
      // Simuler une distance aléatoire pour la démo
      setDistance(Math.floor(Math.random() * 15) + 3);
      setStep('vehicle');
    }
  };

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    const price = calculateVTCPriceWithSurge(distance, vehicle.id);
    setPriceDetails(price);
    setStep('confirm');
  };

  const handleBookRide = async () => {
    if (!priceDetails || !hasEnoughBalance(priceDetails.finalPrice)) {
      alert('Solde insuffisant. Veuillez recharger votre wallet.');
      return;
    }

    setIsLoading(true);
    setStep('booking');

    // Simuler la recherche de chauffeur
    await new Promise(resolve => setTimeout(resolve, 3000));

    setIsLoading(false);
    setStep('success');
  };

  const handleNewRide = () => {
    setStep('destination');
    setDestination('');
    setDistance(0);
    setSelectedVehicle(null);
    setPriceDetails(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-testid="black-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center"
            data-testid="black-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-xl flex items-center gap-2">
              <Car className="w-6 h-6 text-yellow-500" />
              ACTOOS BLACK
            </h1>
            <p className="text-xs text-gray-400">VTC Premium</p>
          </div>
        </div>

        {/* Surge Banner */}
        {surge?.isActive && (
          <div className="mt-4 bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <p className="font-semibold text-yellow-500">Forte Demande</p>
              <p className="text-xs text-gray-400">
                Prix x{surge.multiplier} • {surge.onlineDrivers} chauffeurs disponibles
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Step: Destination */}
        {step === 'destination' && (
          <>
            {/* Pickup */}
            <div className="bg-gray-800 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Point de départ</p>
                  <p className="font-medium">{pickup}</p>
                </div>
              </div>
            </div>

            {/* Destination Input */}
            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-900" />
                </div>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Où allez-vous ?"
                  className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
                  data-testid="destination-input"
                />
              </div>
              {destination && (
                <button
                  onClick={handleCustomDestination}
                  className="mt-3 w-full bg-yellow-500 text-gray-900 font-semibold py-3 rounded-xl"
                >
                  Confirmer la destination
                </button>
              )}
            </div>

            {/* Popular Destinations */}
            <p className="text-sm text-gray-400 mb-3">Destinations populaires</p>
            <div className="space-y-2">
              {POPULAR_DESTINATIONS.map((dest) => (
                <button
                  key={dest.id}
                  onClick={() => handleSelectDestination(dest)}
                  className="w-full bg-gray-800 rounded-2xl p-4 flex items-center gap-4 active:bg-gray-700"
                  data-testid={`destination-${dest.id}`}
                >
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{dest.name}</p>
                    <p className="text-xs text-gray-500">{dest.distance} km</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step: Vehicle Selection */}
        {step === 'vehicle' && (
          <>
            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
                <Navigation className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-400">{pickup}</span>
              </div>
              <div className="flex items-center gap-3 pt-3">
                <MapPin className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">{destination}</span>
                <span className="text-xs text-gray-500 ml-auto">{distance} km</span>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-3">Choisissez votre véhicule</p>
            <div className="space-y-3">
              {VEHICLE_TYPES.map((vehicle) => {
                const price = calculateVTCPriceWithSurge(distance, vehicle.id);
                const Icon = vehicle.icon;
                
                return (
                  <button
                    key={vehicle.id}
                    onClick={() => handleSelectVehicle(vehicle)}
                    className="w-full bg-gray-800 rounded-2xl p-4 flex items-center gap-4 active:bg-gray-700 border border-gray-700"
                    data-testid={`vehicle-${vehicle.id}`}
                  >
                    <div className="w-14 h-14 bg-gray-700 rounded-xl flex items-center justify-center">
                      <Icon className="w-7 h-7 text-yellow-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{vehicle.name}</p>
                      <p className="text-xs text-gray-500">{vehicle.description}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {vehicle.eta}
                      </p>
                    </div>
                    <div className="text-right">
                      {price.isActive && (
                        <p className="text-xs text-gray-500 line-through">
                          {price.originalPrice.toLocaleString()} F
                        </p>
                      )}
                      <p className={`font-bold ${price.isActive ? 'text-yellow-500' : 'text-white'}`}>
                        {price.finalPrice.toLocaleString()} F
                      </p>
                      {price.isActive && (
                        <p className="text-xs text-yellow-500">Surge x{price.multiplier}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && priceDetails && (
          <>
            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
                <Navigation className="w-5 h-5 text-blue-500" />
                <span className="text-sm">{pickup}</span>
              </div>
              <div className="flex items-center gap-3 pt-3">
                <MapPin className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">{destination}</span>
              </div>
            </div>

            {/* Vehicle Summary */}
            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  {selectedVehicle && <selectedVehicle.icon className="w-7 h-7 text-yellow-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{selectedVehicle?.name}</p>
                  <p className="text-sm text-gray-400">{selectedVehicle?.description}</p>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <h3 className="font-semibold mb-3">Détail du prix</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Distance</span>
                  <span>{distance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Prix de base</span>
                  <span>{priceDetails.originalPrice.toLocaleString()} F</span>
                </div>
                {priceDetails.isActive && (
                  <div className="flex justify-between text-yellow-500">
                    <span className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      Surge ({priceDetails.reason})
                    </span>
                    <span>+{priceDetails.surgeAmount.toLocaleString()} F</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-yellow-500">{priceDetails.finalPrice.toLocaleString()} F</span>
                </div>
              </div>
            </div>

            {/* Wallet Balance */}
            <div className={`rounded-2xl p-4 mb-6 ${
              hasEnoughBalance(priceDetails.finalPrice) 
                ? 'bg-green-500/20 border border-green-500/50' 
                : 'bg-red-500/20 border border-red-500/50'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Solde Wallet</span>
                <span className="font-bold">{balance.toLocaleString()} F</span>
              </div>
              {!hasEnoughBalance(priceDetails.finalPrice) && (
                <p className="text-red-400 text-sm mt-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Solde insuffisant
                </p>
              )}
            </div>

            {/* Book Button */}
            <button
              onClick={handleBookRide}
              disabled={!hasEnoughBalance(priceDetails.finalPrice)}
              className={`w-full py-5 rounded-2xl font-bold text-lg ${
                hasEnoughBalance(priceDetails.finalPrice)
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              data-testid="book-ride-btn"
            >
              Réserver maintenant
            </button>
          </>
        )}

        {/* Step: Booking */}
        {step === 'booking' && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Recherche en cours</h2>
            <p className="text-gray-400">Un chauffeur arrive bientôt...</p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Course confirmée !</h2>
            <p className="text-gray-400 mb-6">Votre chauffeur arrive dans 4 minutes</p>
            
            <div className="bg-gray-800 rounded-2xl p-4 mb-6 text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center">
                  <Users className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold">Moussa K.</p>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>4.9</span>
                    <span>•</span>
                    <span>Toyota Corolla</span>
                  </div>
                  <p className="text-xs text-gray-500">BA 1234 ML</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleNewRide}
              className="w-full bg-gray-800 text-white font-semibold py-4 rounded-2xl"
            >
              Nouvelle course
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
