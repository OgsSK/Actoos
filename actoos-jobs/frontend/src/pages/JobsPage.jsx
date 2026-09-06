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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES, EXPERIENCE_LEVELS, formatSalaryPeriod } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

// ----------------------------------------------------------------------
// Taux de conversion vers XOF
// ----------------------------------------------------------------------
const RATES = {
  XOF: 1, EUR: 655.957, USD: 603.5, MAD: 60.5,
  GBP: 754.2, BRL: 115.3, ARS: 0.72, NGN: 0.4, ZAR: 32.5,
  SAR: 160.9, AED: 164.3, EGP: 19.5, DZD: 4.48, TND: 194.5,
  CHF: 722.3, XAF: 1, GNF: 0.07, CDF: 0.22, MGA: 0.15,
};

// -------------------- Local UI components --------------------
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
  <div className={cn('bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300', className)}>
    {children}
  </div>
);

const CardContent = ({ children, className = '' }) => (
  <div className={cn('p-5 sm:p-6', className)}>{children}</div>
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

// -------------------- Salary Input --------------------
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

// -------------------- JobCard – version finale avec badge "Postulé" modernisé --------------------
const JobCard = ({ job, user, isCompany, onSave, isSaved, onEdit, applicationStatus }) => {
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

            <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-slate-50">
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
      case 'full': return t('jobs.remoteFull', '100% télétravail');
      case 'partial': return t('jobs.remoteHybrid', 'Hybride');
      case 'occasional': return t('jobs.remoteOccasional', 'Occasionnel');
      default: return t('jobs.remote', 'Télétravail');
    }
  };

  return (
    <Card className="relative overflow-hidden group transition-all duration-300 hover:shadow-xl border-slate-200 rounded-3xl">
      {job.is_urgent && (
        <div className="absolute -top-px inset-x-0 bg-red-500 text-white text-xs font-medium px-3 py-1 text-center rounded-t-2xl">
          {t('jobs.urgent')}
        </div>
      )}

      <Link to={`/emplois/${job.id}`} className="block">
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
              {job.company?.logo_url ? (
                <img src={job.company.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-7 h-7 text-slate-400" />
              )}
            </div>

            <div className={`flex-1 min-w-0 ${!isOwner && !isCompany ? 'pr-12' : ''}`}>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 line-clamp-2 leading-snug">
                {job.title}
              </h3>
              <p className="text-sm text-slate-600 mt-1">{job.company?.name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-3 py-1">
              <MapPin className="w-3 h-3" />
              {job.city?.name || t('jobs.unspecified')}
            </span>
            {job.address && (
              <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                <MapPin className="w-3 h-3 text-slate-400" />
                {job.address}
              </span>
            )}
            <Badge className={`${contractInfo.color} border-0 text-xs rounded-full`}>
              {t(contractInfo.key)}
            </Badge>
            {job.is_remote && (
              <Badge className="bg-green-50 text-green-600 border-0 text-xs rounded-full">
                {getRemoteLabel() || t('jobs.remote')}
              </Badge>
            )}
          </div>

          {job.skills_required && job.skills_required.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.skills_required.slice(0, 4).map((skill) => (
                <span key={skill} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-xl">
                  {skill}
                </span>
              ))}
              {job.skills_required.length > 4 && (
                <span className="text-xs text-slate-400">+{job.skills_required.length - 4}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="text-sm">
              {job.salary_min && job.salary_max ? (
                <span className="font-semibold text-slate-800">
                  {format(job.salary_min)} – {format(job.salary_max)}
                  {formatSalaryPeriod(job.salary_period, t)}
                </span>
              ) : (
                <span className="text-slate-500 text-sm">{t('jobs.unspecified')}</span>
              )}
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelative(job.created_at)}
            </span>
          </div>
        </CardContent>
      </Link>

      {!isOwner && !isCompany && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave && onSave(job.id); }}
          className={cn(
            'absolute top-3 right-3 p-2 rounded-xl transition',
            isSaved ? 'bg-red-50 text-red-500' : 'text-slate-400 hover:bg-red-50 hover:text-red-500'
          )}
        >
          <Heart className={cn('w-5 h-5', isSaved && 'fill-current')} />
        </button>
      )}

      {/* ✅ Badge "Postulé" modernisé – sans emoji, look professionnel */}
      {applicationStatus && applicationStatus !== 'rejected' && applicationStatus !== 'withdrawn' && (
        <Badge className="absolute top-3 left-3 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full px-3 py-1 border border-emerald-200 shadow-sm">
          {t('jobs.alreadyAppliedBadge', 'Postulé')}
        </Badge>
      )}

      {isOwner && (
        <>
          <Badge className="absolute top-3 left-3 bg-blue-600 text-white text-xs rounded-full">
            {t('jobs.yourOffer')}
          </Badge>
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
        </>
      )}

      {menu}
    </Card>
  );
};

// -------------------- Filters Sidebar (inchangé) --------------------
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

  const contractOptions = contractTypes?.length > 0
    ? contractTypes.map(({ value }) => ({
        value,
        label: t(CONTRACT_TYPES[value]?.key || value),
      }))
    : [];

  const experienceOptions = experienceLevels?.length > 0
    ? experienceLevels.map(({ value }) => ({
        value,
        label: t(EXPERIENCE_LEVELS[value]?.key || value),
      }))
    : [];

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
const ITEMS_PER_PAGE = 10;

const JobsPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { user, isCompany } = useAuth();
  const navigate = useNavigate();
  const { prefs } = usePreferencesContext();
  const { cities: filteredCities } = useCities(prefs.country);
  const { format } = useCurrencyFormatter();

  const [countryId, setCountryId] = useState(null);
  const [countryLoaded, setCountryLoaded] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [appliedStatuses, setAppliedStatuses] = useState({});

  const { data: categories } = useCachedData('job_categories', 'id, slug, name, icon', 'name');

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

  const conversionRate = RATES[prefs.currency] || 1;

  useEffect(() => {
    if (prefs.country) {
      supabase
        .from('countries')
        .select('id')
        .eq('code', prefs.country)
        .single()
        .then(({ data }) => {
          setCountryId(data?.id || null);
          setCountryLoaded(true);
        })
        .catch(() => {
          setCountryId(null);
          setCountryLoaded(true);
        });
    } else {
      setCountryId(null);
      setCountryLoaded(true);
    }
  }, [prefs.country]);

  useEffect(() => {
    if (!countryLoaded) return;

    const fetchJobs = async () => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        let query = supabase
          .from('jobs')
          .select(`
            id, title, description, contract_type, experience_level, salary_min, salary_max,
            salary_period,
            is_remote, remote_type, is_urgent, is_featured, skills_required, created_at, status,
            city_id, category_id,
            boosted_until,
            address,
            company:companies(name, logo_url, is_verified, owner_id, subscription_plan),
            city:cities(name)
          `)
          .eq('status', 'active')
          .or(`expires_at.is.null,expires_at.gte.${now}`);

        if (countryId) {
          query = query.eq('country_id', countryId);
        }

        const { data, error } = await query
          .order('boosted_until', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setJobs(data || []);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [countryId, countryLoaded]);

  useEffect(() => {
    if (!user || jobs.length === 0) {
      setAppliedStatuses({});
      return;
    }
    supabase
      .from('applications')
      .select('job_id, status')
      .eq('candidate_id', user.id)
      .in('job_id', jobs.map(j => j.id))
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(app => { map[app.job_id] = app.status; });
        setAppliedStatuses(map);
      });
  }, [user, jobs]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const popularCities = useMemo(() => {
    if (!filteredCities || jobs.length === 0) return [];
    const cityIds = [...new Set(jobs.map(j => j.city_id).filter(Boolean))];
    return filteredCities
      .filter(city => cityIds.includes(city.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [jobs, filteredCities]);

  const filteredCategories = useMemo(() => {
    if (!categories || jobs.length === 0) return [];
    const catIds = [...new Set(jobs.map(j => j.category_id).filter(Boolean))];
    return categories
      .filter(cat => catIds.includes(cat.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [jobs, categories]);

  const contractTypes = useMemo(() => {
    if (jobs.length === 0) return [];
    return [...new Set(jobs.map(j => j.contract_type).filter(Boolean))].sort();
  }, [jobs]);

  const experienceLevels = useMemo(() => {
    if (jobs.length === 0) return [];
    return [...new Set(jobs.map(j => j.experience_level).filter(Boolean))].sort();
  }, [jobs]);

  const contractOptions = useMemo(
    () => contractTypes.map(type => ({ value: type })),
    [contractTypes]
  );
  const experienceOptions = useMemo(
    () => experienceLevels.map(exp => ({ value: exp })),
    [experienceLevels]
  );

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

    if (filters.category && filteredCategories.length > 0) {
      const cat = filteredCategories.find((c) => c.slug === filters.category);
      if (cat) {
        result = result.filter((job) => job.category_id === cat.id);
      }
    }

    const now = new Date();
    const planPriority = { business: 3, pro: 2, free: 1 };

    result.sort((a, b) => {
      const aBoosted = a.boosted_until && new Date(a.boosted_until) > now;
      const bBoosted = b.boosted_until && new Date(b.boosted_until) > now;

      if (aBoosted && !bBoosted) return -1;
      if (!aBoosted && bBoosted) return 1;

      if (aBoosted && bBoosted) {
        const boostedDiff = new Date(b.boosted_until) - new Date(a.boosted_until);
        if (boostedDiff !== 0) return boostedDiff;
        return new Date(b.created_at) - new Date(a.created_at);
      }

      const aPlan = planPriority[a.company?.subscription_plan] || 0;
      const bPlan = planPriority[b.company?.subscription_plan] || 0;
      if (bPlan !== aPlan) return bPlan - aPlan;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return result;
  }, [jobs, filters, filteredCategories]);

  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
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
                  {popularCities.map((city) => (
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
          <div className="hidden lg:block w-72 shrink-0">
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sticky top-36">
              <FiltersSidebar
                filters={filters}
                onChange={setFilters}
                cities={popularCities}
                categories={filteredCategories}
                contractTypes={contractOptions}
                experienceLevels={experienceOptions}
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
            </div>

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
                    {filteredCategories.find((c) => c.slug === filters.category)?.name || filters.category}
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
              <>
                <div className="space-y-4">
                  {paginatedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      user={user}
                      isCompany={isCompany}
                      onSave={handleSaveJob}
                      isSaved={savedJobs.includes(job.id)}
                      onEdit={handleEditJob}
                      applicationStatus={appliedStatuses[job.id] || null}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {t('common.previous')}
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      {t('common.next')}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
                cities={popularCities}
                categories={filteredCategories}
                contractTypes={contractOptions}
                experienceLevels={experienceOptions}
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