import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { useCities } from '../hooks/useCities';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import useCachedData from '../hooks/useCachedData';
import { JobCardSkeleton } from '../components/ui/Skeleton';
import {
  Search,
  MapPin,
  Briefcase,
  Building2,
  Clock,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Heart,
  ExternalLink,
  Banknote,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  Send,
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

// ----------------------------------------------------------------------
// Taux de conversion vers XOF (identiques à ceux de useCurrencyFormatter)
// ----------------------------------------------------------------------
const RATES = {
  XOF: 1, EUR: 655.957, USD: 603.5, MAD: 60.5,
  GBP: 754.2, BRL: 115.3, ARS: 0.72, NGN: 0.4, ZAR: 32.5,
  SAR: 160.9, AED: 164.3, EGP: 19.5, DZD: 4.48, TND: 194.5,
  CHF: 722.3, XAF: 1, GNF: 0.07, CDF: 0.22, MGA: 0.15
};

// -------------------- Local UI components (identiques à l'original) --------------------
const Button = React.forwardRef(
  ({ children, className = '', variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';
    const variants = {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    };
    const sizes = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-9 px-3 py-2 text-sm',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

const Card = ({ children, className = '' }) => (
  <div className={cn('bg-white border border-slate-200 rounded-3xl', className)}>{children}</div>
);

const CardContent = ({ children, className = '' }) => (
  <div className={cn('p-4 sm:p-5', className)}>{children}</div>
);

const Badge = ({ children, className = '', ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
      className
    )}
    {...props}
  >
    {children}
  </span>
);

const Input = ({ className = '', ...props }) => (
  <input
    className={cn(
      'w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500',
      className
    )}
    {...props}
  />
);

const Label = ({ children, className = '', ...props }) => (
  <label className={cn('block text-sm font-medium text-slate-700', className)} {...props}>
    {children}
  </label>
);

const removeAccents = (str = '') => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

// -------------------- Salary Input (conversion en XOF au blur) --------------------
const SalaryInput = ({ placeholder, value, onApply, conversionRate }) => {
  const [local, setLocal] = useState('');

  useEffect(() => {
    if (value != null && conversionRate) {
      const displayValue = Math.round(value / conversionRate);
      setLocal(displayValue.toString());
    } else {
      setLocal('');
    }
  }, [value, conversionRate]);

  const handleBlur = () => {
    const num = local ? parseInt(local, 10) : null;
    const xofVal = num != null ? Math.round(num * conversionRate) : null;
    onApply(xofVal);
  };

  return (
    <Input
      type="number"
      placeholder={placeholder}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleBlur();
      }}
    />
  );
};

// -------------------- Job Card (modifié pour object-cover) --------------------
const JobCard = ({ job, user, isCompany, onSave, isSaved, onEdit }) => {
  const { t } = useTranslation();
  const { format } = useCurrencyFormatter();
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef(null);
  const isOwner = user?.id && job.company?.owner_id === user.id;

  const handleToggleStatus = async (newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'active' && !job.published_at) {
        updates.published_at = new Date().toISOString();
        updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      await supabase.from('jobs').update(updates).eq('id', job.id);
      toast.success(newStatus === 'active' ? t('jobs.publishedToast') : t('jobs.statusUpdated'));
      setShowMenu(false);
      window.location.reload();
    } catch (err) {
      toast.error(t('jobs.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('jobs.deleteConfirm'))) return;
    try {
      await supabase.from('jobs').delete().eq('id', job.id);
      toast.success(t('jobs.deletedToast'));
      setShowMenu(false);
      window.location.reload();
    } catch (err) {
      toast.error(t('jobs.deleteError'));
    }
  };

  const updateMenuPosition = () => {
    if (!menuButtonRef.current) return;
    const rect = menuButtonRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 220;
    const padding = 12;
    const gap = 8;
    const left = Math.max(
      padding,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - padding)
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top =
      spaceBelow >= menuHeight || spaceBelow >= spaceAbove
        ? rect.bottom + gap
        : Math.max(padding, rect.top - menuHeight - gap);
    setMenuPos({ top, left });
  };

  const openMenu = () => {
    if (!showMenu) updateMenuPosition();
    setShowMenu((prev) => !prev);
  };

  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    const reposition = () => updateMenuPosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', close, true);
    };
  }, [showMenu]);

  const menu = showMenu
    ? createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-[9999] w-[240px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-slate-200 py-1 overflow-hidden"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={() => {
                onEdit && onEdit(job);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Edit className="w-4 h-4" />
              {t('jobs.edit')}
            </button>

            {job.status === 'draft' || job.status === 'closed' || job.status === 'expired' ? (
              <button
                onClick={() => handleToggleStatus('active')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-green-600 hover:bg-slate-50"
              >
                <Send className="w-4 h-4" />
                {t('jobs.publish')}
              </button>
            ) : job.status === 'active' ? (
              <button
                onClick={() => handleToggleStatus('paused')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-yellow-600 hover:bg-slate-50"
              >
                <Clock className="w-4 h-4" />
                {t('jobs.pause')}
              </button>
            ) : job.status === 'paused' ? (
              <button
                onClick={() => handleToggleStatus('active')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-green-600 hover:bg-slate-50"
              >
                <CheckCircle className="w-4 h-4" />
                {t('jobs.reactivate')}
              </button>
            ) : null}

            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-slate-50"
            >
              <Trash2 className="w-4 h-4" />
              {t('jobs.delete')}
            </button>
          </div>
        </>,
        document.body
      )
    : null;

  const isBoosted = job.boosted_until && new Date(job.boosted_until) > new Date();

  const getRemoteLabel = () => {
    if (!job.is_remote) return null;
    switch (job.remote_type) {
      case 'full':
        return t('jobs.remoteFull', '100% télétravail');
      case 'partial':
        return t('jobs.remoteHybrid', 'Hybride');
      case 'occasional':
        return t('jobs.remoteOccasional', 'Occasionnel');
      default:
        return t('jobs.remote', 'Télétravail');
    }
  };

  return (
    <Card
      className={cn(
        'group relative overflow-visible bg-white transition-all duration-300 hover:shadow-xl border-slate-200 rounded-3xl',
        job.is_featured && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      {isOwner && (
        <div className="absolute top-3 left-3 z-20">
          <Badge className="bg-blue-600 text-white text-xs">{t('jobs.yourOffer')}</Badge>
        </div>
      )}

      <Link to={`/emplois/${job.id}`} className="block">
        <CardContent className="p-0">
          <div className="flex flex-wrap gap-2 p-3 pb-0">
            {job.is_featured && (
              <Badge className="bg-blue-600 text-white rounded-full">{t('jobs.featured')}</Badge>
            )}
            {job.is_urgent && (
              <Badge className="bg-red-500 text-white rounded-full">{t('jobs.urgent')}</Badge>
            )}
            {job.is_remote && (
              <Badge className="border border-green-500 text-green-600 rounded-full bg-white">
                {getRemoteLabel()}
              </Badge>
            )}
            {isBoosted && (
              <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                🚀 {t('jobs.boosted')}
              </Badge>
            )}
          </div>

          <div className="p-4 sm:p-5 pt-3">
            <div className="flex items-start gap-4">
              {/* ✅ Conteneur corrigé : overflow-hidden + object-cover */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                {job.company?.logo_url ? (
                  <img
                    src={job.company.logo_url}
                    alt={job.company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-16">
                <h3
                  className="font-semibold text-base sm:text-lg text-slate-900 group-hover:text-blue-600"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {job.title}
                </h3>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-700 font-medium line-clamp-1">{job.company?.name}</span>
                  {job.company?.is_verified && (
                    <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      {t('jobs.verified')}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.city?.name || t('jobs.unspecified')}
                  </span>

                  <Badge className={cn(contractInfo.color, 'border-0 rounded-full')}>
                    {t(contractInfo.key)}
                  </Badge>

                  {job.salary_min && job.salary_max && (
                    <span className="flex items-center gap-1">
                      <Banknote className="w-4 h-4" />
                      {format(job.salary_min)} – {format(job.salary_max)}
                    </span>
                  )}
                </div>

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
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelative(job.created_at)}
              </span>
              <span className="text-blue-600 text-sm font-medium flex items-center gap-1">
                {t('jobs.viewOffer')} <ExternalLink className="w-4 h-4" />
              </span>
            </div>
          </div>
        </CardContent>
      </Link>

      {/* Bouton sauvegarde normal, sans restriction */}
      {!isOwner && !isCompany && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSave && onSave(job.id);
          }}
          className={cn(
            'absolute top-3 right-3 p-2 rounded-xl transition-all z-30',
            isSaved
              ? 'bg-red-100 text-red-500'
              : 'bg-white/90 text-slate-400 hover:bg-red-50 hover:text-red-500'
          )}
        >
          <Heart className={cn('w-5 h-5', isSaved && 'fill-current')} />
        </button>
      )}

      {isOwner && (
        <div className="absolute top-2 right-2 z-40">
          <Button
            variant="ghost"
            size="icon"
            ref={menuButtonRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openMenu();
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      )}

      {menu}
    </Card>
  );
};

// -------------------- Filters Sidebar (identiques) --------------------
const FiltersSidebar = ({
  filters,
  onChange,
  cities,
  categories,
  contractTypes,
  experienceLevels,
  onReset,
  conversionRate,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState({
    contract: true,
    location: true,
    salary: true,
    experience: true,
    category: true,
  });

  const toggleSection = (section) =>
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));

  const FilterSection = ({ id, title, children }) => (
    <div className="border-b border-slate-200 py-4 last:border-b-0">
      <button
        type="button"
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

  const contractOptions =
    contractTypes?.length > 0
      ? contractTypes.map(({ value }) => ({
          value,
          label: t(CONTRACT_TYPES[value]?.key || value),
        }))
      : Object.entries(CONTRACT_TYPES).map(([value, meta]) => ({
          value,
          label: t(meta.key),
        }));

  const experienceOptions =
    experienceLevels?.length > 0
      ? experienceLevels.map(({ value }) => ({
          value,
          label: t(EXPERIENCE_LEVELS[value]?.key || value),
        }))
      : Object.entries(EXPERIENCE_LEVELS).map(([value, meta]) => ({
          value,
          label: t(meta.key),
        }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-blue-600" />
          {t('jobs.filters')}
        </h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-blue-600">
          {t('jobs.resetFilters')}
        </Button>
      </div>

      <FilterSection id="contract" title={t('jobs.contractType')}>
        <div className="space-y-2">
          {contractOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.contract_types?.includes(value)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...(filters.contract_types || []), value]
                    : (filters.contract_types || []).filter((t) => t !== value);
                  onChange({ ...filters, contract_types: newTypes });
                }}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection id="location" title={t('jobs.location')}>
        <select
          value={filters.city || 'all'}
          onChange={(e) =>
            onChange({ ...filters, city: e.target.value === 'all' ? null : e.target.value })
          }
          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('jobs.allCities')}</option>
          {cities.map((city) => (
            <option key={city.name} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input
            type="checkbox"
            checked={filters.remote || false}
            onChange={(e) => onChange({ ...filters, remote: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <span className="text-sm text-slate-700">{t('jobs.remotePossible')}</span>
        </label>
      </FilterSection>

      <FilterSection id="salary" title={t('jobs.salary')}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1">{t('jobs.minSalary')}</Label>
            <SalaryInput
              placeholder="Ex: 100000"
              value={filters.salary_min}
              onApply={(val) => onChange({ ...filters, salary_min: val })}
              conversionRate={conversionRate}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1">{t('jobs.maxSalary')}</Label>
            <SalaryInput
              placeholder="Ex: 500000"
              value={filters.salary_max}
              onApply={(val) => onChange({ ...filters, salary_max: val })}
              conversionRate={conversionRate}
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection id="experience" title={t('jobs.experience')}>
        <div className="space-y-2">
          {experienceOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.experience_levels?.includes(value)}
                onChange={(e) => {
                  const newLevels = e.target.checked
                    ? [...(filters.experience_levels || []), value]
                    : (filters.experience_levels || []).filter((l) => l !== value);
                  onChange({ ...filters, experience_levels: newLevels });
                }}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection id="category" title={t('jobs.category')}>
        <select
          value={filters.category || 'all'}
          onChange={(e) =>
            onChange({ ...filters, category: e.target.value === 'all' ? null : e.target.value })
          }
          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('jobs.allCategories')}</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {t(`categories.${cat.slug}`, cat.name)}
            </option>
          ))}
        </select>
      </FilterSection>
    </div>
  );
};

// -------------------- Main Jobs Page --------------------
const JobsPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { user, isCompany } = useAuth();
  const navigate = useNavigate();
  const { prefs } = usePreferencesContext();
  const { cities: filteredCities } = useCities(prefs.country);
  const { format } = useCurrencyFormatter();

  const [countryId, setCountryId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: categories } = useCachedData('job_categories', 'id, slug, name, icon', 'name');
  const [availableContractTypes, setAvailableContractTypes] = useState([]);
  const [availableExperienceLevels, setAvailableExperienceLevels] = useState([]);

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

  const conversionRate = RATES[prefs.currency] || 1;

  useEffect(() => {
    if (prefs.country) {
      supabase
        .from('countries')
        .select('id')
        .eq('code', prefs.country)
        .single()
        .then(({ data }) => setCountryId(data?.id || null));
    } else {
      setCountryId(null);
    }
  }, [prefs.country]);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('jobs')
          .select(`
            id, title, description, contract_type, experience_level, salary_min, salary_max,
            is_remote, remote_type, is_urgent, is_featured, skills_required, created_at, status, category_id,
            boosted_until,
            company:companies(name, logo_url, is_verified, owner_id),
            city:cities(name)
          `)
          .eq('status', 'active');

        if (countryId) {
          query = query.eq('country_id', countryId);
        }

        const { data, error } = await query
          .order('boosted_until', { ascending: false, nullsFirst: false })
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
  }, [countryId]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        let query = supabase
          .from('jobs')
          .select('contract_type, experience_level')
          .eq('status', 'active');

        if (countryId) {
          query = query.eq('country_id', countryId);
        }

        const { data } = await query;
        if (data) {
          const uniqueTypes = [...new Set(data.map((j) => j.contract_type).filter(Boolean))];
          setAvailableContractTypes(
            uniqueTypes.map((type) => ({ value: type }))
          );
          const uniqueExp = [...new Set(data.map((j) => j.experience_level).filter(Boolean))];
          setAvailableExperienceLevels(
            uniqueExp.map((exp) => ({ value: exp }))
          );
        }
      } catch {
        setAvailableContractTypes(
          Object.entries(CONTRACT_TYPES).map(([k]) => ({ value: k }))
        );
        setAvailableExperienceLevels(
          Object.entries(EXPERIENCE_LEVELS).map(([k]) => ({ value: k }))
        );
      }
    };

    loadFilterOptions();
  }, [countryId]);

  useEffect(() => {
    if (user) {
      supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          setSavedJobs((data || []).map((s) => s.job_id));
        });
    }
  }, [user]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (filters.keyword) {
      const kw = removeAccents(filters.keyword);
      result = result.filter(
        (job) =>
          removeAccents(job.title).includes(kw) ||
          removeAccents(job.company?.name || '').includes(kw) ||
          (job.skills_required || []).some((s) => removeAccents(s).includes(kw))
      );
    }

    if (filters.city) result = result.filter((job) => job.city?.name === filters.city);
    if (filters.contract_types?.length > 0) {
      result = result.filter((job) => filters.contract_types.includes(job.contract_type));
    }
    if (filters.experience_levels?.length > 0) {
      result = result.filter((job) => filters.experience_levels.includes(job.experience_level));
    }
    if (filters.remote) result = result.filter((job) => job.is_remote);
    if (filters.salary_min) result = result.filter((job) => job.salary_max >= filters.salary_min);
    if (filters.salary_max) result = result.filter((job) => job.salary_min <= filters.salary_max);

    if (filters.category && categories.length > 0) {
      const cat = categories.find((c) => c.slug === filters.category);
      if (cat) {
        result = result.filter((job) => job.category_id === cat.id);
      }
    }

    result.sort((a, b) => {
      const aBoost = a.boosted_until && new Date(a.boosted_until) > new Date() ? 1 : 0;
      const bBoost = b.boosted_until && new Date(b.boosted_until) > new Date() ? 1 : 0;
      if (bBoost !== aBoost) return bBoost - aBoost;

      if ((b.is_featured ? 1 : 0) !== (a.is_featured ? 1 : 0)) {
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      }

      if (sortBy === 'recent') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'salary') {
        return (b.salary_max || 0) - (a.salary_max || 0);
      }
      return 0;
    });

    return result;
  }, [jobs, filters, sortBy, categories]);

  const handleSaveJob = async (jobId) => {
    if (!user) {
      toast.error(t('jobs.loginToSave'));
      return;
    }
    if (isCompany) {
      toast.error(t('jobs.companyCannotSave'));
      return;
    }
    if (savedJobs.includes(jobId)) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
      setSavedJobs((prev) => prev.filter((id) => id !== jobId));
      toast.success(t('jobs.unsaveSuccess'));
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId });
      setSavedJobs((prev) => [...prev, jobId]);
      toast.success(t('jobs.saveSuccess'));
    }
  };

  const resetFilters = () =>
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

  const handleEditJob = (job) => {
    navigate(`/dashboard/entreprise/offres/${job.id}/modifier`);
  };

  const salaryBadge = (filters.salary_min || filters.salary_max) ? (
    <Badge className="gap-1 rounded-full bg-slate-100 text-slate-700">
      {filters.salary_min ? format(filters.salary_min) : '0'} –{' '}
      {filters.salary_max ? format(filters.salary_max) : '∞'}
      <button
        onClick={() =>
          setFilters((prev) => ({ ...prev, salary_min: null, salary_max: null }))
        }
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  ) : null;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Barre de recherche */}
      <div className="bg-white border-b border-slate-200 sticky top-16 lg:top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t('jobs.searchPlaceholder')}
                  value={filters.keyword}
                  onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>

              <div className="w-48 relative hidden sm:block">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                <select
                  value={filters.city || 'all'}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      city: e.target.value === 'all' ? null : e.target.value,
                    }))
                  }
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('jobs.allCities')}</option>
                  {filteredCities.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              variant="outline"
              className="lg:hidden rounded-xl min-h-[44px]"
              onClick={() => setShowMobileFilters(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('jobs.filters')}
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white rounded-full">{activeFiltersCount}</Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* Sidebar filtres desktop */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sticky top-36">
              <FiltersSidebar
                filters={filters}
                onChange={setFilters}
                cities={filteredCities}
                categories={categories}
                contractTypes={availableContractTypes}
                experienceLevels={availableExperienceLevels}
                onReset={resetFilters}
                conversionRate={conversionRate}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 break-words">
                  {filters.keyword ? t('jobs.resultsFor', { query: filters.keyword }) : t('jobs.allOffers')}
                </h1>
                <p className="text-slate-600 mt-1">
                  {t('jobs.results', { count: filteredJobs.length })}
                </p>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-44 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">{t('jobs.sortRecent')}</option>
                <option value="salary">{t('jobs.sortSalary')}</option>
              </select>
            </div>

            {/* Badges de filtres actifs */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.city && (
                  <Badge className="gap-1 rounded-full bg-slate-100 text-slate-700">
                    {filters.city}
                    <button onClick={() => setFilters((prev) => ({ ...prev, city: null }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}

                {filters.contract_types?.map((type) => (
                  <Badge key={type} className="gap-1 rounded-full bg-slate-100 text-slate-700">
                    {t(CONTRACT_TYPES[type]?.key || type)}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          contract_types: prev.contract_types.filter((t) => t !== type),
                        }))
                      }
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}

                {filters.experience_levels?.map((exp) => (
                  <Badge key={exp} className="gap-1 rounded-full bg-slate-100 text-slate-700">
                    {t(EXPERIENCE_LEVELS[exp]?.key || exp)}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          experience_levels: prev.experience_levels.filter((e) => e !== exp),
                        }))
                      }
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}

                {filters.category && (
                  <Badge className="gap-1 rounded-full bg-slate-100 text-slate-700">
                    {categories.find((c) => c.slug === filters.category)?.name || filters.category}
                    <button onClick={() => setFilters((prev) => ({ ...prev, category: null }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}

                {salaryBadge}

                {filters.remote && (
                  <Badge className="gap-1 rounded-full bg-slate-100 text-slate-700">
                    {t('jobs.remote')}
                    <button onClick={() => setFilters((prev) => ({ ...prev, remote: false }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Liste des offres */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">{t('jobs.noResults')}</h3>
                <p className="text-slate-600 mb-4">{t('jobs.noResultsHint')}</p>
                <Button variant="outline" onClick={resetFilters} className="rounded-xl border-blue-600 text-blue-600">
                  {t('jobs.resetFilters')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    user={user}
                    isCompany={isCompany}
                    onSave={handleSaveJob}
                    isSaved={savedJobs.includes(job.id)}
                    onEdit={handleEditJob}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtres mobiles */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-lg">{t('jobs.filters')}</h2>
              <button onClick={() => setShowMobileFilters(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4">
              <FiltersSidebar
                filters={filters}
                onChange={setFilters}
                cities={filteredCities}
                categories={categories}
                contractTypes={availableContractTypes}
                experienceLevels={availableExperienceLevels}
                onReset={resetFilters}
                conversionRate={conversionRate}
              />
            </div>

            <div className="p-4 border-t border-slate-200 sticky bottom-0 bg-white">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                onClick={() => setShowMobileFilters(false)}
              >
                {t('jobs.viewResults', { count: filteredJobs.length })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsPage;