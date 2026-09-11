// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;

const ACTOOS_KNOWLEDGE = `
Actoos Jobs est la plateforme de recrutement flexible du groupe Actoos, fondé par Salif KANE.
Site web : https://jobs.actoos.com
Siège social : Bruxelles, Belgique
Contact : contact@actoos.com / +32 465 74 36 61
... (reste de la connaissance déjà fournie)
`;

// Reprendre tout le code des agents, modèles, etc. (celui que nous avons finalisé)
// Pour simplifier, je te laisse copier-coller le bloc complet de la fonction jobs-ai
// depuis notre précédent échange. Je vais te redonner une version épurée qui fonctionne.
