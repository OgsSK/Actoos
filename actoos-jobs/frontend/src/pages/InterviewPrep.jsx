import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Loader2, Briefcase, User, Lightbulb, Target, FileText, MessageSquare, Save, Trash2,
  CheckCircle, ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';

/* ---------- Bloc éditable avec gestion du curseur ---------- */
const EditableBlock = ({ title, icon: Icon, content, onChange, onSave, saving, onDelete, lastSaved, placeholder, t }) => {
  const editableRef = useRef(null);
  const cursorPosRef = useRef(null);

  const saveCursorPosition = () => {
    const el = editableRef.current;
    if (!el) return;
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const preRange = document.createRange();
      preRange.selectNodeContents(el);
      preRange.setEnd(range.startContainer, range.startOffset);
      cursorPosRef.current = preRange.toString().length;
    }
  };

  useEffect(() => {
    const el = editableRef.current;
    if (!el || cursorPosRef.current === null) return;
    try {
      const range = document.createRange();
      const textNodes = [];
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walk.nextNode())) textNodes.push(node);

      let charCount = 0;
      let targetNode = null;
      let targetOffset = 0;
      for (const tn of textNodes) {
        if (charCount + tn.length >= cursorPosRef.current) {
          targetNode = tn;
          targetOffset = cursorPosRef.current - charCount;
          break;
        }
        charCount += tn.length;
      }
      if (targetNode) {
        range.setStart(targetNode, Math.min(targetOffset, targetNode.length));
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) { /* ignore */ }
    cursorPosRef.current = null;
  }, [content]);

  const handleInput = (e) => {
    saveCursorPosition();
    onChange(e.currentTarget.textContent);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Icon className="w-4 h-4 text-blue-600" /> {title}
        </h4>
        <div className="flex gap-1">
          {content && (
            <Button variant="ghost" size="sm" onClick={onDelete} title={t('common.delete')}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        dir="ltr"
        onInput={handleInput}
        className="w-full text-sm border border-slate-100 rounded-lg p-3 whitespace-pre-wrap
                   focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        style={{
          minHeight: '120px',
          maxHeight: '300px',
          overflowY: 'auto',
          direction: 'ltr',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
        }}
        data-placeholder={placeholder}
      >
        {content}
      </div>
      {lastSaved && (
        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> {t('common.savedAt', { time: lastSaved })}
        </p>
      )}
    </div>
  );
};

/* ---------- Onglets ---------- */
const TABS = [
  { key: 'questions', label: 'Questions', icon: MessageSquare },
  { key: 'answers', label: 'Réponses', icon: Lightbulb },
  { key: 'tips', label: 'Conseils', icon: Lightbulb },
];

const INTERVIEW_PREP_CACHE_KEY = 'actoos_interview_prep_v2';

const InterviewPrep = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id');

  const [jobDescription, setJobDescription] = useState('');
  const [candidateProfile, setCandidateProfile] = useState('');
  const [contents, setContents] = useState({ questions: '', answers: '', tips: '' });
  const [activeTab, setActiveTab] = useState('questions');
  const [saving, setSaving] = useState(false);
  const [lastSavedMap, setLastSavedMap] = useState({});

  useEffect(() => {
    if (jobId) {
      supabase.from('jobs').select('description').eq('id', jobId).single()
        .then(({ data }) => { if (data) setJobDescription(data.description); });
    }
    try {
      const cached = JSON.parse(localStorage.getItem(INTERVIEW_PREP_CACHE_KEY));
      if (cached) {
        if (cached.jobDescription) setJobDescription(cached.jobDescription);
        if (cached.candidateProfile) setCandidateProfile(cached.candidateProfile);
        if (cached.contents) setContents(cached.contents);
        if (cached.lastSavedMap) setLastSavedMap(cached.lastSavedMap);
      }
    } catch {}
  }, [jobId]);

  const saveToCache = useCallback((data) => {
    localStorage.setItem(INTERVIEW_PREP_CACHE_KEY, JSON.stringify(data));
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    const data = {
      jobDescription,
      candidateProfile,
      contents,
      lastSavedMap: { ...lastSavedMap, main: new Date().toLocaleTimeString() }
    };
    saveToCache(data);
    setLastSavedMap(prev => ({ ...prev, main: new Date().toLocaleTimeString() }));
    setSaving(false);
    toast.success(t('interviewPrep.toasts.saved'));
  };

  const handleSaveContent = async (tab) => {
    setSaving(true);
    const updatedContents = { ...contents, [tab]: contents[tab] };
    const data = {
      jobDescription,
      candidateProfile,
      contents: updatedContents,
      lastSavedMap: { ...lastSavedMap, [tab]: new Date().toLocaleTimeString() }
    };
    saveToCache(data);
    setLastSavedMap(prev => ({ ...prev, [tab]: new Date().toLocaleTimeString() }));
    setSaving(false);
    toast.success(t('interviewPrep.toasts.saved'));
  };

  const handleDeleteContent = async (tab) => {
    const updatedContents = { ...contents, [tab]: '' };
    setContents(updatedContents);
    const data = {
      jobDescription,
      candidateProfile,
      contents: updatedContents,
      lastSavedMap: { ...lastSavedMap, [tab]: null }
    };
    saveToCache(data);
    setLastSavedMap(prev => ({ ...prev, [tab]: null }));
    toast.success(t('interviewPrep.toasts.noteDeleted'));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSaveContent(activeTab);
    }, 2000);
    return () => clearTimeout(timer);
  }, [contents[activeTab], activeTab]);

  const handleTabChange = (tab) => {
    handleSaveContent(activeTab);
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('interviewPrep.back', 'Retour')}
        </Link>

        <div className="text-center mb-10">
          <Badge className="bg-blue-100 text-blue-700 border-0 mb-4">{t('interviewPrep.badge')}</Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('interviewPrep.title')}</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {t('interviewPrep.description')}
          </p>
        </div>

        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={handleSaveAll} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {t('interviewPrep.saveAll')}
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  {t('interviewPrep.jobSection')}
                </h2>
                <EditableBlock
                  title={t('interviewPrep.jobSection')}
                  icon={Briefcase}
                  content={jobDescription}
                  onChange={(val) => setJobDescription(val)}
                  onSave={handleSaveAll}
                  saving={saving}
                  onDelete={() => setJobDescription('')}
                  lastSaved={lastSavedMap['main']}
                  placeholder={t('interviewPrep.jobPlaceholder')}
                  t={t}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  {t('interviewPrep.profileSection')}
                </h2>
                <EditableBlock
                  title={t('interviewPrep.profileSection')}
                  icon={User}
                  content={candidateProfile}
                  onChange={(val) => setCandidateProfile(val)}
                  onSave={handleSaveAll}
                  saving={saving}
                  onDelete={() => setCandidateProfile('')}
                  lastSaved={lastSavedMap['main']}
                  placeholder={t('interviewPrep.profilePlaceholder')}
                  t={t}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> {t('interviewPrep.results')}
              </h3>

              <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-200 pb-px">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                    {t(`interviewPrep.tabs.${tab.key}`)}
                  </button>
                ))}
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {TABS.map(tab => (
                  activeTab === tab.key && (
                    <div key={tab.key} className="space-y-3">
                      <EditableBlock
                        title={t(`interviewPrep.${tab.key}.title`)}
                        icon={tab.icon}
                        content={contents[tab.key]}
                        onChange={(val) => setContents(prev => ({ ...prev, [tab.key]: val }))}
                        onSave={() => handleSaveContent(tab.key)}
                        saving={saving}
                        onDelete={() => handleDeleteContent(tab.key)}
                        lastSaved={lastSavedMap[tab.key]}
                        placeholder={t('interviewPrep.empty')}
                        t={t}
                      />
                    </div>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;