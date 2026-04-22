import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { 
  History, RotateCcw, Trash2, FileSpreadsheet, Users, 
  Wrench, FileText, Receipt, Check, X, AlertTriangle,
  Loader2, ChevronRight, Calendar, User
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatDate } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Entity type icons
const ENTITY_ICONS = {
  clients: Users,
  interventions: Wrench,
  devis: FileText,
  factures: Receipt
};

const ENTITY_LABELS = {
  clients: 'Clients',
  interventions: 'Interventions',
  devis: 'Devis',
  factures: 'Factures'
};

const ImportHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rollbackDialog, setRollbackDialog] = useState(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/import/history`, { headers });
      setHistory(response.data.imports || []);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (importRecord) => {
    setRollbackLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/import/rollback/${importRecord.id}`,
        null,
        { headers }
      );
      
      toast.success(`${response.data.deleted_count} enregistrements supprimés`);
      setRollbackDialog(null);
      loadHistory();
    } catch (error) {
      console.error('Rollback error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'annulation');
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleDelete = async (importId) => {
    try {
      await axios.delete(`${API_URL}/api/import/history/${importId}`, { headers });
      toast.success('Historique supprimé');
      loadHistory();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const loadImportDetails = async (importId) => {
    try {
      const response = await axios.get(`${API_URL}/api/import/history/${importId}`, { headers });
      setSelectedImport(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6" />
            Historique des imports
          </h2>
          <p className="text-slate-600">
            Consultez et gérez vos imports précédents
          </p>
        </div>
        <Button variant="outline" onClick={loadHistory}>
          Actualiser
        </Button>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Aucun import effectué
            </h3>
            <p className="text-slate-500">
              Vos imports apparaîtront ici une fois que vous aurez importé des données.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => {
                  const Icon = ENTITY_ICONS[record.entity_type] || FileSpreadsheet;
                  const isRolledBack = record.rolled_back;
                  
                  return (
                    <TableRow 
                      key={record.id}
                      className={isRolledBack ? 'opacity-60' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">
                            {ENTITY_LABELS[record.entity_type]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 truncate max-w-40 block">
                          {record.filename}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <Check className="w-3 h-3 mr-1" />
                            {record.imported_count}
                          </Badge>
                          {record.error_count > 0 && (
                            <Badge variant="destructive">
                              <X className="w-3 h-3 mr-1" />
                              {record.error_count}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(record.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <User className="w-3 h-3" />
                          {record.user_name || 'Inconnu'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isRolledBack ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Annulé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                            <Check className="w-3 h-3 mr-1" />
                            Actif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadImportDetails(record.id)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                          {!isRolledBack && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => setRollbackDialog(record)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(record.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Rollback Confirmation Dialog */}
      <Dialog open={!!rollbackDialog} onOpenChange={() => setRollbackDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Annuler cet import ?
            </DialogTitle>
            <DialogDescription>
              Cette action va supprimer tous les enregistrements créés par cet import.
            </DialogDescription>
          </DialogHeader>
          
          {rollbackDialog && (
            <div className="py-4">
              <Alert className="bg-orange-50 border-orange-200">
                <AlertDescription>
                  <strong>{rollbackDialog.imported_count}</strong> {ENTITY_LABELS[rollbackDialog.entity_type]?.toLowerCase()} 
                  seront supprimés du fichier <strong>{rollbackDialog.filename}</strong>
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialog(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleRollback(rollbackDialog)}
              disabled={rollbackLoading}
            >
              {rollbackLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Details Dialog */}
      <Dialog open={!!selectedImport} onOpenChange={() => setSelectedImport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de l'import</DialogTitle>
          </DialogHeader>
          
          {selectedImport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="font-medium">{ENTITY_LABELS[selectedImport.entity_type]}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Fichier</p>
                  <p className="font-medium">{selectedImport.filename}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{formatDate(selectedImport.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Utilisateur</p>
                  <p className="font-medium">{selectedImport.user_name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-slate-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{selectedImport.total_rows}</p>
                    <p className="text-sm text-slate-500">Lignes totales</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{selectedImport.imported_count}</p>
                    <p className="text-sm text-emerald-700">Importées</p>
                  </CardContent>
                </Card>
                <Card className={selectedImport.error_count > 0 ? "bg-red-50" : "bg-slate-50"}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold ${selectedImport.error_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {selectedImport.error_count}
                    </p>
                    <p className="text-sm text-slate-500">Erreurs</p>
                  </CardContent>
                </Card>
              </div>
              
              {selectedImport.rolled_back && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    Cet import a été annulé le {formatDate(selectedImport.rolled_back_at)}.
                    {selectedImport.deleted_count} enregistrements ont été supprimés.
                  </AlertDescription>
                </Alert>
              )}
              
              {selectedImport.mappings_used && selectedImport.mappings_used.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Mapping utilisé</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedImport.mappings_used.map((m, idx) => (
                      <Badge key={idx} variant="outline">
                        {m.source_column} → {m.target_field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportHistory;
