import React, { useState } from 'react';
import { Button } from './ui/button';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const ReportButton = ({ itemType, itemId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');

  const handleReport = async () => {
    if (!user) {
      toast.error('Connectez-vous pour signaler');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({
          reporter_id: user.id,
          reported_item_type: itemType,
          reported_item_id: itemId,
          reason: reason || 'Non spécifiée'
        })
      });
      toast.success('Signalement envoyé');
      setShowForm(false);
      setReason('');
    } catch (err) {
      toast.error('Erreur lors du signalement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!showForm ? (
        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => setShowForm(true)}>
          <Flag className="w-4 h-4 mr-1" /> Signaler
        </Button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-lg mb-4">Signaler ce {itemType === 'job' ? 'cette offre' : itemType === 'company' ? 'cette entreprise' : 'cet utilisateur'}</h3>
            <textarea
              className="w-full border rounded-lg p-2 mb-4"
              rows="3"
              placeholder="Raison du signalement..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700 text-white" onClick={handleReport} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
                Envoyer le signalement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportButton;