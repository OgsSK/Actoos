import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import AIAssistant from '../components/AIAssistant';
import EditableLinks from '../components/EditableLinks';
import { toast } from 'sonner';
import {
  User, Briefcase, FileText, GraduationCap, Award,
  MapPin, Globe, Plus, X, Save, Loader2,
  Upload, Trash2, ChevronLeft, Check, Calendar, Building2, Link,
  Camera, File, ExternalLink, Sparkles, Eye, Flag
} from 'lucide-react';
import { cn, EXPERIENCE_LEVELS } from '../lib/utils';

// ---------- Section Header ----------
const SectionHeader = ({ icon: Icon, title, description, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    {action}
  </div>
);

// ---------- Skill Badge ----------
const SkillBadge = ({ skill, onRemove }) => (
  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1">
    {skill}
    <button
      type="button"
      onClick={() => onRemove(skill)}
      className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  </Badge>
);

// ---------- Experience Item ----------
const ExperienceItem = ({ experience, onEdit, onRemove, t }) => (
  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200">
          <Building2 className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h3 className="font-medium text-slate-900">{experience.title}</h3>
          <p className="text-sm text-slate-600">{experience.company}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{experience.start_date} - {experience.end_date || t('candidateProfilePage.experience.present')}</span>
            {experience.location && (
              <>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5" />
                <span>{experience.location}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" type="button" onClick={() => onEdit(experience)}>
          {t('candidateProfilePage.experience.edit')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="text-red-500 hover:text-red-700"
          onClick={() => onRemove(experience.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
    {experience.description && (
      <p className="text-sm text-slate-600 mt-3 pl-15">{experience.description}</p>
    )}
  </div>
);

// ---------- Education Item ----------
const EducationItem = ({ education, onEdit, onRemove, t }) => (
  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200">
          <GraduationCap className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h3 className="font-medium text-slate-900">{education.degree}</h3>
          <p className="text-sm text-slate-600">{education.school}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{education.year}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" type="button" onClick={() => onEdit(education)}>
          {t('candidateProfilePage.education.edit')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="text-red-500 hover:text-red-700"
          onClick={() => onRemove(education.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
);

// ---------- Experience Modal ----------
const ExperienceModal = ({ isOpen, onClose, onSave, experience = null, t }) => {
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    start_date: '',
    end_date: '',
    current: false,
    description: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setErrors({});
    if (experience) {
      setForm(experience);
    } else {
      setForm({
        title: '',
        company: '',
        location: '',
        start_date: '',
        end_date: '',
        current: false,
        description: '',
      });
    }
  }, [experience, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const newErrors = {};
    if (!form.title?.trim()) newErrors.title = true;
    if (!form.company?.trim()) newErrors.company = true;
    if (!form.start_date) newErrors.start_date = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(t('candidateProfilePage.experience.fillRequired'));
      return;
    }

    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            {experience ? t('candidateProfilePage.experience.modalEditTitle') : t('candidateProfilePage.experience.modalAddTitle')}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.experience.jobTitle')}</label>
            <Input
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value });
                if (errors.title) setErrors(prev => ({ ...prev, title: false }));
              }}
              className={errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.experience.company')}</label>
            <Input
              value={form.company}
              onChange={(e) => {
                setForm({ ...form, company: e.target.value });
                if (errors.company) setErrors(prev => ({ ...prev, company: false }));
              }}
              className={errors.company ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.experience.location')}</label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.experience.startDate')}</label>
              <Input
                type="month"
                value={form.start_date}
                onChange={(e) => {
                  setForm({ ...form, start_date: e.target.value });
                  if (errors.start_date) setErrors(prev => ({ ...prev, start_date: false }));
                }}
                className={errors.start_date ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.experience.endDate')}</label>
              <Input
                type="month"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                disabled={form.current}
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.checked, end_date: '' })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">{t('candidateProfilePage.experience.currentlyWorking')}</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.experience.description')}</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="mt-2">
              <AIAssistant
                agentId="cv-experience"
                initialText={form.description}
                context={`${form.title} chez ${form.company}`}
                onApply={(newDesc) => setForm({ ...form, description: newDesc })}
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={onClose}>{t('candidateProfilePage.experience.cancel')}</Button>
          <Button type="button" onClick={handleSave}>
            {experience ? t('candidateProfilePage.experience.save') : t('candidateProfilePage.experience.saveNew')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------- Education Modal ----------
const EducationModal = ({ isOpen, onClose, onSave, education = null, t }) => {
  const [form, setForm] = useState({ degree: '', school: '', field: '', year: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setErrors({});
    if (education) setForm(education);
    else setForm({ degree: '', school: '', field: '', year: '' });
  }, [education, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const newErrors = {};
    if (!form.degree?.trim()) newErrors.degree = true;
    if (!form.school?.trim()) newErrors.school = true;
    if (!form.year) newErrors.year = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(t('candidateProfilePage.education.fillRequired'));
      return;
    }

    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            {education ? t('candidateProfilePage.education.modalEditTitle') : t('candidateProfilePage.education.modalAddTitle')}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.education.degree')}</label>
            <Input
              value={form.degree}
              onChange={(e) => {
                setForm({ ...form, degree: e.target.value });
                if (errors.degree) setErrors(prev => ({ ...prev, degree: false }));
              }}
              className={errors.degree ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.education.school')}</label>
            <Input
              value={form.school}
              onChange={(e) => {
                setForm({ ...form, school: e.target.value });
                if (errors.school) setErrors(prev => ({ ...prev, school: false }));
              }}
              className={errors.school ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.education.field')}</label>
            <Input
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.education.year')}</label>
            <Input
              type="number"
              min="1950"
              max={new Date().getFullYear()}
              value={form.year}
              onChange={(e) => {
                setForm({ ...form, year: e.target.value });
                if (errors.year) setErrors(prev => ({ ...prev, year: false }));
              }}
              className={errors.year ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={onClose}>{t('candidateProfilePage.education.cancel')}</Button>
          <Button type="button" onClick={handleSave}>
            {education ? t('candidateProfilePage.education.save') : t('candidateProfilePage.education.saveNew')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------- Analyse CV Modale ----------
const CvAnalysisModal = ({ isOpen, onClose, cvText, onTextChange, onAnalyze, analyzing, result, t }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t('candidateProfilePage.cvAnalysis.title')}</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">{t('candidateProfilePage.cvAnalysis.description')}</p>
          <textarea
            rows={8}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm"
            value={cvText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={t('candidateProfilePage.cvAnalysis.placeholder')}
          />
          {result && (
            <div className="bg-blue-50 rounded-xl p-4 text-sm whitespace-pre-wrap">
              <p className="font-medium mb-2">{t('candidateProfilePage.cvAnalysis.suggestions')}</p>
              {result}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={onClose}>{t('candidateProfilePage.cvAnalysis.close')}</Button>
          <Button type="button" onClick={onAnalyze} disabled={analyzing || !cvText.trim()}>
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {analyzing ? t('candidateProfilePage.cvAnalysis.analyzing') : t('candidateProfilePage.cvAnalysis.analyze')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------- Main Component ----------
const CandidateProfilePage = () => {
  const { t, i18n } = useTranslation();   // ← ajout de i18n
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cities, setCities] = useState([]);
  const [errors, setErrors] = useState({});

  const [personalInfo, setPersonalInfo] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    city_id: '',
    avatar_url: '',
  });

  const [candidateInfo, setCandidateInfo] = useState({
    title: '',
    bio: '',
    experience_level: '',
    years_of_experience: 0,
    is_available: true,
    is_open_to_remote: false,
    desired_salary_min: '',
    desired_salary_max: '',
  });

  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [education, setEducation] = useState([]);
  const [links, setLinks] = useState([]);

  const [cvUrl, setCvUrl] = useState('');
  const [uploadingCV, setUploadingCV] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [cvText, setCvText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEdu, setEditingEdu] = useState(null);

  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setCities(data || []);
    };
    fetchCities();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchLinks();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setPersonalInfo({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        city_id: profile.city_id || '',
        avatar_url: profile.avatar_url || '',
      });

      const cp = profile.candidate_profile || {};
      setCandidateInfo({
        title: cp.title || '',
        bio: cp.bio || '',
        experience_level: cp.experience_level || '',
        years_of_experience: cp.years_of_experience || 0,
        is_available: cp.is_available ?? true,
        is_open_to_remote: cp.is_open_to_remote || false,
        desired_salary_min: cp.desired_salary_min || '',
        desired_salary_max: cp.desired_salary_max || '',
      });

      setSkills(cp.skills || []);
      setExperiences(cp.experience || []);
      setEducation(cp.education || []);
      setCvUrl(cp.cv_url || '');
    }
  }, [profile]);

  const fetchLinks = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('links')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setLinks(data?.links || []);
    } catch (err) {
      console.error('Erreur chargement liens:', err);
    }
  };

  const fetchDocuments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('candidate_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  // ---- Photo de profil ----
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        const res = await apiFetch('/api/upload', {
          method: 'POST',
          body: JSON.stringify({
            bucket: 'avatars',
            folder: user.id,
            filename: `avatar-${Date.now()}.${file.name.split('.').pop()}`,
            file_data: base64Data
          })
        });
        await updateProfile({ avatar_url: res.url });
        toast.success(t('candidateProfilePage.photo.updated'));
        await refreshProfile();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(t('candidateProfilePage.photo.uploadError'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm(t('candidateProfilePage.photo.deleteConfirm'))) return;
    try {
      if (personalInfo.avatar_url) {
        const urlParts = personalInfo.avatar_url.split('/avatars/');
        if (urlParts[1]) await supabase.storage.from('avatars').remove([urlParts[1]]);
      }
      await updateProfile({ avatar_url: null });
      toast.success(t('candidateProfilePage.photo.deleted'));
      await refreshProfile();
    } catch (err) {
      toast.error(t('candidateProfilePage.photo.deleteError'));
    }
  };

  // ---- CV principal ----
  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('candidateProfilePage.cv.invalidFormat'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('candidateProfilePage.cv.fileTooLarge'));
      return;
    }
    setUploadingCV(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/cv-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('cvs').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(fileName);
      await supabase.from('candidate_profiles').upsert({ user_id: user.id, cv_url: urlData.publicUrl }, { onConflict: 'user_id' });
      toast.success(t('candidateProfilePage.cv.uploadedToast'));
      await refreshProfile();
    } catch (error) {
      toast.error(t('candidateProfilePage.cv.uploadError'));
    } finally {
      setUploadingCV(false);
    }
  };

  const handleDeleteCV = async () => {
    if (!window.confirm(t('candidateProfilePage.cv.deleteConfirm'))) return;
    setUploadingCV(true);
    try {
      if (cvUrl) {
        const urlParts = cvUrl.split('/cvs/');
        if (urlParts[1]) await supabase.storage.from('cvs').remove([urlParts[1]]);
      }
      await supabase.from('candidate_profiles').upsert({ user_id: user.id, cv_url: null }, { onConflict: 'user_id' });
      toast.success(t('candidateProfilePage.cv.deletedToast'));
      await refreshProfile();
    } catch (error) {
      toast.error(t('candidateProfilePage.cv.deleteError'));
    } finally {
      setUploadingCV(false);
    }
  };

  // ---- Documents supplémentaires ----
  const handleDocumentUpload = async (file, fileType = 'other') => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        const res = await apiFetch('/api/upload-document', {
          method: 'POST',
          body: JSON.stringify({
            user_id: user.id,
            file_data: base64Data,
            filename: `doc-${Date.now()}.${file.name.split('.').pop()}`,
            file_type: fileType
          })
        });
        setDocuments(prev => [{
          id: res.document?.id || Date.now().toString(),
          name: file.name,
          file_url: res.url,
          file_type: fileType
        }, ...prev]);
        toast.success(t('candidateProfilePage.documents.addedToast'));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erreur upload document:', err);
      toast.error(t('candidateProfilePage.documents.uploadError'));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm(t('candidateProfilePage.documents.deleteConfirm'))) return;
    try {
      const urlParts = doc.file_url.split('/candidate-documents/');
      if (urlParts[1]) await supabase.storage.from('candidate-documents').remove([urlParts[1]]);
      await supabase.from('candidate_documents').delete().eq('id', doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success(t('candidateProfilePage.documents.deletedToast'));
    } catch (err) {
      console.error('Erreur suppression document:', err);
      toast.error(t('candidateProfilePage.documents.deleteError'));
    }
  };

  // ---- Analyse IA du CV ----
  const handleAnalyzeCV = async () => {
    if (!cvText.trim()) {
      toast.error(t('candidateProfilePage.cvAnalysis.emptyText'));
      return;
    }
    setAnalyzing(true);
    try {
      const res = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'cv-analysis',
          text: cvText,
          context: candidateInfo.title || '',
          language: i18n.language,   // ← AJOUTÉ pour l'analyse multilingue
        })
      });
      setAnalysisResult(res.result);
      toast.success(t('candidateProfilePage.cvAnalysis.doneToast'));
    } catch (err) {
      toast.error(err.message || t('candidateProfilePage.cvAnalysis.errorToast'));
    } finally {
      setAnalyzing(false);
    }
  };

  // ---- Compétences ----
  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => setSkills(skills.filter(s => s !== skillToRemove));

  // ---- Expériences ----
  const handleSaveExperience = (exp) => {
    if (editingExp) {
      setExperiences(experiences.map(e => e.id === editingExp.id ? { ...exp, id: editingExp.id } : e));
    } else {
      setExperiences([...experiences, { ...exp, id: Date.now().toString() }]);
    }
    setShowExpModal(false);
    setEditingExp(null);
  };

  const handleRemoveExperience = (id) => setExperiences(experiences.filter(e => e.id !== id));

  // ---- Éducation ----
  const handleSaveEducation = (edu) => {
    if (editingEdu) {
      setEducation(education.map(e => e.id === editingEdu.id ? { ...edu, id: editingEdu.id } : e));
    } else {
      setEducation([...education, { ...edu, id: Date.now().toString() }]);
    }
    setShowEduModal(false);
    setEditingEdu(null);
  };

  const handleRemoveEducation = (id) => setEducation(education.filter(e => e.id !== id));

  // ---- Sauvegarde ----
  const handleSave = async () => {
    const newErrors = {};
    if (!personalInfo.first_name?.trim()) newErrors.first_name = true;
    if (!personalInfo.last_name?.trim()) newErrors.last_name = true;
    if (!candidateInfo.title?.trim()) newErrors.title = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(t('candidateProfilePage.toasts.fillRequired'));
      return;
    }

    setSaving(true);
    try {
      const cleanedPersonalInfo = { ...personalInfo, email: user.email, city_id: personalInfo.city_id || null };
      await updateProfile(cleanedPersonalInfo);

      const { error } = await supabase.from('candidate_profiles').upsert({
        user_id: user.id,
        title: (candidateInfo.title || '').substring(0, 200),
        bio: candidateInfo.bio,
        experience_level: candidateInfo.experience_level || null,
        years_of_experience: candidateInfo.years_of_experience,
        is_available: candidateInfo.is_available,
        is_open_to_remote: candidateInfo.is_open_to_remote,
        desired_salary_min: candidateInfo.desired_salary_min ? parseInt(candidateInfo.desired_salary_min) : null,
        desired_salary_max: candidateInfo.desired_salary_max ? parseInt(candidateInfo.desired_salary_max) : null,
        skills,
        experience: experiences,
        education,
        links,
      }, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success(t('candidateProfilePage.toasts.profileUpdated'));
      await refreshProfile();
      await fetchLinks();
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      toast.error(error.message || t('candidateProfilePage.toasts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2" type="button">
              <ChevronLeft className="w-4 h-4" />
              {t('candidateProfilePage.back')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('candidateProfilePage.title')}</h1>
              <p className="text-slate-600">{t('candidateProfilePage.subtitle')}</p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            type="button"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('candidateProfilePage.save')}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Photo */}
          <Card>
            <CardContent className="p-6 flex items-center gap-6">
              <div className="relative w-24 h-24">
                {personalInfo.avatar_url ? (
                  <img src={personalInfo.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-12 h-12 text-blue-600" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow hover:bg-blue-700"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{t('candidateProfilePage.photo.title')}</h3>
                <p className="text-sm text-slate-500">{t('candidateProfilePage.photo.hint')}</p>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} type="button">
                    <Upload className="w-4 h-4 mr-2" /> {t('candidateProfilePage.photo.change')}
                  </Button>
                  {personalInfo.avatar_url && (
                    <Button variant="outline" size="sm" onClick={handleDeletePhoto} className="text-red-600 hover:bg-red-50" type="button">
                      <Trash2 className="w-4 h-4 mr-2" /> {t('candidateProfilePage.photo.delete')}
                    </Button>
                  )}
                </div>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </CardContent>
          </Card>

          {/* Informations personnelles */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader icon={User} title={t('candidateProfilePage.personalInfo.sectionTitle')} description={t('candidateProfilePage.personalInfo.sectionDesc')} />
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.personalInfo.firstName')}</label>
                  <Input
                    value={personalInfo.first_name}
                    onChange={(e) => {
                      setPersonalInfo({ ...personalInfo, first_name: e.target.value });
                      if (errors.first_name) setErrors(prev => ({ ...prev, first_name: false }));
                    }}
                    className={errors.first_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.personalInfo.lastName')}</label>
                  <Input
                    value={personalInfo.last_name}
                    onChange={(e) => {
                      setPersonalInfo({ ...personalInfo, last_name: e.target.value });
                      if (errors.last_name) setErrors(prev => ({ ...prev, last_name: false }));
                    }}
                    className={errors.last_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.personalInfo.phone')}</label>
                  <Input
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    placeholder={t('candidateProfilePage.personalInfo.phonePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.personalInfo.city')}</label>
                  <select
                    value={personalInfo.city_id}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, city_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">{t('candidateProfilePage.personalInfo.selectCity')}</option>
                    {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profil professionnel */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader icon={Briefcase} title={t('candidateProfilePage.professionalProfile.sectionTitle')} description={t('candidateProfilePage.professionalProfile.sectionDesc')} />
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.professionalProfile.title')}</label>
                  <Input
                    value={candidateInfo.title}
                    onChange={(e) => {
                      setCandidateInfo({ ...candidateInfo, title: e.target.value });
                      if (errors.title) setErrors(prev => ({ ...prev, title: false }));
                    }}
                    className={errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  <div className="mt-2">
                    <AIAssistant
                      agentId="cv-summary"
                      initialText={candidateInfo.title}
                      onApply={(newTitle) => setCandidateInfo({ ...candidateInfo, title: newTitle })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.professionalProfile.bio')}</label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={candidateInfo.bio}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, bio: e.target.value })}
                  />
                  <div className="mt-2">
                    <AIAssistant
                      agentId="cv-summary"
                      initialText={candidateInfo.bio}
                      context={candidateInfo.title}
                      onApply={(newBio) => setCandidateInfo({ ...candidateInfo, bio: newBio })}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.professionalProfile.experienceLevel')}</label>
                    <select
                      value={candidateInfo.experience_level}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, experience_level: e.target.value })}
                      className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">{t('candidateProfilePage.professionalProfile.selectLevel')}</option>
                      {Object.entries(EXPERIENCE_LEVELS).map(([key, val]) => (
                        <option key={key} value={key}>{t(`experienceLevels.${key}`, { defaultValue: val.label })}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.professionalProfile.yearsOfExperience')}</label>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={candidateInfo.years_of_experience}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, years_of_experience: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={candidateInfo.is_available}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, is_available: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">{t('candidateProfilePage.professionalProfile.available')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={candidateInfo.is_open_to_remote}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, is_open_to_remote: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">{t('candidateProfilePage.professionalProfile.openToRemote')}</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CV */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader icon={FileText} title={t('candidateProfilePage.cv.sectionTitle')} description={t('candidateProfilePage.cv.sectionDesc')} />
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                {cvUrl ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="font-medium text-slate-900">{t('candidateProfilePage.cv.uploaded')}</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      <a href={cvUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" type="button">
                          <Eye className="w-4 h-4 mr-2" /> {t('candidateProfilePage.cv.view')}
                        </Button>
                      </a>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingCV} type="button">
                        <Upload className="w-4 h-4 mr-2" />{t('candidateProfilePage.cv.change')}
                      </Button>
                      <Button variant="outline" onClick={handleDeleteCV} disabled={uploadingCV} className="text-red-600 hover:bg-red-50" type="button">
                        <Trash2 className="w-4 h-4 mr-2" />{t('candidateProfilePage.cv.delete')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-900">{t('candidateProfilePage.cv.uploadTitle')}</p>
                    <p className="text-sm text-slate-500">{t('candidateProfilePage.cv.uploadHint')}</p>
                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingCV} type="button">
                      <Upload className="w-4 h-4 mr-2" />{t('candidateProfilePage.cv.chooseFile')}
                    </Button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="hidden" />
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => setShowAnalysis(true)} type="button">
                  <Sparkles className="w-4 h-4 mr-2" /> {t('candidateProfilePage.cv.analyzeButton')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader icon={File} title={t('candidateProfilePage.documents.sectionTitle')} description={t('candidateProfilePage.documents.sectionDesc')} />
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    id="doc-type"
                    className="h-10 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                    defaultValue="other"
                  >
                    <option value="diploma">{t('candidateProfilePage.documents.typeDiploma')}</option>
                    <option value="certificate">{t('candidateProfilePage.documents.typeCertificate')}</option>
                    <option value="other">{t('candidateProfilePage.documents.typeOther')}</option>
                  </select>
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleDocumentUpload(file, document.getElementById('doc-type').value);
                        }
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.currentTarget.parentElement.querySelector('input[type="file"]').click();
                      }}
                      disabled={uploadingDoc}
                      type="button"
                    >
                      <Upload className="w-4 h-4 mr-2" /> {t('candidateProfilePage.documents.addButton')}
                    </Button>
                  </label>
                </div>

                {documents.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{doc.file_type}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" type="button">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </a>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc)} type="button">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">{t('candidateProfilePage.documents.empty')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compétences */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader icon={Award} title={t('candidateProfilePage.skills.sectionTitle')} description={t('candidateProfilePage.skills.sectionDesc')} />
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder={t('candidateProfilePage.skills.placeholder')}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                />
                <Button onClick={handleAddSkill} disabled={!newSkill.trim()} type="button">
                  <Plus className="w-4 h-4 mr-1" />{t('candidateProfilePage.skills.add')}
                </Button>
              </div>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {skills.map(skill => (
                    <SkillBadge key={skill} skill={skill} onRemove={handleRemoveSkill} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">{t('candidateProfilePage.skills.empty')}</p>
              )}
              <div className="mt-2">
                <AIAssistant
                  agentId="cv-skills"
                  initialText={candidateInfo.bio}
                  onApply={(generatedSkills) => {
                    const skillsArray = generatedSkills
                      .split(/[•,\n-]/)
                      .map(s => s.trim())
                      .filter(s => s.length > 0 && !skills.includes(s));
                    if (skillsArray.length > 0) {
                      setSkills([...skills, ...skillsArray]);
                      toast.success(t('candidateProfilePage.skills.addedToast', { count: skillsArray.length }));
                    } else {
                      toast.info(t('candidateProfilePage.skills.noneFound'));
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Expériences */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader
                icon={Briefcase}
                title={t('candidateProfilePage.experience.sectionTitle')}
                description={t('candidateProfilePage.experience.sectionDesc')}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingExp(null);
                      setShowExpModal(true);
                    }}
                    type="button"
                  >
                    <Plus className="w-4 h-4 mr-1" />{t('candidateProfilePage.experience.add')}
                  </Button>
                }
              />
              {experiences.length > 0 ? (
                <div className="space-y-4">
                  {experiences.map(exp => (
                    <ExperienceItem
                      key={exp.id}
                      experience={exp}
                      onEdit={(e) => {
                        setEditingExp(e);
                        setShowExpModal(true);
                      }}
                      onRemove={handleRemoveExperience}
                      t={t}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{t('candidateProfilePage.experience.empty')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Éducation */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader
                icon={GraduationCap}
                title={t('candidateProfilePage.education.sectionTitle')}
                description={t('candidateProfilePage.education.sectionDesc')}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingEdu(null);
                      setShowEduModal(true);
                    }}
                    type="button"
                  >
                    <Plus className="w-4 h-4 mr-1" />{t('candidateProfilePage.education.add')}
                  </Button>
                }
              />
              {education.length > 0 ? (
                <div className="space-y-4">
                  {education.map(edu => (
                    <EducationItem
                      key={edu.id}
                      education={edu}
                      onEdit={(e) => {
                        setEditingEdu(e);
                        setShowEduModal(true);
                      }}
                      onRemove={handleRemoveEducation}
                      t={t}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{t('candidateProfilePage.education.empty')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Liens dynamiques */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader
                icon={Link}
                title={t('candidateProfilePage.links.sectionTitle')}
                description={t('candidateProfilePage.links.sectionDesc')}
              />
              <EditableLinks links={links} onChange={setLinks} />
            </CardContent>
          </Card>

          {/* Salaire souhaité */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader icon={Briefcase} title={t('candidateProfilePage.salary.sectionTitle')} description={t('candidateProfilePage.salary.sectionDesc')} />
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.salary.minSalary')}</label>
                  <Input
                    type="number"
                    value={candidateInfo.desired_salary_min}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, desired_salary_min: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('candidateProfilePage.salary.maxSalary')}</label>
                  <Input
                    type="number"
                    value={candidateInfo.desired_salary_max}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, desired_salary_max: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 bg-blue-600 text-white hover:bg-blue-700" type="button">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {t('candidateProfilePage.saveChanges')}
            </Button>
          </div>
        </div>
      </div>

      <ExperienceModal
        isOpen={showExpModal}
        onClose={() => {
          setShowExpModal(false);
          setEditingExp(null);
        }}
        onSave={handleSaveExperience}
        experience={editingExp}
        t={t}
      />
      <EducationModal
        isOpen={showEduModal}
        onClose={() => {
          setShowEduModal(false);
          setEditingEdu(null);
        }}
        onSave={handleSaveEducation}
        education={editingEdu}
        t={t}
      />
      <CvAnalysisModal
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        cvText={cvText}
        onTextChange={setCvText}
        onAnalyze={handleAnalyzeCV}
        analyzing={analyzing}
        result={analysisResult}
        t={t}
      />
    </div>
  );
};

export default CandidateProfilePage;