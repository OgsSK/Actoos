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
  Share2, ExternalLink, Banknote
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../lib/utils';

// Job Card Component
const JobCard = ({ job, onSave, isSaved }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;

  return (
    <Card className={cn(
      'group hover:shadow-xl transition-all duration-300 border-slate-200 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm',
      job.is_featured && 'ring-2 ring-[#2563eb] ring-offset-2'
    )}>
      <CardContent className="p-0">
        {/* Badges top */}
        <div className="flex gap-2 p-3 pb-0">
          {job.is_featured && (
            <Badge className="bg-[#2563eb] text-white rounded-full">⭐ Mise en avant</Badge>
          )}
          {job.is_urgent && (
            <Badge className="bg-red-500 text-white rounded-full">🔥 Urgent</Badge>
          )}
          {job.is_remote && (
            <Badge variant="outline" className="border-green-500 text-green-600 rounded-full">
              🏠 Télétravail
            </Badge>
          )}
        </div>

        <div className="p-5 pt-3">
          <div className="flex items-start gap-4">
            {/* Company Logo */}
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#2563eb]/10 transition-colors">
              {job.company?.logo_url ? (
                <img src={job.company.logo_url} alt={job.company.name} className="w-12 h-12 object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400 group-hover:text-[#2563eb]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Link
                to={`/emplois/${job.id}`}
                className="font-semibold text-lg text-slate-900 hover:text-[#2563eb] line-clamp-1 block"
              >
                {job.title}
              </Link>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-700 font-medium">{job.company?.name}</span>
                {job.company?.is_verified && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs px-1.5 rounded-full">
                    ✓ Vérifié
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.city?.name}
                </span>
                <Badge className={cn(contractInfo.color, 'border-0 rounded-full')}>
                  {contractInfo.label}
                </Badge>
                {job.salary_min && job.salary_max && (
                  <span className="flex items-center gap-1">
                    <Banknote className="w-4 h-4" />
                    {job.salary_min.toLocaleString('fr-FR')} - {job.salary_max.toLocaleString('fr-FR')} FCFA
                  </span>
                )}
              </div>

              {/* Skills */}
              {job.skills_required && job.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {job.skills_required.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-xl"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.skills_required.length > 4 && (
                    <span className="text-xs text-slate-400">
                      +{job.skills_required.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => onSave && onSave(job.id)}
                className={cn(
                  'p-2 rounded-xl transition-all',
                  isSaved
                    ? 'bg-red-100 text-red-500'
                    : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500'
                )}
              >
                <Heart className={cn('w-5 h-5', isSaved && 'fill-current')} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelative(job.created_at)}
            </span>

            <Link to={`/emplois/${job.id}`}>
              <Button size="sm" className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl">
                Voir l'offre
                <ExternalLink className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Filters Sidebar (dynamique, champs libres pour le salaire)
const FiltersSidebar = ({ filters, onChange, cities, categories, contractTypes, experienceLevels, onReset }) => {
  const [expanded, setExpanded] = useState({
    contract: true,
    location: true,
    salary: true,
    experience: true,
    category: true,
  });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const FilterSection = ({ id, title, children }) => (
    <div className="border-b border-slate-200 py-4">
      <button
        onClick={() => toggleSection(id)}
        className="flex items-center justify-between w-full text-left font-medium text-slate-900"
      >
        {title}
        {expanded[id] ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {expanded[id] && <div className="mt-3">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[#2563eb]" />
          Filtres
        </h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-[#2563eb]">
          Réinitialiser
        </Button>
      </div>

      {/* Contract Type - DYNAMIQUE */}
      <FilterSection id="contract" title="Type de contrat">
        <div className="space-y-2">
          {contractTypes.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.contract_types?.includes(value)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...(filters.contract_types || []), value]
                    : (filters.contract_types || []).filter(t => t !== value);
                  onChange({ ...filters, contract_types: newTypes });
                }}
                className="w-4 h-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Location - villes dynamiques */}
      <FilterSection id="location" title="Localisation">
        <Select
          value={filters.city || 'all'}
          onValueChange={(value) => onChange({ ...filters, city: value === 'all' ? null : value })}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Toutes les villes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input
            type="checkbox"
            checked={filters.remote || false}
            onChange={(e) => onChange({ ...filters, remote: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
          />
          <span className="text-sm text-slate-700">Télétravail possible</span>
        </label>
      </FilterSection>

      {/* Salary - champs libres */}
      <FilterSection id="salary" title="Salaire (FCFA)">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-500">Salaire minimum (FCFA)</Label>
            <Input
              type="number"
              placeholder="Ex: 100000"
              value={filters.salary_min || ''}
              onChange={(e) => onChange({ ...filters, salary_min: e.target.value ? parseInt(e.target.value) : null })}
              className="h-10 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Salaire maximum (FCFA)</Label>
            <Input
              type="number"
              placeholder="Ex: 500000"
              value={filters.salary_max || ''}
              onChange={(e) => onChange({ ...filters, salary_max: e.target.value ? parseInt(e.target.value) : null })}
              className="h-10 rounded-xl"
            />
          </div>
        </div>
      </FilterSection>

      {/* Experience - DYNAMIQUE */}
      <FilterSection id="experience" title="Expérience">
        <div className="space-y-2">
          {experienceLevels.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.experience_levels?.includes(value)}
                onChange={(e) => {
                  const newLevels = e.target.checked
                    ? [...(filters.experience_levels || []), value]
                    : (filters.experience_levels || []).filter(l => l !== value);
                  onChange({ ...filters, experience_levels: newLevels });
                }}
                className="w-4 h-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Category - dynamique */}
      <FilterSection id="category" title="Catégorie">
        <Select
          value={filters.category || 'all'}
          onValueChange={(value) => onChange({ ...filters, category: value === 'all' ? null : value })}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.slug} value={cat.slug}>
                {cat.icon || '📌'} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>
    </div>
  );
};

// Main Jobs Page
const JobsPage = () => {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Data lists (dynamiques)
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableContractTypes, setAvailableContractTypes] = useState([]);
  const [availableExperienceLevels, setAvailableExperienceLevels] = useState([]);

  // Chargement initial des listes
  useEffect(() => {
    const loadLists = async () => {
      const [cats, cityList] = await Promise.all([fetchCategories(), fetchCities()]);
      setCategories(cats);
      setCities(cityList);
    };
    loadLists();
  }, []);

  // Charger les valeurs distinctes pour les filtres dynamiques
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const { data: contractData, error: contractError } = await supabase
          .from('jobs')
          .select('contract_type')
          .eq('status', 'active');
        
        if (!contractError && contractData) {
          const uniqueTypes = [...new Set(contractData.map(j => j.contract_type).filter(Boolean))];
          const mapped = uniqueTypes.map(type => ({
            value: type,
            label: CONTRACT_TYPES[type]?.label || type,
          }));
          setAvailableContractTypes(mapped);
        }

        const { data: expData, error: expError } = await supabase
          .from('jobs')
          .select('experience_level')
          .eq('status', 'active');
        
        if (!expError && expData) {
          const uniqueExp = [...new Set(expData.map(j => j.experience_level).filter(Boolean))];
          const mapped = uniqueExp.map(exp => ({
            value: exp,
            label: EXPERIENCE_LEVELS[exp]?.label || exp,
          }));
          setAvailableExperienceLevels(mapped);
        }
      } catch (err) {
        console.error('Erreur chargement filtres dynamiques', err);
        // Fallback : garder les listes statiques
        setAvailableContractTypes(Object.entries(CONTRACT_TYPES).map(([k,v]) => ({ value: k, label: v.label })));
        setAvailableExperienceLevels(Object.entries(EXPERIENCE_LEVELS).map(([k,v]) => ({ value: k, label: v.label })));
      }
    };
    loadFilterOptions();
  }, []);

  // Filters state
  const [filters, setFilters] = useState({
    keyword: searchParams.get('q') || '',
    city: searchParams.get('location') || null,
    contract_types: searchParams.get('contract')?.split(',').filter(Boolean) || [],
    experience_levels: [],
    category: searchParams.get('category') || null,
    salary_min: null,
    salary_max: null,
    remote: false,
  });

  const [sortBy, setSortBy] = useState('recent');

  // Fetch jobs from Supabase
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            id, title, description, contract_type, experience_level,
            salary_min, salary_max, is_remote, is_urgent, is_featured,
            skills_required, created_at,
            company:companies(name, logo_url, is_verified),
            city:cities(name)
          `)
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

  // Filter jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Keyword filter
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter(job =>
        job.title.toLowerCase().includes(keyword) ||
        job.company?.name?.toLowerCase().includes(keyword) ||
        job.skills_required?.some(s => s.toLowerCase().includes(keyword))
      );
    }

    // City filter
    if (filters.city) {
      result = result.filter(job => job.city?.name === filters.city);
    }

    // Contract type filter
    if (filters.contract_types?.length > 0) {
      result = result.filter(job => filters.contract_types.includes(job.contract_type));
    }

    // Experience filter
    if (filters.experience_levels?.length > 0) {
      result = result.filter(job => filters.experience_levels.includes(job.experience_level));
    }

    // Remote filter
    if (filters.remote) {
      result = result.filter(job => job.is_remote);
    }

    // Salary filter (min & max)
    if (filters.salary_min) {
      result = result.filter(job => job.salary_max >= filters.salary_min);
    }
    if (filters.salary_max) {
      result = result.filter(job => job.salary_min <= filters.salary_max);
    }

    // Sort
    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'salary') {
      result.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
    }

    // Featured first
    result.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));

    return result;
  }, [jobs, filters, sortBy]);

  const handleSaveJob = (jobId) => {
    setSavedJobs(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const resetFilters = () => {
    setFilters({
      keyword: '',
      city: null,
      contract_types: [],
      experience_levels: [],
      category: null,
      salary_min: null,
      salary_max: null,
      remote: false,
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.city) count++;
    if (filters.contract_types?.length > 0) count += filters.contract_types.length;
    if (filters.experience_levels?.length > 0) count += filters.experience_levels.length;
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
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Poste, compétences..."
                  value={filters.keyword}
                  onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  className="pl-10 h-12 rounded-xl"
                  data-testid="jobs-search-keyword"
                />
              </div>
              <div className="w-48 relative hidden sm:block">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                <Select
                  value={filters.city || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, city: value === 'all' ? null : value }))}
                >
                  <SelectTrigger className="pl-10 h-12 rounded-xl">
                    <SelectValue placeholder="Ville" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              className="lg:hidden rounded-xl"
              onClick={() => setShowMobileFilters(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-[#2563eb] rounded-full">{activeFiltersCount}</Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sticky top-36">
              <FiltersSidebar
                filters={filters}
                onChange={setFilters}
                cities={cities}
                categories={categories}
                contractTypes={availableContractTypes}
                experienceLevels={availableExperienceLevels}
                onReset={resetFilters}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {filters.keyword ? `Résultats pour "${filters.keyword}"` : 'Toutes les offres'}
                </h1>
                <p className="text-slate-600 mt-1">
                  {filteredJobs.length} offre{filteredJobs.length > 1 ? 's' : ''} trouvée{filteredJobs.length > 1 ? 's' : ''}
                </p>
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Plus récentes</SelectItem>
                  <SelectItem value="salary">Salaire décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filters */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.city && (
                  <Badge variant="secondary" className="gap-1 rounded-full">
                    {filters.city}
                    <button onClick={() => setFilters(prev => ({ ...prev, city: null }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.contract_types?.map(type => (
                  <Badge key={type} variant="secondary" className="gap-1 rounded-full">
                    {CONTRACT_TYPES[type]?.label}
                    <button onClick={() => setFilters(prev => ({
                      ...prev,
                      contract_types: prev.contract_types.filter(t => t !== type)
                    }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {filters.experience_levels?.map(exp => (
                  <Badge key={exp} variant="secondary" className="gap-1 rounded-full">
                    {EXPERIENCE_LEVELS[exp]?.label}
                    <button onClick={() => setFilters(prev => ({
                      ...prev,
                      experience_levels: prev.experience_levels.filter(e => e !== exp)
                    }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {(filters.salary_min || filters.salary_max) && (
                  <Badge variant="secondary" className="gap-1 rounded-full">
                    {filters.salary_min ? `${filters.salary_min.toLocaleString()} FCFA` : '0'} - {filters.salary_max ? `${filters.salary_max.toLocaleString()} FCFA` : '∞'}
                    <button onClick={() => setFilters(prev => ({ ...prev, salary_min: null, salary_max: null }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.remote && (
                  <Badge variant="secondary" className="gap-1 rounded-full">
                    Télétravail
                    <button onClick={() => setFilters(prev => ({ ...prev, remote: false }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Jobs list */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Aucune offre trouvée
                </h3>
                <p className="text-slate-600 mb-4">
                  Essayez de modifier vos critères de recherche
                </p>
                <Button variant="outline" onClick={resetFilters} className="rounded-xl border-[#2563eb] text-[#2563eb]">
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onSave={handleSaveJob}
                    isSaved={savedJobs.includes(job.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-lg">Filtres</h2>
              <button onClick={() => setShowMobileFilters(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <FiltersSidebar
                filters={filters}
                onChange={setFilters}
                cities={cities}
                categories={categories}
                contractTypes={availableContractTypes}
                experienceLevels={availableExperienceLevels}
                onReset={resetFilters}
              />
            </div>
            <div className="p-4 border-t border-slate-200 sticky bottom-0 bg-white">
              <Button
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl"
                onClick={() => setShowMobileFilters(false)}
              >
                Voir {filteredJobs.length} résultat{filteredJobs.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsPage;