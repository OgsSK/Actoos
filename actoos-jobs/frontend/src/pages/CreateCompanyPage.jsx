import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { useCities } from '../hooks/useCities';
import {
  Building2, Globe, Mail, Phone, MapPin, Users, Calendar,
  Upload, Loader2, ChevronLeft, Save, Image
} from 'lucide-react';
import { slugify } from '../lib/utils';
import { apiFetch } from '../lib/api';

const CreateCompanyPage = () => {
  const { t, i18n } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const logoInputRef = useRef(null);

  const { prefs } = usePreferencesContext();

  // Par défaut : le pays préféré de l'utilisateur, sinon Belgique
  const [selectedCountry, setSelectedCountry] = useState(prefs.country || 'BE');
  const [countries, setCountries] = useState([]);

  const { cities: filteredCities } = useCities(selectedCountry);

  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [errors, setErrors] = useState({});
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

  const COMPANY_SIZES = Object.keys(t('createCompany.sizes', { returnObjects: true }));
  const INDUSTRIES = t('createCompany.industries', { returnObjects: true }) || [];

  useEffect(() => {
    supabase.from('countries').select('code, name').order('name').then(({ data }) => {
      setCountries(data || []);
    });
  }, []);

  // Synchronise le pays sélectionné avec les préférences de l'utilisateur
  useEffect(() => {
    if (prefs.country && prefs.country !== selectedCountry) {
      setSelectedCountry(prefs.country);
    }
  }, [prefs.country]);

  // Upload de logo directement vers Supabase Storage
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('createCompany.toasts.imageRequired'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('createCompany.toasts.imageTooBig'));
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
      toast.success(t('createCompany.toasts.logoUploaded'));
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(t('createCompany.toasts.uploadError'));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.name) newErrors.name = true;
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(t('createCompany.toasts.fillRequired'));
      return;
    }

    setLoading(true);
    try {
      const { data: country } = await supabase
        .from('countries')
        .select('id')
        .eq('code', selectedCountry)
        .single();

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          owner_id: user.id,
          name: form.name,
          slug: slugify(form.name) + '-' + Date.now(),
          description: form.description || null,
          industry: form.industry || null,
          size: form.size || null,
          website: form.website
            ? (form.website.startsWith('http') ? form.website : `https://${form.website}`)
            : null,
          email: form.email || user.email,
          phone: form.phone || null,
          city_id: form.city_id || null,
          country_id: country?.id,
          address: form.address || null,
          founded_year: form.founded_year ? parseInt(form.founded_year) : null,
          logo_url: form.logo_url || null,
          is_active: true,
          subscription_plan: 'free'
        })
        .select()
        .single();

      if (companyError) throw companyError;

      await supabase
        .from('company_members')
        .insert({
          company_id: company.id,
          user_id: user.id,
          role: 'admin',
          is_admin: true
        });

      await supabase
        .from('users')
        .update({ role: 'company' })
        .eq('id', user.id);

      await supabase.auth.updateUser({
        data: { role: 'company' }
      });

      if (refreshProfile) {
        await refreshProfile();
      }

      toast.success(t('createCompany.toasts.companyCreated'));

      try {
        await apiFetch('/api/notify-admin-new-company', {
          method: 'POST',
          body: JSON.stringify({
            company_name: form.name,
            owner_email: user.email,
            owner_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`,
            language: i18n.language,
          })
        });
      } catch (e) {
        console.error('Erreur notification admin:', e);
      }

      navigate('/dashboard/entreprise', { replace: true });
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error(error.message || t('createCompany.toasts.createError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20" data-testid="create-company-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-2">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('createCompany.back')}
        </Button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t('createCompany.title')}</h1>
          <p className="text-slate-600 mt-2">{t('createCompany.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Logo */}
              <div className="text-center">
                <div
                  className="w-24 h-24 bg-slate-100 rounded-xl mx-auto mb-3 flex items-center justify-center border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? t('createCompany.uploading') : t('createCompany.logo')}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('createCompany.labels.name')}
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (errors.name) setErrors(prev => ({ ...prev, name: false }));
                  }}
                  placeholder="Ex: ACME Corporation"
                  required
                  className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  data-testid="company-name-input"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createCompany.labels.description')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={t('createCompany.placeholders.description')}
                  data-testid="company-description-textarea"
                />
              </div>

              {/* Industry & Size */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createCompany.labels.industry')}</label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    data-testid="company-industry-select"
                  >
                    <option value="">{t('createCompany.options.selectIndustry')}</option>
                    {INDUSTRIES.map((ind, i) => (
                      <option key={i} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('createCompany.labels.size')}</label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    data-testid="company-size-select"
                  >
                    <option value="">{t('createCompany.options.selectSize')}</option>
                    {COMPANY_SIZES.map((size) => (
                      <option key={size} value={size}>{t(`createCompany.sizes.${size}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />{t('createCompany.labels.website')}
                  </label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://www.monentreprise.com"
                    data-testid="company-website-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />{t('createCompany.labels.email')}
                  </label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@monentreprise.com"
                    type="email"
                    data-testid="company-email-input"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />{t('createCompany.labels.phone')}
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    data-testid="company-phone-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />{t('createCompany.labels.foundedYear')}
                  </label>
                  <Input
                    value={form.founded_year}
                    onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
                    placeholder="Ex: 2020"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    data-testid="company-year-input"
                  />
                </div>
              </div>

              {/* Pays et Ville */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />{t('createCompany.labels.country', 'Pays')}
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {t(`countries.${c.code}`, c.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('createCompany.labels.city')}
                  </label>
                  <select
                    value={form.city_id}
                    onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    data-testid="company-city-select"
                  >
                    <option value="">{t('createCompany.options.selectCity')}</option>
                    {filteredCities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('createCompany.labels.address')}</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t('createCompany.placeholders.address')}
                  data-testid="company-address-input"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                disabled={loading}
                data-testid="create-company-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {t('createCompany.submit')}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default CreateCompanyPage;