/**
 * ACTOOS ONE - Admin Wallets Overview
 * 
 * Vue globale de tous les wallets du système.
 * Clients, Partenaires, Livreurs.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Users,
  Store,
  Truck,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { WALLET_TYPES } from '../services/financialService';

const WALLET_TYPE_CONFIG = {
  client: { 
    label: 'Clients', 
    icon: Users, 
    color: 'blue',
    description: 'Wallets clients pour paiements' 
  },
  partner_earnings: { 
    label: 'Partenaires', 
    icon: Store, 
    color: 'green',
    description: 'Gains des restaurants' 
  },
  driver_caution: { 
    label: 'Livreurs', 
    icon: Truck, 
    color: 'orange',
    description: 'Cautions livreurs' 
  },
};

export function AdminWalletsOverview() {
  const [wallets, setWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalBalance: 0,
    clientBalance: 0,
    partnerBalance: 0,
    driverBalance: 0,
    walletCount: 0,
  });
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Charger les wallets
  const loadWallets = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      // Mode mock
      setWallets([
        { id: '1', owner_id: 'user1', wallet_type: 'client', balance: 15000, users: { name: 'Amadou Diallo', phone: '+223 70 12 34 56' } },
        { id: '2', owner_id: 'user2', wallet_type: 'partner_earnings', balance: 125000, users: { name: 'Maquis Chez Tanti', phone: '+223 76 00 00 01' } },
        { id: '3', owner_id: 'user3', wallet_type: 'driver_caution', balance: 8500, users: { name: 'Moussa Keita', phone: '+223 79 00 00 01' } },
        { id: '4', owner_id: 'user4', wallet_type: 'client', balance: 5000, users: { name: 'Fatoumata Ba', phone: '+223 70 00 00 02' } },
        { id: '5', owner_id: 'user5', wallet_type: 'partner_earnings', balance: 87000, users: { name: 'Le Dragon d\'Or', phone: '+223 76 00 00 02' } },
        { id: '6', owner_id: 'user6', wallet_type: 'driver_caution', balance: 12000, users: { name: 'Ibrahim Traore', phone: '+223 79 00 00 02' } },
      ]);
      setStats({
        totalBalance: 252500,
        clientBalance: 20000,
        partnerBalance: 212000,
        driverBalance: 20500,
        walletCount: 6,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select(`
          *,
          users (name, phone, email)
        `)
        .order('balance', { ascending: false });

      if (fetchError) throw fetchError;

      setWallets(data || []);

      // Calculer les stats
      const clientWallets = (data || []).filter(w => w.wallet_type === 'client');
      const partnerWallets = (data || []).filter(w => w.wallet_type === 'partner_earnings');
      const driverWallets = (data || []).filter(w => w.wallet_type === 'driver_caution');

      setStats({
        totalBalance: (data || []).reduce((sum, w) => sum + parseFloat(w.balance || 0), 0),
        clientBalance: clientWallets.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0),
        partnerBalance: partnerWallets.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0),
        driverBalance: driverWallets.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0),
        walletCount: (data || []).length,
      });

      setError(null);
    } catch (err) {
      console.error('Erreur chargement wallets:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  // Charger les transactions d'un wallet
  const loadWalletTransactions = async (walletId) => {
    if (!isSupabaseConfigured()) {
      setWalletTransactions([
        { id: 1, type: 'topup', amount: 10000, description: 'Recharge Orange Money', created_at: new Date().toISOString() },
        { id: 2, type: 'payment', amount: -2500, description: 'Commande #A42', created_at: new Date().toISOString() },
      ]);
      return;
    }

    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setWalletTransactions(data || []);
    } catch (err) {
      console.error('Erreur transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Filtrer les wallets
  const filteredWallets = wallets.filter(w => {
    const matchesType = selectedType === 'all' || w.wallet_type === selectedType;
    const matchesSearch = !searchTerm || 
      w.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.users?.phone?.includes(searchTerm);
    return matchesType && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5" />
            <span className="text-sm opacity-80">Total Wallets</span>
          </div>
          <p className="text-2xl font-bold">{stats.walletCount}</p>
          <p className="text-sm opacity-80">{stats.totalBalance.toLocaleString()} FCFA</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm opacity-80">Clients</span>
          </div>
          <p className="text-2xl font-bold">
            {wallets.filter(w => w.wallet_type === 'client').length}
          </p>
          <p className="text-sm opacity-80">{stats.clientBalance.toLocaleString()} FCFA</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-5 h-5" />
            <span className="text-sm opacity-80">Partenaires</span>
          </div>
          <p className="text-2xl font-bold">
            {wallets.filter(w => w.wallet_type === 'partner_earnings').length}
          </p>
          <p className="text-sm opacity-80">{stats.partnerBalance.toLocaleString()} FCFA</p>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5" />
            <span className="text-sm opacity-80">Livreurs</span>
          </div>
          <p className="text-2xl font-bold">
            {wallets.filter(w => w.wallet_type === 'driver_caution').length}
          </p>
          <p className="text-sm opacity-80">{stats.driverBalance.toLocaleString()} FCFA</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, téléphone..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-xl font-medium text-sm ${
              selectedType === 'all' ? 'bg-[#FF5A00] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Tous
          </button>
          {Object.entries(WALLET_TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 ${
                  selectedType === type ? 'bg-[#FF5A00] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={loadWallets}
          className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Wallets List */}
      {error ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Utilisateur</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Type</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Solde</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWallets.map((wallet) => {
                const typeConfig = WALLET_TYPE_CONFIG[wallet.wallet_type] || { label: wallet.wallet_type, color: 'gray' };
                const Icon = typeConfig.icon || Wallet;
                
                return (
                  <tr key={wallet.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-${typeConfig.color}-100 flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 text-${typeConfig.color}-600`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{wallet.users?.name || 'Utilisateur'}</p>
                          <p className="text-sm text-gray-500">{wallet.users?.phone || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}>
                        {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-gray-900">{parseFloat(wallet.balance || 0).toLocaleString()} F</p>
                      {wallet.is_frozen && (
                        <span className="text-xs text-red-500">🔒 Gelé</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedWallet(wallet);
                          loadWalletTransactions(wallet.id);
                        }}
                        className="p-2 text-gray-500 hover:text-[#FF5A00] hover:bg-gray-100 rounded-lg"
                        title="Voir détails"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredWallets.length === 0 && (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun wallet trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Wallet Detail Modal */}
      {selectedWallet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedWallet(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-${WALLET_TYPE_CONFIG[selectedWallet.wallet_type]?.color || 'gray'}-100 flex items-center justify-center`}>
                  <Wallet className={`w-7 h-7 text-${WALLET_TYPE_CONFIG[selectedWallet.wallet_type]?.color || 'gray'}-600`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedWallet.users?.name || 'Utilisateur'}</h3>
                  <p className="text-sm text-gray-500">{selectedWallet.users?.phone}</p>
                  <p className="text-2xl font-bold text-[#FF5A00] mt-1">
                    {parseFloat(selectedWallet.balance || 0).toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h4 className="font-medium text-gray-700 mb-3">Transactions récentes</h4>
              
              {loadingTransactions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#FF5A00] animate-spin" />
                </div>
              ) : walletTransactions.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Aucune transaction</p>
              ) : (
                <div className="space-y-2">
                  {walletTransactions.map((txn) => (
                    <div key={txn.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        parseFloat(txn.amount) >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {parseFloat(txn.amount) >= 0 
                          ? <ArrowUpCircle className="w-4 h-4 text-green-600" />
                          : <ArrowDownCircle className="w-4 h-4 text-red-600" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{txn.description || txn.type}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(txn.created_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <p className={`font-bold ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(txn.amount) >= 0 ? '+' : ''}{parseFloat(txn.amount).toLocaleString()} F
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => setSelectedWallet(null)}
                className="w-full py-3 bg-gray-200 text-gray-700 font-medium rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminWalletsOverview;
