import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { useCities } from '../hooks/useCities';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import {
  Building2, Globe, Mail, Phone, MapPin, Calendar,
  Loader2, ChevronLeft, Save, Image, Trash2
} from 'lucide-react';

const INDUSTRY_KEYS = [
  'tech', 'finance', 'telecom', 'commerce', 'manufacturing',
  'agriculture', 'construction', 'transport', 'health',
  'education', 'tourism', 'services', 'ngo', 'public', 'other'
];

const COMPANY_SIZE_KEYS = ['1-10', '11-50', '51-200', '201-500', '500+'];

const CompanyProfilePage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId } = useAuth();
  const { prefs } = usePreferencesContext();
  const navigate = useNavigate();
  const logoInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [noCompany, setNoCompany] = useState(false);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(prefs.country);
  const { cities: filteredCities } = useCities(selectedCountry);
  const [deleting, setDeleting] = useState(false);
  const [company, setCompany] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    industry: '',
    size: '',
    website: '',
    email: '',
    phone: '',
    city_id: '',
    address: '',
    founded_year: '',
    logo_url: '',
  });

  useEffect(() => {
    if (!user || !activeCompanyId) {
      setLoading(false);
      setNoCompany(true);
      return;
    }
    fetchCountries();
    fetchCompany();
  }, [user, activeCompanyId]);

  const fetchCountries = async () => {
    const { data } = await supabase
      .from('countries')
      .select('code, name')
      .order('name');
    setCountries(data || []);
  };

  const fetchCompany = async () => {
    setLoading(true);
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', activeCompanyId)
      .single();

    if (error || !company) {
      setNoCompany(true);
      setLoading(false);
      return;
    }

    setNoCompany(false);
    setCompany(company);
    setForm({
      name: company.name || '',
      description: company.description || '',
      industry: company.industry || '',
      size: company.size || '',
      website: company.website || '',
      email: company.email || '',
      phone: company.phone || '',
      city_id: company.city_id || '',
      address: company.address || '',
      founded_year: company.founded_year ? String(company.founded_year) : '',
      logo_url: company.logo_url || '',
    });

    if (company.country_id) {
      const { data: country } = await supabase
        .from('countries')
        .select('code')
        .eq('id', company.country_id)
        .single();
      if (country) setSelectedCountry(country.code);
    }
    setLoading(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('companyProfile.toasts.imageRequired'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('companyProfile.toasts.imageTooBig'));
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);
      setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success(t('companyProfile.toasts.logoUploaded'));
    } catch (error) {
      toast.error(t('companyProfile.toasts.uploadError'));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = () => {
    if (!window.confirm(t('companyProfile.deleteLogoConfirm'))) return;
    setForm(prev => ({ ...prev, logo_url: '' }));
    toast.success(t('companyProfile.toasts.logoDeleted'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('companyProfile.toasts.nameRequired'));
      return;
    }

    setSaving(true);
    try {
      const { data: country } = await supabase
        .from('countries')
        .select('id')
        .eq('code', selectedCountry)
        .single();

      const payload = {
        name: form.name,
        description: form.description,
        industry: form.industry || null,
        size: form.size || null,
        website: form.website
          ? (form.website.startsWith('http') ? form.website : `https://${form.website}`)
          : null,
        email: form.email || null,
        phone: form.phone || null,
        city_id: form.city_id || null,
        country_id: country?.id || null,
        address: form.address || null,
        founded_year: form.founded_year ? parseInt(form.founded_year) : null,
        logo_url: form.logo_url || null,
      };

      const { error } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', activeCompanyId);
      if (error) throw error;
      toast.success(t('companyProfile.toasts.updateSuccess'));
    } catch (error) {
      toast.error(error.message || t('companyProfile.toasts.updateError'));
    } finally {
      setSaving(false);
    }
  };

const handleDeleteCompany = async () => {
  if (!window.confirm(t('companyProfile.deleteConfirm'))) return;

  setDeleting(true);
  try {
    await apiFetch('/api/company/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        company_id: activeCompanyId,
      }),
    });
    toast.success(t('companyProfile.toasts.companyDeleted'));
    navigate('/dashboard/entreprise');
  } catch (err) {
    toast.error(err.message || t('companyProfile.toasts.deleteError'));
  } finally {
    setDeleting(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (noCompany) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('companyProfile.noCompany.title')}</h2>
          <p className="text-slate-600 mb-6">{t('companyProfile.noCompany.message')}</p>
          <Link to="/dashboard/entreprise/creer">
            <Button className="bg-blue-600 text-white">{t('companyProfile.noCompany.createButton')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20 pb-24 sm:pb-10" data-testid="company-profile-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* En-tête avec bouton retour et bouton Enregistrer (desktop) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('companyProfile.title')}</h1>
              <p className="text-sm text-slate-600">{t('companyProfile.subtitle')}</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="hidden sm:inline-flex gap-2 bg-blue-600 text-white hover:bg-blue-700 min-h-[44px]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('companyProfile.submit')}
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Logo avec suppression possible */}
              <div className="text-center">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-center"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    ) : form.logo_url ? (
                      <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="min-h-[44px]"
                    >
                      {uploadingLogo ? t('companyProfile.uploading') : t('companyProfile.logo')}
                    </Button>
                    {form.logo_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteLogo}
                        className="min-h-[44px] text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('companyProfile.deleteLogo')}
                      </Button>
                    )}
                  </div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('companyProfile.labels.name')}
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('companyProfile.placeholders.name')}
                  required
                  className="min-h-[44px]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('companyProfile.labels.description')}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={t('companyProfile.placeholders.description')}
                />
              </div>

              {/* Secteur et Taille */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('companyProfile.labels.industry')}
                  </label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="w-full h-10 min-h-[44px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">{t('companyProfile.options.selectIndustry')}</option>
                    {INDUSTRY_KEYS.map(key => (
                      <option key={key} value={t(`industries.${key}`)}>
                        {t(`industries.${key}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('companyProfile.labels.size')}
                  </label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full h-10 min-h-[44px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">{t('companyProfile.options.selectSize')}</option>
                    {COMPANY_SIZE_KEYS.map(size => (
                      <option key={size} value={size}>
                        {t(`companyProfile.sizes.${size}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Site web / Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.website')}
                  </label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder={t('companyProfile.placeholders.website')}
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.email')}
                  </label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={t('companyProfile.placeholders.email')}
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              {/* Téléphone / Année de création */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.phone')}
                  </label>
                  {/* ✅ Placeholder international identique à la création */}
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.foundedYear')}
                  </label>
                  <Input
                    value={form.founded_year}
                    onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
                    placeholder={t('companyProfile.placeholders.year')}
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              {/* Pays / Ville */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.country')}
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full h-10 min-h-[44px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>
                        {t(`countries.${c.code}`, c.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.city')}
                  </label>
                  <select
                    value={form.city_id}
                    onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                    className="w-full h-10 min-h-[44px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">{t('companyProfile.options.selectCity')}</option>
                    {filteredCities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('companyProfile.labels.address')}</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t('companyProfile.placeholders.address')}
                  className="min-h-[44px]"
                />
              </div>

              {/* Bouton enregistrer dans le formulaire (visible sur mobile si l'utilisateur scroll) */}
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white hover:bg-blue-700 min-h-[44px]"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {t('companyProfile.submit')}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Section suppression d'entreprise */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-red-600 font-semibold mb-2">{t('companyProfile.deleteSection.title')}</h3>
          <p className="text-sm text-slate-600 mb-4">
            {t('companyProfile.deleteSection.description')}
          </p>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 min-h-[44px]"
            onClick={handleDeleteCompany}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {deleting ? t('companyProfile.deleteSection.deleting') : t('companyProfile.deleteSection.button')}
          </Button>
        </div>
      </div>

      {/* Barre sticky en bas pour mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 sm:hidden z-40">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700 gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {t('companyProfile.submit')}
        </Button>
      </div>
    </div>
  );
};

export default CompanyProfilePage;