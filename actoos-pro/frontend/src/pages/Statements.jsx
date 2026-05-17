import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  FileText, Download, Send, Loader2, Calendar, Users, Mail, CheckCircle, AlertCircle, Info,
  Search, Share2, MessageCircle, Copy, Check, X, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { facturesApi, clientsApi } from '../lib/supabaseApi';
import { fetchClientStatementData, generateStatementPDF, downloadStatementPDF } from '../lib/statementService';

const Statements = () => {
  const { formatAmount, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [statements, setStatements] = useState([]);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [filteredStatements, setFilteredStatements] = useState([]);
  const [history, setHistory] = useState([]);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(null);
  
  // Period selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() === 0 ? 12 : currentDate.getMonth()
  );
  const [selectedYear, setSelectedYear] = useState(
    currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()
  );

  const months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ];

  const years = [2024, 2025, 2026].filter(y => y <= currentDate.getFullYear());

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter statements when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStatements(statements);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = statements.filter(s => 
        s.client_name?.toLowerCase().includes(query) ||
        s.client_email?.toLowerCase().includes(query)
      );
      setFilteredStatements(filtered);
    }
  }, [searchQuery, statements]);

  const fetchHistory = async () => {
    // Statements history - load from Supabase
    // For now, return empty - this feature requires dedicated table
    setHistory([]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Generate statements by fetching factures for the period
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
      
      // Get all factures for the period
      const factures = await facturesApi.list(user?.entreprise_id, {
        date_start: startDate,
        date_end: endDate
      });
      
      // Group by client
      const clientMap = {};
      for (const facture of factures) {
        if (!clientMap[facture.client_id]) {
          // Fetch client info
          const client = await clientsApi.get(facture.client_id);
          clientMap[facture.client_id] = {
            client_id: facture.client_id,
            client_name: `${client.nom} ${client.prenom || ''}`.trim(),
            client_email: client.email,
            factures_count: 0,
            total_ttc: 0,
            total_paye: 0
          };
        }
        clientMap[facture.client_id].factures_count += 1;
        clientMap[facture.client_id].total_ttc += facture.montant_ttc || facture.total_ttc || 0;
        clientMap[facture.client_id].total_paye += facture.montant_paye || 0;
      }
      
      const data = Object.values(clientMap);
      setStatements(data);
      setFilteredStatements(data);
      setSearchQuery('');
      
      if (data.length === 0) {
        toast.info('Aucune facture trouvée pour cette période');
      } else {
        toast.success(`${data.length} relevé(s) généré(s)`);
      }
    } catch (error) {
      console.error('Error generating statements:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (clientId, clientName) => {
    setPreviewLoading(true);
    const toastId = toast.loading('Génération du relevé complet...');
    
    try {
      // Fetch complete statement data using the service
      const data = await fetchClientStatementData(
        clientId,
        user?.entreprise_id,
        selectedMonth,
        selectedYear
      );
      
      // Generate the PDF
      const doc = await generateStatementPDF(data);
      
      // Download the PDF
      downloadStatementPDF(doc, clientName, selectedMonth, selectedYear);
      
      toast.dismiss(toastId);
      toast.success('Relevé téléchargé avec succès');
    } catch (err) {
      console.error('Error generating statement PDF:', err);
      toast.dismiss(toastId);
      toast.error('Erreur lors de la génération du relevé');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreview = async (clientId, clientName) => {
    setPreviewLoading(true);
    const toastId = toast.loading('Chargement de l\'aperçu...');
    
    try {
      // Fetch complete statement data using the service
      const data = await fetchClientStatementData(
        clientId,
        user?.entreprise_id,
        selectedMonth,
        selectedYear
      );
      
      // Generate the PDF
      const doc = await generateStatementPDF(data);
      
      // Create blob URL for preview
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      
      setPdfPreview({
        url,
        clientName,
        data
      });
      
      toast.dismiss(toastId);
    } catch (err) {
      console.error('Error generating preview:', err);
      toast.dismiss(toastId);
      toast.error('Erreur lors de la génération de l\'aperçu');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePdfPreview = () => {
    if (pdfPreview?.url) {
      URL.revokeObjectURL(pdfPreview.url);
    }
    setPdfPreview(null);
  };

  const handleSendAll = async () => {
    setSending(true);
    setShowConfirmSend(false);
    try {
      // Group statements by client and open mailto
      const clientEmails = [...new Set(statements.map(s => s.client?.email).filter(Boolean))];
      
      if (clientEmails.length > 0) {
        toast.success(`${clientEmails.length} relevé(s) prêts à envoyer. Ouvrez votre client mail.`);
      } else {
        toast.warning('Aucun client avec email trouvé');
      }
    } catch (error) {
      console.error('Error sending statements:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = (clientId, clientName) => {
    const link = `${window.location.origin}/portal/client/${clientId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(clientId);
    setTimeout(() => setCopiedLink(null), 2000);
    toast.success('Lien copié !');
  };

  const handleShareWhatsApp = (clientId, clientName, phone) => {
    const link = `${window.location.origin}/portal/client/${clientId}`;
    const message = encodeURIComponent(`Bonjour ${clientName}, voici votre espace client : ${link}`);
    
    if (phone) {
      // Clean phone number
      const cleanPhone = phone.replace(/\s/g, '').replace(/^\+/, '');
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  const handleShareEmail = (email, clientName, clientId) => {
    const link = `${window.location.origin}/portal/client/${clientId}`;
    const subject = encodeURIComponent('Votre espace client');
    const body = encodeURIComponent(`Bonjour ${clientName},\n\nVoici le lien vers votre espace client où vous pouvez consulter vos documents :\n\n${link}\n\nCordialement`);
    
    if (email) {
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    } else {
      toast.error('Email manquant pour ce client');
    }
  };

  const handleShareSMS = (phone, clientName, clientId) => {
    const link = `${window.location.origin}/portal/client/${clientId}`;
    const message = encodeURIComponent(`Bonjour ${clientName}, votre espace client : ${link}`);
    
    if (phone) {
      window.open(`sms:${phone}?body=${message}`, '_blank');
    } else {
      toast.error('Téléphone manquant pour ce client');
    }
  };

  const handleNativeShare = async (clientId, clientName) => {
    const link = `${window.location.origin}/portal/client/${clientId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Espace client',
          text: `Bonjour ${clientName}, voici votre espace client`,
          url: link
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share error:', error);
        }
      }
    } else {
      handleCopyLink(clientId, clientName);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6" data-testid="statements-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Relevés mensuels</h1>
        <p className="text-slate-500">Générez et envoyez les relevés de compte à vos clients</p>
      </div>

      {/* Period Selection */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Sélection de la période
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Mois</label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Année</label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generating} data-testid="generate-btn">
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              Générer les relevés
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Statements */}
      {statements.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Relevés générés ({filteredStatements.length}/{statements.length})
                </CardTitle>
                <CardDescription>
                  Période: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Rechercher client..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                    data-testid="statement-search"
                  />
                </div>
                <Button 
                  onClick={() => setShowConfirmSend(true)} 
                  disabled={sending}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="send-all-btn"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Envoyer par email
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Factures</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStatements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        {searchQuery ? 'Aucun résultat pour cette recherche' : 'Aucun relevé'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStatements.map((statement) => (
                      <TableRow key={statement.client_id}>
                        <TableCell className="font-medium">{statement.client_name}</TableCell>
                        <TableCell>
                          {statement.client_email ? (
                            <span className="text-slate-600">{statement.client_email}</span>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                              Email manquant
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{statement.factures_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(statement.client_id, statement.client_name)}
                              disabled={previewLoading}
                              data-testid={`preview-${statement.client_id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Aperçu
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(statement.client_id, statement.client_name)}
                              disabled={previewLoading}
                              data-testid={`download-${statement.client_id}`}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                            
                            {/* Share dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`share-${statement.client_id}`}>
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleCopyLink(statement.client_id, statement.client_name)}>
                                  {copiedLink === statement.client_id ? (
                                    <Check className="w-4 h-4 mr-2 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-4 h-4 mr-2" />
                                  )}
                                  Copier le lien
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShareWhatsApp(statement.client_id, statement.client_name, statement.client_phone)}>
                                  <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                                  WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShareEmail(statement.client_email, statement.client_name, statement.client_id)}>
                                  <Mail className="w-4 h-4 mr-2 text-blue-600" />
                                  Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShareSMS(statement.client_phone, statement.client_name, statement.client_id)}>
                                  <Send className="w-4 h-4 mr-2 text-purple-600" />
                                  SMS
                                </DropdownMenuItem>
                                {navigator.share && (
                                  <DropdownMenuItem onClick={() => handleNativeShare(statement.client_id, statement.client_name)}>
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Partager...
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {statements.length === 0 && !generating && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">Aucun relevé généré</h3>
            <p className="text-slate-500 text-sm mb-4">
              Sélectionnez une période et cliquez sur "Générer les relevés"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Send History */}
      {history.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Historique des envois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 10).map((log, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm">
                      Relevé envoyé à <strong>{log.details?.email}</strong>
                    </span>
                    <Badge variant="secondary" className="text-xs">{log.details?.period}</Badge>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(log.timestamp)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Send Dialog */}
      <Dialog open={showConfirmSend} onOpenChange={setShowConfirmSend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'envoi</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'envoyer {statements.filter(s => s.client_email).length} relevé(s) par email.
            </DialogDescription>
          </DialogHeader>
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Seuls les clients avec une adresse email recevront leur relevé.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmSend(false)}>Annuler</Button>
            <Button onClick={handleSendAll} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={!!pdfPreview} onOpenChange={(open) => !open && closePdfPreview()}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                Relevé - {pdfPreview?.clientName}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={closePdfPreview}
                className="h-8 w-8"
                data-testid="close-preview-btn"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <DialogDescription>
              {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              {pdfPreview?.data && (
                <span className="ml-2 text-slate-600">
                  • {pdfPreview.data.totals?.interventions || 0} interventions
                  • {pdfPreview.data.totals?.photos || 0} photos
                  • {pdfPreview.data.devis?.length || 0} devis
                  • {pdfPreview.data.factures?.length || 0} factures
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {/* PDF Embed */}
          <div className="flex-1 min-h-0 mt-4 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
            {pdfPreview?.url && (
              <iframe
                src={pdfPreview.url}
                className="w-full h-full"
                title="Aperçu du relevé"
              />
            )}
          </div>
          
          <DialogFooter className="flex-shrink-0 mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={closePdfPreview} data-testid="close-preview-btn-footer">
              <X className="w-4 h-4 mr-2" />
              Fermer
            </Button>
            <Button 
              onClick={() => {
                if (pdfPreview?.url) {
                  const link = document.createElement('a');
                  link.href = pdfPreview.url;
                  link.download = `releve_${pdfPreview.clientName?.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.pdf`;
                  link.click();
                  toast.success('Relevé téléchargé');
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="download-preview-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Statements;
