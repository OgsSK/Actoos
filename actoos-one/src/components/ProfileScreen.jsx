import { useState } from 'react';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  ChevronRight,
  Shield,
  FileText,
  HelpCircle,
  LogOut,
  Briefcase,
  Truck,
  RefreshCw,
  Crown,
  Bell,
  CreditCard
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';

// Mock user data
const MOCK_USER = {
  id: 'user-001',
  name: 'Amadou Diallo',
  phone: '+223 70 12 34 56',
  address: 'Bamako, Hamdallaye',
  isLoggedIn: true,
  // Rôles validés par l'admin
  role_partner: false,
  role_driver: false,
  role_admin: false,
  // Demandes en cours
  pending_partner: false,
  pending_driver: false,
};

export function ProfileScreen({ 
  onBack, 
  onDriverOnboarding, 
  onPartnerOnboarding,
  onSwitchToDriver,
  onSwitchToPartner,
  onSwitchToAdmin
}) {
  const [user, setUser] = useState(MOCK_USER);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Pour la démo, on peut activer les rôles
  const toggleRole = (role) => {
    setUser(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="profile-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            data-testid="profile-back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="font-bold text-xl text-gray-900">Mon Profil</h1>
        </div>
      </header>

      <div className="p-4 pb-24">
        {/* User Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FF5A00] to-orange-400 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-500 flex items-center gap-1 mt-1">
                <Phone className="w-4 h-4" />
                {user.phone}
              </p>
              <p className="text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {user.address}
              </p>
            </div>
          </div>
        </div>

        {/* Magic Switch Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#FF5A00]" />
              Changer de Mode
            </h3>
            <p className="text-xs text-gray-500 mt-1">Basculez entre vos différents rôles</p>
          </div>

          {/* Mode Livreur */}
          {user.role_driver ? (
            <button
              onClick={onSwitchToDriver}
              className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
              data-testid="switch-driver-btn"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Passer en mode Livreur</p>
                <p className="text-xs text-gray-500">Gérer vos courses</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ) : user.pending_driver ? (
            <div className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 opacity-60">
              <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Demande Livreur</p>
                <p className="text-xs text-yellow-600">En attente de validation...</p>
              </div>
            </div>
          ) : (
            <button
              onClick={onDriverOnboarding}
              className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
              data-testid="become-driver-btn"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-gray-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Devenir Livreur</p>
                <p className="text-xs text-gray-500">Remplir le formulaire d'inscription</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}

          {/* Mode Partenaire */}
          {user.role_partner ? (
            <button
              onClick={onSwitchToPartner}
              className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
              data-testid="switch-partner-btn"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Passer en mode Restaurant</p>
                <p className="text-xs text-gray-500">Gérer vos commandes (KDS)</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ) : user.pending_partner ? (
            <div className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 opacity-60">
              <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Demande Partenaire</p>
                <p className="text-xs text-yellow-600">En attente de validation...</p>
              </div>
            </div>
          ) : (
            <button
              onClick={onPartnerOnboarding}
              className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
              data-testid="become-partner-btn"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-gray-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Devenir Partenaire</p>
                <p className="text-xs text-gray-500">Inscrivez votre restaurant</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}

          {/* Mode Admin (si validé) */}
          {user.role_admin && (
            <button
              onClick={onSwitchToAdmin}
              className="w-full px-4 py-4 flex items-center gap-4 active:bg-gray-50"
              data-testid="switch-admin-btn"
            >
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Mode Admin</p>
                <p className="text-xs text-gray-500">God Mode - Tableau de bord</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Demo Controls - Pour activer les rôles (À RETIRER EN PROD) */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-4 mb-6">
          <p className="text-yellow-800 font-semibold text-sm mb-3">🧪 Mode Démo - Activer les rôles</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleRole('role_driver')}
              className={`px-3 py-2 rounded-xl text-sm font-medium ${
                user.role_driver ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              Livreur {user.role_driver ? '✓' : ''}
            </button>
            <button
              onClick={() => toggleRole('role_partner')}
              className={`px-3 py-2 rounded-xl text-sm font-medium ${
                user.role_partner ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              Partenaire {user.role_partner ? '✓' : ''}
            </button>
            <button
              onClick={() => toggleRole('role_admin')}
              className={`px-3 py-2 rounded-xl text-sm font-medium ${
                user.role_admin ? 'bg-red-500 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              Admin {user.role_admin ? '✓' : ''}
            </button>
          </div>
        </div>

        {/* Other Options */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <button className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Notifications</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Moyens de paiement</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Confidentialité</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Conditions d'utilisation</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Aide & Support</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full px-4 py-4 flex items-center gap-4 active:bg-gray-50"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <span className="flex-1 text-left font-medium text-red-600">Déconnexion</span>
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-gray-400 text-xs mt-6">
          ACTOOS ONE v1.0.0 • Mali 🇲🇱
        </p>
      </div>

      {/* Logout Confirmation */}
      <BottomSheet
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Déconnexion"
      >
        <div className="py-4">
          <p className="text-gray-600 text-center mb-6">
            Êtes-vous sûr de vouloir vous déconnecter ?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                // Handle logout
                setShowLogoutConfirm(false);
                onBack();
              }}
              className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-semibold"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
