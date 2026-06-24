import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const ReportButton = ({ itemType, itemId, reporterId }) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const titleKey =
    itemType === 'job'
      ? 'report.titleJob'
      : itemType === 'company'
      ? 'report.titleCompany'
      : itemType === 'user'
      ? 'report.titleUser'
      : 'report.titleDefault';

  const subtitleKey =
    itemType === 'job'
      ? 'report.subtitleJob'
      : itemType === 'company'
      ? 'report.subtitleCompany'
      : itemType === 'user'
      ? 'report.subtitleUser'
      : 'report.subtitleDefault';

  const reasons = useMemo(() => {
    const raw =
      t(`reportReasons.${itemType}`, { returnObjects: true }) ||
      t('reportReasons.job', { returnObjects: true });

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return Object.entries(raw).map(([value, label]) => ({
        value,
        label: String(label),
      }));
    }

    return [];
  }, [t, itemType]);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error(t('report.reasonRequired'));
      return;
    }

    if (!reporterId) {
      toast.error(t('report.mustLogin'));
      return;
    }

    setLoading(true);
    try {
      const fullReason = details.trim()
        ? `${reason} - ${details.trim()}`
        : reason;

      const { error } = await supabase.from('reports').insert({
        reporter_id: reporterId,
        reported_item_type: itemType,
        reported_item_id: itemId,
        reason: fullReason,
        status: 'pending',
      });

      if (error) throw error;

      toast.success(t('report.sentSuccess'));
      setShowModal(false);
      setReason('');
      setDetails('');
    } catch (err) {
      console.error('Erreur signalement:', err);
      toast.error(t('report.sendError'));
    } finally {
      setLoading(false);
    }
  };

  if (!reporterId) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-sm transition-colors"
        title={t('report.button')}
        type="button"
      >
        <Flag className="w-4 h-4" />
        {t('report.button')}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Flag className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-slate-900">
                {t(titleKey)}
              </h3>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              {t(subtitleKey)}
            </p>

            <div className="space-y-2 mb-4">
              {reasons.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-sm ${
                    reason === r.value
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <span className="whitespace-normal break-words leading-5">
                    {r.label}
                  </span>
                </label>
              ))}
            </div>

            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder={t('report.detailsPlaceholder')}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                {t('report.cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !reason}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {t('report.send')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportButton;