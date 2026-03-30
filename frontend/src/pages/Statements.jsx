import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  FileText, Download, Send, Loader2, Calendar, Users, Mail, CheckCircle, AlertCircle, Info
} from 'lucide-react';
import { toast } from 'sonner';

const Statements = () => {
  const { api, formatAmount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [statements, setStatements] = useState([]);
  const [history, setHistory] = useState([]);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  
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

  const fetchHistory = async () => {
    try {
      const response = await api.get('/statements/history');
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await api.get(`/statements/generate?month=${selectedMonth}&year=${selectedYear}`);
      setStatements(response.data.clients || []);
      if (response.data.generated === 0) {
        toast.info('Aucune facture trouvée pour cette période');
      } else {
        toast.success(`${response.data.generated} relevé(s) généré(s)`);
      }
    } catch (error) {
      console.error('Error generating statements:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (clientId, clientName) => {
    try {
      const response = await api.get(
        `/statements/preview/${clientId}?month=${selectedMonth}&year=${selectedYear}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `releve_${clientName.replace(/\s/g, '_')}_${selectedMonth}_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Relevé téléchargé');
    } catch (error) {
      console.error('Error downloading statement:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleSendAll = async () => {
    setSending(true);
    setShowConfirmSend(false);
    try {
      const response = await api.post(`/statements/send?month=${selectedMonth}&year=${selectedYear}`);
      toast.success(`${response.data.queued} relevé(s) en cours d'envoi`);
      if (response.data.failed > 0) {
        toast.warning(`${response.data.failed} échec(s) - emails manquants`);
      }
      fetchHistory();
    } catch (error) {
      console.error('Error sending statements:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Relevés générés ({statements.length})
                </CardTitle>
                <CardDescription>
                  Période: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardDescription>
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
          </CardHeader>
          <CardContent>
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
                {statements.map((statement) => (
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
                      <Badge variant="secondary">{statement.facture_count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(statement.client_id, statement.client_name)}
                        data-testid={`download-${statement.client_id}`}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </div>
  );
};

export default Statements;
