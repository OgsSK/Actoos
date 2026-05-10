/**
 * ACTOOS ONE - Admin Wallet Section
 * 
 * Composant wallet pour le dashboard admin.
 * Permet de gérer les fonds ACTOOS et d'encaisser livreurs/partenaires.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Wallet,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Users,
  Building2,
  Truck,
  DollarSign,
  Search,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { BottomSheet } from './BottomSheet';
import { PayQRCodeSheet, ScanQRCodeSheet } from './WalletQRPayment';

export function AdminWalletSection({ adminId }) {
  const [actoosWallet, setActoosWallet] = useState(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    pendingWithdrawals: 0,
    activeDrivers: 0,
    activePartners: 0,
  });
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEncaisser, setShowEncaisser] = useState(false);
  const [showPayer, setShowPayer] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview'); // overview, withdrawals

  // Charger les données admin
  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      // Wallet ACTOOS (revenus plateforme)
      let { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('owner_id', 'actoos-platform')
        .maybeSingle();

      if (!walletData) {
        walletData = { id: 'actoos-main', balance: 0 };
      }
      setActoosWallet(walletData);

      // Stats globales
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Compter les partenaires actifs
      const { count: partnersCount } = await supabase
        .from('partners')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Compter les livreurs actifs
      const { count: driversCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Demandes de retrait en attente
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      setWithdrawalRequests(withdrawals || []);

      setStats({
        totalRevenue: parseFloat(walletData?.balance || 0),
        todayRevenue: 0, // À calculer via transactions
        pendingWithdrawals: withdrawals?.length || 0,
        activeDrivers: driversCount || 0,
        activePartners: partnersCount || 0,
      });

    } catch (err) {
      console.error('Erreur chargement données admin:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Traiter une demande de retrait
  const handleWithdrawal = async (requestId, action) => {
    try {
      await supabase
        .from('withdrawal_requests')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: adminId,
        })
        .eq('id', requestId);
      
      loadData(); // Recharger
    } catch (err) {
      console.error('Erreur traitement retrait:', err);
    }
  };

  const balance = actoosWallet?.balance ? parseFloat(actoosWallet.balance) : 0;

  return (
    <div className="space-y-6" data-testid="admin-wallet-section">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-[#FF5A00] rounded-xl flex items-center justify-center">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-bold text-xl">ACTOOS Finance</h2>
              <p className="text-gray-400">Dashboard Administrateur</p>
            </div>
          </div>
          <button 
            onClick={loadData}
            className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Revenus */}
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          <p className="text-gray-400 text-sm">Revenus plateforme</p>
          <p className="text-4xl font-bold">
            {balance.toLocaleString()} <span className="text-xl text-gray-400">FCFA</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <p className="text-xs text-gray-400">Aujourd'hui</p>
            <p className="font-bold">+{stats.todayRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
            <p className="text-xs text-gray-400">Retraits</p>
            <p className="font-bold">{stats.pendingWithdrawals}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <Building2 className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <p className="text-xs text-gray-400">Partenaires</p>
            <p className="font-bold">{stats.activePartners}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <Truck className="w-5 h-5 mx-auto mb-1 text-purple-400" />
            <p className="text-xs text-gray-400">Livreurs</p>
            <p className="font-bold">{stats.activeDrivers}</p>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowEncaisser(true)}
            className="bg-[#FF5A00] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            data-testid="admin-encaisser-btn"
          >
            <QrCode className="w-5 h-5" />
            Encaisser Livreur
          </button>
          <button
            onClick={() => setShowPayer(true)}
            className="bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            data-testid="admin-payer-btn"
          >
            <ArrowUpRight className="w-5 h-5" />
            Payer un compte
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`flex-1 py-4 text-sm font-semibold ${
                selectedTab === 'overview'
                  ? 'text-[#FF5A00] border-b-2 border-[#FF5A00]'
                  : 'text-gray-500'
              }`}
            >
              Vue d'ensemble
            </button>
            <button
              onClick={() => setSelectedTab('withdrawals')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 ${
                selectedTab === 'withdrawals'
                  ? 'text-[#FF5A00] border-b-2 border-[#FF5A00]'
                  : 'text-gray-500'
              }`}
            >
              Demandes de retrait
              {stats.pendingWithdrawals > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.pendingWithdrawals}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {selectedTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Flux financier</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Commissions commandes</span>
                    <span className="font-semibold text-green-600">+12%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Frais de livraison</span>
                    <span className="font-semibold text-green-600">+8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Retraits payés</span>
                    <span className="font-semibold text-red-600">-{(balance * 0.3).toLocaleString()} F</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  <strong>💡 Conseil:</strong> {stats.pendingWithdrawals} demande(s) de retrait en attente. 
                  Traitez-les dans les 24h pour maintenir la confiance des partenaires.
                </p>
              </div>
            </div>
          )}

          {selectedTab === 'withdrawals' && (
            <div>
              {withdrawalRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune demande de retrait en attente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawalRequests.map((req) => (
                    <div key={req.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {req.method === 'orange_money' ? '🟠' : req.method === 'wave' ? '🔵' : '🟢'} 
                            {' '}{req.destination}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(req.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          {parseFloat(req.amount).toLocaleString()} F
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleWithdrawal(req.id, 'approve')}
                          className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleWithdrawal(req.id, 'reject')}
                          className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Encaisser Livreur (génère QR) */}
      <PayQRCodeSheet
        isOpen={showEncaisser}
        onClose={() => {
          setShowEncaisser(false);
          loadData();
        }}
        userId={adminId || 'actoos-admin'}
      />

      {/* Payer un compte (scanne QR) */}
      <ScanQRCodeSheet
        isOpen={showPayer}
        onClose={() => {
          setShowPayer(false);
          loadData();
        }}
        onPaymentConfirmed={(data) => {
          console.log('Paiement admin effectué:', data);
          loadData();
        }}
      />
    </div>
  );
}

export default AdminWalletSection;
