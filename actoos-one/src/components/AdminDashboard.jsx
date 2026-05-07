import { useState } from 'react';
import { 
  ArrowLeft,
  Shield,
  Package,
  Users,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bike,
  Car,
  Store,
  Phone,
  MapPin,
  Zap,
  Settings,
  Tag,
  Scale,
  Edit3,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { mockBlockedOrders, mockDrivers, mockOnboardingRequests } from '../data/driverData';
import { AdminPromotionsManager } from './AdminPromotionsManager';

const TABS = {
  ORDERS: 'orders',
  DRIVERS: 'drivers',
  ONBOARDING: 'onboarding',
  SETTINGS: 'settings',
};

export function AdminDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState(TABS.ORDERS);
  const [blockedOrders, setBlockedOrders] = useState(mockBlockedOrders);
  const [drivers] = useState(mockDrivers);
  const [onboardingRequests, setOnboardingRequests] = useState(mockOnboardingRequests);
  
  // Settings sub-tab
  const [settingsTab, setSettingsTab] = useState('promos'); // promos, legal, app

  // Force assign un livreur à une commande
  const handleForceAssign = (orderId) => {
    const availableDrivers = drivers.filter(d => d.is_online && !d.current_order_id);
    if (availableDrivers.length === 0) {
      alert('Aucun livreur disponible !');
      return;
    }
    const driver = availableDrivers[0];
    alert(`Commande ${orderId} assignée à ${driver.name} !`);
    setBlockedOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Approuver une demande d'onboarding
  const handleApprove = (requestId) => {
    alert(`Demande ${requestId} approuvée !`);
    setOnboardingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  // Rejeter une demande d'onboarding
  const handleReject = (requestId) => {
    const reason = prompt('Raison du rejet :');
    if (reason) {
      alert(`Demande ${requestId} rejetée. Raison: ${reason}`);
      setOnboardingRequests(prev => prev.filter(r => r.id !== requestId));
    }
  };

  // Calcul du temps écoulé
  const getElapsedTime = (dateStr) => {
    const created = new Date(dateStr);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}j`;
  };

  const isUrgent = (dateStr) => {
    const created = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - created) / 60000);
    return diffMins > 20;
  };

  const onlineDrivers = drivers.filter(d => d.is_online);
  const busyDrivers = drivers.filter(d => d.current_order_id);
  const pendingOnboarding = onboardingRequests.filter(r => r.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-100" data-testid="admin-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center active:bg-gray-700 transition-colors"
              data-testid="admin-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h1 className="font-bold text-lg">GOD MODE</h1>
              </div>
              <p className="text-xs text-gray-400">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab(TABS.ORDERS)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.ORDERS
                ? 'bg-red-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-blocked-orders"
          >
            <Package className="w-4 h-4" />
            Bloquées
            {blockedOrders.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {blockedOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab(TABS.DRIVERS)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.DRIVERS
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-drivers"
          >
            <Users className="w-4 h-4" />
            Livreurs
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {onlineDrivers.length}/{drivers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab(TABS.ONBOARDING)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.ONBOARDING
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-onboarding"
          >
            <FileText className="w-4 h-4" />
            Onboarding
            {pendingOnboarding.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {pendingOnboarding.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab(TABS.SETTINGS)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.SETTINGS
                ? 'bg-purple-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-settings"
          >
            <Settings className="w-4 h-4" />
            Config
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Blocked Orders Tab */}
        {activeTab === TABS.ORDERS && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Commandes bloquées</h2>
              <span className="text-sm text-gray-500">{blockedOrders.length} en attente</span>
            </div>

            {blockedOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">Aucune commande bloquée</p>
              </div>
            ) : (
              blockedOrders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl overflow-hidden border-2 ${
                    isUrgent(order.created_at) ? 'border-red-500' : 'border-gray-200'
                  }`}
                  data-testid={`blocked-order-${order.id}`}
                >
                  {isUrgent(order.created_at) && (
                    <div className="bg-red-500 text-white px-4 py-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-bold text-sm">URGENT - {getElapsedTime(order.created_at)} d'attente</span>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">{order.restaurant_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{order.total_amount.toLocaleString()} FCFA</p>
                        {!isUrgent(order.created_at) && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            {getElapsedTime(order.created_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-gray-500">De:</p>
                          <p className="text-gray-700">{order.restaurant_address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-gray-500">Vers:</p>
                          <p className="text-gray-700">{order.client_address}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleForceAssign(order.id)}
                      className="w-full mt-4 bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-red-600 transition-colors"
                      data-testid={`force-assign-${order.id}`}
                    >
                      <Zap className="w-5 h-5" />
                      FORCE ASSIGN
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Drivers Tab */}
        {activeTab === TABS.DRIVERS && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{onlineDrivers.length}</p>
                <p className="text-xs text-green-600">En ligne</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{busyDrivers.length}</p>
                <p className="text-xs text-blue-600">En mission</p>
              </div>
            </div>

            <h2 className="font-bold text-gray-900">Liste des livreurs</h2>

            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="bg-white rounded-2xl p-4 border border-gray-200"
                data-testid={`driver-${driver.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    driver.is_online ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {driver.vehicle_type === 'moto' ? (
                      <Bike className={`w-6 h-6 ${driver.is_online ? 'text-green-600' : 'text-gray-400'}`} />
                    ) : (
                      <Car className={`w-6 h-6 ${driver.is_online ? 'text-green-600' : 'text-gray-400'}`} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{driver.name}</p>
                      {driver.is_online && (
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{driver.phone}</p>
                  </div>

                  <div className="text-right">
                    {driver.current_order_id ? (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                        <Package className="w-3 h-3" />
                        En mission
                      </span>
                    ) : driver.is_online ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                        Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs font-medium">
                        Hors ligne
                      </span>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {driver.total_deliveries} livraisons • ⭐ {driver.rating}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Onboarding Tab */}
        {activeTab === TABS.ONBOARDING && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Demandes en attente</h2>
              <span className="text-sm text-gray-500">{pendingOnboarding.length} à traiter</span>
            </div>

            {onboardingRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">Toutes les demandes ont été traitées</p>
              </div>
            ) : (
              onboardingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-2xl p-4 border border-gray-200"
                  data-testid={`onboarding-${request.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      request.type === 'driver' ? 'bg-blue-100' : 'bg-primary/10'
                    }`}>
                      {request.type === 'driver' ? (
                        <Bike className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Store className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{request.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          request.type === 'driver' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {request.type === 'driver' ? 'Livreur' : 'Partenaire'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{request.phone}</p>
                      <p className="text-sm text-gray-500">{request.email}</p>
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {request.documents.map((doc, i) => (
                          <span key={i} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                            {doc}
                          </span>
                        ))}
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Soumis il y a {getElapsedTime(request.submitted_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleReject(request.id)}
                      className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-gray-200 transition-colors"
                      data-testid={`reject-${request.id}`}
                    >
                      <XCircle className="w-5 h-5 text-red-500" />
                      REJETER
                    </button>
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-green-600 transition-colors"
                      data-testid={`approve-${request.id}`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      APPROUVER
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === TABS.SETTINGS && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2 bg-white rounded-2xl p-2">
              <button
                onClick={() => setSettingsTab('promos')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  settingsTab === 'promos' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
                }`}
              >
                <Tag className="w-4 h-4 inline mr-1" />
                Promos
              </button>
              <button
                onClick={() => setSettingsTab('legal')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  settingsTab === 'legal' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
                }`}
              >
                <Scale className="w-4 h-4 inline mr-1" />
                Légal
              </button>
              <button
                onClick={() => setSettingsTab('app')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  settingsTab === 'app' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-1" />
                App
              </button>
            </div>

            {/* Promos Management */}
            {settingsTab === 'promos' && (
              <AdminPromotionsManager />
            )}

            {/* Legal Management */}
            {settingsTab === 'legal' && (
              <div className="space-y-4">
                <h2 className="font-bold text-gray-900">Textes légaux</h2>
                <p className="text-sm text-gray-500">Modifiez les conditions d'utilisation et mentions légales.</p>

                <div className="bg-white rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Conditions d'utilisation</h3>
                    <button className="text-[#FF5A00] text-sm font-medium flex items-center gap-1">
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Définissez les règles d'utilisation de l'application ACTOOS ONE.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Mentions légales</h3>
                    <button className="text-[#FF5A00] text-sm font-medium flex items-center gap-1">
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Informations sur l'éditeur, l'hébergeur et les données personnelles.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Politique de confidentialité</h3>
                    <button className="text-[#FF5A00] text-sm font-medium flex items-center gap-1">
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Comment ACTOOS ONE collecte et utilise les données personnelles.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Politique cookies</h3>
                    <button className="text-[#FF5A00] text-sm font-medium flex items-center gap-1">
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Utilisation des cookies et technologies similaires.
                  </p>
                </div>
              </div>
            )}

            {/* App Settings */}
            {settingsTab === 'app' && (
              <div className="space-y-4">
                <h2 className="font-bold text-gray-900">Paramètres de l'app</h2>

                <div className="bg-white rounded-2xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Informations générales</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">Nom de l'application</label>
                      <input
                        type="text"
                        defaultValue="ACTOOS ONE"
                        className="w-full mt-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Slogan</label>
                      <input
                        type="text"
                        defaultValue="Tout le Mali, livré chez vous"
                        className="w-full mt-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Copyright</label>
                      <input
                        type="text"
                        defaultValue="ACTOOS ONE tout droit réservé"
                        className="w-full mt-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Frais et commissions</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">Frais de livraison par défaut (FCFA)</label>
                      <input
                        type="number"
                        defaultValue="500"
                        className="w-full mt-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Commission livreur (%)</label>
                      <input
                        type="number"
                        defaultValue="15"
                        className="w-full mt-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Commission partenaire (%)</label>
                      <input
                        type="number"
                        defaultValue="20"
                        className="w-full mt-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                    </div>
                  </div>
                </div>

                <button className="w-full bg-[#FF5A00] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  Enregistrer les modifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
