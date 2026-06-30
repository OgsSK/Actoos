import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, Upload, CheckCircle, Clock, FileText, Trash2, RefreshCw, XCircle, ChevronLeft
} from 'lucide-react';

const CandidateDocumentsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [replacing, setReplacing] = useState({});
  
  // ✅ Persistance des documents masqués via localStorage
  const [hiddenDocs, setHiddenDocs] = useState(() => {
    if (!user?.id) return [];
    try {
      const stored = localStorage.getItem(`hidden_docs_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (user?.id) {
      // Réinitialiser hiddenDocs si l'utilisateur change (sécurité)
      const stored = localStorage.getItem(`hidden_docs_${user.id}`);
      setHiddenDocs(stored ? JSON.parse(stored) : []);
    }
  }, [user?.id]);

  const getDocLabel = (type) =>
    t(`candidateDocuments.documentTypes.${type}`, {
      defaultValue: {
        contract: 'Contrat signé',
        id_card: "Pièce d'identité",
        diploma: 'Diplôme',
        other: 'Autre document',
      }[type] || type,
    });

  useEffect(() => {
    if (!user) return;
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data: docs, error } = await supabase
        .from('hiring_documents')
        .select('id, document_type, status, file_url, application_id, created_at')
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const appIds = (docs || []).map(d => d.application_id).filter(Boolean);
      let jobsMap = {};
      if (appIds.length > 0) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, job:jobs(title)')
          .in('id', appIds);
        (apps || []).forEach(app => {
          jobsMap[app.id] = app.job?.title || t('candidateDocuments.unknownJob', 'Offre inconnue');
        });
      }

      const enriched = (docs || []).map(doc => ({
        ...doc,
        jobTitle: jobsMap[doc.application_id] || t('candidateDocuments.unknownJob', 'Offre inconnue'),
      }));

      setDocuments(enriched);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (doc, file) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [doc.id]: true }));
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        await apiFetch('/api/hiring/upload-document', {
          method: 'POST',
          body: JSON.stringify({
            application_id: doc.application_id,
            document_type: doc.document_type,
            file_data: base64,
            filename: file.name,
          }),
        });
        toast.success(t('candidateDocuments.uploadSuccess', 'Document envoyé avec succès'));
        await fetchDocuments();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      const message = err?.message || err?.error || JSON.stringify(err);
      console.error('Erreur upload:', message);
      toast.error(message);
    } finally {
      setUploading(prev => ({ ...prev, [doc.id]: false }));
    }
  };

  const handleReplace = async (doc, file) => {
    if (!file) return;

    setReplacing(prev => ({ ...prev, [doc.id]: true }));
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        await apiFetch('/api/hiring/upload-document', {
          method: 'POST',
          body: JSON.stringify({
            application_id: doc.application_id,
            document_type: doc.document_type,
            file_data: base64,
            filename: file.name,
          }),
        });
        toast.success(t('candidateDocuments.replaceSuccess', 'Document remplacé avec succès'));
        await fetchDocuments();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      const message = err?.message || err?.error || JSON.stringify(err);
      console.error('Erreur remplacement:', message);
      toast.error(message);
    } finally {
      setReplacing(prev => ({ ...prev, [doc.id]: false }));
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(t('candidateDocuments.confirmDelete', 'Supprimer ce document ?'))) return;

    try {
      const { error } = await supabase
        .from('hiring_documents')
        .update({ file_url: null, status: 'pending' })
        .eq('id', doc.id);

      if (error) throw error;

      toast.success(t('candidateDocuments.deleteSuccess', 'Document supprimé'));
      await fetchDocuments();
    } catch (err) {
      const message = err?.message || err?.error || JSON.stringify(err);
      console.error('Erreur suppression:', message);
      toast.error(message);
    }
  };

  // ✅ Retirer un document validé de la liste avec persistance
  const handleHide = (docId) => {
    const updated = [...hiddenDocs, docId];
    setHiddenDocs(updated);
    if (user?.id) {
      localStorage.setItem(`hidden_docs_${user.id}`, JSON.stringify(updated));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex justify-center items-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Filtrer les documents masqués
  const visibleDocuments = documents.filter(d => !hiddenDocs.includes(d.id));

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Bouton retour */}
        <Link to="/dashboard/candidat" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4 min-h-[44px]">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('applicationDetail.back')}
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
          {t('candidateDocuments.title', 'Documents demandés')}
        </h1>

        {visibleDocuments.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                {t('candidateDocuments.noDocuments', 'Aucune demande de document pour le moment.')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleDocuments.map((doc) => {
              const isUploaded = doc.status === 'uploaded' || doc.status === 'validated';
              const isPending = doc.status === 'pending';
              const isRejected = doc.status === 'rejected';
              const isUploadedOnly = doc.status === 'uploaded';
              const jobTitle = doc.jobTitle || t('candidateDocuments.unknownJob', 'Offre inconnue');

              return (
                <Card key={doc.id} className="border-slate-200 overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                        {getDocLabel(doc.document_type)}
                      </h3>
                      {isUploaded && !isRejected && !isUploadedOnly && (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> {t('candidateDocuments.status.validated', 'Validé')}
                        </Badge>
                      )}
                      {isUploadedOnly && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                          <Clock className="w-3 h-3 mr-1" /> {t('candidateDocuments.status.uploaded', 'En validation')}
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                          <XCircle className="w-3 h-3 mr-1" /> {t('candidateDocuments.status.rejected', 'Refusé')}
                        </Badge>
                      )}
                      {isPending && (
                        <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">
                          <Clock className="w-3 h-3 mr-1" /> {t('candidateDocuments.status.pending', 'En attente')}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-slate-500 mb-3 truncate">
                      {t('candidateDocuments.offer', 'Offre :')} {jobTitle}
                    </p>

                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1 mb-3"
                      >
                        <FileText className="w-4 h-4" />
                        {t('candidateDocuments.viewUploaded', 'Voir le document envoyé')}
                      </a>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                      {isPending && (
                        <label className="cursor-pointer w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploading[doc.id]}
                            className="w-full sm:w-auto min-h-[44px]"
                            asChild
                          >
                            <span>
                              {uploading[doc.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              {t('candidateDocuments.upload', 'Téléverser')}
                            </span>
                          </Button>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => {
                              if (e.target.files[0]) handleUpload(doc, e.target.files[0]);
                            }}
                          />
                        </label>
                      )}

                      {(isUploadedOnly || isRejected) && (
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          <label className="cursor-pointer flex-1 sm:flex-none">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={replacing[doc.id]}
                              className="w-full sm:w-auto min-h-[44px]"
                              asChild
                            >
                              <span>
                                {replacing[doc.id] ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                {t('candidateDocuments.replace', 'Remplacer')}
                              </span>
                            </Button>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                if (e.target.files[0]) handleReplace(doc, e.target.files[0]);
                              }}
                            />
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc)}
                            className="text-red-600 hover:text-red-700 min-h-[44px] w-full sm:w-auto"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {t('candidateDocuments.delete', 'Supprimer')}
                          </Button>
                        </div>
                      )}

                      {doc.status === 'validated' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHide(doc.id)}
                          className="text-slate-500 hover:text-slate-700 min-h-[44px] w-full sm:w-auto"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {t('candidateDocuments.hide', 'Retirer de la liste')}
                        </Button>
                      )}
                    </div>
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

export default CandidateDocumentsPage;