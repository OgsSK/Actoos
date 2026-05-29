import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchCategories, fetchCities } from '../lib/data';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import {
  Search, MapPin, Briefcase, Building2, Clock, Filter, X,
  ChevronDown, ChevronUp, Loader2, SlidersHorizontal, Heart,
  ExternalLink, Banknote, MoreVertical, Edit, Trash2, CheckCircle, Send
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// ---- Fonction pour normaliser les accents ----
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Job Card Component
const JobCard = ({ job, user, isCompany, onSave, isSaved }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const [showMenu, setShowMenu] = useState(false);
  const isOwner = user?.id && job.company?.owner_id === user.id;

  const handleToggleStatus = async (newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'active' && !job.published_at) {
        updates.published_at = new Date().toISOString();
        updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      await supabase.from('jobs').update(updates).eq('id', job.id);
      toast.success(newStatus === 'active' ? 'Offre publiée !' : 'Statut mis à jour');
      setShowMenu(false);
      window.location.reload();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette offre ?')) return;
    try {
      await supabase.from('jobs').delete().eq('id', job.id);
      toast.success('Offre supprimée');
      setShowMenu(false);
      window.location.reload();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <Card className={cn(
      'group hover:shadow-xl transition-all duration-300 border-slate-200 rounded-3xl overflow-hidden bg-white relative',
      job.is_featured && 'ring-2 ring-blue-500 ring-offset-2'
    )}>
      {isOwner && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-blue-600 text-white text-white text-xs">Votre offre</Badge>
        </div>
      )}

      <Link to={`/emplois/${job.id}`} className="block">
        <CardContent className="p-0">
          <div className="flex gap-2 p-3 pb-0">
            {job.is_featured && <Badge className="bg-blue-600 text-white text-white rounded-full">⭐ Mise en avant</Badge>}
            {job.is_urgent && <Badge className="bg-red-500 text-white rounded-full">🔥 Urgent</Badge>}
            {job.is_remote && <Badge variant="outline" className="border-green-500 text-green-600 rounded-full">🏠 Télétravail</Badge>}
          </div>

          <div className="p-5 pt-3">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                {job.company?.logo_url ? (
                  <img src={job.company.logo_url} alt={job.company.name} className="w-12 h-12 object-contain" />
                ) : (
                  <Building2 className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 line-clamp-1">{job.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-700 font-medium">{job.company?.name}</span>
                  {job.company?.is_verified && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs px-1.5 rounded-full">✓ Vérifié</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.city?.name}</span>
                  <Badge className={cn(contractInfo.color, 'border-0 rounded-full')}>{contractInfo.label}</Badge>
                  {job.salary_min && job.salary_max && (
                    <span className="flex items-center gap-1"><Banknote className="w-4 h-4" />{job.salary_min.toLocaleString('fr-FR')} - {job.salary_max.toLocaleString('fr-FR')} FCFA</span>
                  )}
                </div>
                {job.skills_required && job.skills_required.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.skills_required.slice(0, 4).map(skill => (
                      <span key={skill} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-xl">{skill}</span>
                    ))}
                    {job.skills_required.length > 4 && <span className="text-xs text-slate-400">+{job.skills_required.length - 4}</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(job.created_at)}</span>
              <span className="text-blue-600 text-sm font-medium flex items-center gap-1">Voir l'offre <ExternalLink className="w-4 h-4" /></span>
            </div>
          </div>
        </CardContent>
      </Link>

      {!isOwner && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave && onSave(job.id); }}
          className={cn('absolute top-2 right-2 p-2 rounded-xl transition-all z-10', isSaved ? 'bg-red-100 text-red-500' : 'bg-white/90 text-slate-400 hover:bg-red-50 hover:text-red-500')}
        >
          <Heart className={cn('w-5 h-5', isSaved && 'fill-current')} />
        </button>
      )}

      {isOwner && (
        <div className="absolute top-2 right-2 z-10">
          <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}>
            <MoreVertical className="w-5 h-5" />
          </Button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30">
                <Link to={`/dashboard/entreprise/offres/${job.id}/modifier`} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Edit className="w-4 h-4" /> Modifier
                </Link>
                {job.status === 'draft' || job.status === 'closed' || job.status === 'expired' ? (
                  <button onClick={() => handleToggleStatus('active')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-slate-50">
                    <Send className="w-4 h-4" /> Publier
                  </button>
                ) : job.status === 'active' ? (
                  <button onClick={() => handleToggleStatus('paused')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-slate-50">
                    <Clock className="w-4 h-4" /> Mettre en pause
                  </button>
                ) : job.status === 'paused' ? (
                  <button onClick={() => handleToggleStatus('active')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-slate-50">
                    <CheckCircle className="w-4 h-4" /> Réactiver
                  </button>
                ) : null}
                <button onClick={handleDelete} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-slate-50">
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
};

// Filters Sidebar
const FiltersSidebar = ({ filters, onChange, cities, categories, contractTypes, experienceLevels, onReset }) => {
  const [expanded, setExpanded] = useState({
    contract: true,
    location: true,
    salary: true,
    experience: true,
    category: true,
  });

  const toggleSection = (section) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }));

  const FilterSection = ({ id, title, children }) => (
    <div className="border-b border-slate-200 py-4">
      <button onClick={() => toggleSection(id)} className="flex items-center justify-between w-full text-left font-medium text-slate-900">
        {title}
        {expanded[id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded[id] && <div className="mt-3">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-blue-600" />Filtres</h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-blue-600">Réinitialiser</Button>
      </div>

      <FilterSection id="contract" title="Type de contrat">
        <div className="space-y-2">
          {contractTypes.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.contract_types?.includes(value)} onChange={(e) => {
                const newTypes = e.target.checked ? [...(filters.contract_types || []), value] : (filters.contract_types || []).filter(t => t !== value);
                onChange({ ...filters, contract_types: newTypes });
              }} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection id="location" title="Localisation">
        <Select value={filters.city || 'all'} onValueChange={(value) => onChange({ ...filters, city: value === 'all' ? null : value })}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Toutes les villes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((city) => <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input type="checkbox" checked={filters.remote || false} onChange={(e) => onChange({ ...filters, remote: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
          <span className="text-sm text-slate-700">Télétravail possible</span>
        </label>
      </FilterSection>

      <FilterSection id="salary" title="Salaire (FCFA)">
        <div className="space-y-3">
          <div><Label className="text-xs text-slate-500">Salaire minimum</Label><Input type="number" placeholder="Ex: 100000" value={filters.salary_min || ''} onChange={(e) => onChange({ ...filters, salary_min: e.target.value ? parseInt(e.target.value) : null })} className="h-10 rounded-xl" /></div>
          <div><Label className="text-xs text-slate-500">Salaire maximum</Label><Input type="number" placeholder="Ex: 500000" value={filters.salary_max || ''} onChange={(e) => onChange({ ...filters, salary_max: e.target.value ? parseInt(e.target.value) : null })} className="h-10 rounded-xl" /></div>
        </div>
      </FilterSection>

      <FilterSection id="experience" title="Expérience">
        <div className="space-y-2">
          {experienceLevels.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.experience_levels?.includes(value)} onChange={(e) => {
                const newLevels = e.target.checked ? [...(filters.experience_levels || []), value] : (filters.experience_levels || []).filter(l => l !== value);
                onChange({ ...filters, experience_levels: newLevels });
              }} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection id="category" title="Catégorie">
        <Select value={filters.category || 'all'} onValueChange={(value) => onChange({ ...filters, category: value === 'all' ? null : value })}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Toutes les catégories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((cat) => <SelectItem key={cat.slug} value={cat.slug}>{cat.icon || '📌'} {cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterSection>
    </div>
  );
};

// Main Jobs Page
const JobsPage = () => {
  const [searchParams] = useSearchParams();
  const { user, isCompany } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableContractTypes, setAvailableContractTypes] = useState([]);
  const [availableExperienceLevels, setAvailableExperienceLevels] = useState([]);

  const [filters, setFilters] = useState({
    keyword: searchParams.get('q') || '',
    city: searchParams.get('location') || null,
    contract_types: searchParams.get('contract')?.split(',').filter(Boolean) || [],
    experience_levels: [],
    category: searchParams.get('category') || null,   // <-- slug
    salary_min: null,
    salary_max: null,
    remote: false,
  });

  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const loadLists = async () => {
      const [cats, cityList] = await Promise.all([fetchCategories(), fetchCities()]);
      setCategories(cats);
      setCities(cityList);
      console.log('Catégories chargées :', cats);  
    };
    loadLists();
  }, []);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const { data: contractData } = await supabase.from('jobs').select('contract_type').eq('status', 'active');
        if (contractData) {
          const uniqueTypes = [...new Set(contractData.map(j => j.contract_type).filter(Boolean))];
          setAvailableContractTypes(uniqueTypes.map(type => ({ value: type, label: CONTRACT_TYPES[type]?.label || type })));
        }
        const { data: expData } = await supabase.from('jobs').select('experience_level').eq('status', 'active');
        if (expData) {
          const uniqueExp = [...new Set(expData.map(j => j.experience_level).filter(Boolean))];
          setAvailableExperienceLevels(uniqueExp.map(exp => ({ value: exp, label: EXPERIENCE_LEVELS[exp]?.label || exp })));
        }
      } catch (err) {
        setAvailableContractTypes(Object.entries(CONTRACT_TYPES).map(([k,v]) => ({ value: k, label: v.label })));
        setAvailableExperienceLevels(Object.entries(EXPERIENCE_LEVELS).map(([k,v]) => ({ value: k, label: v.label })));
      }
    };
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`id, title, description, contract_type, experience_level, salary_min, salary_max, is_remote, is_urgent, is_featured, skills_required, created_at, status, category_id, company:companies(name, logo_url, is_verified, owner_id), city:cities(name)`)
          .eq('status', 'active')
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setJobs(data || []);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from('saved_jobs').select('job_id').eq('user_id', user.id).then(({ data }) => {
        setSavedJobs((data || []).map(s => s.job_id));
      });
    }
  }, [user]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Filtre par mot-clé (insensible aux accents)
    if (filters.keyword) {
      const kw = removeAccents(filters.keyword);
      result = result.filter(job =>
        removeAccents(job.title).includes(kw) ||
        removeAccents(job.company?.name || '').includes(kw) ||
        (job.skills_required || []).some(s => removeAccents(s).includes(kw))
      );
    }

    if (filters.city) result = result.filter(job => job.city?.name === filters.city);
    if (filters.contract_types?.length > 0) result = result.filter(job => filters.contract_types.includes(job.contract_type));
    if (filters.experience_levels?.length > 0) result = result.filter(job => filters.experience_levels.includes(job.experience_level));
    if (filters.remote) result = result.filter(job => job.is_remote);
    if (filters.salary_min) result = result.filter(job => job.salary_max >= filters.salary_min);
    if (filters.salary_max) result = result.filter(job => job.salary_min <= filters.salary_max);

    // Filtre par catégorie (slug -> id via la liste categories)
   if (filters.category && categories.length > 0) {
  const cat = categories.find(c => c.slug === filters.category);
  if (cat) {
    result = result.filter(job => job.category_id === cat.id);
  } else {
    console.warn('Catégorie inconnue :', filters.category);
  }
}

    if (sortBy === 'recent') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === 'salary') result.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
    result.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));

    return result;
  }, [jobs, filters, sortBy, categories]);

  const handleSaveJob = async (jobId) => {
    if (!user) { toast.error('Connectez-vous pour sauvegarder'); return; }
    if (savedJobs.includes(jobId)) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
      setSavedJobs(prev => prev.filter(id => id !== jobId));
      toast.success('Offre retirée des favoris');
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId });
      setSavedJobs(prev => [...prev, jobId]);
      toast.success('Offre sauvegardée');
    }
  };

  const resetFilters = () => setFilters({ keyword: '', city: null, contract_types: [], experience_levels: [], category: null, salary_min: null, salary_max: null, remote: false });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.city) count++;
    if (filters.contract_types?.length) count += filters.contract_types.length;
    if (filters.experience_levels?.length) count += filters.experience_levels.length;
    if (filters.salary_min || filters.salary_max) count++;
    if (filters.remote) count++;
    if (filters.category) count++;
    return count;
  }, [filters]);

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Search Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 lg:top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-3">
              <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><Input type="text" placeholder="Poste, compétences..." value={filters.keyword} onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))} className="pl-10 h-12 rounded-xl" /></div>
              <div className="w-48 relative hidden sm:block"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" /><Select value={filters.city || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value === 'all' ? null : value }))}><SelectTrigger className="pl-10 h-12 rounded-xl"><SelectValue placeholder="Ville" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les villes</SelectItem>{cities.map(city => <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <Button variant="outline" className="lg:hidden rounded-xl" onClick={() => setShowMobileFilters(true)}><Filter className="w-4 h-4 mr-2" /> Filtres {activeFiltersCount > 0 && <Badge className="ml-2 bg-blue-600 text-white rounded-full">{activeFiltersCount}</Badge>}</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          <div className="hidden lg:block w-72 shrink-0">
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sticky top-36">
              <FiltersSidebar filters={filters} onChange={setFilters} cities={cities} categories={categories} contractTypes={availableContractTypes} experienceLevels={availableExperienceLevels} onReset={resetFilters} />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{filters.keyword ? `Résultats pour "${filters.keyword}"` : 'Toutes les offres'}</h1>
                <p className="text-slate-600 mt-1">{filteredJobs.length} offre{filteredJobs.length > 1 ? 's' : ''} trouvée{filteredJobs.length > 1 ? 's' : ''}</p>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">Plus récentes</SelectItem><SelectItem value="salary">Salaire décroissant</SelectItem></SelectContent></Select>
            </div>

            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.city && <Badge variant="secondary" className="gap-1 rounded-full">{filters.city} <button onClick={() => setFilters(prev => ({ ...prev, city: null }))}><X className="w-3 h-3" /></button></Badge>}
                {filters.contract_types?.map(type => <Badge key={type} variant="secondary" className="gap-1 rounded-full">{CONTRACT_TYPES[type]?.label} <button onClick={() => setFilters(prev => ({ ...prev, contract_types: prev.contract_types.filter(t => t !== type) }))}><X className="w-3 h-3" /></button></Badge>)}
                {filters.experience_levels?.map(exp => <Badge key={exp} variant="secondary" className="gap-1 rounded-full">{EXPERIENCE_LEVELS[exp]?.label} <button onClick={() => setFilters(prev => ({ ...prev, experience_levels: prev.experience_levels.filter(e => e !== exp) }))}><X className="w-3 h-3" /></button></Badge>)}
                {filters.category && <Badge variant="secondary" className="gap-1 rounded-full">{categories.find(c => c.slug === filters.category)?.name || filters.category} <button onClick={() => setFilters(prev => ({ ...prev, category: null }))}><X className="w-3 h-3" /></button></Badge>}
                {(filters.salary_min || filters.salary_max) && <Badge variant="secondary" className="gap-1 rounded-full">{filters.salary_min ? `${filters.salary_min.toLocaleString()} FCFA` : '0'} - {filters.salary_max ? `${filters.salary_max.toLocaleString()} FCFA` : '∞'} <button onClick={() => setFilters(prev => ({ ...prev, salary_min: null, salary_max: null }))}><X className="w-3 h-3" /></button></Badge>}
                {filters.remote && <Badge variant="secondary" className="gap-1 rounded-full">Télétravail <button onClick={() => setFilters(prev => ({ ...prev, remote: false }))}><X className="w-3 h-3" /></button></Badge>}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune offre trouvée</h3>
                <p className="text-slate-600 mb-4">Essayez de modifier vos critères de recherche</p>
                <Button variant="outline" onClick={resetFilters} className="rounded-xl border-blue-600 text-blue-600">Réinitialiser les filtres</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} user={user} isCompany={isCompany} onSave={handleSaveJob} isSaved={savedJobs.includes(job.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white"><h2 className="font-semibold text-lg">Filtres</h2><button onClick={() => setShowMobileFilters(false)}><X className="w-6 h-6" /></button></div>
            <div className="p-4"><FiltersSidebar filters={filters} onChange={setFilters} cities={cities} categories={categories} contractTypes={availableContractTypes} experienceLevels={availableExperienceLevels} onReset={resetFilters} /></div>
            <div className="p-4 border-t border-slate-200 sticky bottom-0 bg-white"><Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl" onClick={() => setShowMobileFilters(false)}>Voir {filteredJobs.length} résultat{filteredJobs.length > 1 ? 's' : ''}</Button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsPage;