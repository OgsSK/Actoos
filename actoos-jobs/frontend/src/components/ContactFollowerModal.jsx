import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api'; // ✅ import de apiFetch
import { toast } from 'sonner';
import { Loader2, X, Send, Briefcase } from 'lucide-react';

const ContactFollowerModal = ({ isOpen, onClose, follower, companyId, userId }) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('quick');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen || tab !== 'invite') return;
    setLoadingJobs(true);
    supabase
      .from('jobs')
      .select('id, title')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => setJobs(data || []))
      .finally(() => setLoadingJobs(false));
  }, [isOpen, tab, companyId]);

  const handleSend = async () => {
    if (!subject.trim() && tab === 'quick') {
      toast.error(t('contactModal.subjectRequired', 'Veuillez saisir un sujet.'));
      return;
    }
    setSending(true);
    try {
      // ✅ Utilisation de apiFetch et envoi de la langue
      const data = await apiFetch('/api/companies/contact-follower', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          follower_id: follower.user_id,
          company_id: companyId,
          message_type: tab === 'invite' ? 'invite_to_apply' : 'quick_message',
          subject,
          body,
          job_id: tab === 'invite' ? selectedJobId : null,
          language: i18n.language, // langue de l'utilisateur
        }),
      });

      if (data.success) {
        toast.success(t('contactModal.sent', 'Message envoyé avec succès !'));
        onClose();
      } else {
        toast.error(data.detail || t('common.error'));
      }
    } catch (err) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('contactModal.title', 'Contacter {{name}}', { name: `${follower.first_name} ${follower.last_name}` })}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setTab('quick')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === 'quick' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send className="w-4 h-4 inline mr-1" />
            {t('contactModal.quickMessage', 'Message rapide')}
          </button>
          <button
            onClick={() => setTab('invite')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              tab === 'invite' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase className="w-4 h-4 inline mr-1" />
            {t('contactModal.inviteToApply', 'Inviter à postuler')}
          </button>
        </div>

        <div className="p-6 space-y-4">
          {tab === 'quick' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('contactModal.subject', 'Sujet')}
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('contactModal.subjectPlaceholder', 'Sujet de votre message')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('contactModal.message', 'Message')}
                </label>
                <textarea
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('contactModal.messagePlaceholder', 'Votre message...')}
                />
              </div>
            </>
          )}

          {tab === 'invite' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('contactModal.selectJob', 'Offre concernée')}
                </label>
                {loadingJobs ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md bg-white"
                  >
                    <option value="">{t('contactModal.selectJobPlaceholder', 'Sélectionnez une offre')}</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>{job.title}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('contactModal.message', 'Message personnalisé (optionnel)')}
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('contactModal.inviteMessagePlaceholder', 'Ajoutez un message personnalisé...')}
                />
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button onClick={handleSend} disabled={sending || (tab === 'invite' && !selectedJobId)}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {t('contactModal.send', 'Envoyer')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactFollowerModal;