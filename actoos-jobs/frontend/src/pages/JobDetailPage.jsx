import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Building2, MapPin, Clock, Briefcase, Calendar, Users, Globe,
  Heart, Share2, ChevronLeft, CheckCircle, Loader2, Mail, Phone,
  DollarSign, GraduationCap, Star, AlertCircle, Send, ExternalLink
} from 'lucide-react';
import { formatDate, formatRelative, formatSalary, CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../lib/utils';

// Application Modal
const ApplyModal = ({ isOpen, onClose, job, user, onSuccess }) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!user) {
      toast.error('Connectez-vous pour postuler');
      navigate('/connexion');
      return;
    }

    setLoading(true);
    try {
      // Check if already applied
      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', job.id)
        .eq('candidate_id', user.id)
        .single();

      if (existing) {
        toast.error('Vous avez déjà postulé à cette offre');
        onClose();
        return;
      }

      // Get candidate's CV URL
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('cv_url')
        .eq('user_id', user.id)
        .single();

      // Create application
      const { error } = await supabase
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: user.id,
          cover_letter: coverLetter || null,
          cv_url: candidateProfile?.cv_url || null,
          status: 'pending'
        });

      if (error) throw error;

      // Update job applications count (with fallback)
      try {
        await supabase.rpc('increment_applications_count', { job_id: job.id });
      } catch (e) {
        // Fallback: fetch and increment
        const { data: currentJob } = await supabase
          .from('jobs')
          .select('applications_count')
          .eq('id', job.id)
          .single();
        await supabase
          .from('jobs')
          .update({ applications_count: (currentJob?.applications_count || 0) + 1 })
          .eq('id', job.id);
      }

      toast.success('Candidature envoyée avec succès !');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Erreur lors de l\'envoi de la candidature');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            Postuler à: {job.title}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{job.company?.name}</p>
        </div>
        
        <div className="p-6 space-y-4">
          {!user ? (
            <div className="text-center py-4">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">Vous devez être connecté pour postuler</p>
              <Button onClick={() => navigate('/connexion')}>
                Se connecter
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  Votre CV sera automatiquement joint à votre candidature.
                  <Link to="/profil" className="underline ml-1">Mettre à jour mon CV</Link>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message de motivation (optionnel)
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Présentez-vous brièvement et expliquez pourquoi vous êtes intéressé par ce poste..."
                  data-testid="cover-letter-textarea"
                />
              </div>
            </>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          {user && (
            <Button 
              onClick={handleApply} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="submit-application-btn"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer ma candidature
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Job Detail Page
const JobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [similarJobs, setSimilarJobs] = useState([]);

  useEffect(() => {
    fetchJob();
  }, [id]);

  useEffect(() => {
    if (user && job) {
      checkUserStatus();
    }
  }, [user, job]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          company:companies(id, name, logo_url, description, size, industry, website),
          category:job_categories(id, name, slug),
          city:cities(id, name, region),
          country:countries(id, name, code)
        `)
        .eq('id', id)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      setJob(data);

      // Increment view count (with fallback if RPC doesn't exist)
      try {
        await supabase.rpc('increment_job_views', { job_id: id });
      } catch (e) {
        // Fallback: direct update
        await supabase
          .from('jobs')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', id);
      }

      // Fetch similar jobs
      if (data?.category_id) {
        const { data: similar } = await supabase
          .from('jobs')
          .select(`
            id, title, contract_type,
            company:companies(name, logo_url),
            city:cities(name)
          `)
          .eq('status', 'active')
          .eq('category_id', data.category_id)
          .neq('id', id)
          .limit(3);
        setSimilarJobs(similar || []);
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Offre non trouvée');
      navigate('/emplois');
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = async () => {
    // Check if saved
    const { data: saved } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', job.id)
      .single();
    setIsSaved(!!saved);

    // Check if applied
    const { data: applied } = await supabase
      .from('applications')
      .select('id')
      .eq('candidate_id', user.id)
      .eq('job_id', job.id)
      .single();
    setHasApplied(!!applied);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Connectez-vous pour sauvegarder');
      navigate('/connexion');
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', job.id);
        setIsSaved(false);
        toast.success('Offre retirée des favoris');
      } else {
        await supabase
          .from('saved_jobs')
          .insert({ user_id: user.id, job_id: job.id });
        setIsSaved(true);
        toast.success('Offre sauvegardée');
      }
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: job.title,
        text: `Découvrez cette offre: ${job.title} chez ${job.company?.name}`,
        url
      });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié !');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Offre non trouvée</h1>
          <p className="text-slate-600 mt-2">Cette offre n'existe plus ou a été retirée.</p>
          <Link to="/emplois">
            <Button className="mt-4">Voir toutes les offres</Button>
          </Link>
        </div>
      </div>
    );
  }

  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const experienceInfo = job.experience_level ? EXPERIENCE_LEVELS[job.experience_level] : null;

  return (
    <div className="min-h-screen bg-slate-50 pt-20" data-testid="job-detail-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-4 -ml-2"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Company Logo */}
            <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              {job.company?.logo_url ? (
                <img 
                  src={job.company.logo_url} 
                  alt={job.company.name}
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <Building2 className="w-10 h-10 text-slate-400" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {job.is_urgent && (
                  <Badge className="bg-red-100 text-red-700 border-0">Urgent</Badge>
                )}
                {job.is_featured && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-0">
                    <Star className="w-3 h-3 mr-1" />
                    À la une
                  </Badge>
                )}
                <Badge className={`${contractInfo.color} border-0`}>
                  {contractInfo.label}
                </Badge>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900" data-testid="job-title">
                {job.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 mt-3 text-slate-600">
                <Link 
                  to={`/entreprises/${job.company?.id}`}
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  <Building2 className="w-4 h-4" />
                  {job.company?.name}
                </Link>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.city?.name}, {job.country?.name}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatRelative(job.published_at || job.created_at)}
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex sm:flex-col gap-2 shrink-0">
              {hasApplied ? (
                <Button disabled className="bg-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Candidature envoyée
                </Button>
              ) : (
                <Button 
                  onClick={() => setShowApplyModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="apply-btn"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Postuler
                </Button>
              )}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleSave}
                  className={isSaved ? 'text-red-500' : ''}
                  data-testid="save-job-btn"
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Description du poste</h2>
                <div className="prose prose-slate max-w-none">
                  <p className="whitespace-pre-line text-slate-600">{job.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            {job.requirements && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Profil recherché</h2>
                  <div className="prose prose-slate max-w-none">
                    <p className="whitespace-pre-line text-slate-600">{job.requirements}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Responsibilities */}
            {job.responsibilities && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Missions</h2>
                  <div className="prose prose-slate max-w-none">
                    <p className="whitespace-pre-line text-slate-600">{job.responsibilities}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {job.benefits && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Avantages</h2>
                  <div className="prose prose-slate max-w-none">
                    <p className="whitespace-pre-line text-slate-600">{job.benefits}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {job.skills_required?.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Compétences requises</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skills_required.map((skill, i) => (
                      <Badge key={i} className="bg-slate-100 text-slate-700 border-0">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">Informations</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Type de contrat</p>
                      <p className="font-medium text-slate-900">{contractInfo.label}</p>
                    </div>
                  </div>

                  {experienceInfo && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Expérience</p>
                        <p className="font-medium text-slate-900">{experienceInfo.label}</p>
                      </div>
                    </div>
                  )}

                  {job.is_salary_visible && (job.salary_min || job.salary_max) && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Salaire</p>
                        <p className="font-medium text-slate-900">
                          {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                        </p>
                      </div>
                    </div>
                  )}

                  {job.positions_count > 1 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Postes disponibles</p>
                        <p className="font-medium text-slate-900">{job.positions_count}</p>
                      </div>
                    </div>
                  )}

                  {job.application_deadline && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Date limite</p>
                        <p className="font-medium text-slate-900">{formatDate(job.application_deadline)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Company Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">À propos de l'entreprise</h3>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
                    {job.company?.logo_url ? (
                      <img 
                        src={job.company.logo_url} 
                        alt={job.company.name}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{job.company?.name}</p>
                    {job.company?.industry && (
                      <p className="text-sm text-slate-500">{job.company.industry}</p>
                    )}
                  </div>
                </div>

                {job.company?.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                    {job.company.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {job.company?.size && (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Users className="w-4 h-4" />
                      {job.company.size} employés
                    </p>
                  )}
                  {job.company?.website && (
                    <a 
                      href={job.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      Site web
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <Link to={`/entreprises/${job.company?.id}`}>
                  <Button variant="outline" className="w-full mt-4">
                    Voir le profil complet
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Similar Jobs */}
            {similarJobs.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Offres similaires</h3>
                  <div className="space-y-3">
                    {similarJobs.map((similar) => (
                      <Link 
                        key={similar.id}
                        to={`/emplois/${similar.id}`}
                        className="block p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <p className="font-medium text-slate-900 text-sm line-clamp-1">
                          {similar.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {similar.company?.name} • {similar.city?.name}
                        </p>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <ApplyModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        job={job}
        user={user}
        onSuccess={() => setHasApplied(true)}
      />
    </div>
  );
};

export default JobDetailPage;
