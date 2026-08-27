import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { useCities } from '../hooks/useCities';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';

import {
  Building2, Globe, Mail, Phone, MapPin, Calendar,
  Loader2, ChevronLeft, Save, Image, Trash2,
  FileText, Upload, X, Plus
} from 'lucide-react';

// ---------- Drapeau emoji ----------
const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
};

const placeholderByCountry = {
  'US': '555 000 0000', 'CA': '555 000 0000', 'FR': '6 12 34 56 78',
  'CI': '05 00 00 00', 'SN': '70 123 45 67', 'ML': '70 00 00 00',
  'BF': '70 00 00 00', 'NE': '90 00 00 00', 'TG': '90 00 00 00',
  'BJ': '90 00 00 00', 'CM': '6 12 34 56 78', 'GA': '01 23 45 67',
  'CG': '01 23 45 67', 'CD': '81 000 00 00', 'NG': '801 234 5678',
  'GH': '50 123 4567', 'ZA': '82 123 4567', 'KE': '712 345 678',
  'UG': '712 345 678', 'TZ': '712 345 678', 'RW': '788 000 000',
  'BI': '79 000 000', 'MA': '06 12 34 56 78', 'DZ': '0550 12 34 56',
  'TN': '20 123 456', 'EG': '10 1234 5678', 'SA': '50 000 0000',
  'AE': '50 000 0000', 'UK': '7700 900 000', 'GB': '7700 900 000',
  'DE': '1512 3456789', 'IT': '312 345 6789', 'ES': '612 34 56 78',
  'PT': '912 345 678', 'NL': '06 12345678', 'BE': '470 12 34 56',
  'CH': '76 123 45 67', 'AT': '664 123456', 'IN': '98765 43210',
  'CN': '138 0000 0000', 'JP': '090 1234 5678', 'KR': '010 1234 5678',
  'AU': '412 345 678', 'NZ': '21 123 4567', 'BR': '11 91234 5678',
  'AR': '11 1234 5678', 'MX': '55 1234 5678',
};

// ---------- Skeleton pour le formulaire ----------
const CompanyProfileSkeleton = () => (
  <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8 animate-pulse">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0" />
      <div className="space-y-2">
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="h-4 bg-slate-200 rounded w-32" />
      </div>
    </div>
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 bg-slate-200 rounded-xl" />
          <div className="h-10 bg-slate-200 rounded-lg w-24" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-10 bg-slate-200 rounded-lg w-full" />
          </div>
        ))}
        <div className="h-11 bg-slate-200 rounded-lg w-full" />
      </CardContent>
    </Card>
  </div>
);

