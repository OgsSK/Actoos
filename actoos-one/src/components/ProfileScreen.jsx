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
  Clock,
  Bell,
  CreditCard,
  Edit3,
  Check,
  X,
  MessageCircle,
  Mail,
  ChevronDown,
  Package,
  History,
  Heart
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { ReferralSection } from './ReferralSection';
import { OrderHistorySection } from './OrderHistorySection';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';

// Mock user data - CLIENT APP (no admin roles visible)
const MOCK_USER = {
  id: 'user-001',
  name: 'Amadou Diallo',
  phone: '+223 70 12 34 56',
  address: 'Bamako, Hamdallaye',
  email: '',
  isLoggedIn: true,
  // Rôles validés - Ces infos sont stockées mais NON VISIBLES dans l'app client
  // L'accès se fait via URLs séparées: /partner, /driver, /admin
  role_partner: false,
  role_driver: false,
  role_admin: false,
  // Demandes en cours (visibles pour le client)
  pending_partner: false,
  pending_driver: false,
  // Préférences notifications
  notifications: {
    orders: true,
    promotions: true,
    sms: false,
  },
};

// FAQ Data
const FAQ_ITEMS = [
  {
    q: 'Comment passer une commande ?',
    a: 'Sélectionnez un restaurant, ajoutez des plats au panier, puis validez votre commande avec votre mode de paiement préféré.',
  },
  {
    q: 'Comment recharger mon wallet ?',
    a: 'Allez dans l\'onglet Wallet, cliquez sur "Recharger" et suivez les instructions pour payer via Mobile Money.',
  },
  {
    q: 'Comment devenir livreur ?',
    a: 'Depuis votre Profil, cliquez sur "Devenir Livreur" et remplissez le formulaire. Notre équipe validera votre demande.',
  },
  {
    q: 'Comment contacter le support ?',
    a: 'Vous pouvez nous joindre via WhatsApp au +223 70 00 00 00 ou par email à support@actoos.com.',
  },
];

export function ProfileScreen({ 
  onBack, 
  onDriverOnboarding, 
  onPartnerOnboarding,
  onPrivacyClick,
  onTermsClick,
  onOrderHistory,
  onFavorites,
  currentUser,
  isLoggedIn,
  onLoginClick
}) {
  const { getFavoritesCount } = useFavorites();
  const favoritesCount = getFavoritesCount();
  const { signOut } = useAuth();
  
  // Utiliser currentUser si connecté, sinon un user vide
  // Assurer que notifications existe toujours avec des valeurs par défaut
  const [user, setUser] = useState(() => {
    const baseUser = currentUser || MOCK_USER;
    return {
      ...baseUser,
      notifications: {
        orders: true,
        promotions: true,
        sms: false,
        ...baseUser.notifications
      }
    };
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState(() => {
    const stored = localStorage.getItem('actoos_privacy_settings');
    return stored ? JSON.parse(stored) : {
      shareLocation: true,
      shareOrderHistory: false,
      allowAnalytics: true,
      allowMarketing: false,
    };
  });
  
  // Edit profile form
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone);
  const [editAddress, setEditAddress] = useState(user.address);

  const handleSaveProfile = () => {
    setUser(prev => ({
      ...prev,
      name: editName,
      phone: editPhone,
      address: editAddress,
    }));
    setShowEditProfile(false);
  };

  const toggleNotification = (key) => {
    setUser(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const togglePrivacy = (key) => {
    const newSettings = {
      ...privacySettings,
      [key]: !privacySettings[key],
    };
    setPrivacySettings(newSettings);
    localStorage.setItem('actoos_privacy_settings', JSON.stringify(newSettings));
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

      {/* Si pas connecté - Écran de connexion */}
      {!isLoggedIn ? (
        <div className="p-4 pb-24">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Bienvenue sur ACTOOS</h2>
            <p className="text-gray-500 mb-6">Connectez-vous pour accéder à votre profil, vos commandes et vos favoris.</p>
            <button
              onClick={onLoginClick}
              className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold active:bg-[#E54E00] transition-colors"
              data-testid="login-btn"
            >
              Se connecter
            </button>
          </div>

          {/* Devenir Partenaire / Livreur - Accessible sans connexion */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="px-4 py-3 bg-[#FF5A00]/5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Rejoignez-nous</h3>
              <p className="text-xs text-gray-500">Devenez partenaire ou livreur ACTOOS</p>
            </div>
            
            <button
              onClick={onPartnerOnboarding}
              className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Devenir Partenaire</p>
                <p className="text-xs text-gray-500">Restaurant, Commerce...</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={onDriverOnboarding}
              className="w-full px-4 py-4 flex items-center gap-4 active:bg-gray-50"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Devenir Livreur</p>
                <p className="text-xs text-gray-500">Livrez et gagnez</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Aide */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowHelp(true)}
              className="w-full px-4 py-4 flex items-center gap-4 active:bg-gray-50"
            >
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Aide & FAQ</p>
                <p className="text-xs text-gray-500">Questions fréquentes</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      ) : (
      /* Si connecté - Profil complet */
      <div className="p-4 pb-24">
        {/* User Card - Editable */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#FF5A00] to-orange-400 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
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
            <button
              onClick={() => setShowEditProfile(true)}
              className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"
              data-testid="edit-profile-btn"
            >
              <Edit3 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Section Parrainage - DÉSACTIVÉ pour MVP */}
        {/* 
        <div className="mb-6">
          <ReferralSection
            userId={user.id}
            userName={user.name}
            userPhone={user.phone}
          />
        </div>
        */}

        {/* Demandes en attente - Visible si candidature soumise */}
        {(user.pending_driver || user.pending_partner) && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="px-4 py-3 bg-yellow-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                Demandes en cours
              </h3>
            </div>

            {user.pending_driver && (
              <div className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Demande Livreur</p>
                  <p className="text-xs text-yellow-600">En attente de validation...</p>
                </div>
              </div>
            )}

            {user.pending_partner && (
              <div className="w-full px-4 py-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Demande Partenaire</p>
                  <p className="text-xs text-yellow-600">En attente de validation...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Devenir Partenaire / Livreur - Si pas encore de demande */}
        {!user.pending_driver && !user.pending_partner && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="px-4 py-3 bg-[#FF5A00]/5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Rejoignez-nous</h3>
              <p className="text-xs text-gray-500">Devenez partenaire ou livreur ACTOOS</p>
            </div>
            
            <button
              onClick={onPartnerOnboarding}
              className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
              data-testid="become-partner-btn"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Devenir Partenaire</p>
                <p className="text-xs text-gray-500">Restaurant, Commerce...</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={onDriverOnboarding}
              className="w-full px-4 py-4 flex items-center gap-4 active:bg-gray-50"
              data-testid="become-driver-btn"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">Devenir Livreur</p>
                <p className="text-xs text-gray-500">Livrez et gagnez</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}

        {/* Mes commandes - Section complète avec historique */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="px-4 py-3 bg-[#FF5A00]/5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-[#FF5A00]" />
                Mes commandes
              </h3>
              <p className="text-xs text-gray-500">Historique et recommander</p>
            </div>
          </div>
          
          <div className="p-4">
            <OrderHistorySection 
              onOrderClick={onOrderHistory} 
              onTrackOrder={(order) => {
                // Naviguer vers le tracking de la commande
                if (onOrderHistory) {
                  onOrderHistory(order);
                }
              }}
              onViewOrderDetails={(order) => {
                // Naviguer vers les détails de la commande
                if (onOrderHistory) {
                  onOrderHistory(order);
                }
              }}
            />
          </div>
        </div>
          
        {/* Mes favoris */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <button
            onClick={onFavorites}
            className="w-full px-4 py-4 flex items-center gap-4 active:bg-gray-50"
            data-testid="favorites-btn"
          >
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900">Mes favoris</p>
              <p className="text-xs text-gray-500">
                {favoritesCount > 0 
                  ? `${favoritesCount} établissement${favoritesCount > 1 ? 's' : ''} sauvegardé${favoritesCount > 1 ? 's' : ''}`
                  : 'Vos restaurants préférés'
                }
              </p>
            </div>
            {favoritesCount > 0 && (
              <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Paramètres */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowNotifications(true)}
            className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Notifications</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => setShowPaymentMethods(true)}
            className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Moyens de paiement</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => setShowPrivacy(true)}
            className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
            data-testid="privacy-btn"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Confidentialité</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={onTermsClick}
            className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Conditions d'utilisation</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => setShowHelp(true)}
            className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
          >
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
          ACTOOS ONE v1.0.0 • Mali
        </p>
      </div>
      )}

      {/* Edit Profile Sheet */}
      <BottomSheet
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        title="Modifier le profil"
      >
        <div className="py-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Nom complet</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
              data-testid="edit-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Téléphone</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
              data-testid="edit-phone"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Adresse par défaut</label>
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
              data-testid="edit-address"
            />
          </div>
          <button
            onClick={handleSaveProfile}
            className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
            data-testid="save-profile-btn"
          >
            <Check className="w-5 h-5" />
            Enregistrer
          </button>
        </div>
      </BottomSheet>

      {/* Notifications Sheet */}
      <BottomSheet
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Notifications"
      >
        <div className="py-4 space-y-4">
          <p className="text-gray-500 text-sm mb-4">Gérez vos préférences de notification</p>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Commandes</p>
              <p className="text-xs text-gray-500">Statut de vos commandes en cours</p>
            </div>
            <button
              onClick={() => toggleNotification('orders')}
              className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                user.notifications.orders ? 'bg-[#FF5A00] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 bg-white rounded-full mx-1 shadow" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Promotions</p>
              <p className="text-xs text-gray-500">Offres spéciales et réductions</p>
            </div>
            <button
              onClick={() => toggleNotification('promotions')}
              className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                user.notifications.promotions ? 'bg-[#FF5A00] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 bg-white rounded-full mx-1 shadow" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">SMS</p>
              <p className="text-xs text-gray-500">Recevoir les notifications par SMS</p>
            </div>
            <button
              onClick={() => toggleNotification('sms')}
              className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                user.notifications.sms ? 'bg-[#FF5A00] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 bg-white rounded-full mx-1 shadow" />
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Payment Methods Sheet */}
      <BottomSheet
        isOpen={showPaymentMethods}
        onClose={() => setShowPaymentMethods(false)}
        title="Moyens de paiement"
      >
        <div className="py-4">
          <p className="text-gray-500 text-sm mb-4">Vos moyens de paiement enregistrés</p>
          
          {/* Wallet ACTOOS */}
          <div className="bg-gradient-to-r from-[#FF5A00] to-orange-400 rounded-2xl p-4 mb-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">ACTOOS Wallet</p>
                <p className="text-2xl font-bold">15 000 FCFA</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Mobile Money */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Orange Money</p>
                <p className="text-sm text-gray-500">+223 70 •• •• 56</p>
              </div>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Vérifié</span>
            </div>
          </div>

          {/* Add new */}
          <button className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-medium flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5" />
            Ajouter un moyen de paiement
          </button>
        </div>
      </BottomSheet>

      {/* Help & Support Sheet */}
      <BottomSheet
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Aide & Support"
      >
        <div className="py-4">
          {/* Contact */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Nous contacter</p>
            <div className="flex gap-3">
              <a
                href="https://wa.me/22370000000"
                className="flex-1 bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col items-center gap-2"
              >
                <MessageCircle className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium text-green-700">WhatsApp</span>
              </a>
              <a
                href="mailto:support@actoos.com"
                className="flex-1 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col items-center gap-2"
              >
                <Mail className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Email</span>
              </a>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Questions fréquentes</p>
            <div className="space-y-2">
              {FAQ_ITEMS.map((faq, idx) => (
                <div key={idx} className="bg-gray-50 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <span className="font-medium text-gray-900 text-sm">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedFaq === idx ? 'rotate-180' : ''
                    }`} />
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 pb-3">
                      <p className="text-sm text-gray-600">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

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
              onClick={async () => {
                try {
                  await signOut();
                  setShowLogoutConfirm(false);
                  onBack();
                } catch (error) {
                  console.error('Erreur déconnexion:', error);
                }
              }}
              className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-semibold"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Privacy Settings Sheet */}
      <BottomSheet
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Confidentialité"
      >
        <div className="py-4 space-y-4">
          <p className="text-gray-500 text-sm mb-4">Gérez vos paramètres de confidentialité et de données personnelles.</p>
          
          {/* Location Sharing */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Partage de localisation</p>
              <p className="text-xs text-gray-500">Améliore les suggestions de restaurants</p>
            </div>
            <button
              onClick={() => togglePrivacy('shareLocation')}
              className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                privacySettings.shareLocation ? 'bg-[#FF5A00] justify-end' : 'bg-gray-300 justify-start'
              }`}
              data-testid="privacy-location-toggle"
            >
              <div className="w-5 h-5 bg-white rounded-full mx-1 shadow" />
            </button>
          </div>

          {/* Order History Sharing */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Historique des commandes</p>
              <p className="text-xs text-gray-500">Partager avec les partenaires</p>
            </div>
            <button
              onClick={() => togglePrivacy('shareOrderHistory')}
              className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                privacySettings.shareOrderHistory ? 'bg-[#FF5A00] justify-end' : 'bg-gray-300 justify-start'
              }`}
              data-testid="privacy-history-toggle"
            >
              <div className="w-5 h-5 bg-white rounded-full mx-1 shadow" />
            </button>
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Données analytiques</p>
              <p className="text-xs text-gray-500">Nous aider à améliorer l'app</p>
            </div>
            <button
              onClick={() => togglePrivacy('allowAnalytics')}
              className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                privacySettings.allowAnalytics ? 'bg-[#FF5A00] justify-end' : 'bg-gray-300 justify-start'
              }`}
              data-testid="privacy-analytics-toggle"
            >
              <div className="w-5 h-5 bg-white rounded-full mx-1 shadow" />
            </button>
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Communications marketing</p>
              <p className="text-xs text-gray-500">Recevoir des offres personnalisées</p>
            </div>
            <button
              onClick={() => togglePrivacy('allowMarketing')}
              className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                privacySettings.allowMarketing ? 'bg-[#FF5A00] justify-end' : 'bg-gray-300 justify-start'
              }`}
              data-testid="privacy-marketing-toggle"
            >
              <div className="w-5 h-5 bg-white rounded-full mx-1 shadow" />
            </button>
          </div>

          {/* Data Management */}
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-gray-700">Gestion des données</p>
            
            <button 
              className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-medium flex items-center justify-center gap-2"
              data-testid="download-data-btn"
            >
              Télécharger mes données
            </button>
            
            <button 
              className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-medium flex items-center justify-center gap-2"
              data-testid="delete-account-btn"
            >
              Supprimer mon compte
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-400 text-center mt-4">
            ACTOOS ONE respecte votre vie privée. Consultez notre politique de confidentialité pour plus de détails.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}
