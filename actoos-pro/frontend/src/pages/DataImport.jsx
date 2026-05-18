import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Upload, FileSpreadsheet, Check, X, AlertTriangle, 
  ArrowRight, ArrowLeft, Download, Loader2, CheckCircle,
  Users, FileText, Receipt, Wrench, HelpCircle, Trash2, History
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import ImportHistory from '../components/ImportHistory';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Entity type configurations
const ENTITY_TYPES = {
  clients: {
    label: 'Clients',
    icon: Users,
    description: 'Importer vos contacts et clients',
    color: 'text-blue-500'
  },
  interventions: {
    label: 'Interventions',
    icon: Wrench,
    description: 'Importer des interventions planifiées',
    color: 'text-emerald-500'
  },
  devis: {
    label: 'Devis',
    icon: FileText,
    description: 'Importer des devis existants',
    color: 'text-amber-500'
  },
  factures: {
    label: 'Factures',
    icon: Receipt,
    description: 'Importer des factures',
    color: 'text-purple-500'
  }
};

// Steps
const STEPS = ['entity', 'upload', 'mapping', 'preview', 'import'];

const DataImport = () => {
  const [activeTab, setActiveTab] = useState('import');
  const [currentStep, setCurrentStep] = useState(0);
  const [entityType, setEntityType] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [previewResult, setPreviewResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFormat, setDateFormat] = useState('%d/%m/%Y');
  
  const { user } = useAuth();
  const entrepriseId = user?.entreprise_id;

  // Parse date with format
  const parseDate = (dateStr, format) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  // File upload handler - client-side parsing
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setLoading(true);

    try {
      // Read file client-side using xlsx library
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          if (jsonData.length < 2) {
            toast.error('Le fichier doit contenir au moins un en-tête et une ligne de données');
            setLoading(false);
            return;
          }
          
          const headers = jsonData[0].map(h => String(h || '').trim());
          const rows = jsonData.slice(1, 6).map(row => 
            headers.reduce((obj, header, i) => ({ ...obj, [header]: row[i] || '' }), {})
          );
          
          // Auto-suggest mappings based on column names
          const fieldMappings = {
            clients: { nom: ['nom', 'name', 'client'], email: ['email', 'mail'], telephone: ['telephone', 'phone', 'tel'], adresse: ['adresse', 'address'], ville: ['ville', 'city'], code_postal: ['code_postal', 'postal', 'zip'] },
            interventions: { titre: ['titre', 'title', 'sujet'], description: ['description', 'desc'], date_prevue: ['date', 'date_prevue'], adresse: ['adresse'], client_id: ['client_id', 'client'] },
            devis: { client_id: ['client_id', 'client'], total_ht: ['total_ht', 'montant', 'amount'] },
            factures: { client_id: ['client_id', 'client'], total_ttc: ['total_ttc', 'montant', 'amount'] }
          };
          
          const suggested = {};
          const entityFields = fieldMappings[entityType] || {};
          headers.forEach(header => {
            const headerLower = header.toLowerCase();
            Object.entries(entityFields).forEach(([field, aliases]) => {
              if (aliases.some(alias => headerLower.includes(alias))) {
                suggested[header] = field;
              }
            });
          });
          
          setFilePreview({
            filename: file.name,
            columns: headers,
            row_count: jsonData.length - 1,
            preview_rows: rows,
            suggested_mappings: suggested,
            raw_data: jsonData.slice(1) // All data rows for import
          });
          
          const initialMappings = Object.entries(suggested).map(
            ([source, target]) => ({ source_column: source, target_field: target, transform: null })
          );
          setMappings(initialMappings);
          
          setCurrentStep(2);
          toast.success('Fichier analysé avec succès');
        } catch (parseError) {
          console.error('Parse error:', parseError);
          toast.error('Erreur lors de l\'analyse du fichier');
        }
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du chargement du fichier');
      setLoading(false);
    }
  }, [entityType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: loading
  });

  // Update mapping
  const updateMapping = (sourceColumn, field, value) => {
    setMappings(prev => {
      const existing = prev.find(m => m.source_column === sourceColumn);
      if (existing) {
        return prev.map(m => 
          m.source_column === sourceColumn ? { ...m, [field]: value } : m
        );
      } else {
        return [...prev, { source_column: sourceColumn, target_field: value, transform: null }];
      }
    });
  };

  // Remove mapping
  const removeMapping = (sourceColumn) => {
    setMappings(prev => prev.filter(m => m.source_column !== sourceColumn));
  };

  // Preview import - client-side
  const handlePreview = async () => {
    if (!filePreview?.raw_data) return;
    setLoading(true);

    try {
      const headers = filePreview.columns;
      const mappingObj = mappings.reduce((acc, m) => ({ ...acc, [m.source_column]: m.target_field }), {});
      
      const valid = [];
      const errors = [];
      
      filePreview.raw_data.slice(0, 100).forEach((row, idx) => {
        const mapped = {};
        headers.forEach((h, i) => {
          if (mappingObj[h]) {
            let value = row[i];
            // Parse dates if needed
            if (mappingObj[h].includes('date') && value) {
              value = parseDate(value, dateFormat);
            }
            mapped[mappingObj[h]] = value;
          }
        });
        
        // Basic validation
        if (entityType === 'clients' && !mapped.nom) {
          errors.push({ row: idx + 2, error: 'Nom manquant', data: mapped });
        } else if (entityType === 'interventions' && !mapped.titre) {
          errors.push({ row: idx + 2, error: 'Titre manquant', data: mapped });
        } else {
          valid.push(mapped);
        }
      });

      setPreviewResult({
        valid_records: valid,
        error_records: errors,
        total_rows: filePreview.raw_data.length,
        valid_count: valid.length,
        error_count: errors.length
      });
      setCurrentStep(3);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Erreur lors de la prévisualisation');
    } finally {
      setLoading(false);
    }
  };

  // Execute import - directly to Supabase
  const handleImport = async (skipErrors = false) => {
    if (!previewResult?.valid_records?.length) return;
    setLoading(true);

    try {
      const records = previewResult.valid_records.map(r => ({
        ...r,
        entreprise_id: entrepriseId,
        created_at: new Date().toISOString()
      }));
      
      const tableName = entityType; // clients, interventions, devis, factures
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(records)
        .select();
      
      if (error) throw error;

      setImportResult({
        imported_count: data?.length || 0,
        skipped_count: skipErrors ? previewResult.error_count : 0,
        total_processed: previewResult.total_rows
      });
      setCurrentStep(4);
      toast.success(`${data?.length || 0} enregistrements importés`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  // Download template - generate client-side
  const downloadTemplate = async () => {
    try {
      const templates = {
        clients: 'nom,email,telephone,adresse,ville,code_postal',
        interventions: 'titre,description,date_prevue,adresse,ville,code_postal',
        devis: 'client_id,description,quantite,prix_unitaire,tva',
        factures: 'client_id,description,quantite,prix_unitaire,tva'
      };
      
      const csvContent = templates[entityType] || '';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template_${entityType}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erreur lors du téléchargement du template');
    }
  };

  // Reset
  const reset = () => {
    setCurrentStep(0);
    setEntityType(null);
    setUploadedFile(null);
    setFilePreview(null);
    setMappings([]);
    setPreviewResult(null);
    setImportResult(null);
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Select entity type
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Que souhaitez-vous importer ?
              </h2>
              <p className="text-slate-600">
                Sélectionnez le type de données à importer depuis votre fichier CSV ou Excel
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(ENTITY_TYPES).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      entityType === key ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'hover:border-emerald-300'
                    }`}
                    onClick={() => setEntityType(key)}
                    data-testid={`entity-type-${key}`}
                  >
                    <CardContent className="p-6 text-center">
                      <Icon className={`w-12 h-12 mx-auto mb-4 ${config.color}`} />
                      <h3 className="font-semibold text-lg text-slate-900">{config.label}</h3>
                      <p className="text-sm text-slate-500 mt-1">{config.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep(1)}
                disabled={!entityType}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="next-step-btn"
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 1: // Upload file
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Importez votre fichier
              </h2>
              <p className="text-slate-600">
                Glissez-déposez votre fichier CSV ou Excel, ou cliquez pour sélectionner
              </p>
            </div>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input {...getInputProps()} data-testid="file-input" />
              {loading ? (
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-emerald-500 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              )}
              <p className="text-lg font-medium text-slate-700">
                {isDragActive ? 'Déposez le fichier ici' : 'Glissez votre fichier ici'}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Formats acceptés : CSV, XLS, XLSX (max 10MB)
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger un modèle
              </Button>
              
              <Button variant="ghost" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </div>
          </div>
        );

      case 2: // Column mapping
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Mappez vos colonnes
              </h2>
              <p className="text-slate-600">
                Associez les colonnes de votre fichier aux champs ACTOOS PRO
              </p>
            </div>
            
            {filePreview && (
              <>
                <Alert className="bg-emerald-50 border-emerald-200">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <AlertDescription>
                    <strong>{filePreview.total_rows}</strong> lignes détectées dans <strong>{filePreview.filename}</strong>
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700">Format de date</label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="%d/%m/%Y">JJ/MM/AAAA (31/12/2026)</SelectItem>
                        <SelectItem value="%Y-%m-%d">AAAA-MM-JJ (2026-12-31)</SelectItem>
                        <SelectItem value="%d-%m-%Y">JJ-MM-AAAA (31-12-2026)</SelectItem>
                        <SelectItem value="%m/%d/%Y">MM/JJ/AAAA (12/31/2026)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">Mapping des colonnes</CardTitle>
                      <Badge variant="outline">
                        {filePreview.entity_fields?.required?.length || 0} champs requis
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colonne source</TableHead>
                          <TableHead>Champ cible</TableHead>
                          <TableHead>Transformation</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filePreview.columns.map((col) => {
                          const mapping = mappings.find(m => m.source_column === col);
                          const isRequired = filePreview.entity_fields?.required?.includes(mapping?.target_field);
                          
                          return (
                            <TableRow key={col}>
                              <TableCell className="font-mono text-sm">{col}</TableCell>
                              <TableCell>
                                <Select
                                  value={mapping?.target_field || ''}
                                  onValueChange={(val) => updateMapping(col, 'target_field', val)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="-- Ignorer --" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">-- Ignorer --</SelectItem>
                                    {[...filePreview.entity_fields?.required || [], ...filePreview.entity_fields?.optional || []].map(field => (
                                      <SelectItem key={field} value={field}>
                                        {field} {filePreview.entity_fields?.required?.includes(field) && <span className="text-red-500">*</span>}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {mapping?.target_field && (
                                  <Select
                                    value={mapping?.transform || ''}
                                    onValueChange={(val) => updateMapping(col, 'transform', val || null)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Aucune" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="">Aucune</SelectItem>
                                      <SelectItem value="date">Date</SelectItem>
                                      <SelectItem value="float">Nombre décimal</SelectItem>
                                      <SelectItem value="int">Nombre entier</SelectItem>
                                      <SelectItem value="upper">Majuscules</SelectItem>
                                      <SelectItem value="lower">Minuscules</SelectItem>
                                      <SelectItem value="trim">Supprimer espaces</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell>
                                {mapping?.target_field && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMapping(col)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                {/* Sample data preview */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Aperçu des données</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {filePreview.columns.slice(0, 6).map(col => (
                            <TableHead key={col} className="text-xs">{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filePreview.sample_data?.slice(0, 3).map((row, idx) => (
                          <TableRow key={idx}>
                            {filePreview.columns.slice(0, 6).map(col => (
                              <TableCell key={col} className="text-xs truncate max-w-32">
                                {row[col] || '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
            
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button
                onClick={handlePreview}
                disabled={loading || mappings.filter(m => m.target_field).length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Prévisualiser l'import
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3: // Preview results
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Vérifiez avant d'importer
              </h2>
            </div>
            
            {previewResult && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-slate-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-slate-900">{previewResult.total_rows}</p>
                      <p className="text-sm text-slate-600">Lignes totales</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-emerald-600">{previewResult.valid_rows}</p>
                      <p className="text-sm text-emerald-700">Prêtes à importer</p>
                    </CardContent>
                  </Card>
                  <Card className={previewResult.error_rows > 0 ? "bg-red-50 border-red-200" : "bg-slate-50"}>
                    <CardContent className="p-4 text-center">
                      <p className={`text-3xl font-bold ${previewResult.error_rows > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {previewResult.error_rows}
                      </p>
                      <p className="text-sm text-slate-600">Erreurs</p>
                    </CardContent>
                  </Card>
                </div>
                
                {previewResult.error_rows > 0 && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <strong>{previewResult.error_rows}</strong> lignes contiennent des erreurs et ne seront pas importées.
                      Vous pouvez corriger votre fichier ou continuer en ignorant ces lignes.
                    </AlertDescription>
                  </Alert>
                )}
                
                {previewResult.preview_errors?.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base text-red-600">Erreurs détectées</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ligne</TableHead>
                            <TableHead>Erreurs</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewResult.preview_errors.slice(0, 5).map((err, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{err.row}</TableCell>
                              <TableCell className="text-red-600 text-sm">
                                {err.errors.join(', ')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
                
                {previewResult.preview_valid?.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base text-emerald-600">Aperçu des données valides</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ligne</TableHead>
                            <TableHead>Données</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewResult.preview_valid.slice(0, 5).map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{item.row}</TableCell>
                              <TableCell className="text-sm">
                                {Object.entries(item.data).slice(0, 4).map(([k, v]) => (
                                  <span key={k} className="mr-2">
                                    <span className="text-slate-500">{k}:</span> {String(v || '-')}
                                  </span>
                                ))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Modifier le mapping
              </Button>
              <div className="flex gap-2">
                {previewResult?.error_rows > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => handleImport(true)}
                    disabled={loading || previewResult?.valid_rows === 0}
                  >
                    Importer les valides uniquement
                  </Button>
                )}
                <Button
                  onClick={() => handleImport(false)}
                  disabled={loading || previewResult?.valid_rows === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Lancer l'import
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 4: // Import complete
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Import terminé !
              </h2>
              <p className="text-slate-600">
                Vos données ont été importées avec succès
              </p>
            </div>
            
            {importResult && (
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <Card className="bg-emerald-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{importResult.imported_count}</p>
                    <p className="text-sm text-emerald-700">Importés</p>
                  </CardContent>
                </Card>
                <Card className={importResult.error_count > 0 ? "bg-red-50" : "bg-slate-50"}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-3xl font-bold ${importResult.error_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {importResult.error_count}
                    </p>
                    <p className="text-sm text-slate-600">Erreurs</p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={reset}>
                Nouvel import
              </Button>
              <Button
                onClick={() => window.location.href = `/dashboard/${entityType}`}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Voir les {ENTITY_TYPES[entityType]?.label}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Import de données
          </h1>
          <p className="text-slate-600">
            Importez vos clients, interventions, devis et factures depuis un fichier CSV ou Excel
          </p>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Nouvel import
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="mt-6">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200" />
                <div 
                  className="absolute top-4 left-0 h-0.5 bg-emerald-500 transition-all"
                  style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                />
                {STEPS.map((step, idx) => (
                  <div
                    key={step}
                    className={`relative z-10 flex flex-col items-center ${
                      idx <= currentStep ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      idx < currentStep ? 'bg-emerald-500 text-white' :
                      idx === currentStep ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className="mt-2 text-xs font-medium capitalize">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Content */}
            <Card>
              <CardContent className="p-8">
                {renderStepContent()}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="mt-6">
            <ImportHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DataImport;
