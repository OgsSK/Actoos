import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, Sparkles, FileText, Briefcase, User, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

const CoverLetter = () => {
  const { t } = useTranslation();
  const [jobDescription, setJobDescription] = useState('');
  const [candidateProfile, setCandidateProfile] = useState('');
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!jobDescription.trim() || !candidateProfile.trim()) {
      toast.error(t('coverLetter.toasts.fillBothFields'));
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'cover-letter',
          text: `Offre : ${jobDescription}\n\nProfil : ${candidateProfile}`,
        }),
      });
      setLetter(res.result);
      toast.success(t('coverLetter.toasts.generated'));
    } catch (err) {
      toast.error(err.message || t('coverLetter.toasts.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    toast.success(t('coverLetter.toasts.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <Badge className="bg-blue-100 text-blue-700 border-0 mb-4">{t('coverLetter.badge')}</Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('coverLetter.title')}</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {t('coverLetter.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                  <Briefcase className="w-5 h-5 text-blue-600" /> {t('coverLetter.jobSection')}
                </h3>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={t('coverLetter.jobPlaceholder')}
                />
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-blue-600" /> {t('coverLetter.profileSection')}
                </h3>
                <textarea
                  value={candidateProfile}
                  onChange={(e) => setCandidateProfile(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={t('coverLetter.profilePlaceholder')}
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                {t('coverLetter.generateButton')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> {t('coverLetter.letterTitle')}
                </h3>
                {letter && (
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 mr-2" /> : null}
                    {copied ? t('coverLetter.copiedButton') : t('coverLetter.copyButton')}
                  </Button>
                )}
              </div>
              {letter ? (
                <div className="bg-slate-50 rounded-xl p-4 text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {letter}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400">
                  <FileText className="w-16 h-16 mx-auto mb-4" />
                  <p>{t('coverLetter.emptyState')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CoverLetter;