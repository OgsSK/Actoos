import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
import { cn, formatRelative, CONTRACT_TYPES, JOB_CATEGORIES, CITIES_MALI } from '../lib/utils';

// Job Card Component
const JobCard = ({ job, onSave, isSaved }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;

  return (
    <Card className={cn(
      'group hover:shadow-xl transition-all duration-300 border-slate-200 overflow-hidden',
      job.is_featured && 'ring-2 ring-blue-500 ring-offset-2'
    )}>
      <CardContent className="p-0">
        {/* Badges top */}
        <div className="flex gap-2 p-3 pb-0">
          {job.is_featured && (
            <Badge className="bg-blue-600 text-white">⭐ Mise en avant</Badge>
          )}
          {job.is_urgent && (
            <Badge className="bg-red-500 text-white">🔥 Urgent</Badge>
          )}
          {job.is_remote && (
            <Badge variant="outline" className="border-green-500 text-green-600">
              🏠 Télétravail
            </Badge>
          )}
        </div>

        <div className="p-5 pt-3">
          <div className="flex items-start gap-4">
            {/* Company Logo */}
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
              {job.company?.logo_url ? (
                <img src={job.company.logo_url} alt={job.company.name} className="w-12 h-12 object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Link
                to={`/emplois/${job.id}`}
                className="font-semibold text-lg text-slate-900 hover:text-blue-600 line-clamp-1 block"
              >
                {job.title}
              </Link>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-700 font-medium">{job.company?.name}</span>
                {job.company?.is_verified && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs px-1.5">
                    ✓ Vérifié
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.city?.name}
                </span>
                <Badge className={cn(contractInfo.color, 'border-0')}>
                  {contractInfo.label}
                </Badge>
                {job.salary_min && job.salary_max && (
                  <span className="flex items-center gap-1">
                    <Banknote className="w-4 h-4" />
                    {(job.salary_min / 1000).toFixed(0)}K - {(job.salary_max / 1000).toFixed(0)}K FCFA
                  </span>
                )}
              </div>

              {/* Skills */}
              {job.skills_required && job.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {job.skills_required.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md"
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
                  'p-2 rounded-lg transition-all',
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
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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

// Filters Sidebar
const FiltersSidebar = ({ filters, onChange, cities, categories, onReset }) => {
  const [expanded, setExpanded] = useState({
    contract: true,
    location: true,
    salary: true,
    experience: false,
    category: false,
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
          <SlidersHorizontal className="w-5 h-5" />
          Filtres
        </h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-blue-600">
          Réinitialiser
        </Button>
      </div>

      {/* Contract Type */}
      <FilterSection id="contract" title="Type de contrat">
        <div className="space-y-2">
          {Object.entries(CONTRACT_TYPES).map(([key, { label }]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.contract_types?.includes(key)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...(filters.contract_types || []), key]
                    : (filters.contract_types || []).filter(t => t !== key);
                  onChange({ ...filters, contract_types: newTypes });
                }}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Location */}
      <FilterSection id="location" title="Localisation">
        <Select
          value={filters.city || 'all'}
          onValueChange={(value) => onChange({ ...filters, city: value === 'all' ? null : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les villes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input
            type="checkbox"
            checked={filters.remote || false}
            onChange={(e) => onChange({ ...filters, remote: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Télétravail possible</span>
        </label>
      </FilterSection>

      {/* Salary */}
      <FilterSection id="salary" title="Salaire">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-500">Salaire minimum (FCFA)</Label>
            <Select
              value={filters.salary_min?.toString() || 'any'}
              onValueChange={(value) => onChange({ ...filters, salary_min: value === 'any' ? null : parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Peu importe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Peu importe</SelectItem>
                <SelectItem value="200000">200 000 FCFA</SelectItem>
                <SelectItem value="300000">300 000 FCFA</SelectItem>
                <SelectItem value="400000">400 000 FCFA</SelectItem>
                <SelectItem value="500000">500 000 FCFA</SelectItem>
                <SelectItem value="750000">750 000 FCFA</SelectItem>
                <SelectItem value="1000000">1 000 000 FCFA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterSection>

      {/* Experience */}
      <FilterSection id="experience" title="Expérience">
        <div className="space-y-2">
          {[
            { value: 'junior', label: 'Junior (0-2 ans)' },
            { value: 'intermediaire', label: 'Intermédiaire (2-5 ans)' },
            { value: 'senior', label: 'Senior (5-10 ans)' },
            { value: 'expert', label: 'Expert (10+ ans)' },
          ].map((level) => (
            <label key={level.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.experience_levels?.includes(level.value)}
                onChange={(e) => {
                  const newLevels = e.target.checked
                    ? [...(filters.experience_levels || []), level.value]
                    : (filters.experience_levels || []).filter(l => l !== level.value);
                  onChange({ ...filters, experience_levels: newLevels });
                }}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{level.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Category */}
      <FilterSection id="category" title="Catégorie">
        <Select
          value={filters.category || 'all'}
          onValueChange={(value) => onChange({ ...filters, category: value === 'all' ? null : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.label}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    keyword: searchParams.get('q') || '',
    city: searchParams.get('location') || null,
    contract_types: searchParams.get('contract')?.split(',').filter(Boolean) || [],
    experience_levels: [],
    category: searchParams.get('category') || null,
    salary_min: null,
    remote: false,
  });

  // Sort state
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

    // Salary filter
    if (filters.salary_min) {
      result = result.filter(job => job.salary_max >= filters.salary_min);
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

  // Handle save job
  const handleSaveJob = (jobId) => {
    setSavedJobs(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      keyword: '',
      city: null,
      contract_types: [],
      experience_levels: [],
      category: null,
      salary_min: null,
      remote: false,
    });
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.city) count++;
    if (filters.contract_types?.length > 0) count += filters.contract_types.length;
    if (filters.experience_levels?.length > 0) count += filters.experience_levels.length;
    if (filters.salary_min) count++;
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
            {/* Search inputs */}
            <div className="flex-1 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Poste, compétences..."
                  value={filters.keyword}
                  onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  className="pl-10 h-12"
                  data-testid="jobs-search-keyword"
                />
              </div>
              <div className="w-48 relative hidden sm:block">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                <Select
                  value={filters.city || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, city: value === 'all' ? null : value }))}
                >
                  <SelectTrigger className="pl-10 h-12">
                    <SelectValue placeholder="Ville" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {CITIES_MALI.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mobile filter button */}
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setShowMobileFilters(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-blue-600">{activeFiltersCount}</Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-36">
              <FiltersSidebar
                filters={filters}
                onChange={setFilters}
                cities={CITIES_MALI}
                categories={JOB_CATEGORIES}
                onReset={resetFilters}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results header */}
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
                <SelectTrigger className="w-44">
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
                  <Badge variant="secondary" className="gap-1">
                    {filters.city}
                    <button onClick={() => setFilters(prev => ({ ...prev, city: null }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.contract_types?.map(type => (
                  <Badge key={type} variant="secondary" className="gap-1">
                    {CONTRACT_TYPES[type]?.label}
                    <button onClick={() => setFilters(prev => ({
                      ...prev,
                      contract_types: prev.contract_types.filter(t => t !== type)
                    }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {filters.remote && (
                  <Badge variant="secondary" className="gap-1">
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
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
                <Button variant="outline" onClick={resetFilters}>
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
                cities={CITIES_MALI}
                categories={JOB_CATEGORIES}
                onReset={resetFilters}
              />
            </div>
            <div className="p-4 border-t border-slate-200 sticky bottom-0 bg-white">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
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
