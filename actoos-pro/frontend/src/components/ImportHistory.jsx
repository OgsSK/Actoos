import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { History, Info, FileSpreadsheet } from 'lucide-react';

/**
 * ImportHistory - Placeholder for import history
 * This feature requires backend API for tracking imports
 */
const ImportHistory = () => {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          Historique des imports
        </CardTitle>
        <CardDescription>
          Consultez et gérez vos imports de données
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="w-4 h-4 text-blue-500" />
          <AlertDescription className="text-blue-700">
            <strong>Aucun historique disponible</strong>
            <p className="mt-1 text-sm">
              L'historique des imports n'est pas encore disponible. 
              Les données importées sont directement enregistrées dans Supabase.
            </p>
          </AlertDescription>
        </Alert>
        
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">Besoin d'importer des données ?</p>
              <p className="mt-1 text-sm text-slate-600">
                Utilisez la fonction d'import dans le menu principal pour importer 
                vos clients, interventions et devis depuis un fichier Excel ou CSV.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImportHistory;
