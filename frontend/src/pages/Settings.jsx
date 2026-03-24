import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Building2, User, FileText, Check, Loader2 } from 'lucide-react';

export const SettingsPage = () => {
  const { api, entreprise, user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    ville: '',
    code_postal: '',
    telephone: '',
    email: '',
    siret: '',
    tva_intra: '',
    conditions_generales: '',
  });

  useEffect(() => {
    if (entreprise) {
      setFormData({
        nom: entreprise.nom || '',
        adresse: entreprise.adresse || '',
        ville: entreprise.ville || '',
        code_postal: entreprise.code_postal || '',
        telephone: entreprise.telephone || '',
        email: entreprise.email || '',
        siret: entreprise.siret || '',
        tva_intra: entreprise.tva_intra || '',
        conditions_generales: entreprise.conditions_generales || '',
      });
    }
  }, [entreprise]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      await api.put('/entreprise', formData);
      setSuccess('Paramètres enregistrés avec succès');
      refreshUser();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Paramètres</h1>
        <p className="text-slate-500">Configurez votre entreprise</p>
      </div>

      <Tabs defaultValue="entreprise" className="space-y-6">
        <TabsList>
          <TabsTrigger value="entreprise" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entreprise">
          <form onSubmit={handleSubmit}>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Informations de l'entreprise</CardTitle>
                <CardDescription>Ces informations apparaîtront sur vos devis et factures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {success && (
                  <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
                    <Check className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de l'entreprise *</Label>
                  <Input
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    data-testid="settings-nom"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      data-testid="settings-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      data-testid="settings-telephone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleChange}
                    data-testid="settings-adresse"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code_postal">Code postal</Label>
                    <Input
                      id="code_postal"
                      name="code_postal"
                      value={formData.code_postal}
                      onChange={handleChange}
                      data-testid="settings-code-postal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      name="ville"
                      value={formData.ville}
                      onChange={handleChange}
                      data-testid="settings-ville"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siret">SIRET</Label>
                    <Input
                      id="siret"
                      name="siret"
                      value={formData.siret}
                      onChange={handleChange}
                      data-testid="settings-siret"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tva_intra">N° TVA Intracommunautaire</Label>
                    <Input
                      id="tva_intra"
                      name="tva_intra"
                      value={formData.tva_intra}
                      onChange={handleChange}
                      data-testid="settings-tva"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving} data-testid="settings-submit">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="documents">
          <form onSubmit={handleSubmit}>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Conditions générales</CardTitle>
                <CardDescription>Texte affiché par défaut sur vos devis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="conditions_generales">Conditions générales de vente</Label>
                  <Textarea
                    id="conditions_generales"
                    name="conditions_generales"
                    value={formData.conditions_generales}
                    onChange={handleChange}
                    rows={6}
                    placeholder="Vos conditions générales de vente..."
                    data-testid="settings-conditions"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving} data-testid="settings-documents-submit">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};
