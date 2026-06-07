import React, { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';

const REPORT_REASONS = {
  job: [
    { value: 'offre_inappropriee', label: 'Offre inappropriée' },
    { value: 'offre_fausse', label: 'Offre frauduleuse ou fausse' },
    { value: 'discrimination', label: 'Discrimination' },
    { value: 'spam', label: 'Spam' },
    { value: 'autre', label: 'Autre' },
  ],
  company: [
    { value: 'entreprise_fictive', label: 'Entreprise fictive' },
    { value: 'informations_erronees', label: 'Informations erronées' },
    { value: 'harcelement', label: 'Harcèlement' },
    { value: 'autre', label: 'Autre' },
  ],
};

const ReportButton = ({ itemType, itemId, reporterId }) => {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = REPORT_REASONS[itemType] || REPORT_REASONS.job;

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Veuillez sélectionner un motif.');
      return;
    }

    setLoading(true);
    try {
      const fullReason = `${reason}${details ? ' - ' + details : ''}`;
      await apiFetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({
          reporter_id: reporterId,
          reported_item_type: itemType,
          reported_item_id: itemId,
          reason: fullReason,
        }),
      });
      toast.success('Signalement envoyé. Merci de votre vigilance.');
      setShowModal(false);
      setReason('');
      setDetails('');
    } catch (err) {
      toast.error('Erreur lors du signalement');
    } finally {
      setLoading(false);
    }
  };

  if (!reporterId) return null; // pas connecté

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-sm transition-colors"
        title="Signaler ce contenu"
      >
        <Flag className="w-4 h-4" />
        Signaler
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Flag className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-slate-900">Signaler ce contenu</h3>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Pourquoi souhaitez-vous signaler ce{' '}
              {itemType === 'job' ? "cette offre d'emploi" : 'ce profil entreprise'} ?
            </p>

            <div className="space-y-2 mb-4">
              {reasons.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
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
                    className="text-red-600 focus:ring-red-500"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="Précisez votre signalement (facultatif)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !reason}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Envoyer le signalement
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportButton;