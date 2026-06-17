import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import AIAssistant from '../components/AIAssistant';
import { toast } from 'sonner';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { useCities } from '../hooks/useCities';
import {
  Briefcase, MapPin, DollarSign, Calendar, Users,
  Plus, X, Save, Loader2, ChevronLeft, Send,
  GraduationCap, ArrowRight
} from 'lucide-react';
import { cn, slugify, CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../lib/utils';
import { apiFetch } from '../lib/api';
import { getPlanLimit, getExpirationDays } from '../lib/planLimits';

const CreateJobPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, activeCompanyId } = useAuth();
  const navigate = useNavigate();

  const { prefs } = usePreferencesContext();
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
    is_salary_visible: true,
    city_id: '',
    address: '',
    is_remote: false,
    remote_type: '',
    positions_count: 1,
    skills_required: [],
    application_deadline: '',
    start_date: '',
    is_urgent: false,
    status: 'draft'
  });

  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    fetchData();
    if (id) {
      fetchJob();
    }
  }, [id, activeCompanyId]);

  const fetchData = async () => {
    if (!user?.id) {
      toast.error(t('createJob.toasts.userNotIdentified'));
      navigate('/connexion');
      return;
    }

    if (!activeCompanyId) {
      toast.error(t('createJob.toasts.noCompanySelected'));
      navigate('/dashboard/entreprise');
      return;
    }

    setLoading(true);
    try {
      const { data: comp, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', activeCompanyId)
        .single();

      if (companyError || !comp) {
        toast.error(t('createJob.toasts.companyNotFound'));
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

      setForm({
        title: data.title || '',
        description: data.description || '',
        requirements: data.requirements || '',
        responsibilities: data.responsibilities || '',
        benefits: data.benefits || '',
        category_id: data.category_id || '',
        contract_type: data.contract_type || 'cdi',
        experience_level: data.experience_level || '',
        salary_min: data.salary_min || '',
        salary_max: data.salary_max || '',
        is_salary_visible: data.is_salary_visible ?? true,
        city_id: data.city_id || '',
        address: data.address || '',
        is_remote: data.is_remote || false,
        remote_type: data.remote_type || '',
        positions_count: data.positions_count || 1,
        skills_required: data.skills_required || [],
        application_deadline: data.application_deadline || '',
        start_date: data.start_date || '',
        is_urgent: data.is_urgent || false,
        status: data.status || 'draft'
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

  const countActiveJobs = async (excludeId = null) => {
    let query = supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('status', 'active');

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
  };

  const handleSave = async (publish = false) => {
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

      const { data: country } = await supabase
        .from('countries')
        .select('id')
        .eq('code', prefs.country || 'ML')
        .single();
      const countryId = country?.id;

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
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        salary_currency: 'XOF',
        is_salary_visible: form.is_salary_visible,
        city_id: form.city_id || null,
        country_id: countryId,
        address: form.address || null,
        is_remote: form.is_remote,
        remote_type: form.is_remote ? form.remote_type : null,
        positions_count: parseInt(form.positions_count) || 1,
        skills_required: form.skills_required.length > 0 ? form.skills_required : null,
        application_deadline: form.application_deadline || null,
        start_date: form.start_date || null,
        is_urgent: form.is_urgent,
        status: finalStatus
      };

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
        const { error } = await supabase.from('jobs').insert(jobData);
        if (error) throw error;
      }

      if (publish) {
        if (finalStatus === 'pending') {
          toast.success(t('createJob.toasts.submittedForValidation'));
          try {
            await apiFetch('/api/send-job-alerts', { method: 'POST' });
          } catch (err) {
            console.error('Erreur envoi alertes emploi:', err);
          }
          try {
            await apiFetch('/api/notify-admin-new-job', {
              method: 'POST',
              body: JSON.stringify({
                job_title: form.title,
                company_name: company.name,
                company_email: company.email || user.email
              })
            });
          } catch (err) {
            console.error('Erreur notification admin job:', err);
          }
        } else if (finalStatus === 'active') {
          toast.success(t('createJob.toasts.offerUpdated'));
        }
      } else {
        toast.success(t('createJob.toasts.draftSaved'));
      }

      navigate('/dashboard/entreprise');
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error(error?.message || error?.details || t('createJob.toasts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const inputErrorClass = (key) => cn(errors[key] && 'border-red-500 focus-visible:ring-red-500');

  const selectErrorClass = (key, base = '') =>
    cn(
      base,
      errors[key]
        ? 'border-red-500 focus:ring-red-500'
        : 'border-slate-200 focus:ring-blue-500'
    );

  const isUnverified = company && !company.is_verified;

  const getPublishButtonText = () => {
    if (id && (form.status === 'active' || form.status === 'paused')) {
      return t('createJob.updateOffer');
    }
    if (isUnverified) {
      return t('createJob.validationRequired');
    }
    return t('createJob.submitForValidation');
  };

  const isPublishDisabled = () => {
    if (isUnverified) return true;
    return saving;
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20" data-testid="create-job-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {isUnverified && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-amber-800 font-medium">{t('createJob.unverifiedBanner.title')}</p>
              <p className="text-amber-600 text-sm">{t('createJob.unverifiedBanner.description')}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard/entreprise')} className="-ml-2" type="button">
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('createJob.back')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {id ? t('createJob.titleEdit') : t('createJob.titleNew')}
              </h1>
              <p className="text-slate-600">{company?.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} type="button">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {t('createJob.save')}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={isPublishDisabled()}
              className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="publish-job-btn"
              type="button"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {getPublishButtonText()}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                {t('createJob.sections.basicInfo')}
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('createJob.labels.title')}
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    if (errors.title) setErrors(prev => ({ ...prev, title: false }));
                  }}
                  placeholder={t('createJob.placeholders.title')}
                  required
                  className={inputErrorClass('title')}
                  data-testid="job-title-input"
                />
                <div className="mt-2">
                  <AIAssistant
                    agentId="job-title"
                    initialText={form.title}
                    onApply={(newTitle) => setForm({ ...form, title: newTitle.substring(0, 200) })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.category')}</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => {
                      setForm({ ...form, category_id: e.target.value });
                      if (errors.category_id) setErrors(prev => ({ ...prev, category_id: false }));
                    }}
                    className={selectErrorClass('category_id', 'w-full h-10 px-3 py-2 border rounded-md bg-white')}
                    data-testid="job-category-select"
                  >
                    <option value="">{t('createJob.options.selectCategory')}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {t(`categories.${cat.slug}`, cat.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.contractType')}</label>
                  <select
                    value={form.contract_type}
                    onChange={(e) => {
                      setForm({ ...form, contract_type: e.target.value });
                      if (errors.contract_type) setErrors(prev => ({ ...prev, contract_type: false }));
                    }}
                    className={selectErrorClass('contract_type', 'w-full h-10 px-3 py-2 border rounded-md bg-white')}
                    required
                    data-testid="job-contract-select"
                  >
                    <option value="">{t('createJob.options.selectContract')}</option>
                    {Object.entries(CONTRACT_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{t(`contractTypes.${key}`, { defaultValue: val.label })}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    {t('createJob.labels.experienceLevel')}
                  </label>
                  <select
                    value={form.experience_level}
                    onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    data-testid="job-experience-select"
                  >
                    <option value="">{t('createJob.options.unspecified')}</option>
                    {Object.entries(EXPERIENCE_LEVELS).map(([key, val]) => (
                      <option key={key} value={key}>{t(`experienceLevels.${key}`, { defaultValue: val.label })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Users className="w-4 h-4 inline mr-1" />
                    {t('createJob.labels.positionsCount')}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={form.positions_count}
                    onChange={(e) => setForm({ ...form, positions_count: e.target.value })}
                    data-testid="job-positions-input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_urgent}
                    onChange={(e) => setForm({ ...form, is_urgent: e.target.checked })}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-600">{t('createJob.labels.urgent')}</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">{t('createJob.sections.description')}</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.description')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => {
                    setForm({ ...form, description: e.target.value });
                    if (errors.description) setErrors(prev => ({ ...prev, description: false }));
                  }}
                  rows={6}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 resize-none',
                    errors.description
                      ? 'border border-red-500 focus:ring-red-500'
                      : 'border border-slate-200 focus:ring-blue-500'
                  )}
                  placeholder={t('createJob.placeholders.description')}
                  required
                  data-testid="job-description-textarea"
                />
                <div className="mt-2">
                  <AIAssistant
                    agentId="job-description"
                    initialText={form.description}
                    context={form.title}
                    onApply={(newDesc) => setForm({ ...form, description: newDesc })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.missions')}</label>
                <textarea
                  value={form.responsibilities}
                  onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={t('createJob.placeholders.missions')}
                  data-testid="job-responsibilities-textarea"
                />
                <div className="mt-2">
                  <AIAssistant
                    agentId="job-missions"
                    initialText={form.responsibilities}
                    context={form.title}
                    onApply={(newMissions) => setForm({ ...form, responsibilities: newMissions })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.requirements')}</label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={t('createJob.placeholders.requirements')}
                  data-testid="job-requirements-textarea"
                />
                <div className="mt-2">
                  <AIAssistant
                    agentId="job-requirements"
                    initialText={form.requirements}
                    context={form.title}
                    onApply={(newReqs) => setForm({ ...form, requirements: newReqs })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.benefits')}</label>
                <textarea
                  value={form.benefits}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={t('createJob.placeholders.benefits')}
                  data-testid="job-benefits-textarea"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">{t('createJob.sections.skills')}</h2>

              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder={t('createJob.placeholders.skill')}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  data-testid="job-skill-input"
                />
                <Button type="button" onClick={handleAddSkill} disabled={!newSkill.trim()}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('createJob.skills.add')}
                </Button>
              </div>

              {form.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills_required.map((skill) => (
                    <Badge key={skill} className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                {t('createJob.sections.location')}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.city')}</label>
                  <select
                    value={form.city_id}
                    onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    data-testid="job-city-select"
                  >
                    <option value="">{t('createJob.options.selectCity')}</option>
                    {filteredCities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.address')}</label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder={t('createJob.placeholders.address')}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_remote}
                    onChange={(e) => setForm({ ...form, is_remote: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">{t('createJob.labels.remote')}</span>
                </label>

                {form.is_remote && (
                  <select
                    value={form.remote_type}
                    onChange={(e) => setForm({ ...form, remote_type: e.target.value })}
                    className="h-9 px-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="">{t('createJob.labels.remoteType')}</option>
                    <option value="full">{t('createJob.options.remoteFull')}</option>
                    <option value="partial">{t('createJob.options.remoteHybrid')}</option>
                    <option value="occasional">{t('createJob.options.remoteOccasional')}</option>
                  </select>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                {t('createJob.sections.salary')}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.salaryMin')}</label>
                  <Input
                    type="number"
                    value={form.salary_min}
                    onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                    placeholder={t('createJob.placeholders.salaryMin')}
                    data-testid="job-salary-min-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.salaryMax')}</label>
                  <Input
                    type="number"
                    value={form.salary_max}
                    onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                    placeholder={t('createJob.placeholders.salaryMax')}
                    data-testid="job-salary-max-input"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_salary_visible}
                  onChange={(e) => setForm({ ...form, is_salary_visible: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">{t('createJob.labels.showSalary')}</span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {t('createJob.sections.dates')}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.applicationDeadline')}</label>
                  <Input
                    type="date"
                    value={form.application_deadline}
                    onChange={(e) => setForm({ ...form, application_deadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="job-deadline-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createJob.labels.startDate')}</label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    data-testid="job-start-date-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} type="button">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {t('createJob.saveDraft')}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={isPublishDisabled()}
              className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="publish-job-btn-bottom"
              type="button"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {getPublishButtonText()}
            </Button>
          </div>
          {isUnverified && (
            <p className="text-center text-xs text-amber-600 mt-1">
              {t('createJob.companyUnverified')}
            </p>
          )}
        </div>
      </div>

      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {t('createJob.limitModal.title')}
            </h2>
            <p className="text-slate-600 mb-6">
              {t('createJob.limitModal.message', {
                plan: limitInfo.currentPlan === 'free' ? t('pricing.free') : limitInfo.currentPlan,
                max: limitInfo.maxActiveJobs,
                current: limitInfo.activeJobs
              })}
            </p>
            <p className="text-sm text-slate-500 mb-8">
              {t('createJob.limitModal.upgradeSuggestion')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => setShowLimitModal(false)}
                type="button"
              >
                {t('createJob.limitModal.later')}
              </Button>
              <Link to="/tarifs" onClick={() => setShowLimitModal(false)}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl" type="button">
                  {t('createJob.limitModal.seePlans')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateJobPage;