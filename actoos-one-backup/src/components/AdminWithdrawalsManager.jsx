/**
 * ACTOOS ONE - Admin Withdrawals Manager
 * 
 * Gestion des demandes de retrait pour l'admin.
 * Permet d'approuver ou rejeter les retraits.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Smartphone,
  Building2,
  User,
  Wallet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { 
  getAllWithdrawals, 
  approveWithdrawal, 
  rejectWithdrawal,
  WITHDRAWAL_STATUS 
} from '../services/financialService';

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'yellow', icon: Clock },
  processing: { label: 'En cours', color: 'blue', icon: Loader2 },
  completed: { label: 'Complété', color: 'green', icon: CheckCircle },
  failed: { label: 'Échoué', color: 'red', icon: XCircle },
  cancelled: { label: 'Annulé', color: 'gray', icon: XCircle },
};

const METHOD_CONFIG = {
  orange_money: { label: 'Orange Money', icon: '🟠' },
  wave: { label: 'Wave', icon: '🌊' },
  moov_money: { label: 'Moov Money', icon: '🔵' },
  bank_transfer: { label: 'Virement Bancaire', icon: '🏦' },
};

export function AdminWithdrawalsManager({ adminId }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, completed
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    pendingCount: 0,
    pendingAmount: 0,
    todayCompleted: 0,
    todayAmount: 0,
  });

  // Charger les retraits
  const loadWithdrawals = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await getAllWithdrawals({ limit: 100 });
      
      if (fetchError) throw fetchError;
      
      setWithdrawals(data || []);
      
      // Calculer les stats
      const pending = (data || []).filter(w => w.status === 'pending');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCompleted = (data || []).filter(w => 
        w.status === 'completed' && new Date(w.processed_at) >= today
      );
      
      setStats({
        pendingCount: pending.length,
        pendingAmount: pending.reduce((sum, w) => sum + w.amount, 0),
        todayCompleted: todayCompleted.length,
        todayAmount: todayCompleted.reduce((sum, w) => sum + w.amount, 0),
      });
      
      setError(null);
    } catch (err) {
      console.error('Erreur chargement retraits:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  // Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadWithdrawals();
    setIsRefreshing(false);
  };

  // Approuver un retrait
  const handleApprove = async (withdrawalId) => {
    setProcessingId(withdrawalId);
    try {
      const { error } = await approveWithdrawal(withdrawalId, adminId);
      if (error) throw error;
      
      // Mettre à jour localement
      setWithdrawals(prev => prev.map(w => 
        w.id === withdrawalId 
          ? { ...w, status: 'completed', processed_at: new Date().toISOString() }
          : w
      ));
      
      // Recalculer stats
      await loadWithdrawals();
    } catch (err) {
      alert('Erreur: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Rejeter un retrait
  const handleReject = async () => {
    if (!showRejectModal || !rejectReason) return;
    
    setProcessingId(showRejectModal);
    try {
      const { error } = await rejectWithdrawal(showRejectModal, adminId, rejectReason);
      if (error) throw error;
      
      setWithdrawals(prev => prev.map(w => 
        w.id === showRejectModal 
          ? { ...w, status: 'cancelled', rejection_reason: rejectReason }
          : w
      ));
      
      setShowRejectModal(null);
      setRejectReason('');
      await loadWithdrawals();
    } catch (err) {
      alert('Erreur: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Filtrer les retraits
  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesFilter = filter === 'all' || 
      (filter === 'pending' && w.status === 'pending') ||
      (filter === 'completed' && w.status === 'completed');
    
    const matchesSearch = !searchTerm || 
      w.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.users?.phone?.includes(searchTerm);
    
    return matchesFilter && matchesSearch;
  });

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-700">En attente</span>
          </div>
          <p className="text-2xl font-bold text-yellow-800">{stats.pendingCount}</p>
          <p className="text-xs text-yellow-600">{stats.pendingAmount.toLocaleString()} FCFA</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">Aujourd'hui</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{stats.todayCompleted}</p>
          <p className="text-xs text-green-600">{stats.todayAmount.toLocaleString()} FCFA</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-700">Total traité ce mois</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {withdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0).toLocaleString()} FCFA
          </p>
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
          {[
            { id: 'all', label: 'Tous' },
            { id: 'pending', label: 'En attente' },
            { id: 'completed', label: 'Complétés' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl font-medium text-sm ${
                filter === f.id 
                  ? 'bg-[#FF5A00] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Withdrawals List */}
      {error ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600">{error}</p>
          <button onClick={loadWithdrawals} className="mt-4 px-4 py-2 bg-[#FF5A00] text-white rounded-xl">
            Réessayer
          </button>
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <ArrowDownCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune demande de retrait</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWithdrawals.map((withdrawal) => {
            const statusConfig = STATUS_CONFIG[withdrawal.status] || STATUS_CONFIG.pending;
            const methodConfig = METHOD_CONFIG[withdrawal.method] || { label: withdrawal.method, icon: '💳' };
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedId === withdrawal.id;
            
            return (
              <div 
                key={withdrawal.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
              >
                {/* Main Row */}
                <div 
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(isExpanded ? null : withdrawal.id)}
                >
                  {/* Status Badge */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${statusConfig.color}-100`}>
                    <StatusIcon className={`w-5 h-5 text-${statusConfig.color}-600 ${withdrawal.status === 'processing' ? 'animate-spin' : ''}`} />
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {withdrawal.users?.name || 'Utilisateur'}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-700`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {methodConfig.icon} {methodConfig.label} • {withdrawal.destination}
                    </p>
                  </div>
                  
                  {/* Amount */}
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{withdrawal.amount?.toLocaleString()} F</p>
                    <p className="text-xs text-gray-500">{formatDate(withdrawal.created_at)}</p>
                  </div>
                  
                  {/* Expand Icon */}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Montant demandé</p>
                        <p className="font-medium">{withdrawal.amount?.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Frais</p>
                        <p className="font-medium">{withdrawal.fee?.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Net à recevoir</p>
                        <p className="font-medium text-green-600">{withdrawal.net_amount?.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Téléphone</p>
                        <p className="font-medium">{withdrawal.users?.phone || '-'}</p>
                      </div>
                    </div>
                    
                    {withdrawal.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p className="text-sm text-red-700">
                          <strong>Raison du rejet:</strong> {withdrawal.rejection_reason}
                        </p>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    {withdrawal.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(withdrawal.id); }}
                          disabled={processingId === withdrawal.id}
                          className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
                          data-testid={`approve-${withdrawal.id}`}
                        >
                          {processingId === withdrawal.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                          Approuver
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowRejectModal(withdrawal.id); }}
                          disabled={processingId === withdrawal.id}
                          className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
                          data-testid={`reject-${withdrawal.id}`}
                        >
                          <XCircle className="w-5 h-5" />
                          Rejeter
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rejeter le retrait</h3>
            
            <p className="text-sm text-gray-500 mb-4">
              Veuillez indiquer la raison du rejet. Le montant sera remboursé au wallet de l'utilisateur.
            </p>
            
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison du rejet..."
              className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={3}
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason || processingId}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {processingId ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminWithdrawalsManager;
