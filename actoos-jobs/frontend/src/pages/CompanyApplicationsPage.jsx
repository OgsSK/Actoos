import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, Users, Trash2, Filter, X, LayoutGrid, ChevronDown } from 'lucide-react';
import { formatRelative } from '../lib/utils';
import { toast } from 'sonner';
import useCachedData from '../hooks/useCachedData';

// Skeleton
const ApplicationSkeleton = () => (
  <Card className="animate-pulse">
    <CardContent className="p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-3 bg-slate-200 rounded w-2/3" />
      </div>
      <div className="h-6 w-20 bg-slate-200 rounded-lg shrink-0" />
      <div className="h-3 w-16 bg-slate-200 rounded hidden sm:block shrink-0" />
      <div className="h-8 w-20 bg-slate-200 rounded-lg shrink-0" />
    </CardContent>
  </Card>
);

const CompanyApplicationsPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Récupération des catégories globales
  const { data: categories } = useCachedData('job_categories', 'id, slug, name, icon', 'name');

  // ✅ Fonction pour obtenir le libellé du statut
  const getStatusLabel = (status) => {
    // Pour "completed", on utilise la clé qui existe dans ApplicationDetailPage
    if (status === 'completed') {
      return t('applicationDetail.status.completed', { defaultValue: 'Finalisé' });
    }
    // Pour les autres, on utilise les clés spécifiques à cette page
    return t(`companyApplications.status.${status}`, { defaultValue: status });
  };

  // ✅ Statuts pour les filtres (avec les mêmes libellés)
  const STATUS_FILTERS = [
    { key: 'all', label: t('companyApplications.status.all', 'Tous'), icon: LayoutGrid },
    { key: 'pending', label: t('companyApplications.status.pending', 'En attente') },
    { key: 'viewed', label: t('companyApplications.status.viewed', 'Consultée') },
    { key: 'shortlisted', label: t('companyApplications.status.shortlisted', 'Présélectionnée') },
    { key: 'interview', label: t('companyApplications.status.interview', 'Entretien') },
    { key: 'accepted', label: t('companyApplications.status.accepted', 'Acceptée') },
    { key: 'rejected', label: t('companyApplications.status.rejected', 'Refusée') },
    { key: 'completed', label: getStatusLabel('completed') }, // ← utilisation de la même fonction
  ];

  // Récupération des offres actives (avec catégorie)
  useEffect(() => {
    if (!activeCompanyId) {
      setOffers([]);
      setLoadingOffers(false);
      return;
    }
    setLoadingOffers(true);
    supabase
      .from('jobs')
      .select('id, title, category_id')
      .eq('company_id', activeCompanyId)
      .eq('status', 'active')
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (error) throw error;
        setOffers(data || []);
        setLoadingOffers(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingOffers(false);
      });
  }, [activeCompanyId]);

  // Récupération des candidatures
  useEffect(() => {
    if (user && activeCompanyId) {
      fetchApplications();
    } else if (!activeCompanyId) {
      setApplications([]);
      setLoading(false);
    }
  }, [user, activeCompanyId]);

  const fetchApplications = async () => {
    if (!activeCompanyId) {
      setApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', activeCompanyId);

      if (!jobs?.length) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      const { data } = await supabase
        .from('applications')
        .select('*, candidate:users(first_name, last_name, email, avatar_url), job:jobs(title, id, category_id)')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });

      setApplications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawApplication = async (appId) => {
    if (!window.confirm(t('companyApplications.withdrawConfirm', 'Retirer cette candidature ?'))) return;
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'withdrawn' })
        .eq('id', appId);
      if (error) throw error;
      toast.success(t('companyApplications.toasts.withdrawn', 'Candidature retirée'));
      setApplications(prev => prev.filter(app => app.id !== appId));
    } catch (err) {
      console.error(err);
      toast.error(err.message || t('companyApplications.toasts.deleteError', 'Erreur lors de la suppression'));
    }
  };

  // Filtrer les candidatures retirées
  const visibleApplications = useMemo(() => {
    return applications.filter(app => app.status !== 'withdrawn');
  }, [applications]);

  // Catégories disponibles parmi les offres ayant des candidatures
  const availableCategories = useMemo(() => {
    if (!categories || visibleApplications.length === 0) return [];
    const usedCategoryIds = new Set(
      visibleApplications
        .map(app => app.job?.category_id)
        .filter(Boolean)
    );
    return categories.filter(cat => usedCategoryIds.has(cat.id));
  }, [categories, visibleApplications]);

  // Appliquer les deux filtres (catégorie + statut)
  const filteredApplications = useMemo(() => {
    let result = visibleApplications;

    if (selectedCategory) {
      result = result.filter(app => app.job?.category_id === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      result = result.filter(app => app.status === selectedStatus);
    }

    return result;
  }, [visibleApplications, selectedCategory, selectedStatus]);

  // Compteurs par statut
  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_FILTERS.forEach(({ key }) => {
      if (key === 'all') return;
      counts[key] = visibleApplications.filter(app => app.status === key).length;
    });
    return counts;
  }, [visibleApplications]);

  // Compteurs par catégorie
  const categoryCounts = useMemo(() => {
    const counts = {};
    visibleApplications.forEach(app => {
      const catId = app.job?.category_id;
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1;
      }
    });
    return counts;
  }, [visibleApplications]);

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard/entreprise">
              <Button variant="ghost">
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t('companyApplications.back', 'Retour')}
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              {t('companyApplications.title', 'Candidatures')}
            </h1>
          </div>

          {/* Sélecteur de catégories (traduit) */}
          {!loadingOffers && availableCategories.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <div className="relative w-full sm:w-56">
                <select
                  value={selectedCategory || 'all'}
                  onChange={(e) => setSelectedCategory(e.target.value === 'all' ? null : e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="all">
                    {t('jobs.allCategories', 'Toutes les catégories')} ({visibleApplications.length})
                  </option>
                  {availableCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {t(`categories.${cat.slug}`, cat.name)} ({categoryCounts[cat.id] || 0})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filtres par statut - compteur visible sur "Tous" */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {STATUS_FILTERS.map(({ key, label, icon: Icon }) => {
            const isActive = key === selectedStatus;
            const count = key === 'all' ? visibleApplications.length : statusCounts[key] || 0;
            const isAll = key === 'all';
            return (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {isAll ? (
                  <>
                    <Icon className="w-4 h-4" />
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </>
                ) : (
                  <>
                    {label}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </>
                )}
              </button>
            );
          })}
          {selectedStatus !== 'all' && (
            <button
              onClick={() => setSelectedStatus('all')}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              title={t('companyApplications.resetFilters', 'Réinitialiser les filtres')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Liste des candidatures */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <ApplicationSkeleton key={i} />
            ))}
          </div>
        ) : filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              {selectedCategory && selectedStatus !== 'all'
                ? t('companyApplications.noFiltersMatch', 'Aucune candidature ne correspond aux filtres')
                : selectedCategory
                ? t('companyApplications.noApplicationsForCategory', 'Aucune candidature pour cette catégorie')
                : t('companyApplications.noApplications', 'Aucune candidature reçue')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredApplications.map((app) => {
              // ✅ Utilisation de getStatusLabel pour le libellé
              const statusLabel = getStatusLabel(app.status);
              const statusColors = {
                pending: 'bg-blue-100 text-blue-700',
                viewed: 'bg-slate-100 text-slate-700',
                shortlisted: 'bg-purple-100 text-purple-700',
                interview: 'bg-green-100 text-green-700',
                accepted: 'bg-green-100 text-green-700',
                rejected: 'bg-red-100 text-red-700',
                completed: 'bg-green-200 text-green-800',
              };
              const statusColor = statusColors[app.status] || 'bg-slate-100 text-slate-700';

              return (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Link
                      to={`/dashboard/entreprise/candidatures/${app.id}`}
                      className="flex-1 min-w-0 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {app.candidate?.avatar_url ? (
                          <img
                            src={app.candidate.avatar_url}
                            alt={`${app.candidate.first_name} ${app.candidate.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          {app.candidate?.first_name} {app.candidate?.last_name}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {app.job?.title}
                        </p>
                      </div>
                      <Badge className={statusColor}>{statusLabel}</Badge>
                      <span className="text-xs text-slate-400 hidden sm:block">
                        {formatRelative(app.created_at)}
                      </span>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-slate-600 hover:bg-slate-100 shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        handleWithdrawApplication(app.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('companyApplications.withdrawButton', 'Retirer')}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyApplicationsPage;