import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import {
  Building2, Globe, Mail, Phone, MapPin, Users, Calendar,
  Loader2, ChevronLeft, Save, Image
} from 'lucide-react';

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+'
];

const INDUSTRIES = [
  'Technologie',
  'Finance & Banque',
  'Télécommunications',
  'Commerce & Distribution',
  'Industrie & Manufacturing',
  'Agriculture',
  'BTP & Construction',
  'Transport & Logistique',
  'Santé & Pharmaceutique',
  'Éducation & Formation',
  'Tourisme & Hôtellerie',
  'Services aux entreprises',
  'ONG & Humanitaire',
  'Administration publique',
  'Autre'
];

const CompanyProfilePage = () => {
  const { user, activeCompanyId } = useAuth();
  const navigate = useNavigate();
  const logoInputRef = React.useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [noCompany, setNoCompany] = useState(false);
  const [cities, setCities] = useState([]);
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
    fetchCities();
    fetchCompany();
  }, [user, activeCompanyId]);

  const fetchCities = async () => {
    const { data } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setCities(data || []);
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
    setLoading(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2MB");
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
      toast.success('Logo téléchargé');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Le nom de l\'entreprise est requis');
      return;
    }

    setSaving(true);
    try {
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
        address: form.address || null,
        founded_year: form.founded_year ? parseInt(form.founded_year) : null,
        logo_url: form.logo_url || null,
      };

      const { error } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', activeCompanyId);

      if (error) throw error;
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">Aucune entreprise</h2>
          <p className="text-slate-600 mb-6">
            Vous devez créer une entreprise pour accéder à votre profil.
          </p>
          <Link to="/dashboard/entreprise/creer">
            <Button className="bg-blue-600 text-white">Créer mon entreprise</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20" data-testid="company-profile-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-2">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Modifier votre entreprise</h1>
          <p className="text-slate-600 mt-2">
            Mettez à jour les informations de votre entreprise
          </p>
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
                  {uploadingLogo ? 'Téléchargement...' : 'Ajouter un logo'}
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
                  Nom de l'entreprise *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Orange"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Présentez votre entreprise, sa mission, ses valeurs..."
                />
              </div>

              {/* Industry & Size */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Secteur d'activité</label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Sélectionner</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Taille de l'entreprise</label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Sélectionner</option>
                    {COMPANY_SIZES.map(size => (
                      <option key={size} value={size}>{size} employés</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />Site web
                  </label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://www.example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />Email de contact
                  </label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="recrutement@example.com"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />Téléphone
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+223 XX XX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />Année de création
                  </label>
                  <Input
                    value={form.founded_year}
                    onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
                    placeholder="Ex: 2010"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />Ville
                  </label>
                  <select
                    value={form.city_id}
                    onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Sélectionner</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Quartier, rue..."
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Enregistrer les modifications
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default CompanyProfilePage;