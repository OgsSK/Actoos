import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import {
  Building2, Globe, Mail, Phone, MapPin, Users, Calendar,
  Loader2, ChevronLeft, Save, Upload, Trash2
} from 'lucide-react';

const CompanyProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const logoInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cities, setCities] = useState([]);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', industry: '', size: '', website: '',
    email: '', phone: '', city_id: '', address: '', founded_year: '', logo_url: '',
  });

  useEffect(() => {
    fetchCities();
    fetchCompany();
  }, []);

  const fetchCities = async () => {
    const { data } = await supabase.from('cities').select('*').eq('is_active', true).order('name');
    setCities(data || []);
  };

  const fetchCompany = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!error && data) {
      setCompany(data);
      setForm({
        name: data.name || '', description: data.description || '',
        industry: data.industry || '', size: data.size || '',
        website: data.website || '', email: data.email || '',
        phone: data.phone || '', city_id: data.city_id || '',
        address: data.address || '', founded_year: data.founded_year ? String(data.founded_year) : '',
        logo_url: data.logo_url || '',
      });
    }
  };

  // Upload immédiat + mise à jour DB
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("L'image ne doit pas dépasser 2MB"); return; }
    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        const res = await apiFetch('/api/upload', {
          method: 'POST',
          body: JSON.stringify({
            bucket: 'company-logos',
            folder: user.id,
            filename: `logo-${Date.now()}.${file.name.split('.').pop()}`,
            file_data: base64Data
          })
        });
        // Mettre à jour la base immédiatement
        await supabase.from('companies').update({ logo_url: res.url }).eq('id', company.id);
        setForm({ ...form, logo_url: res.url });
        toast.success('Logo mis à jour');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Erreur lors du téléchargement du logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Suppression immédiate + mise à jour DB
  const handleDeleteLogo = async () => {
    if (!window.confirm('Supprimer le logo ?')) return;
    try {
      if (form.logo_url) {
        const urlParts = form.logo_url.split('/company-logos/');
        if (urlParts[1]) await supabase.storage.from('company-logos').remove([urlParts[1]]);
      }
      await supabase.from('companies').update({ logo_url: null }).eq('id', company.id);
      setForm({ ...form, logo_url: '' });
      toast.success('Logo supprimé');
    } catch (err) {
      toast.error('Erreur suppression logo');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Le nom de l'entreprise est requis"); return; }
    setLoading(true);
    try {
      const updates = {
        name: form.name, description: form.description || null,
        industry: form.industry || null, size: form.size || null,
        website: form.website ? (form.website.startsWith('http') ? form.website : `https://${form.website}`) : null,
        email: form.email || null, phone: form.phone || null,
        city_id: form.city_id || null, address: form.address || null,
        founded_year: form.founded_year ? parseInt(form.founded_year) : null,
        logo_url: form.logo_url || null,
      };
      const { error } = await supabase.from('companies').update(updates).eq('id', company.id);
      if (error) throw error;
      toast.success('Profil mis à jour');
    } catch (err) { toast.error(err.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  if (!company) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard/entreprise')} className="mb-6 -ml-2">
          <ChevronLeft className="w-4 h-4 mr-1" />Retour
        </Button>
        <div className="text-center mb-8">
          <div
            className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-400 transition-colors overflow-hidden relative"
            onClick={() => logoInputRef.current?.click()}
          >
            {uploadingLogo ? <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            : form.logo_url ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
            : <Building2 className="w-10 h-10 text-blue-600" />}
          </div>
          <div className="flex gap-2 mt-2 justify-center">
            <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
              <Upload className="w-4 h-4 mr-2" /> Changer le logo
            </Button>
            {form.logo_url && (
              <Button variant="outline" size="sm" onClick={handleDeleteLogo} className="text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </Button>
            )}
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          <h1 className="text-2xl font-bold text-slate-900 mt-4">Profil entreprise</h1>
          <p className="text-slate-600 mt-2">Modifiez les informations de votre entreprise</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'entreprise *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea rows={4} className="w-full border border-slate-200 rounded-lg p-3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Secteur</label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Taille</label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1"><Globe className="w-4 h-4 inline mr-1" />Site web</label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1"><Mail className="w-4 h-4 inline mr-1" />Email</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1"><Phone className="w-4 h-4 inline mr-1" />Téléphone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1"><Calendar className="w-4 h-4 inline mr-1" />Année de création</label><Input type="number" value={form.founded_year} onChange={(e) => setForm({ ...form, founded_year: e.target.value })} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1"><MapPin className="w-4 h-4 inline mr-1" />Ville</label>
                  <select value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value })} className="w-full h-10 border border-slate-200 rounded-md">
                    <option value="">Sélectionnez</option>
                    {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-blue-600 text-white hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Enregistrer les modifications
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyProfilePage;