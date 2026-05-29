import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Loader2, MapPin, Globe, Mail, Users, Briefcase, ChevronLeft, Building2, Flag } from 'lucide-react';
import { toast } from 'sonner';

const CompanyDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    supabase
      .from('companies')
      .select('*, city:cities(name)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setCompany(data);
        setLoading(false);
      });
  }, [id]);

  const handleReport = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour signaler');
      return;
    }
    const reason = window.prompt('Pourquoi signalez-vous cette entreprise ?');
    if (!reason) return;
    setReporting(true);
    try {
      await apiFetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({
          reporter_id: user.id,
          reported_item_type: 'company',
          reported_item_id: company.id,
          reason: reason
        }),
      });
      toast.success('Signalement envoyé. Merci !');
    } catch (err) {
      toast.error("Erreur lors de l'envoi du signalement");
    } finally {
      setReporting(false);
    }
  };

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!company) return <div className="pt-20 text-center text-slate-500">Entreprise introuvable.</div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/entreprises"><Button variant="ghost" className="mb-6"><ChevronLeft className="w-4 h-4 mr-2" />Retour</Button></Link>
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center">
              {company.logo_url ? <img src={company.logo_url} alt={company.name} className="w-20 h-20 object-contain" /> : <Building2 className="w-12 h-12 text-slate-400" />}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
              {company.industry && <Badge className="mt-2">{company.industry}</Badge>}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
                {company.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{company.city.name}</span>}
                {company.size && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{company.size} employés</span>}
                {company.website && <a href={company.website} target="_blank" className="flex items-center gap-1 text-blue-600 hover:underline"><Globe className="w-4 h-4" />Site web</a>}
                {company.email && <a href={`mailto:${company.email}`} className="flex items-center gap-1 text-blue-600 hover:underline"><Mail className="w-4 h-4" />Email</a>}
              </div>
              {/* Bouton Signaler */}
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={handleReport} disabled={reporting}>
                  <Flag className="w-4 h-4 mr-2" /> Signaler cette entreprise
                </Button>
              </div>
            </div>
          </div>
          {company.description && <p className="text-slate-600 leading-relaxed">{company.description}</p>}
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;