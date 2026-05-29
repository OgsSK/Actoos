import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import AIAssistant from '../components/AIAssistant';
import { toast } from 'sonner';
import {
  Briefcase, MapPin, DollarSign, Calendar, Users, Clock,
  Plus, X, Save, Loader2, ChevronLeft, Eye, Send, GraduationCap
} from 'lucide-react';
import { slugify, CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../lib/utils';

const CreateJobPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);

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
  }, [id]);

  const fetchData = async () => {
    if (!user?.id) {
      toast.error('Utilisateur non identifié');
      navigate('/connexion');
      return;
    }
    setLoading(true);
    try {
      // Récupérer l'entreprise directement par owner_id
      const { data: ownedCompany, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (companyError || !ownedCompany) {
        toast.error('Vous devez créer une entreprise d\'abord');
        navigate('/dashboard/entreprise/creer');
        return;
      }
      setCompany(ownedCompany);

      // Charger les villes
      const { data: citiesData } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setCities(citiesData || []);

      // Charger les catégories
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
      toast.error('Offre non trouvée');
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

   const handleSave = async (publish = false) => {
  // Vérification des champs obligatoires
  if (!form.title || !form.description || !form.contract_type) {
    toast.error('Veuillez remplir les champs obligatoires');
    return;
  }
  // Catégorie maintenant obligatoire
  if (!form.category_id) {
    toast.error('Veuillez sélectionner une catégorie');
    return;
  }

  setSaving(true);
  try {
    const safeTitle = (form.title || '').substring(0, 200);

    const { data: country } = await supabase
      .from('countries')
      .select('id')
      .eq('code', 'ML')
      .single();

    // Déterminer le statut final :
    // - Si l'entreprise est vérifiée et qu'on publie → 'active'
    // - Si l'entreprise n'est pas vérifiée et qu'on publie → 'pending' (en attente de validation admin)
    let finalStatus = form.status;
    if (publish) {
      finalStatus = company?.is_verified ? 'active' : 'pending';
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
      category_id: form.category_id,   // maintenant obligatoire
      contract_type: form.contract_type,
      experience_level: form.experience_level || null,
      salary_min: form.salary_min ? parseInt(form.salary_min) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max) : null,
      salary_currency: 'XOF',
      is_salary_visible: form.is_salary_visible,
      city_id: form.city_id || null,
      country_id: country?.id,
      address: form.address || null,
      is_remote: form.is_remote,
      remote_type: form.is_remote ? form.remote_type : null,
      positions_count: parseInt(form.positions_count) || 1,
      skills_required: form.skills_required.length > 0 ? form.skills_required : null,
      application_deadline: form.application_deadline || null,
      start_date: form.start_date || null,
      is_urgent: form.is_urgent,
      status: finalStatus,
      published_at: publish ? new Date().toISOString() : null,
      expires_at: publish ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
    };

    if (id) {
      const { error } = await supabase.from('jobs').update(jobData).eq('id', id);
      if (error) throw error;
      toast.success(publish ? (finalStatus === 'active' ? 'Offre publiée !' : 'Offre soumise pour validation') : 'Offre mise à jour');
    } else {
      const { error } = await supabase.from('jobs').insert(jobData);
      if (error) throw error;
      toast.success(publish ? (finalStatus === 'active' ? 'Offre publiée !' : 'Offre soumise pour validation') : 'Brouillon enregistré');
    }

    window.location.href = '/dashboard/entreprise';
  } catch (error) {
    console.error('Error saving job:', error);
    toast.error('Erreur lors de l\'enregistrement');
  } finally {
    setSaving(false);
  }
};
  return (
    <div className="min-h-screen bg-slate-50 pt-20" data-testid="create-job-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard/entreprise')} className="-ml-2">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {id ? 'Modifier l\'offre' : 'Nouvelle offre d\'emploi'}
              </h1>
              <p className="text-slate-600">{company?.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700 text-white" data-testid="publish-job-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Publier
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Informations de base
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titre du poste *
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Développeur Full Stack, Comptable Senior..."
                  required
                  data-testid="job-title-input"
                />
                <div className="mt-2">
                  <AIAssistant
                    agentId="job-title"
                    initialText={form.title}
                    onApply={(newTitle) => setForm({ ...form, title: newTitle })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    data-testid="job-category-select"
                  >
                    <option value="">Sélectionner</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type de contrat *</label>
                  <select
                    value={form.contract_type}
                    onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                    data-testid="job-contract-select"
                  >
                    {Object.entries(CONTRACT_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    Niveau d'expérience
                  </label>
                  <select
                    value={form.experience_level}
                    onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    data-testid="job-experience-select"
                  >
                    <option value="">Non spécifié</option>
                    {Object.entries(EXPERIENCE_LEVELS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Users className="w-4 h-4 inline mr-1" />
                    Postes à pourvoir
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
                  <span className="text-sm text-slate-600">Offre urgente</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">Description du poste</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Décrivez le poste, le contexte, l'équipe..."
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Missions / Responsabilités</label>
                <textarea
                  value={form.responsibilities}
                  onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="• Mission 1&#10;• Mission 2&#10;• Mission 3..."
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Profil recherché / Exigences</label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="• Diplôme requis&#10;• Compétences techniques&#10;• Qualités personnelles..."
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Avantages offerts</label>
                <textarea
                  value={form.benefits}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="• Assurance santé&#10;• Télétravail partiel&#10;• Formation continue..."
                  data-testid="job-benefits-textarea"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">Compétences requises</h2>
              
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Ex: React, Python, Excel..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  data-testid="job-skill-input"
                />
                <Button type="button" onClick={handleAddSkill} disabled={!newSkill.trim()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
              
              {form.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills_required.map((skill) => (
                    <Badge key={skill} className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1">
                      {skill}
                      <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Localisation
              </h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                  <select
                    value={form.city_id}
                    onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    data-testid="job-city-select"
                  >
                    <option value="">Sélectionner</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adresse précise</label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Quartier, rue..."
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
                  <span className="text-sm text-slate-600">Télétravail possible</span>
                </label>
                
                {form.is_remote && (
                  <select
                    value={form.remote_type}
                    onChange={(e) => setForm({ ...form, remote_type: e.target.value })}
                    className="h-9 px-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="">Type de télétravail</option>
                    <option value="full">100% télétravail</option>
                    <option value="partial">Hybride</option>
                    <option value="occasional">Occasionnel</option>
                  </select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Salary */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Rémunération
              </h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salaire minimum (FCFA/mois)</label>
                  <Input
                    type="number"
                    value={form.salary_min}
                    onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                    placeholder="Ex: 300000"
                    data-testid="job-salary-min-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salaire maximum (FCFA/mois)</label>
                  <Input
                    type="number"
                    value={form.salary_max}
                    onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                    placeholder="Ex: 500000"
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
                <span className="text-sm text-slate-600">Afficher le salaire aux candidats</span>
              </label>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Dates
              </h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date limite de candidature</label>
                  <Input
                    type="date"
                    value={form.application_deadline}
                    onChange={(e) => setForm({ ...form, application_deadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="job-deadline-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de début souhaitée</label>
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer comme brouillon
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700 text-white" data-testid="publish-job-btn-bottom">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Publier l'offre
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateJobPage;