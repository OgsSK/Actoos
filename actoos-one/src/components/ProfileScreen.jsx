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
  CreditCard,
  Edit3,
  Check,
  X,
  MessageCircle,
  Mail,
  ChevronDown
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';

// Mock user data
const MOCK_USER = {
  id: 'user-001',
  name: 'Amadou Diallo',
  phone: '+223 70 12 34 56',
  address: 'Bamako, Hamdallaye',
  email: '',
  isLoggedIn: true,
  // Rôles validés par l'admin (activés pour démo)
  role_partner: true,
  role_driver: true,
  role_admin: false,
  // Demandes en cours
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
  onSwitchToDriver,
  onSwitchToPartner,
  onSwitchToAdmin,
  onPrivacyClick,
  onTermsClick
}) {
  const [user, setUser] = useState(MOCK_USER);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  
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

        {/* Magic Switch Section - Seulement si rôles validés */}
        {(user.role_driver || user.role_partner || user.role_admin || user.pending_driver || user.pending_partner) && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#FF5A00]" />
                Changer de Mode
              </h3>
            </div>

            {/* Mode Livreur */}
            {user.role_driver && (
              <button
                onClick={onSwitchToDriver}
                className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
                data-testid="switch-driver-btn"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Mode Livreur</p>
                  <p className="text-xs text-gray-500">Gérer vos courses</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            )}
            {user.pending_driver && (
              <div className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 opacity-60">
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Demande Livreur</p>
                  <p className="text-xs text-yellow-600">En attente de validation...</p>
                </div>
              </div>
            )}

            {/* Mode Partenaire */}
            {user.role_partner && (
              <button
                onClick={onSwitchToPartner}
                className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
                data-testid="switch-partner-btn"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Mode Restaurant</p>
                  <p className="text-xs text-gray-500">Gérer vos commandes (KDS)</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            )}
            {user.pending_partner && (
              <div className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 opacity-60">
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Demande Partenaire</p>
                  <p className="text-xs text-yellow-600">En attente de validation...</p>
                </div>
              </div>
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
                  <p className="text-xs text-gray-500">Tableau de bord</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        )}

        {/* Devenir Partenaire / Livreur - Si pas encore de rôle */}
        {!user.role_driver && !user.role_partner && !user.pending_driver && !user.pending_partner && (
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
                <p className="text-xs text-gray-500">Restaurant, Pharmacie...</p>
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
            onClick={onPrivacyClick}
            className="w-full px-4 py-4 flex items-center gap-4 border-b border-gray-100 active:bg-gray-50"
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
              onClick={() => {
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
