// frontend/src/pages/CompanyApiPage.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetchAuth } from '../lib/apiAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import ApiKeyCard from '../components/ApiKeyCard';
import { toast } from 'sonner';
import {
  Key, Plus, Copy, Loader2, ChevronLeft,
  Code2, BookOpen, Zap, AlertTriangle, CheckCircle,
  Terminal, Lock,
} from 'lucide-react';

const CompanyApiPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId, isCompany } = useAuth();

  const [company, setCompany] = useState(null);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState(null); // { full_key, name, prefix }

  const [form, setForm] = useState({
    name: '',
    scopes: ['read'],
    environment: 'live',
  });

  // ============================================================
  // CHARGEMENT (parallélisé + skeleton)
  // ============================================================
  useEffect(() => {
    if (!user || !activeCompanyId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { supabase } = await import('../lib/supabase');

        // ⚡ Les 2 appels EN PARALLÈLE (au lieu de l'un après l'autre)
        const [companyResult, keysResult] = await Promise.allSettled([
          supabase
            .from('companies')
            .select('id, name, subscription_plan')
            .eq('id', activeCompanyId)
            .single(),
          apiFetchAuth(`/api/company/api-keys?company_id=${activeCompanyId}`),
        ]);

        if (companyResult.status === 'fulfilled' && companyResult.value.data) {
          setCompany(companyResult.value.data);
        }

        if (keysResult.status === 'fulfilled') {
          setKeys(keysResult.value.data || []);
        } else {
          console.error('Erreur keys:', keysResult.reason);
          toast.error(t('apiPage.loadError', 'Erreur de chargement'));
        }
      } catch (err) {
        console.error(err);
        toast.error(t('apiPage.loadError', 'Erreur de chargement'));
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeCompanyId]);

  // ============================================================
  // CRÉATION D'UNE CLÉ
  // ============================================================
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error(t('apiPage.nameRequired', 'Le nom est requis'));
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetchAuth('/api/company/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          company_id: activeCompanyId,
          name: form.name.trim(),
          scopes: form.scopes,
          environment: form.environment,
        }),
      });

      setNewKeyData({
        full_key: res.full_key,
        name: res.data.name,
        prefix: res.data.key_prefix,
      });

      // Rafraîchir la liste
      const refresh = await apiFetchAuth(`/api/company/api-keys?company_id=${activeCompanyId}`);
      setKeys(refresh.data || []);

      setForm({ name: '', scopes: ['read'], environment: 'live' });
      setShowCreateModal(false);
      toast.success(t('apiPage.createSuccess', 'Clé créée avec succès'));
    } catch (err) {
      console.error(err);
      toast.error(err.message || t('apiPage.createError', 'Erreur de création'));
    } finally {
      setCreating(false);
    }
  };

  // ============================================================
  // RÉVOCATION
  // ============================================================
  const handleRevoke = async (keyId) => {
    if (!window.confirm(t('apiPage.revokeConfirm', 'Voulez-vous vraiment révoquer cette clé ? Cette action est irréversible.'))) return;
    try {
      await apiFetchAuth(`/api/company/api-keys/${keyId}`, { method: 'DELETE' });
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, revoked_at: new Date().toISOString() } : k));
      toast.success(t('apiPage.revokeSuccess', 'Clé révoquée'));
    } catch (err) {
      console.error(err);
      toast.error(err.message || t('apiPage.revokeError', 'Erreur de révocation'));
    }
  };

  // ============================================================
  // COPIE DANS LE PRESSE-PAPIERS
  // ============================================================
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t('apiPage.copied', 'Copié dans le presse-papiers'));
  };

  // ============================================================
  // SCROLL TOP
  // ============================================================
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ============================================================
  // RENDU
  // ============================================================
  if (!isCompany) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <p className="text-slate-600">{t('apiPage.accessDenied', 'Accès réservé aux entreprises')}</p>
      </div>
    );
  }

  const plan = company?.subscription_plan || null;
  const hasApiAccess = plan && ['pro', 'business', 'enterprise'].includes(plan);
  const rateLimit = plan === 'business' || plan === 'enterprise' ? 600 : 60;

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard/entreprise">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-6 h-6 text-blue-600" />
              {t('apiPage.title', 'API Actoos Jobs')}
            </h1>
            <p className="text-slate-600 text-sm">
              {t('apiPage.subtitle', 'Intégrez Actoos Jobs à vos outils RH, ATS ou systèmes internes.')}
            </p>
          </div>
        </div>

        {/* Bannière si pas accès (seulement quand le plan est chargé) */}
        {!loading && !hasApiAccess && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-1">
                    {t('apiPage.upgradeRequired', 'Plan Pro ou Business requis')}
                  </h3>
                  <p className="text-sm text-amber-700 mb-4">
                    {t('apiPage.upgradeMessage', "L'accès à l'API est réservé aux plans Pro et Business. Passez à un plan supérieur pour générer des clés API et intégrer vos outils.")}
                  </p>
                  <Link to="/tarifs">
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                      <Zap className="w-4 h-4 mr-2" />
                      {t('apiPage.seePlans', 'Voir les plans')}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fonctionnalités (toujours affichées immédiatement) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5">
              <Terminal className="w-6 h-6 text-blue-600 mb-2" />
              <h3 className="font-semibold text-slate-900 mb-1">{t('apiPage.feat1Title', 'REST API')}</h3>
              <p className="text-xs text-slate-500">{t('apiPage.feat1Desc', 'Endpoints JSON pour gérer offres et candidatures')}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5">
              <Lock className="w-6 h-6 text-green-600 mb-2" />
              <h3 className="font-semibold text-slate-900 mb-1">{t('apiPage.feat2Title', 'Sécurisé')}</h3>
              <p className="text-xs text-slate-500">{t('apiPage.feat2Desc', 'Authentification par clé API, scopes granulaires')}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5">
              <Zap className="w-6 h-6 text-purple-600 mb-2" />
              <h3 className="font-semibold text-slate-900 mb-1">{t('apiPage.feat3Title', 'Rate limit')}</h3>
              <p className="text-xs text-slate-500">
                {loading
                  ? '...'
                  : t('apiPage.feat3Desc', { limit: rateLimit }, `Limite : ${rateLimit} req/min`)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bouton créer */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-slate-600" />
            {t('apiPage.yourKeys', 'Vos clés API')}
            {!loading && (
              <Badge className="bg-slate-100 text-slate-600 border-0">
                {keys.filter(k => !k.revoked_at).length}
              </Badge>
            )}
          </h2>
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={loading || !hasApiAccess}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('apiPage.createKey', 'Créer une clé')}
          </Button>
        </div>

        {/* Liste des clés */}
        {loading ? (
          // 🔄 Skeleton pendant le chargement
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="border-slate-200 bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-full" />
                      <div className="space-y-2">
                        <div className="h-4 w-40 bg-slate-200 rounded" />
                        <div className="h-3 w-24 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-slate-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-white">
            <CardContent className="p-8 text-center">
              <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">{t('apiPage.noKeys', 'Aucune clé API')}</p>
              <p className="text-xs text-slate-400">
                {t('apiPage.noKeysHint', "Créez votre première clé pour commencer à utiliser l'API.")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {keys.map((keyData) => (
              <ApiKeyCard
                key={keyData.id}
                keyData={keyData}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        )}

        {/* Documentation (toujours affichée) */}
        <Card className="mt-8 border-slate-200 bg-slate-900 text-white overflow-hidden">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              {t('apiPage.docTitle', 'Documentation rapide')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('apiPage.docDesc', 'Quelques exemples pour bien démarrer')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                {t('apiPage.docBase', 'Base URL')}
              </h4>
              <div className="bg-slate-800 rounded-lg p-3 font-mono text-sm flex items-center justify-between">
                <span className="text-green-400">https://actoos-jobs-api.onrender.com/api/v1</span>
                <button
                  onClick={() => handleCopy('https://actoos-jobs-api.onrender.com/api/v1')}
                  className="text-slate-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                {t('apiPage.docAuth', 'Authentification')}
              </h4>
              <div className="bg-slate-800 rounded-lg p-3 font-mono text-sm">
                <div className="text-slate-500"># Header requis sur chaque requête</div>
                <div className="text-green-400">Authorization: Bearer act_live_xxx</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                {t('apiPage.docExample', 'Exemple : lister les offres')}
              </h4>
              <div className="bg-slate-800 rounded-lg p-3 font-mono text-sm relative">
                <pre className="text-blue-300 whitespace-pre-wrap">
{`curl -H "Authorization: Bearer act_live_xxx" \\\n  https://actoos-jobs-api.onrender.com/api/v1/jobs`}
                </pre>
                <button
                  onClick={() => handleCopy(`curl -H "Authorization: Bearer act_live_xxx" \\\n  https://actoos-jobs-api.onrender.com/api/v1/jobs`)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                {t('apiPage.docEndpoints', 'Endpoints disponibles')}
              </h4>
              <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-1 font-mono">
                <div><span className="text-green-400">GET</span> <span className="text-white">/jobs</span> <span className="text-slate-500">— lister les offres</span></div>
                <div><span className="text-green-400">GET</span> <span className="text-white">/jobs/:id</span> <span className="text-slate-500">— détails d'une offre</span></div>
                <div><span className="text-yellow-400">POST</span> <span className="text-white">/jobs</span> <span className="text-slate-500">— créer une offre (scope write)</span></div>
                <div><span className="text-blue-400">PATCH</span> <span className="text-white">/jobs/:id</span> <span className="text-slate-500">— modifier (scope write)</span></div>
                <div><span className="text-red-400">DELETE</span> <span className="text-white">/jobs/:id</span> <span className="text-slate-500">— supprimer (scope write)</span></div>
                <div><span className="text-green-400">GET</span> <span className="text-white">/applications</span> <span className="text-slate-500">— lister les candidatures</span></div>
                <div><span className="text-blue-400">PATCH</span> <span className="text-white">/applications/:id</span> <span className="text-slate-500">— changer le statut</span></div>
                <div><span className="text-green-400">GET</span> <span className="text-white">/company</span> <span className="text-slate-500">— infos de l'entreprise</span></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          MODALE DE CRÉATION
      ============================================================ */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <Card
            className="max-w-md w-full bg-white shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Key className="w-5 h-5 text-blue-600" />
                {t('apiPage.createKey', 'Créer une clé')}
              </CardTitle>
              <CardDescription className="text-slate-500">
                {t('apiPage.createDesc', 'Donnez un nom à votre clé pour la retrouver facilement.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('apiPage.name', 'Nom')}
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('apiPage.namePlaceholder', 'Ex : Mon ATS, Zapier, etc.')}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('apiPage.scopes', 'Permissions')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.scopes.includes('read')}
                      onChange={(e) => {
                        const newScopes = e.target.checked
                          ? [...form.scopes, 'read']
                          : form.scopes.filter(s => s !== 'read');
                        setForm({ ...form, scopes: newScopes });
                      }}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">
                      <strong>read</strong> — {t('apiPage.scopeRead', 'Lecture (GET)')}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.scopes.includes('write')}
                      onChange={(e) => {
                        const newScopes = e.target.checked
                          ? [...form.scopes, 'write']
                          : form.scopes.filter(s => s !== 'write');
                        setForm({ ...form, scopes: newScopes });
                      }}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">
                      <strong>write</strong> — {t('apiPage.scopeWrite', 'Écriture (POST/PATCH/DELETE)')}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  {t('common.cancel', 'Annuler')}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !form.name.trim() || form.scopes.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t('apiPage.create', 'Créer')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================
          MODALE DE SUCCÈS
      ============================================================ */}
      {newKeyData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="max-w-lg w-full bg-white shadow-2xl border border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                {t('apiPage.keyCreated', 'Clé créée avec succès')}
              </CardTitle>
              <CardDescription className="text-slate-500">
                {t('apiPage.keyCreatedWarning', '⚠️ Copiez cette clé maintenant. Vous ne pourrez plus la voir après.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs break-all text-green-400 relative">
                {newKeyData.full_key}
                <button
                  onClick={() => handleCopy(newKeyData.full_key)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <strong>Important :</strong> {t('apiPage.storeSecurely', 'Stockez cette clé dans un gestionnaire de mots de passe. Elle ne sera plus jamais affichée.')}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    handleCopy(newKeyData.full_key);
                    setNewKeyData(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t('apiPage.copyAndClose', 'Copier et fermer')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CompanyApiPage;