import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, Sparkles, Briefcase, User, Lightbulb, Target } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

const InterviewPrep = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id');

  const [jobDescription, setJobDescription] = useState('');
  const [candidateProfile, setCandidateProfile] = useState('');
  const [questions, setQuestions] = useState('');
  const [answers, setAnswers] = useState('');
  const [tips, setTips] = useState('');
  const [loading, setLoading] = useState({ questions: false, answers: false, tips: false });

  useEffect(() => {
    if (jobId) {
      supabase.from('jobs').select('description').eq('id', jobId).single()
        .then(({ data }) => { if (data) setJobDescription(data.description); });
    }
  }, [jobId]);

  const handleGenerate = async (agentId, setter) => {
    if (!jobDescription.trim()) {
      toast.error(t('interviewPrep.toast.needJobDescription'));
      return;
    }
    setLoading(prev => ({ ...prev, [agentId]: true }));
    try {
      const res = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: agentId,
          text: jobDescription,
          context: candidateProfile
        }),
      });
      setter(res.result);
      toast.success(t('interviewPrep.toast.success'));
    } catch (err) {
      toast.error(err.message || t('interviewPrep.toast.error'));
    } finally {
      setLoading(prev => ({ ...prev, [agentId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <Badge className="bg-blue-100 text-blue-700 border-0 mb-4">{t('interviewPrep.badge')}</Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('interviewPrep.title')}</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {t('interviewPrep.description')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                {t('interviewPrep.jobSection')}
              </h2>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={t('interviewPrep.jobPlaceholder')}
              />
              
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                {t('interviewPrep.profileSection')}
              </h2>
              <textarea
                value={candidateProfile}
                onChange={(e) => setCandidateProfile(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={t('interviewPrep.profilePlaceholder')}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    {t('interviewPrep.questions.title')}
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => handleGenerate('interview-questions', setQuestions)}
                    disabled={loading['interview-questions']}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loading['interview-questions'] ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {t('interviewPrep.generateButton')}
                  </Button>
                </div>
                {questions ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-sm whitespace-pre-wrap">{questions}</div>
                ) : (
                  <p className="text-sm text-slate-500 italic">{t('interviewPrep.questions.empty')}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    {t('interviewPrep.answers.title')}
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => handleGenerate('interview-answers', setAnswers)}
                    disabled={loading['interview-answers'] || !questions}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loading['interview-answers'] ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {t('interviewPrep.generateButton')}
                  </Button>
                </div>
                {answers ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-sm whitespace-pre-wrap">{answers}</div>
                ) : (
                  <p className="text-sm text-slate-500 italic">{t('interviewPrep.answers.empty')}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    {t('interviewPrep.tips.title')}
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => handleGenerate('interview-tips', setTips)}
                    disabled={loading['interview-tips']}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loading['interview-tips'] ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {t('interviewPrep.generateButton')}
                  </Button>
                </div>
                {tips ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-sm whitespace-pre-wrap">{tips}</div>
                ) : (
                  <p className="text-sm text-slate-500 italic">{t('interviewPrep.tips.empty')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;