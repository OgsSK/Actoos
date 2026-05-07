import { useState } from 'react';
import { 
  ArrowLeft,
  Wallet,
  Plus,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Clock,
  CheckCircle,
  CreditCard,
  Building2,
  Users,
  ChevronRight,
  Trash2,
  AlertCircle,
  Lock,
  MessageSquare
} from 'lucide-react';
import { useWallet, TRANSACTION_TYPES, TRANSACTION_STATUS } from '../context/WalletContext';
import { TouchPaySheet } from './TouchPaySheet';
import { P2PTransferSheet } from './P2PTransferSheet';
import { CreateSubWalletSheet } from './CreateSubWalletSheet';

export function WalletScreen({ onBack }) {
  const { 
    balance, 
    transactions, 
    pendingTransfers,
    isLoading, 
    walletType, 
    dailySpendLimit, 
    companyName, 
    getTodaySpending,
    subWallets,
    deleteSubWallet
  } = useWallet();
  
  const [showTopUp, setShowTopUp] = useState(false);
  const [showP2P, setShowP2P] = useState(false);
  const [showCreateSubWallet, setShowCreateSubWallet] = useState(false);
  const [activeSection, setActiveSection] = useState('main'); // main, subwallets, cards

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getTransactionIcon = (type, status) => {
    if (status === TRANSACTION_STATUS.PENDING_REGISTRATION) {
      return <MessageSquare className="w-5 h-5 text-yellow-600" />;
    }
    switch (type) {
      case TRANSACTION_TYPES.TOPUP:
      case TRANSACTION_TYPES.TRANSFER_IN:
      case TRANSACTION_TYPES.CORPORATE_TOPUP:
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
      case TRANSACTION_TYPES.PAYMENT:
      case TRANSACTION_TYPES.TRANSFER_OUT:
      case TRANSACTION_TYPES.TRANSFER_PENDING:
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case TRANSACTION_TYPES.REFUND:
        return <RotateCcw className="w-5 h-5 text-blue-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionColor = (type, status) => {
    if (status === TRANSACTION_STATUS.PENDING_REGISTRATION) {
      return 'bg-yellow-100';
    }
    switch (type) {
      case TRANSACTION_TYPES.TOPUP:
      case TRANSACTION_TYPES.TRANSFER_IN:
      case TRANSACTION_TYPES.CORPORATE_TOPUP:
        return 'bg-green-100';
      case TRANSACTION_TYPES.PAYMENT:
      case TRANSACTION_TYPES.TRANSFER_OUT:
      case TRANSACTION_TYPES.TRANSFER_PENDING:
        return 'bg-red-100';
      case TRANSACTION_TYPES.REFUND:
        return 'bg-blue-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case TRANSACTION_STATUS.COMPLETED:
        return (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
            Terminé
          </span>
        );
      case TRANSACTION_STATUS.PENDING_REGISTRATION:
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-600">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      default:
        return null;
    }
  };

  const isEmployee = walletType === 'employee';
  const todaySpent = isEmployee ? getTodaySpending() : 0;
  const remainingLimit = isEmployee && dailySpendLimit ? dailySpendLimit - todaySpent : null;

  const handleDeleteSubWallet = async (id) => {
    if (window.confirm('Supprimer ce sous-wallet ? Le solde sera remboursé.')) {
      await deleteSubWallet(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="wallet-screen">
      {/* Header */}
      <header className="bg-[#FF5A00] text-white px-4 pt-4 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30 transition-colors"
            data-testid="wallet-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">ACTOOS Pay</h1>
            {isEmployee && companyName && (
              <p className="text-xs text-white/70 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {companyName}
              </p>
            )}
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-white/10 backdrop-blur rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-white/80" />
            <span className="text-white/80 text-sm">Solde disponible</span>
          </div>
          <p className="text-4xl font-bold" data-testid="wallet-balance">
            {balance.toLocaleString()} <span className="text-2xl">FCFA</span>
          </p>

          {/* Corporate Limit Info */}
          {isEmployee && dailySpendLimit && (
            <div className="mt-4 bg-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Limite journalière</span>
                <span className="font-medium">{dailySpendLimit.toLocaleString()} F</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-white/70">Dépensé aujourd'hui</span>
                <span className="font-medium">{todaySpent.toLocaleString()} F</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    remainingLimit <= 0 ? 'bg-red-400' : remainingLimit < dailySpendLimit * 0.2 ? 'bg-yellow-400' : 'bg-white'
                  }`}
                  style={{ width: `${Math.min(100, (todaySpent / dailySpendLimit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/70 mt-1 text-right">
                Reste: {(remainingLimit || 0).toLocaleString()} F
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowTopUp(true)}
              disabled={isLoading}
              className="flex-1 bg-white text-[#FF5A00] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-gray-100 transition-colors disabled:opacity-50"
              data-testid="topup-btn"
            >
              <Plus className="w-5 h-5" />
              Recharger
            </button>
            <button
              onClick={() => setShowP2P(true)}
              disabled={isLoading || balance < 100}
              className="flex-1 bg-white/20 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-white/30 transition-colors disabled:opacity-50"
              data-testid="send-btn"
            >
              <Send className="w-5 h-5" />
              Envoyer
            </button>
          </div>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl p-1 flex shadow-sm">
          <button
            onClick={() => setActiveSection('main')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
              activeSection === 'main' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
            }`}
          >
            Historique
          </button>
          <button
            onClick={() => setActiveSection('subwallets')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
              activeSection === 'subwallets' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
            }`}
          >
            Sous-comptes
          </button>
          <button
            onClick={() => setActiveSection('cards')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
              activeSection === 'cards' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
            }`}
          >
            Cartes
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Section: Historique */}
        {activeSection === 'main' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Historique</h2>
              <span className="text-sm text-gray-500">{transactions.length} transactions</span>
            </div>

            {/* Transferts en attente */}
            {pendingTransfers.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-yellow-700 font-medium mb-2 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Transferts en attente ({pendingTransfers.length})
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  {pendingTransfers.map((pt) => (
                    <div key={pt.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{pt.recipient_phone}</p>
                        <p className="text-xs text-yellow-700">En attente d'inscription</p>
                      </div>
                      <p className="font-bold text-gray-900">{pt.amount.toLocaleString()} F</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {transactions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune transaction</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="bg-white rounded-2xl p-4 flex items-center gap-4"
                    data-testid={`transaction-${txn.id}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTransactionColor(txn.transaction_type, txn.status)}`}>
                      {getTransactionIcon(txn.transaction_type, txn.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{txn.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{formatDate(txn.created_at)}</span>
                        {getStatusBadge(txn.status)}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-bold ${txn.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount.toLocaleString()} F
                      </p>
                      <p className="text-xs text-gray-400">
                        Solde: {txn.balance_after.toLocaleString()} F
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Section: Sous-comptes (B2B & Famille) */}
        {activeSection === 'subwallets' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Sous-comptes</h2>
                <p className="text-xs text-gray-500">Gérez les wallets famille/employés</p>
              </div>
              <button
                onClick={() => setShowCreateSubWallet(true)}
                className="bg-[#FF5A00] text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer
              </button>
            </div>

            {subWallets.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">Aucun sous-compte</p>
                <p className="text-xs text-gray-400">
                  Créez des sous-wallets pour vos enfants ou employés avec des règles de dépense.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {subWallets.map((sw) => (
                  <div
                    key={sw.id}
                    className="bg-white rounded-2xl p-4 border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{sw.wallet_name}</p>
                          <p className="text-xs text-gray-500">{sw.linked_phone}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSubWallet(sw.id)}
                        className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>

                    {/* Smart Rules */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Solde alloué</span>
                        <span className="font-semibold text-gray-900">{sw.balance.toLocaleString()} F</span>
                      </div>
                      
                      {sw.daily_spend_limit && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Limite/jour</span>
                          <span className="font-medium text-gray-700">{sw.daily_spend_limit.toLocaleString()} F</span>
                        </div>
                      )}
                      
                      {sw.allowed_time_start && sw.allowed_time_end && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Heures</span>
                          <span className="font-medium text-gray-700">{sw.allowed_time_start} - {sw.allowed_time_end}</span>
                        </div>
                      )}
                      
                      {sw.allowed_categories && sw.allowed_categories.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Catégories</span>
                          <span className="font-medium text-gray-700 capitalize">{sw.allowed_categories.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Section: Cartes Virtuelles (Bientôt disponible) */}
        {activeSection === 'cards' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Cartes Virtuelles</h2>
              <span className="bg-[#FF5A00] text-white text-xs px-2 py-1 rounded-full font-semibold">
                Bientôt
              </span>
            </div>

            <div className="bg-gray-100 rounded-2xl p-6 text-center opacity-60">
              <div className="w-full max-w-[280px] h-[170px] bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl mx-auto mb-6 relative overflow-hidden">
                <div className="absolute inset-0 flex flex-col justify-between p-5">
                  <div className="flex justify-between items-start">
                    <Lock className="w-6 h-6 text-white/50" />
                    <span className="text-white/50 font-bold text-lg">VISA</span>
                  </div>
                  <div>
                    <p className="text-white/50 font-mono text-lg tracking-wider">
                      •••• •••• •••• ••••
                    </p>
                    <div className="flex justify-between mt-3">
                      <div>
                        <p className="text-white/40 text-xs">Titulaire</p>
                        <p className="text-white/50 text-sm">VOTRE NOM</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs">Expire</p>
                        <p className="text-white/50 text-sm">••/••</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-gray-500 font-semibold mb-2">Cartes Visa Virtuelles</h3>
              <p className="text-gray-400 text-sm mb-4">
                Créez des cartes virtuelles pour vos achats en ligne en toute sécurité.
              </p>

              <div className="bg-[#FF5A00]/10 border border-[#FF5A00]/20 rounded-xl p-4">
                <p className="text-[#FF5A00] font-medium text-sm">
                  Cette fonctionnalité sera disponible prochainement.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Vous serez notifié dès son lancement.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* TouchPay Sheet */}
      <TouchPaySheet
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
      />

      {/* P2P Transfer Sheet */}
      <P2PTransferSheet
        isOpen={showP2P}
        onClose={() => setShowP2P(false)}
      />

      {/* Create Sub-Wallet Sheet */}
      <CreateSubWalletSheet
        isOpen={showCreateSubWallet}
        onClose={() => setShowCreateSubWallet(false)}
      />
    </div>
  );
}
