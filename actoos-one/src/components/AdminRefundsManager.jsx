/**
 * ACTOOS ONE - Admin Refunds Manager
 * 
 * Gère les demandes de remboursement.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  DollarSign,
  User,
  ShoppingBag,
  Filter,
} from 'lucide-react';
import { getRefundRequests, processRefund, REFUND_STATUS } from '../services/refundService';

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approuvé', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  processed: { label: 'Traité', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export function AdminRefundsManager({ onBack }) {
  // Admin context doesn't have AuthProvider, so we don't use useAuth here
  const user = null; // Admin actions will pass null for user ID
  const [refunds, setRefunds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processed: 0,
    totalAmount: 0,
  });

  // Charger les remboursements
  const loadRefunds = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getRefundRequests(
        filterStatus === 'all' ? null : filterStatus
      );
      
      if (error) throw error;
      
      setRefunds(data || []);
      
      // Calculer les stats
      const pending = (data || []).filter(r => r.status === 'pending').length;
      const processed = (data || []).filter(r => r.status === 'processed').length;
      const totalAmount = (data || [])
        .filter(r => r.status === 'processed')
        .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      
      setStats({
        total: data?.length || 0,
        pending,
        processed,
        totalAmount,
      });
    } catch (err) {
      console.error('Erreur chargement remboursements:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  // Traiter un remboursement
  const handleProcess = async (refundId, action) => {
    setProcessingId(refundId);
    try {
      const { error } = await processRefund(refundId, user?.id, action);
      
      if (error) throw error;
      
      // Recharger
      await loadRefunds();
    } catch (err) {
      console.error('Erreur traitement:', err);
      alert(err.message || 'Erreur lors du traitement');
    } finally {
      setProcessingId(null);
    }
  };

  // Filtrer par recherche
  const filteredRefunds = refunds.filter(refund => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      refund.order_id?.toLowerCase().includes(query) ||
      refund.users?.email?.toLowerCase().includes(query) ||
      refund.users?.name?.toLowerCase().includes(query) ||
      refund.reason?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-refunds-manager">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Remboursements</h1>
              <p className="text-sm text-gray-500">Gérer les demandes de remboursement</p>
            </div>
          </div>
          <button
            onClick={loadRefunds}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">En attente</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Traités</p>
                <p className="text-xl font-bold text-green-600">{stats.processed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Montant total</p>
                <p className="text-xl font-bold text-purple-600">{stats.totalAmount.toLocaleString()} F</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par commande, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-[#FF5A00]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-gray-100 rounded-lg outline-none"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="processed">Traités</option>
                <option value="rejected">Rejetés</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune demande de remboursement</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRefunds.map((refund) => {
              const statusConfig = STATUS_CONFIG[refund.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;
              
              return (
                <div
                  key={refund.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Commande #{refund.order_id?.slice(-6) || 'N/A'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <User className="w-4 h-4" />
                          <span>{refund.users?.email || 'Client'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#FF5A00]">
                        {parseFloat(refund.amount || 0).toLocaleString()} F
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600">
                      <strong>Raison:</strong> {refund.reason || 'Non spécifiée'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Demandé le {new Date(refund.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  {refund.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleProcess(refund.id, 'approve')}
                        disabled={processingId === refund.id}
                        className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processingId === refund.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approuver et rembourser
                      </button>
                      <button
                        onClick={() => handleProcess(refund.id, 'reject')}
                        disabled={processingId === refund.id}
                        className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeter
                      </button>
                    </div>
                  )}

                  {refund.status === 'processed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-sm text-green-700">
                        ✅ Remboursé le {new Date(refund.processed_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}

                  {refund.status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <p className="text-sm text-red-700">
                        ❌ Rejeté - Pas de remboursement
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminRefundsManager;
