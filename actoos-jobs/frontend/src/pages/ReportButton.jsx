import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const ReportButton = ({ itemType, itemId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');

  // Déterminer la clé de traduction pour le type d'élément
  const itemTypeKey = ['job', 'company', 'user'].includes(itemType) ? itemType : 'default';
  const itemTypeLabel = t(`report.itemTypes.${itemTypeKey}`);

  const handleReport = async () => {
    if (!user) {
      toast.error(t('report.mustLogin'));
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
          reason: reason || t('report.reasonDefault')
        })
      });
      toast.success(t('report.sentSuccess'));
      setShowForm(false);
      setReason('');
    } catch (err) {
      toast.error(t('report.sendError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!showForm ? (
        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => setShowForm(true)}>
          <Flag className="w-4 h-4 mr-1" /> {t('report.button')}
        </Button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-lg mb-4">
              {t('report.title', { itemType: itemTypeLabel })}
            </h3>
            <textarea
              className="w-full border rounded-lg p-2 mb-4"
              rows="3"
              placeholder={t('report.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {t('report.cancel')}
              </Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleReport} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
                {t('report.send')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportButton;