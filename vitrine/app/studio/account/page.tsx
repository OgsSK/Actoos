'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, FolderOpen, MessageSquare, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SUPABASE_FUNCTIONS_URL } from '../../../lib/supabase-functions';

interface Project {
  id: string;
  client_name: string;
  client_email: string;
  client_token: string;
  status: string;
  payment_status?: string;
  payment_amount?: number;
  created_at: string;
  updated_at?: string;
  brief?: { projectName?: string; type?: string; sector?: string };
  project_name?: string;
  project_type?: string;
  archived?: boolean;
}

function getProjectTitle(p: Project): string {
  return p.project_name || p.brief?.projectName || 'Projet sans titre';
}

function getStatusLabel(status: string): { label: string; color: string } {
  const s = (status || '').toLowerCase().replace(/\s+/g, '_');
  const map: Record<string, { label: string; color: string }> = {
    nouveau: { label: 'Nouveau', color: 'bg-blue-50 text-blue-700' },
    contacté: { label: 'En discussion', color: 'bg-amber-50 text-amber-700' },
    devis_envoyé: { label: 'Devis envoyé', color: 'bg-purple-50 text-purple-700' },
    en_cours: { label: 'En cours', color: 'bg-cyan-50 text-cyan-700' },
    gagné: { label: 'Accepté', color: 'bg-emerald-50 text-emerald-700' },
    livré: { label: 'Livré', color: 'bg-emerald-50 text-emerald-700' },
    terminé: { label: 'Terminé', color: 'bg-slate-100 text-slate-700' },
    perdu: { label: 'Refusé', color: 'bg-red-50 text-red-700' },
  };
  return map[s] || { label: status, color: 'bg-slate-100 text-slate-700' };
}

export default function StudioAccountPage() {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = async (silent = false) => {
    if (!user?.email) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-projects`, { cache: 'no-store' });
      const data = await res.json();
      const all = Array.isArray(data) ? data : [];
      // Filtre côté client par email
      const mine = all.filter((p: Project) => p.client_email?.toLowerCase() === user.email?.toLowerCase());
      setProjects(mine);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">

      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5 min-w-0">
            <img src="/logo-icon.png" alt="Actoos" className="h-8 w-8 object-contain shrink-0" />
            <span className="font-bold text-base tracking-tight text-slate-900 truncate">
              Mes projets
            </span>
          </a>
          <div className="flex items-center gap-3 shrink-0">
            <a href="/" className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft size={15} />
              <span>Accueil</span>
            </a>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-500 hover:text-red-600 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* En-tête */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">
              Mes projets
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => loadProjects(true)}
            className="shrink-0 px-4 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
            <FolderOpen size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900 mb-1">Aucun projet pour le moment</p>
            <p className="text-xs text-slate-500 mb-5">
              Vous n'avez pas encore soumis de projet avec cet email.
            </p>
            <a
              href="/#projet"
              className="inline-block bg-slate-900 text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-slate-800 transition-colors"
            >
              Démarrer un projet
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              {projects.length} {projects.length > 1 ? 'projets' : 'projet'}
            </p>
            {projects.map(p => {
              const st = getStatusLabel(p.status);
              return (
                <a
                  key={p.id}
                  href={`/client/${p.client_token}`}
                  className="block bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {getProjectTitle(p)}
                      </h3>
                      {p.project_type && (
                        <p className="text-xs text-slate-500 mt-0.5 capitalize">
                          {p.project_type.replace(/-/g, ' ')}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(p.created_at)}
                    </span>
                    {p.payment_status && p.payment_status !== 'aucun' && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={12} />
                        {p.payment_status === 'complet' ? 'Payé' : 'En cours'}
                      </span>
                    )}
                    {p.brief?.sector && (
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} />
                        {p.brief.sector}
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}