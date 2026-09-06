import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { useCities } from '../hooks/useCities';
import {
  Briefcase, MapPin, DollarSign, Users,
  Plus, X, Save, Loader2, ChevronLeft, Send,
  GraduationCap, ArrowRight, Building2, Globe
} from 'lucide-react';
import { cn, slugify, CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../lib/utils';
import { getPlanLimit, getExpirationDays } from '../lib/planLimits';

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8001'
  : 'https://actoos-jobs-api.onrender.com';

const RATES = {
  XOF: 1, EUR: 655.957, USD: 603.5, MAD: 60.5,
  GBP: 754.2, BRL: 115.3, ARS: 0.72, NGN: 0.4, ZAR: 32.5,
  SAR: 160.9, AED: 164.3, EGP: 19.5, DZD: 4.48, TND: 194.5,
  CHF: 722.3, XAF: 1, GNF: 0.07, CDF: 0.22, MGA: 0.15
};

const CreateJobPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user, activeCompanyId } = useAuth();
  const navigate = useNavigate();

  const { prefs } = usePreferencesContext();
  const currency = prefs.currency || 'XOF';
  const { cities: filteredCities } = useCities(prefs.country);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState({ currentPlan: '', maxActiveJobs: 0, activeJobs: 0 });
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    responsibilities: '',
    benefits: '',
    category_id: '',
    contract_type: 'cdi',
    experience_level: '',
    salary_min: '',
    salary_max: '',
    salary_period: 'monthly',
    is_salary_visible: true,
    city_id: '',
    address: '',
    is_remote: false,
    remote_type: '',
    positions_count: 1,
    skills_required: [],
    is_urgent: false,
    status: 'draft',
    required_languages: [],
  });

  const [newSkill, setNewSkill] = useState('');
  const [newRequiredLanguage, setNewRequiredLanguage] = useState('');
  const [newRequiredLanguageLevel, setNewRequiredLanguageLevel] = useState('intermediate');

  useEffect(() => {
    if (!user?.id || !activeCompanyId) return;
    fetchData();
    if (id) fetchJob();
  }, [id, activeCompanyId, user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: comp, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', activeCompanyId)
        .single();

      if (companyError || !comp) {
        navigate('/dashboard/entreprise');
        return;
      }

      setCompany(comp);

      const { data: catsData } = await supabase
        .from('job_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setCategories(catsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const rate = RATES[currency] || 1;
      const displaySalaryMin = data.salary_min ? Math.round(data.salary_min / rate) : '';
      const displaySalaryMax = data.salary_max ? Math.round(data.salary_max / rate) : '';

      let requiredLanguages = [];
      if (data.eligibility_criteria && data.eligibility_criteria.languages) {
        requiredLanguages = data.eligibility_criteria.languages;
      }

      setForm({
        title: data.title || '',
        description: data.description || '',
        requirements: data.requirements || '',
        responsibilities: data.responsibilities || '',
        benefits: data.benefits || '',
        category_id: data.category_id || '',
        contract_type: data.contract_type || 'cdi',
        experience_level: data.experience_level || '',
        salary_min: displaySalaryMin,
        salary_max: displaySalaryMax,
        salary_period: data.salary_period || 'monthly',
        is_salary_visible: data.is_salary_visible ?? true,
        city_id: data.city_id || '',
        address: data.address || '',
        is_remote: data.is_remote || false,
        remote_type: data.remote_type || '',
        positions_count: data.positions_count || 1,
        skills_required: data.skills_required || [],
        is_urgent: data.is_urgent || false,
        status: data.status || 'draft',
        required_languages: requiredLanguages,
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error(t('createJob.toasts.jobNotFound'));
      navigate('/dashboard/entreprise');
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !form.skills_required.includes(newSkill.trim())) {
      setForm({ ...form, skills_required: [...form.skills_required, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setForm({ ...form, skills_required: form.skills_required.filter(s => s !== skill) });
  };

  // Gestion des langues requises
  const handleAddRequiredLanguage = () => {
    if (!newRequiredLanguage.trim()) return;
    if (form.required_languages.some(l => l.code === newRequiredLanguage)) {
      toast.error(t('createJob.languages.alreadyAdded', 'Langue déjà ajoutée'));
      return;
    }
    setForm({
      ...form,
      required_languages: [
        ...form.required_languages,
        { code: newRequiredLanguage, level: newRequiredLanguageLevel }
      ]
    });
    setNewRequiredLanguage('');
    setNewRequiredLanguageLevel('intermediate');
  };

  const handleRemoveRequiredLanguage = (code) => {
    setForm({
      ...form,
      required_languages: form.required_languages.filter(l => l.code !== code)
    });
  };

  const handleRequiredLanguageLevelChange = (code, level) => {
    setForm({
      ...form,
      required_languages: form.required_languages.map(l =>
        l.code === code ? { ...l, level } : l
      )
    });
  };

  // Sauvegarde / Publication
  const handleSave = async (publish = false) => {
    if (!company?.is_active) {
      toast.error(t('createJob.toasts.companySuspended'));
      return;
    }

    const newErrors = {};
    if (!form.title.trim()) newErrors.title = true;
    if (!form.description.trim()) newErrors.description = true;
    if (!form.contract_type) newErrors.contract_type = true;
    if (!form.category_id) newErrors.category_id = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(t('createJob.toasts.fillRequiredFields'));
      return;
    }

    setSaving(true);
    try {
      const safeTitle = (form.title || '').substring(0, 200);
      const countryId = company?.country_id || null;

      let finalStatus = form.status;

      if (publish) {
        if (!company?.is_verified) {
          toast.error(t('createJob.toasts.companyNotVerified'));
          setSaving(false);
          return;
        }

        if (!id) {
          const { count: activeCount } = await supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('status', 'active');
          const { count: pendingCount } = await supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('status', 'pending');
          const totalActiveAndPending = (activeCount || 0) + (pendingCount || 0);
          const limit = getPlanLimit(company?.subscription_plan || 'free', 'jobs');
          if (totalActiveAndPending >= limit) {
            toast.error(t('createJob.toasts.limitReached', { total: totalActiveAndPending, limit }));
            setSaving(false);
            return;
          }
        }

        if (id && (form.status === 'active' || form.status === 'paused')) {
          finalStatus = form.status;
        } else {
          finalStatus = 'pending';
        }
      }

      const toXOF = (amount) => {
        const num = parseInt(amount);
        return isNaN(num) ? null : Math.round(num * RATES[currency] || 1);
      };

      const eligibilityCriteria = form.required_languages.length > 0
        ? { languages: form.required_languages }
        : null;

      const jobData = {
        company_id: company.id,
        posted_by: user.id,
        title: safeTitle,
        slug: slugify(safeTitle) + '-' + Date.now(),
        description: form.description,
        requirements: form.requirements || null,
        responsibilities: form.responsibilities || null,
        benefits: form.benefits || null,
        category_id: form.category_id,
        contract_type: form.contract_type,
        experience_level: form.experience_level || null,
        salary_min: toXOF(form.salary_min),
        salary_max: toXOF(form.salary_max),
        salary_currency: 'XOF',
        salary_period: form.salary_period,
        is_salary_visible: form.is_salary_visible,
        city_id: form.city_id || null,
        country_id: countryId,
        address: form.address || null,
        is_remote: form.is_remote,
        remote_type: form.is_remote ? form.remote_type : null,
        positions_count: parseInt(form.positions_count) || 1,
        skills_required: form.skills_required.length > 0 ? form.skills_required : null,
        is_urgent: form.is_urgent,
        status: finalStatus,
        eligibility_criteria: eligibilityCriteria,
      };

      let newJobId = id;

      if (id) {
        if (finalStatus === 'active' && form.status !== 'active') {
          jobData.expires_at = new Date(Date.now() + getExpirationDays(company) * 24 * 60 * 60 * 1000).toISOString();
        }
        const { error } = await supabase.from('jobs').update(jobData).eq('id', id);
        if (error) throw error;
      } else {
        if (finalStatus === 'active') {
          jobData.expires_at = new Date(Date.now() + getExpirationDays(company) * 24 * 60 * 60 * 1000).toISOString();
        }
        const { data: insertedJob, error } = await supabase
          .from('jobs')
          .insert(jobData)
          .select('id')
          .single();
        if (error) throw error;
        newJobId = insertedJob.id;
      }

      if (publish) {
        if (finalStatus === 'pending') {
          toast.success(t('createJob.toasts.submittedForValidation'));
        } else if (finalStatus === 'active') {
          toast.success(t('createJob.toasts.offerUpdated'));
        }
      } else {
        toast.success(t('createJob.toasts.draftSaved'));
      }

      setTimeout(async () => {
        if (publish && finalStatus === 'pending') {
          try { await fetch(`${BASE_URL}/api/send-job-alerts`, { method: 'POST' }); } catch (err) { console.warn('Alertes emploi échouées:', err); }
          try {
            await fetch(`${BASE_URL}/api/notify-admin-new-job`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ job_title: form.title, company_name: company.name, company_email: company.email || user.email, language: i18n.language })
            });
          } catch (err) { console.warn('Notification admin échouée:', err); }
        }
        if (finalStatus === 'active' && newJobId) {
          try {
            await fetch(`${BASE_URL}/api/jobs/${newJobId}/notify-followers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id })
            });
          } catch (err) { console.warn('Notification followers échouée:', err); }
        }
      }, 100);

      navigate('/dashboard/entreprise');
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error(error?.message || error?.details || t('createJob.toasts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const inputErrorClass = (key) => cn(errors[key] && 'border-red-500 focus-visible:ring-red-500');
  const selectErrorClass = (key) => cn(errors[key] ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500');

  const showUnverifiedBanner = !loading && company && !company.is_verified;
  const showSuspendedBanner = !loading && company && !company.is_active;

  const getPublishButtonText = () => {
    if (id && (form.status === 'active' || form.status === 'paused')) return t('createJob.updateOffer');
    if (showUnverifiedBanner) return t('createJob.validationRequired');
    return t('createJob.submitForValidation');
  };

  const isPublishDisabled = () => {
    if (showSuspendedBanner) return true;
    if (showUnverifiedBanner) return true;
    return saving;
  };

  const salaryPeriodOptions = [
    { value: 'monthly', label: t('salaryPeriod.monthly') },
    { value: 'daily', label: t('salaryPeriod.daily') },
    { value: 'hourly', label: t('salaryPeriod.hourly') },
    { value: 'fixed', label: t('salaryPeriod.fixed') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20" data-testid="create-job-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {showUnverifiedBanner && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm">
              <p className="text-amber-800 font-medium">{t('createJob.unverifiedBanner.title')}</p>
              <p className="text-amber-600">{t('createJob.unverifiedBanner.description')}</p>
            </div>
          </div>
        )}

        {showSuspendedBanner && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm">
              <p className="text-red-800 font-medium">{t('createJob.toasts.companySuspended')}</p>
              <p className="text-red-600">{t('createJob.toasts.companySuspendedDesc')}</p>
            </div>
          </div>
        )}

        {/* En-tête sans bouton IA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard/entreprise')} className="-ml-2 shrink-0" type="button">
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">{t('createJob.back')}</span>
            </Button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                {company?.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                  {id ? t('createJob.titleEdit') : t('createJob.titleNew')}
                </h1>
                <p className="text-sm text-slate-600 truncate">{company?.name}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || showSuspendedBanner} type="button" className="flex-1 sm:flex-none overflow-hidden px-3 sm:px-4">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 shrink-0" /> : <Save className="w-4 h-4 mr-2 shrink-0" />}
              <span className="truncate">{t('createJob.save')}</span>
            </Button>

            <Button onClick={() => handleSave(true)} disabled={isPublishDisabled()} className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex-1 sm:flex-none overflow-hidden px-3 sm:px-4" data-testid="publish-job-btn" type="button">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 shrink-0" /> : <Send className="w-4 h-4 mr-2 shrink-0" />}
              <span className="truncate">{getPublishButtonText()}</span>
            </Button>
          </div>
        </div>

        {/* Formulaire */}
        <div className="space-y-4 sm:space-y-6">
          {/* Informations de base */}
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                {t('createJob.sections.basicInfo')}
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.title')}</label>
                <Input value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); if (errors.title) setErrors(prev => ({ ...prev, title: false })); }} placeholder={t('createJob.placeholders.title')} required className={inputErrorClass('title')} data-testid="job-title-input" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.category')}</label>
                  <select value={form.category_id} onChange={(e) => { setForm({ ...form, category_id: e.target.value }); if (errors.category_id) setErrors(prev => ({ ...prev, category_id: false })); }} className={cn(selectErrorClass('category_id'), 'w-full h-10 px-3 py-2 border rounded-md bg-white')} data-testid="job-category-select">
                    <option value="">{t('createJob.options.selectCategory')}</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{t(`categories.${cat.slug}`, cat.name)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.contractType')}</label>
                  <select value={form.contract_type} onChange={(e) => { setForm({ ...form, contract_type: e.target.value }); if (errors.contract_type) setErrors(prev => ({ ...prev, contract_type: false })); }} className={cn(selectErrorClass('contract_type'), 'w-full h-10 px-3 py-2 border rounded-md bg-white')} required data-testid="job-contract-select">
                    <option value="">{t('createJob.options.selectContract')}</option>
                    {Object.entries(CONTRACT_TYPES).map(([key, val]) => <option key={key} value={key}>{t(val.key)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><GraduationCap className="w-4 h-4 inline mr-1" />{t('createJob.labels.experienceLevel')}</label>
                  <select value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })} className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" data-testid="job-experience-select">
                    <option value="">{t('createJob.options.unspecified')}</option>
                    {Object.entries(EXPERIENCE_LEVELS).map(([key, val]) => <option key={key} value={key}>{t(val.key)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><Users className="w-4 h-4 inline mr-1" />{t('createJob.labels.positionsCount')}</label>
                  <Input type="number" min="1" value={form.positions_count} onChange={(e) => setForm({ ...form, positions_count: e.target.value })} data-testid="job-positions-input" />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_urgent} onChange={(e) => setForm({ ...form, is_urgent: e.target.checked })} className="rounded border-slate-300 text-red-600 focus:ring-red-500" />
                  <span className="text-sm text-slate-600">{t('createJob.labels.urgent')}</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">{t('createJob.sections.description')}</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.description')}</label>
                <textarea id="job-description-textarea" value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); if (errors.description) setErrors(prev => ({ ...prev, description: false })); }} rows={6} className={cn('w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 resize-none transition-all', errors.description ? 'border border-red-500 focus:ring-red-500' : 'border border-slate-200 focus:ring-blue-500')} placeholder={t('createJob.placeholders.description')} required data-testid="job-description-textarea" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.missions')}</label>
                <textarea value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder={t('createJob.placeholders.missions')} data-testid="job-responsibilities-textarea" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.requirements')}</label>
                <textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder={t('createJob.placeholders.requirements')} data-testid="job-requirements-textarea" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.benefits')}</label>
                <textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder={t('createJob.placeholders.benefits')} data-testid="job-benefits-textarea" />
              </div>
            </CardContent>
          </Card>

          {/* Compétences */}
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">{t('createJob.sections.skills')}</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder={t('createJob.placeholders.skill')} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} data-testid="job-skill-input" className="flex-1" />
                <Button type="button" onClick={handleAddSkill} disabled={!newSkill.trim()} className="w-full sm:w-auto overflow-hidden px-3"><Plus className="w-4 h-4 mr-1 shrink-0" /><span className="truncate">{t('createJob.skills.add')}</span></Button>
              </div>
              {form.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills_required.map((skill) => (
                    <Badge key={skill} className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1">
                      {skill}
                      <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Langues requises */}
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                {t('createJob.sections.languages', 'Langues requises')}
              </h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={newRequiredLanguage} onChange={(e) => setNewRequiredLanguage(e.target.value)} placeholder={t('createJob.languages.languagePlaceholder', 'Ex: Français')} className="min-h-[44px] flex-1" data-testid="job-language-input" />
                <select value={newRequiredLanguageLevel} onChange={(e) => setNewRequiredLanguageLevel(e.target.value)} className="h-10 min-h-[44px] px-3 py-2 border border-slate-200 rounded-md bg-white" data-testid="job-language-level-select">
                  <option value="basic">{t('languageLevel.basic', 'Débutant')}</option>
                  <option value="intermediate">{t('languageLevel.intermediate', 'Intermédiaire')}</option>
                  <option value="professional">{t('languageLevel.professional', 'Professionnel')}</option>
                  <option value="fluent">{t('languageLevel.fluent', 'Courant')}</option>
                  <option value="native">{t('languageLevel.native', 'Langue maternelle')}</option>
                </select>
                <Button onClick={handleAddRequiredLanguage} disabled={!newRequiredLanguage.trim()} type="button" className="min-h-[44px] w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-1" />{t('createJob.languages.add', 'Ajouter')}
                </Button>
              </div>
              {form.required_languages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.required_languages.map(lang => (
                    <Badge key={lang.code} className="bg-purple-50 text-purple-700 border border-purple-200 gap-1 pr-1">
                      {lang.code}
                      <select value={lang.level} onChange={(e) => handleRequiredLanguageLevelChange(lang.code, e.target.value)} className="ml-1 bg-transparent border-0 focus:ring-0 text-xs">
                        <option value="basic">{t('languageLevel.basic', 'Débutant')}</option>
                        <option value="intermediate">{t('languageLevel.intermediate', 'Intermédiaire')}</option>
                        <option value="professional">{t('languageLevel.professional', 'Professionnel')}</option>
                        <option value="fluent">{t('languageLevel.fluent', 'Courant')}</option>
                        <option value="native">{t('languageLevel.native', 'Langue maternelle')}</option>
                      </select>
                      <button type="button" onClick={() => handleRemoveRequiredLanguage(lang.code)} className="ml-1 hover:bg-purple-200 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Localisation */}
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />{t('createJob.sections.location')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.city')}</label>
                  <select value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value })} className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" data-testid="job-city-select">
                    <option value="">{t('createJob.options.selectCity')}</option>
                    {filteredCities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.address')}</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('createJob.placeholders.address')} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_remote} onChange={(e) => setForm({ ...form, is_remote: e.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-600">{t('createJob.labels.remote')}</span>
                </label>
                {form.is_remote && (
                  <select value={form.remote_type} onChange={(e) => setForm({ ...form, remote_type: e.target.value })} className="h-9 px-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm w-full sm:w-auto">
                    <option value="">{t('createJob.labels.remoteType')}</option>
                    <option value="full">{t('createJob.options.remoteFull')}</option>
                    <option value="partial">{t('createJob.options.remoteHybrid')}</option>
                    <option value="occasional">{t('createJob.options.remoteOccasional')}</option>
                  </select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Salaire */}
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-600" />{t('createJob.sections.salary')}</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.salaryPeriod')}</label>
                <select value={form.salary_period} onChange={(e) => setForm({ ...form, salary_period: e.target.value })} className="w-full sm:w-auto h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" data-testid="job-salary-period-select">
                  {salaryPeriodOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.salaryMin')}</label>
                  <Input type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} placeholder={t('createJob.placeholders.salaryMin')} data-testid="job-salary-min-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.salaryMax')}</label>
                  <Input type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} placeholder={t('createJob.placeholders.salaryMax')} data-testid="job-salary-max-input" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_salary_visible} onChange={(e) => setForm({ ...form, is_salary_visible: e.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-600">{t('createJob.labels.showSalary')}</span>
              </label>
            </CardContent>
          </Card>

          {/* Boutons finaux */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 sm:pt-4">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || showSuspendedBanner} type="button" className="w-full sm:w-auto overflow-hidden px-3 sm:px-4">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 shrink-0" /> : <Save className="w-4 h-4 mr-2 shrink-0" />}
              <span className="truncate">{t('createJob.saveDraft')}</span>
            </Button>
            <Button onClick={() => handleSave(true)} disabled={isPublishDisabled()} className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto overflow-hidden px-3 sm:px-4" data-testid="publish-job-btn-bottom" type="button">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 shrink-0" /> : <Send className="w-4 h-4 mr-2 shrink-0" />}
              <span className="truncate">{getPublishButtonText()}</span>
            </Button>
          </div>
          {showUnverifiedBanner && <p className="text-center text-xs text-amber-600 mt-1">{t('createJob.companyUnverified')}</p>}
        </div>
      </div>

      {/* Modal limite */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"><Briefcase className="w-8 h-8 text-blue-600" /></div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">{t('createJob.limitModal.title')}</h2>
            <p className="text-slate-600 mb-6 text-sm sm:text-base">{t('createJob.limitModal.message', { plan: limitInfo.currentPlan === 'free' ? t('pricing.free') : limitInfo.currentPlan, max: limitInfo.maxActiveJobs, current: limitInfo.activeJobs })}</p>
            <p className="text-sm text-slate-500 mb-6 sm:mb-8">{t('createJob.limitModal.upgradeSuggestion')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" className="rounded-2xl overflow-hidden px-3 sm:px-4" onClick={() => setShowLimitModal(false)} type="button"><span className="truncate">{t('createJob.limitModal.later')}</span></Button>
              <Link to="/tarifs" onClick={() => setShowLimitModal(false)}><Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl w-full sm:w-auto overflow-hidden px-3 sm:px-4" type="button"><span className="truncate">{t('createJob.limitModal.seePlans')}</span><ArrowRight className="w-4 h-4 ml-2 shrink-0" /></Button></Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateJobPage;