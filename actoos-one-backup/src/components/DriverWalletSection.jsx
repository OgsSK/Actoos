/**
 * ACTOOS ONE - Driver Wallet Section
 * 
 * Composant wallet pour le dashboard livreur.
 * Permet d'encaisser les paiements cash des clients.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Wallet,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Banknote,
  RefreshCw,
  AlertTriangle,
  Shield,
  Truck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { BottomSheet } from './BottomSheet';
import { PayQRCodeSheet, ScanQRCodeSheet } from './WalletQRPayment';

export function DriverWalletSection({ driverId, driverName }) {
  const [cautionWallet, setCautionWallet] = useState(null); // Wallet caution
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEncaisser, setShowEncaisser] = useState(false);
  const [showPayCaution, setShowPayCaution] = useState(false);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const MIN_CAUTION = 5000; // Caution minimum requise

  // Charger le wallet livreur (caution)
  const loadWallet = useCallback(async () => {
    if (!driverId || !isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      // Chercher le wallet caution du livreur
      let { data: walletData, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('owner_id', driverId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur wallet livreur:', error);
      }

      if (!walletData) {
        // Créer le wallet si n'existe pas
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert({ owner_id: driverId, balance: 0 })
          .select()
          .single();
        walletData = newWallet;
      }

      setCautionWallet(walletData || { id: 'local', balance: 0 });

      // Charger les transactions
      if (walletData?.id) {
        const { data: txns } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(20);

        setTransactions(txns || []);

        // Stats du jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTxns = (txns || []).filter(t => new Date(t.created_at) >= today);
        
        // Livraisons = nombre de commissions reçues aujourd'hui
        setTodayDeliveries(todayTxns.filter(t => t.type === 'earning' || t.type === 'commission').length);
        
        // Gains = somme des earnings
        setTodayEarnings(
          todayTxns
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        );
      }
    } catch (err) {
      console.error('Erreur chargement wallet livreur:', err);
    } finally {
      setIsLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const balance = cautionWallet?.balance ? parseFloat(cautionWallet.balance) : 0;
  const cautionOk = balance >= MIN_CAUTION;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" data-testid="driver-wallet-section">
      {/* Header */}
      <div className={`text-white p-6 ${cautionOk ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-orange-600 to-orange-500'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Caution Livreur</h3>
              <p className="text-white/70 text-sm">
                {cautionOk ? '✓ Compte actif' : '⚠ Caution insuffisante'}
              </p>
            </div>
          </div>
          <button 
            onClick={loadWallet}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Solde caution */}
        <div className="mb-4">
          <p className="text-white/70 text-sm">Solde caution</p>
          <p className="text-3xl font-bold">
            {balance.toLocaleString()} <span className="text-xl">FCFA</span>
          </p>
          {!cautionOk && (
            <p className="text-yellow-200 text-sm mt-1">
              Minimum requis: {MIN_CAUTION.toLocaleString()} FCFA
            </p>
          )}
        </div>

        {/* Stats du jour */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-sm">Livraisons</span>
            </div>
            <p className="text-2xl font-bold">{todayDeliveries}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-300" />
              <span className="text-sm">Gains</span>
            </div>
            <p className="text-2xl font-bold text-green-300">+{todayEarnings.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Alerte caution insuffisante */}
      {!cautionOk && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Rechargez votre caution</p>
            <p className="text-sm text-yellow-600">
              Vous ne pouvez pas accepter de commandes cash tant que votre caution est inférieure à {MIN_CAUTION.toLocaleString()} FCFA.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowEncaisser(true)}
          disabled={!cautionOk}
          className={`py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
            cautionOk 
              ? 'bg-[#FF5A00] text-white' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          data-testid="driver-encaisser-btn"
        >
          <QrCode className="w-5 h-5" />
          Encaisser Client
        </button>
        <button
          onClick={() => setShowPayCaution(true)}
          className="bg-green-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
          data-testid="driver-caution-btn"
        >
          <Banknote className="w-5 h-5" />
          {cautionOk ? 'Ajouter Caution' : 'Recharger'}
        </button>
      </div>

      {/* Transactions récentes */}
      <div className="px-4 pb-4">
        <h4 className="font-semibold text-gray-900 mb-3">Dernières opérations</h4>
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune transaction</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {transactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  txn.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {txn.amount > 0 ? (
                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{txn.description || txn.type}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(txn.created_at).toLocaleDateString('fr-FR', { 
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                    })}
                  </p>
                </div>
                <p className={`font-bold ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {txn.amount > 0 ? '+' : ''}{parseFloat(txn.amount).toLocaleString()} F
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Encaisser Client (affiche QR) */}
      <PayQRCodeSheet
        isOpen={showEncaisser}
        onClose={() => {
          setShowEncaisser(false);
          loadWallet();
        }}
        userId={driverId}
      />

      {/* Payer/Recharger Caution (scanne QR ACTOOS) */}
      <CautionTopUpSheet
        isOpen={showPayCaution}
        onClose={() => {
          setShowPayCaution(false);
          loadWallet();
        }}
        currentBalance={balance}
        minRequired={MIN_CAUTION}
        walletId={cautionWallet?.id}
      />
    </div>
  );
}

// Composant de recharge caution
function CautionTopUpSheet({ isOpen, onClose, currentBalance, minRequired, walletId }) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('amount'); // amount, processing, success
  const [error, setError] = useState('');

  const suggestedAmount = Math.max(minRequired - currentBalance, 1000);
  const presets = [1000, 2000, 5000, 10000];

  useEffect(() => {
    if (!isOpen) {
      setStep('amount');
      setAmount('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const topUpAmount = parseInt(amount);
    if (topUpAmount < 500) {
      setError('Minimum 500 FCFA');
      return;
    }

    setStep('processing');

    // Simuler le paiement (en production: intégrer Mobile Money)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // En production: mettre à jour le wallet via Supabase
    if (isSupabaseConfigured() && walletId && walletId !== 'local') {
      try {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('id', walletId)
          .single();
        
        if (wallet) {
          const newBalance = parseFloat(wallet.balance) + topUpAmount;
          await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('id', walletId);
          
          await supabase
            .from('wallet_transactions')
            .insert({
              wallet_id: walletId,
              type: 'topup',
              amount: topUpAmount,
              balance_after: newBalance,
              description: 'Recharge caution',
            });
        }
      } catch (err) {
        console.error('Erreur recharge caution:', err);
      }
    }

    setStep('success');
    setTimeout(onClose, 2000);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Recharger la caution">
      <div className="py-4">
        {step === 'amount' && (
          <>
            {/* Info caution */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>Caution actuelle:</strong> {currentBalance.toLocaleString()} FCFA
              </p>
              {currentBalance < minRequired && (
                <p className="text-sm text-blue-700 mt-1">
                  Il vous manque <strong>{(minRequired - currentBalance).toLocaleString()} FCFA</strong> pour activer les commandes cash.
                </p>
              )}
            </div>

            {/* Montant */}
            <div className="mb-4">
              <label className="text-sm text-gray-500 mb-2 block">Montant à ajouter</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={suggestedAmount.toString()}
                className="w-full bg-gray-100 rounded-xl px-4 py-4 text-xl font-bold text-center outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {presets.map(preset => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset.toString())}
                  className={`py-3 rounded-xl font-medium text-sm ${
                    parseInt(amount) === preset
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>

            {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!amount || parseInt(amount) < 500}
              className={`w-full py-4 rounded-xl font-semibold ${
                amount && parseInt(amount) >= 500
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              Recharger {amount ? `${parseInt(amount).toLocaleString()} FCFA` : ''}
            </button>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Traitement du paiement...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">Caution rechargée !</h3>
            <p className="text-gray-500 text-sm">
              +{parseInt(amount).toLocaleString()} FCFA ajoutés à votre caution.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

export default DriverWalletSection;
