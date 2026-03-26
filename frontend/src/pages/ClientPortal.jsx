import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import { formatDate, formatCurrency, getStatusLabel } from '../lib/utils';
import {
  Building2, Phone, Mail, Download, PenTool, Check, X, Loader2, CheckCircle
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Signature Pad Component
const SignaturePad = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [nom, setNom] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    if (!nom.trim()) {
      alert('Veuillez entrer votre nom');
      return;
    }
    const canvas = canvasRef.current;
    const signature = canvas.toDataURL('image/png');
    onSave(signature, nom);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nom_signataire">Votre nom *</Label>
        <Input
          id="nom_signataire"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Entrez votre nom"
          data-testid="portal-signature-name"
        />
      </div>
      
      <div>
        <Label className="mb-2 block">Signature</Label>
        <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            width={500}
            height={200}
            className="w-full h-48 touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            data-testid="portal-signature-canvas"
          />
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={clear} type="button">
          <X className="w-4 h-4 mr-2" />
          Effacer
        </Button>
        <Button onClick={save} type="button" className="bg-emerald-600 hover:bg-emerald-700" data-testid="portal-signature-save">
          <Check className="w-4 h-4 mr-2" />
          Signer le devis
        </Button>
      </div>
      
      <p className="text-xs text-slate-500 text-center">
        En signant, vous acceptez les conditions du devis et autorisez la réalisation des travaux.
      </p>
    </div>
  );
};

// Client Portal - Devis View
export const ClientPortalDevis = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSignature, setShowSignature] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    fetchDevis();
  }, [token]);

  const fetchDevis = async () => {
    try {
      const response = await axios.get(`${API}/portal/devis/${token}`);
      setData(response.data);
      if (response.data.devis.statut === 'signe') {
        setSigned(true);
      }
    } catch (err) {
      setError('Ce devis n\'existe pas ou n\'est plus accessible.');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (signature, nom) => {
    setSigning(true);
    try {
      await axios.post(`${API}/portal/devis/${token}/sign`, null, {
        params: { signature, nom_signataire: nom }
      });
      setSigned(true);
      setShowSignature(false);
      fetchDevis();
    } catch (err) {
      alert('Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  const downloadPDF = () => {
    window.open(`${API}/portal/devis/${token}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { devis, client, entreprise } = data;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="client-portal">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">{entreprise?.nom}</h1>
              <p className="text-xs text-slate-500">Devis {devis.numero_devis}</p>
            </div>
          </div>
          <Badge variant="secondary" className={`status-${devis.statut}`}>
            {getStatusLabel(devis.statut)}
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Success Message */}
        {signed && (
          <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Merci !</strong> Votre devis a été signé avec succès. 
              {devis.nom_signataire && ` Signataire: ${devis.nom_signataire}`}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Devis Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Info */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Vos coordonnées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{client?.nom} {client?.prenom}</p>
                  {client?.adresse && (
                    <p className="text-sm text-slate-600">{client.adresse}, {client.code_postal} {client.ville}</p>
                  )}
                  {client?.email && (
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <Mail className="w-4 h-4" />{client.email}
                    </p>
                  )}
                  {client?.telephone && (
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />{client.telephone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lines */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Détail du devis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">Prix HT</TableHead>
                      <TableHead className="text-right">Total HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devis.lignes?.map((ligne, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{ligne.description}</TableCell>
                        <TableCell className="text-right">{ligne.quantite}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ligne.prix_unitaire)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(ligne.quantite * ligne.prix_unitaire)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Totals */}
                <div className="border-t border-slate-200 mt-4 pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total HT</span>
                        <span className="font-medium">{formatCurrency(devis.total_ht)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">TVA</span>
                        <span className="font-medium">{formatCurrency(devis.total_tva)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                        <span>Total TTC</span>
                        <span>{formatCurrency(devis.total_ttc)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conditions */}
            {devis.conditions && (
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{devis.conditions}</p>
                </CardContent>
              </Card>
            )}

            {/* Signature Section */}
            {showSignature && (
              <Card className="border-slate-200 border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PenTool className="w-4 h-4" />
                    Signature du devis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SignaturePad
                    onSave={handleSign}
                    onCancel={() => setShowSignature(false)}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Signature Section if signed */}
            {devis.statut === 'signe' && devis.signature_client && (
              <Card className="border-slate-200 border-emerald-200 bg-emerald-50/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="w-4 h-4" />
                    Signature
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-white border border-slate-200 rounded-lg p-2">
                    <img 
                      src={devis.signature_client} 
                      alt="Signature" 
                      className="w-full h-auto max-h-24 object-contain"
                    />
                  </div>
                  <div className="text-sm text-slate-600">
                    <p><strong>Signataire:</strong> {devis.nom_signataire}</p>
                    <p><strong>Date:</strong> {formatDate(devis.date_signature)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Numéro</span>
                  <span className="font-mono">{devis.numero_devis}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span>{formatDate(devis.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Validité</span>
                  <span>{formatDate(devis.date_expiration)}</span>
                </div>
                {devis.date_signature && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Signé le</span>
                    <span>{formatDate(devis.date_signature)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!signed && ['brouillon', 'envoye'].includes(devis.statut) && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setShowSignature(true)}
                    data-testid="sign-btn"
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    Signer le devis
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={downloadPDF} data-testid="download-btn">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{entreprise?.nom}</p>
                {entreprise?.telephone && (
                  <p className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${entreprise.telephone}`} className="text-blue-600 hover:underline">
                      {entreprise.telephone}
                    </a>
                  </p>
                )}
                {entreprise?.email && (
                  <p className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${entreprise.email}`} className="text-blue-600 hover:underline">
                      {entreprise.email}
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-sm text-slate-500">
        Propulsé par FieldCommand
      </footer>
    </div>
  );
};
