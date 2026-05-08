/**
 * ACTOOS ONE - Partner Earnings Screen
 * 
 * Écran de gestion des gains pour les partenaires (restaurants).
 * Permet de voir le solde, l'historique et faire des retraits.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Wallet,
  ArrowDownCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Smartphone,
  Building2,
  RefreshCw,
  Calendar,
  ChevronRight,
  X,
} from 'lucide-react';
import { 
  getPartnerEarnings, 
  getPartnerTransactions,
  createWithdrawalRequest,
  getUserWithdrawals,
  WALLET_TYPES,
  WITHDRAWAL_STATUS,
} from '../services/financialService';
import { calculateWithdrawal, WALLET_CONFIG } from '../config/businessConfig';
import { BottomSheet } from './BottomSheet';

const WITHDRAWAL_METHODS = [
  { id: 'orange_money', name: 'Orange Money', icon: '🟠', feeLabel: '1%' },
  { id: 'wave', name: 'Wave', icon: '🌊', feeLabel: '0.5%' },
  { id: 'moov_money', name: 'Moov Money', icon: '🔵', feeLabel: '1%' },
  { id: 'bank_transfer', name: 'Virement Bancaire', icon: '🏦', feeLabel: '1000 FCFA', delay: '24-48h' },
];

export function PartnerEarningsScreen({ partnerId, onBack }) {
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Withdrawal flow
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState('amount'); // amount, method, confirm, processing, success
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('+223 ');
  const [withdrawError, setWithdrawError] = useState(null);

  // Charger les données
  const loadData = useCallback(async () => {
    if (!partnerId) return;
    
    setIsLoading(true);
    try {
      // Charger les gains
      const { data: earningsData, error: earningsError } = await getPartnerEarnings(partnerId);
      if (earningsError) throw earningsError;
      setEarnings(earningsData);

      // Charger les transactions
      const { data: txnData } = await getPartnerTransactions(partnerId, { limit: 30 });
      setTransactions(txnData || []);

      // Charger les retraits
      if (earningsData?.wallet?.owner_id) {
        const { data: withdrawalsData } = await getUserWithdrawals(earningsData.wallet.owner_id);
        setWithdrawals(withdrawalsData || []);
      }

      setError(null);
    } catch (err) {
      console.error('Erreur chargement gains:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Calculer le retrait
  const withdrawCalculation = selectedMethod && withdrawAmount
    ? calculateWithdrawal(parseInt(withdrawAmount) || 0, selectedMethod)
    : null;

  // Soumettre le retrait
  const handleSubmitWithdrawal = async () => {
    if (!withdrawCalculation?.valid) return;

    setWithdrawStep('processing');
    setWithdrawError(null);

    try {
      const { data, error } = await createWithdrawalRequest(
        earnings.wallet.owner_id,
        WALLET_TYPES.PARTNER_EARNINGS,
        parseInt(withdrawAmount),
        selectedMethod,
        phoneNumber
      );

      if (error) throw error;

      setWithdrawStep('success');
      
      // Recharger les données après 2 secondes
      setTimeout(() => {
        loadData();
      }, 2000);
    } catch (err) {
      console.error('Erreur retrait:', err);
      setWithdrawError(err.message);
      setWithdrawStep('confirm');
    }
  };

  // Reset withdrawal sheet
  const resetWithdrawSheet = () => {
    setShowWithdrawSheet(false);
    setWithdrawStep('amount');
    setWithdrawAmount('');
    setSelectedMethod(null);
    setPhoneNumber('+223 ');
    setWithdrawError(null);
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Get transaction icon
  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earning':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'withdrawal':
        return <ArrowDownCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Chargement des gains...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-900 font-medium mb-2">Erreur de chargement</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-[#FF5A00] text-white rounded-xl"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Mes Gains</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Balance Card */}
        <div className="px-4 pb-8 pt-4">
          <div className="bg-white/10 backdrop-blur rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-white/70">Solde disponible</p>
                <p className="text-3xl font-bold">
                  {(earnings?.balance || 0).toLocaleString()} <span className="text-lg">FCFA</span>
                </p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white/10 rounded-2xl p-3">
                <p className="text-xs text-white/70">Aujourd'hui</p>
                <p className="font-bold text-lg">{(earnings?.todayEarnings || 0).toLocaleString()} F</p>
                <p className="text-xs text-white/70">{earnings?.todayOrders || 0} commandes</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3">
                <p className="text-xs text-white/70">Ce mois</p>
                <p className="font-bold text-lg">{(earnings?.monthEarnings || 0).toLocaleString()} F</p>
              </div>
            </div>

            {/* Withdraw Button */}
            <button
              onClick={() => setShowWithdrawSheet(true)}
              disabled={!earnings?.balance || earnings.balance < WALLET_CONFIG.min_withdrawal}
              className="w-full mt-4 py-4 bg-white text-green-600 font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="withdraw-btn"
            >
              <ArrowDownCircle className="w-5 h-5" />
              Retirer
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-4">
        {/* Pending Withdrawals */}
        {withdrawals.filter(w => w.status === WITHDRAWAL_STATUS.PENDING).length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <p className="font-medium text-yellow-800">Retrait en attente</p>
            </div>
            {withdrawals
              .filter(w => w.status === WITHDRAWAL_STATUS.PENDING)
              .map(w => (
                <div key={w.id} className="flex justify-between items-center mt-2">
                  <span className="text-sm text-yellow-700">{w.method}</span>
                  <span className="font-bold text-yellow-800">{w.amount.toLocaleString()} FCFA</span>
                </div>
              ))}
          </div>
        )}

        {/* Transactions History */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Historique</h2>
            <span className="text-xs text-gray-500">{transactions.length} transactions</span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune transaction</p>
              <p className="text-sm text-gray-400 mt-1">Vos gains apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="px-4 py-3 flex items-center gap-3"
                  data-testid={`transaction-${txn.id}`}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    {getTransactionIcon(txn.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {txn.description || txn.type}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(txn.created_at)}</p>
                  </div>
                  <p className={`font-bold ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(txn.amount) >= 0 ? '+' : ''}{parseFloat(txn.amount).toLocaleString()} F
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Sheet */}
      {showWithdrawSheet && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={(e) => e.target === e.currentTarget && resetWithdrawSheet()}>
          <div className="bg-white w-full max-w-lg mx-auto rounded-t-3xl max-h-[90vh] overflow-y-auto">
            {/* Sheet Header */}
            <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900">
                {withdrawStep === 'success' ? 'Retrait effectué' : 'Retirer des fonds'}
              </h2>
              <button
                onClick={resetWithdrawSheet}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {/* Step: Amount */}
              {withdrawStep === 'amount' && (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Solde disponible: <span className="font-bold text-gray-900">{(earnings?.balance || 0).toLocaleString()} FCFA</span>
                  </p>

                  <div className="space-y-3 mb-6">
                    {[5000, 10000, 25000, 50000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setWithdrawAmount(String(amt))}
                        disabled={amt > (earnings?.balance || 0)}
                        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                          withdrawAmount === String(amt)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-900 disabled:opacity-50'
                        }`}
                      >
                        {amt.toLocaleString()} FCFA
                      </button>
                    ))}
                  </div>

                  <div className="relative mb-6">
                    <input
                      type="number"
                      placeholder="Autre montant"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-lg font-semibold text-center outline-none focus:ring-2 focus:ring-green-500"
                      data-testid="withdraw-amount-input"
                    />
                  </div>

                  <button
                    onClick={() => setWithdrawStep('method')}
                    disabled={!withdrawAmount || parseInt(withdrawAmount) < WALLET_CONFIG.min_withdrawal || parseInt(withdrawAmount) > (earnings?.balance || 0)}
                    className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-50"
                  >
                    Continuer
                  </button>

                  <p className="text-xs text-gray-400 text-center mt-3">
                    Minimum: {WALLET_CONFIG.min_withdrawal.toLocaleString()} FCFA
                  </p>
                </>
              )}

              {/* Step: Method */}
              {withdrawStep === 'method' && (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Montant à retirer: <span className="font-bold text-gray-900">{parseInt(withdrawAmount).toLocaleString()} FCFA</span>
                  </p>

                  <div className="space-y-3 mb-6">
                    {WITHDRAWAL_METHODS.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${
                          selectedMethod === method.id
                            ? 'bg-green-50 border-2 border-green-600'
                            : 'bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <span className="text-2xl">{method.icon}</span>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{method.name}</p>
                          <p className="text-xs text-gray-500">
                            Frais: {method.feeLabel}
                            {method.delay && ` • ${method.delay}`}
                          </p>
                        </div>
                        {selectedMethod === method.id && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedMethod && selectedMethod !== 'bank_transfer' && (
                    <div className="mb-4">
                      <label className="text-sm text-gray-500 mb-2 block">Numéro de téléphone</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="+223 XX XX XX XX"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => setWithdrawStep('confirm')}
                    disabled={!selectedMethod || (selectedMethod !== 'bank_transfer' && phoneNumber.length < 10)}
                    className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-50"
                  >
                    Continuer
                  </button>

                  <button
                    onClick={() => setWithdrawStep('amount')}
                    className="w-full py-3 text-gray-500 mt-2"
                  >
                    Retour
                  </button>
                </>
              )}

              {/* Step: Confirm */}
              {withdrawStep === 'confirm' && withdrawCalculation && (
                <>
                  {withdrawError && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                      <p className="text-red-700 text-sm">{withdrawError}</p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500">Montant demandé</span>
                      <span className="font-medium">{withdrawCalculation.requested.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500">{withdrawCalculation.feeLabel}</span>
                      <span className="font-medium text-red-500">-{withdrawCalculation.fee.toLocaleString()} FCFA</span>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between items-center">
                      <span className="font-bold text-gray-900">Vous recevrez</span>
                      <span className="font-bold text-green-600 text-xl">{withdrawCalculation.received.toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-blue-700">
                      <strong>Délai:</strong> {withdrawCalculation.delay}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      <strong>Destination:</strong> {phoneNumber || 'Compte bancaire'}
                    </p>
                  </div>

                  <button
                    onClick={handleSubmitWithdrawal}
                    className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl"
                    data-testid="confirm-withdraw-btn"
                  >
                    Confirmer le retrait
                  </button>

                  <button
                    onClick={() => setWithdrawStep('method')}
                    className="w-full py-3 text-gray-500 mt-2"
                  >
                    Retour
                  </button>
                </>
              )}

              {/* Step: Processing */}
              {withdrawStep === 'processing' && (
                <div className="py-12 text-center">
                  <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">Traitement en cours...</p>
                  <p className="text-sm text-gray-500 mt-2">Veuillez patienter</p>
                </div>
              )}

              {/* Step: Success */}
              {withdrawStep === 'success' && (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 mb-2">Retrait initié !</p>
                  <p className="text-gray-500">
                    Vous recevrez <strong>{withdrawCalculation?.received.toLocaleString()} FCFA</strong>
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Délai: {withdrawCalculation?.delay}
                  </p>

                  <button
                    onClick={resetWithdrawSheet}
                    className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl mt-8"
                  >
                    Terminé
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartnerEarningsScreen;