// ---------- Section Header ----------
const SectionHeader = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

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

  // ---------- Actualités ----------
  const [posts, setPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const postImageInputRef = useRef(null);

  const INDUSTRIES = t('createCompany.industries', { returnObjects: true }) || [];
  const COMPANY_SIZES = t('createCompany.sizes', { returnObjects: true }) || {};

  // ✅ Chargement initial combiné
  useEffect(() => {
    if (!user || !activeCompanyId) {
      setLoading(false);
      setNoCompany(true);
      return;
    }

    const loadAll = async () => {
      setLoading(true);
      try {
        // Charger pays et entreprise en parallèle
        const [countryResult, companyResult, postsResult] = await Promise.all([
          supabase.from('countries').select('code, name, phone_code').order('name'),
          supabase.from('companies').select('*').eq('id', activeCompanyId).single(),
          supabase.from('company_posts').select('*').eq('company_id', activeCompanyId).order('created_at', { ascending: false }),
        ]);

        if (countryResult.data) setCountries(countryResult.data);

        const companyData = companyResult.data;
        if (companyResult.error || !companyData) {
          setNoCompany(true);
          return;
        }

        setNoCompany(false);
        setCompany(companyData);
        setForm({
          name: companyData.name || '',
          description: companyData.description || '',
          industry: companyData.industry || '',
          size: companyData.size || '',
          website: companyData.website || '',
          email: companyData.email || '',
          phone: companyData.phone || '',
          city_id: companyData.city_id || '',
          address: companyData.address || '',
          founded_year: companyData.founded_year ? String(companyData.founded_year) : '',
          logo_url: companyData.logo_url || '',
        });

        if (companyData.country_id) {
          const country = countries.find(c => c.id === companyData.country_id) || 
            countryResult.data?.find(c => c.id === companyData.country_id);
          if (country) setSelectedCountry(country.code);
        }

        if (postsResult.data) setPosts(postsResult.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [user, activeCompanyId]);

  // ---------- Logo ----------
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
      const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
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

  // ---------- Actualités ----------
  const fetchPosts = async () => {
    if (!activeCompanyId) return;
    const { data } = await supabase
      .from('company_posts')
      .select('*')
      .eq('company_id', activeCompanyId)
      .order('created_at', { ascending: false });
    setPosts(data || []);
  };

  const handleAddPost = async () => {
    if (!newPostContent.trim()) return;
    setPosting(true);
    try {
      let imageUrl = null;
      if (newPostImage) {
        const fileExt = newPostImage.name.split('.').pop();
        const fileName = `${user.id}/company-posts/post-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, newPostImage, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('company_posts').insert({
        company_id: activeCompanyId,
        title: newPostTitle.trim() || null,
        content: newPostContent.trim(),
        image_url: imageUrl,
      });
      if (error) throw error;

      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage(null);
      setImagePreview(null);
      fetchPosts();
      toast.success(t('candidateProfilePage.posts.added'));
    } catch (err) {
      console.error('Erreur publication:', err);
      toast.error(err.message || t('candidateProfilePage.posts.error'));
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm(t('candidateProfilePage.posts.deleteConfirm'))) return;
    const { error } = await supabase.from('company_posts').delete().eq('id', postId);
    if (error) toast.error(error.message);
    else {
      toast.success(t('candidateProfilePage.posts.deleted'));
      fetchPosts();
    }
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
      const res = await fetch(`${window.location.hostname === 'localhost' ? 'http://localhost:8001' : 'https://actoos-jobs-api.onrender.com'}/api/company/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, company_id: activeCompanyId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erreur lors de la suppression');
      }
      toast.success(t('companyProfile.toasts.companyDeleted'));
      navigate('/dashboard/entreprise');
    } catch (err) {
      toast.error(err.message || t('companyProfile.toasts.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <CompanyProfileSkeleton />;

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

  const phonePlaceholder = placeholderByCountry[selectedCountry] || t('companyProfile.placeholders.phone') || "50 00 00 00";

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20 pb-24 sm:pb-10" data-testid="company-profile-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
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
              {/* Logo */}
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

              {/* Champs entreprise */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('companyProfile.labels.name')}</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('companyProfile.placeholders.name')} required className="min-h-[44px]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('companyProfile.labels.description')}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder={t('companyProfile.placeholders.description')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('companyProfile.labels.industry')}</label>
                  <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="w-full h-10 min-h-[44px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">{t('companyProfile.options.selectIndustry')}</option>
                    {INDUSTRIES.map((ind, i) => <option key={i} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('companyProfile.labels.size')}</label>
                  <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="w-full h-10 min-h-[44px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">{t('companyProfile.options.selectSize')}</option>
                    {Object.entries(COMPANY_SIZES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><Globe className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.website')}</label>
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder={t('companyProfile.placeholders.website')} className="min-h-[44px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><Mail className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.email')}</label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('companyProfile.placeholders.email')} className="min-h-[44px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><Phone className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.phone')}</label>
                  <div className="flex items-stretch">
                    <select value={selectedCountry || ''} onChange={(e) => setSelectedCountry(e.target.value)} className="h-10 min-h-[44px] px-2 border border-r-0 border-slate-200 rounded-l-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ minWidth: '90px' }}>
                      {countries.map(c => <option key={c.code} value={c.code}>{getFlagEmoji(c.code)} +{c.phone_code || '?'}</option>)}
                    </select>
                    <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={phonePlaceholder} className="min-h-[44px] flex-1 rounded-l-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><Calendar className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.foundedYear')}</label>
                  <Input value={form.founded_year} onChange={(e) => setForm({ ...form, founded_year: e.target.value })} placeholder={t('companyProfile.placeholders.year')} type="number" min="1900" max={new Date().getFullYear()} className="min-h-[44px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><MapPin className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.country')}</label>
                  <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="w-full h-10 min-h-[44px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {countries.map(c => <option key={c.code} value={c.code}>{t(`countries.${c.code}`, c.name)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><MapPin className="w-4 h-4 inline mr-1" />{t('companyProfile.labels.city')}</label>
                  <select value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value })} className="w-full h-10 min-h-[44px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">{t('companyProfile.options.selectCity')}</option>
                    {filteredCities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </select>
                </div>
              </div>

              {/* 🗺️ Champ Adresse avec bouton Carte */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('companyProfile.labels.address')}</label>
                <div className="flex gap-2">
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder={t('companyProfile.placeholders.address')}
                    className="min-h-[44px] flex-1"
                  />
                  {form.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-sm text-blue-600 hover:bg-blue-50 min-h-[44px] shrink-0"
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      {t('common.map', 'Carte')}
                    </a>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700 min-h-[44px]" disabled={saving}>
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {t('companyProfile.submit')}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Carte Actualités */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <SectionHeader
              icon={FileText}
              title={t('candidateProfilePage.posts.sectionTitle', 'Actualités')}
              description={t('candidateProfilePage.posts.sectionDesc', 'Partagez les actualités de votre entreprise')}
            />
            <div className="space-y-4">
              <div>
                <Input value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} placeholder={t('candidateProfilePage.posts.titlePlaceholder', 'Titre (optionnel)')} className="min-h-[44px] mb-2" />
                <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder={t('candidateProfilePage.posts.contentPlaceholder', 'Votre actualité…')} />
                <div className="flex items-center gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => postImageInputRef.current?.click()} type="button" className="min-h-[44px]">
                    <Upload className="w-4 h-4 mr-2" />
                    {t('candidateProfilePage.posts.addImage', 'Image')}
                  </Button>
                  <input ref={postImageInputRef} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0] || null; setNewPostImage(file); if (file) { setImagePreview(URL.createObjectURL(file)); } else { setImagePreview(null); } }} className="hidden" />
                  {newPostImage && <span className="text-sm text-slate-500">{newPostImage.name}</span>}
                </div>
                {imagePreview && (
                  <div className="mt-2 relative inline-block">
                    <img src={imagePreview} alt="Aperçu" className="rounded-lg max-h-40 object-cover" />
                    <button type="button" onClick={() => { setNewPostImage(null); setImagePreview(null); }} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 hover:bg-white"><X className="w-4 h-4 text-red-500" /></button>
                  </div>
                )}
                <Button onClick={handleAddPost} disabled={posting || !newPostContent.trim()} className="mt-3 min-h-[44px]" type="button">
                  {posting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {t('candidateProfilePage.posts.publish', 'Publier')}
                </Button>
              </div>
              {posts.length > 0 && (
                <div className="space-y-3 mt-4">
                  {posts.map(post => (
                    <div key={post.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {post.title && <h4 className="font-medium text-slate-900">{post.title}</h4>}
                          <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1">{post.content}</p>
                          {post.image_url && <img src={post.image_url} alt="" className="mt-3 rounded-lg max-h-60 object-cover" />}
                          <p className="text-xs text-slate-400 mt-2">{new Date(post.created_at).toLocaleDateString()}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)} className="text-red-500 h-8 w-8 shrink-0"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Suppression entreprise */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-red-600 font-semibold mb-2">{t('companyProfile.deleteSection.title')}</h3>
          <p className="text-sm text-slate-600 mb-4">{t('companyProfile.deleteSection.description')}</p>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 min-h-[44px]" onClick={handleDeleteCompany} disabled={deleting}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {deleting ? t('companyProfile.deleteSection.deleting') : t('companyProfile.deleteSection.button')}
          </Button>
        </div>
      </div>

      {/* Barre sticky mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 sm:hidden z-40">
        <Button type="button" onClick={handleSubmit} disabled={saving} className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700 gap-2">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {t('companyProfile.submit')}
        </Button>
      </div>
    </div>
  );
};

export default CompanyProfilePage;