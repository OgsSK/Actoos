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
  Building2
} from 'lucide-react';
import { useWallet, TRANSACTION_TYPES } from '../context/WalletContext';
import { TouchPaySheet } from './TouchPaySheet';
import { P2PTransferSheet } from './P2PTransferSheet';

export function WalletScreen({ onBack }) {
  const { balance, transactions, isLoading, walletType, dailySpendLimit, companyName, getTodaySpending } = useWallet();
  const [showTopUp, setShowTopUp] = useState(false);
  const [showP2P, setShowP2P] = useState(false);

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

  const getTransactionIcon = (type) => {
    switch (type) {
      case TRANSACTION_TYPES.TOPUP:
      case TRANSACTION_TYPES.TRANSFER_IN:
      case TRANSACTION_TYPES.CORPORATE_TOPUP:
        return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
      case TRANSACTION_TYPES.PAYMENT:
      case TRANSACTION_TYPES.TRANSFER_OUT:
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case TRANSACTION_TYPES.REFUND:
        return <RotateCcw className="w-5 h-5 text-blue-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case TRANSACTION_TYPES.TOPUP:
      case TRANSACTION_TYPES.TRANSFER_IN:
      case TRANSACTION_TYPES.CORPORATE_TOPUP:
        return 'bg-green-100';
      case TRANSACTION_TYPES.PAYMENT:
      case TRANSACTION_TYPES.TRANSFER_OUT:
        return 'bg-red-100';
      case TRANSACTION_TYPES.REFUND:
        return 'bg-blue-100';
      default:
        return 'bg-gray-100';
    }
  };

  const isEmployee = walletType === 'employee';
  const todaySpent = isEmployee ? getTodaySpending() : 0;
  const remainingLimit = isEmployee && dailySpendLimit ? dailySpendLimit - todaySpent : null;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="wallet-screen">
      {/* Header */}
      <header className="bg-primary text-white px-4 pt-4 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30 transition-colors"
            data-testid="wallet-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Mon Wallet</h1>
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
              className="flex-1 bg-white text-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-gray-100 transition-colors disabled:opacity-50"
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

      {/* Transactions History */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Historique</h2>
          <span className="text-sm text-gray-500">{transactions.length} transactions</span>
        </div>

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
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTransactionColor(txn.transaction_type)}`}>
                  {getTransactionIcon(txn.transaction_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{txn.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{formatDate(txn.created_at)}</span>
                    {txn.status === 'completed' && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        Terminé
                      </span>
                    )}
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
    </div>
  );
}
