/**
 * ACTOOS ONE - Partner Wallet Section
 * 
 * Composant wallet pour le dashboard partenaire.
 * Permet d'encaisser les paiements clients en boutique.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Wallet,
  Plus,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
  TrendingUp,
  CreditCard,
  Banknote,
  RefreshCw
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { BottomSheet } from './BottomSheet';
import { PayQRCodeSheet } from './WalletQRPayment';

export function PartnerWalletSection({ partnerId, partnerName }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEncaisser, setShowEncaisser] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);

  // Charger le wallet partenaire
  const loadWallet = useCallback(async () => {
    if (!partnerId || !isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      // Chercher le wallet earnings du partenaire
      let { data: walletData, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('owner_id', partnerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur wallet partenaire:', error);
      }

      if (!walletData) {
        // Créer le wallet si n'existe pas
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert({ owner_id: partnerId, balance: 0 })
          .select()
          .single();
        walletData = newWallet;
      }

      setWallet(walletData || { id: 'local', balance: 0 });

      // Charger les transactions
      if (walletData?.id) {
        const { data: txns } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(20);

        setTransactions(txns || []);

        // Calculer les gains du jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTotal = (txns || [])
          .filter(t => new Date(t.created_at) >= today && t.amount > 0)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        setTodayEarnings(todayTotal);
      }
    } catch (err) {
      console.error('Erreur chargement wallet partenaire:', err);
    } finally {
      setIsLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const balance = wallet?.balance ? parseFloat(wallet.balance) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" data-testid="partner-wallet-section">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF5A00] to-[#FF8A00] text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">ACTOOS Pay</h3>
              <p className="text-white/70 text-sm">Wallet Partenaire</p>
            </div>
          </div>
          <button 
            onClick={loadWallet}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Solde */}
        <div className="mb-4">
          <p className="text-white/70 text-sm">Solde disponible</p>
          <p className="text-3xl font-bold">
            {balance.toLocaleString()} <span className="text-xl">FCFA</span>
          </p>
        </div>

        {/* Stats du jour */}
        <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-300" />
            <span className="text-sm">Gains aujourd'hui</span>
          </div>
          <span className="font-bold text-green-300">+{todayEarnings.toLocaleString()} F</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowEncaisser(true)}
          className="bg-[#FF5A00] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
          data-testid="partner-encaisser-btn"
        >
          <QrCode className="w-5 h-5" />
          Encaisser Client
        </button>
        <button
          onClick={() => setShowWithdraw(true)}
          className="bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
          data-testid="partner-withdraw-btn"
        >
          <Banknote className="w-5 h-5" />
          Retirer
        </button>
      </div>

      {/* Transactions récentes */}
      <div className="px-4 pb-4">
        <h4 className="font-semibold text-gray-900 mb-3">Transactions récentes</h4>
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

      {/* Encaisser Sheet (génère QR) */}
      <PayQRCodeSheet
        isOpen={showEncaisser}
        onClose={() => {
          setShowEncaisser(false);
          loadWallet(); // Recharger après transaction
        }}
        userId={partnerId}
      />

      {/* Withdraw Sheet */}
      <WithdrawSheet
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        balance={balance}
        walletId={wallet?.id}
        onSuccess={loadWallet}
      />
    </div>
  );
}

// Composant de retrait
function WithdrawSheet({ isOpen, onClose, balance, walletId, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('orange_money');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('form'); // form, processing, success
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setAmount('');
      setPhone('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const withdrawAmount = parseInt(amount);
    if (withdrawAmount < 500) {
      setError('Minimum 500 FCFA');
      return;
    }
    if (withdrawAmount > balance) {
      setError('Solde insuffisant');
      return;
    }
    if (!phone || phone.length < 8) {
      setError('Numéro de téléphone invalide');
      return;
    }

    setStep('processing');

    // Simuler le traitement
    await new Promise(resolve => setTimeout(resolve, 2000));

    // En production: créer une demande de retrait dans Supabase
    if (isSupabaseConfigured() && walletId) {
      try {
        await supabase.from('withdrawal_requests').insert({
          wallet_id: walletId,
          amount: withdrawAmount,
          method: method,
          destination: phone,
          status: 'pending',
        });
      } catch (err) {
        console.error('Erreur demande retrait:', err);
      }
    }

    setStep('success');
    setTimeout(() => {
      onClose();
      if (onSuccess) onSuccess();
    }, 2000);
  };

  const methods = [
    { id: 'orange_money', name: 'Orange Money', icon: '🟠' },
    { id: 'wave', name: 'Wave', icon: '🔵' },
    { id: 'moov_money', name: 'Moov Money', icon: '🟢' },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Retirer des fonds">
      <div className="py-4">
        {step === 'form' && (
          <>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500">Solde disponible</p>
              <p className="text-2xl font-bold text-gray-900">{balance.toLocaleString()} FCFA</p>
            </div>

            {/* Montant */}
            <div className="mb-4">
              <label className="text-sm text-gray-500 mb-2 block">Montant à retirer</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-100 rounded-xl px-4 py-4 text-xl font-bold text-center outline-none focus:ring-2 focus:ring-[#FF5A00]"
              />
            </div>

            {/* Méthode */}
            <div className="mb-4">
              <label className="text-sm text-gray-500 mb-2 block">Méthode de retrait</label>
              <div className="grid grid-cols-3 gap-2">
                {methods.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`py-3 rounded-xl text-center ${
                      method === m.id
                        ? 'bg-[#FF5A00] text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <p className="text-xs mt-1">{m.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Numéro */}
            <div className="mb-6">
              <label className="text-sm text-gray-500 mb-2 block">Numéro de téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+223 70 00 00 00"
                className="w-full bg-gray-100 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-[#FF5A00]"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

            <button
              onClick={handleSubmit}
              className="w-full bg-[#FF5A00] text-white py-4 rounded-xl font-semibold"
            >
              Demander le retrait
            </button>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#FF5A00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Traitement en cours...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">Demande envoyée !</h3>
            <p className="text-gray-500 text-sm">
              Vous recevrez {parseInt(amount).toLocaleString()} FCFA sur votre compte dans les 24h.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

export default PartnerWalletSection;
