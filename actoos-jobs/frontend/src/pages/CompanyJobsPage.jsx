import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Briefcase, MapPin, Eye, FileText, Loader2, ChevronLeft, Plus,
  MoreVertical, Edit, Trash2, Clock, CheckCircle, Send, XCircle
} from 'lucide-react';
import { formatRelative, CONTRACT_TYPES } from '../lib/utils';

const statusConfig = {
  draft: {
    label: 'Brouillon',
    color: 'bg-slate-100 text-slate-700'
  },
  active: {
    label: 'Publiée',
    color: 'bg-green-100 text-green-700'
  },
  paused: {
    label: 'En pause',
    color: 'bg-yellow-100 text-yellow-700'
  },
  closed: {
    label: 'Fermée',
    color: 'bg-red-100 text-red-700'
  },
  expired: {
    label: 'Expirée',
    color: 'bg-slate-100 text-slate-700'
  },
  pending: {
    label: 'En validation',
    color: 'bg-yellow-100 text-yellow-700'
  }
};

const JobCard = ({ job, onEdit, onDelete, onToggleStatus }) => {
  const [showMenu, setShowMenu] = useState(false);
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const status = statusConfig[job.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <Link to={`/emplois/${job.id}`} className="font-medium text-slate-900 hover:text-blue-600 line-clamp-1">
            {job.title}
          </Link>
          <Badge className={`${status.color} border-0 text-xs`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-1 text-sm text-slate-500">
          {job.city && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city.name}</span>
          )}
          <Badge className={`${contractInfo.color} border-0 text-xs`}>{contractInfo.label}</Badge>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{job.views_count || 0}</span>
          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{job.applications_count || 0}</span>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <span className="text-xs text-slate-400 hidden sm:block">{formatRelative(job.created_at)}</span>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical className="w-4 h-4" />
          </Button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 bottom-full mb-1 w-48 sm:top-full sm:mt-1 sm:bottom-auto sm:mb-0 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                <button
                  onClick={() => { onEdit(job); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Edit className="w-4 h-4" /> Modifier
                </button>
                
                {job.status === 'active' && (
                  <button
                    onClick={() => { onToggleStatus(job, 'paused'); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-slate-50"
                  >
                    <Clock className="w-4 h-4" /> Mettre en pause
                  </button>
                )}
                {job.status === 'paused' && (
                  <button
                    onClick={() => { onToggleStatus(job, 'active'); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-slate-50"
                  >
                    <CheckCircle className="w-4 h-4" /> Réactiver
                  </button>
                )}
                {(job.status === 'draft' || job.status === 'closed' || job.status === 'expired') && (
                  <button
                    onClick={() => { onToggleStatus(job, 'active'); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-slate-50"
                  >
                    <Send className="w-4 h-4" /> Publier
                  </button>
                )}
                
                <button
                  onClick={() => { onDelete(job); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-slate-50"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const CompanyJobsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    setLoading(true);
    const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).single();
    if (!company) { setJobs([]); setLoading(false); return; }
    const { data } = await supabase
      .from('jobs')
      .select('*, city:cities(name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });
    setJobs(data || []);
    setLoading(false);
  };

  const handleEditJob = (job) => {
    navigate(`/dashboard/entreprise/offres/${job.id}/modifier`);
  };

  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${job.title}" ?`)) return;
    try {
      await supabase.from('jobs').delete().eq('id', job.id);
      setJobs(jobs.filter(j => j.id !== job.id));
      toast.success('Offre supprimée');
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleJobStatus = async (job, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'active' && !job.published_at) {
        updates.published_at = new Date().toISOString();
        updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      await supabase.from('jobs').update(updates).eq('id', job.id);
      setJobs(jobs.map(j => j.id === job.id ? { ...j, ...updates } : j));
      toast.success(newStatus === 'active' ? 'Offre publiée !' : 'Statut mis à jour');
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard/entreprise"><Button variant="ghost"><ChevronLeft className="w-4 h-4 mr-2" />Retour</Button></Link>
            <h1 className="text-2xl font-bold text-slate-900">Toutes mes offres</h1>
          </div>
          <Link to="/dashboard/entreprise/offres/nouvelle">
            <Button className="bg-blue-600 text-white hover:bg-blue-700 text-white ">
              <Plus className="w-4 h-4 mr-2" />Nouvelle offre
            </Button>
          </Link>
        </div>
        {jobs.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-500"><Briefcase className="w-12 h-12 mx-auto mb-4" />Aucune offre.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onEdit={handleEditJob}
                onDelete={handleDeleteJob}
                onToggleStatus={handleToggleJobStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyJobsPage;