import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("LLM_API_KEY")!;
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;

// --------------- MODÈLES RÉDUITS ET RAPIDES ---------------
const MODELS_BY_ROLE: Record<string, string[]> = {
  analyst: [
    "meta-llama/llama-3.1-8b-instruct",
    "google/gemini-2.0-flash-001",
    "deepseek/deepseek-chat",
  ],
  designer: [
    "deepseek/deepseek-chat",
    "qwen/qwen3.6-plus-preview:free",
    "poolside/laguna-xs.2",
  ],
  frontend: [
    "teknium/openhermes-2.5-mistral-7b",
    "gryphe/mythomist-7b",
    "undi95/toppy-m-7b",
  ],
  commercial: [
    "nousresearch/hermes-2-pro-llama-3-8b",
    "openchat/openchat-7b",
    "mistralai/mistral-7b-instruct",
  ],
  innovation: [
    "undi95/toppy-m-7b",
    "huggingfaceh4/zephyr-7b-beta",
    "google/gemma-2-9b-it",
  ],
  step_planner: [
    "deepseek/deepseek-chat",
    "qwen/qwen-2.5-72b-instruct",
    "google/gemini-2.0-flash-001",
  ],
  global_fallback: [
    "google/gemini-2.0-flash-001",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.1-8b-instruct",
  ],
};

// --------------- PROMPTS SPÉCIALISÉS ---------------
const PROMPTS_BY_ROLE: Record<string, string> = {
  analyst: `Tu es Agent Actoos, l'assistant officiel d'ACTOOS.

À PROPOS D'ACTOOS :
- Actoos Group est un créateur de logiciels sur mesure pour entreprises et entrepreneurs.
- Vision : démocratiser l'accès aux outils numériques avancés.
- Mission : transformer des idées en solutions logicielles performantes, évolutives et sécurisées.
- Valeurs : sur-mesure, accompagnement, fiabilité, évolutivité.
- Site web officiel : https://actoos.com

- Produits actuels :
  - Actoos Jobs : plateforme de recrutement pour les jobs flexibles.
    - URL officielle : https://jobs.actoos.com (sous-domaine dédié).
    - Public cible : étudiants, extras, temps partiel, stages, missions ponctuelles.
    - Fonctionnalités pour candidats : recherche d'offres par ville, catégorie, type de contrat ; candidature en ligne ; suivi des candidatures ; alertes emploi.
    - Fonctionnalités pour recruteurs : publication d'offres, gestion des candidatures, espace entreprise dédié, statistiques simples.
    - Utilise un système de comptes centralisé Actoos (en cours de déploiement).
  - Actoos Pro (en développement) : logiciel SaaS de gestion d'interventions terrain.
  - Actoos Pay (à venir) : infrastructure financière souveraine.

- Services proposés : conception et développement de logiciels sur mesure, accompagnement de bout en bout.

- Processus : l'utilisateur décrit son projet, l'IA génère un brief structuré, puis l'équipe Actoos le développe.

RÈGLE ABSOLUE SUR LES QUESTIONS GÉNÉRALES :
- Si l'utilisateur te pose une question sur toi (ex: "parle moi de toi", "qui es-tu", "présente-toi"), ou sur Actoos en général, réponds en texte normal, SANS JSON.
- Si l'utilisateur demande des informations sur Actoos Jobs, réponds en texte normal, SANS JSON.
- Si l'utilisateur te salue ou pose une question générale, réponds en texte normal, SANS JSON.
- Si l'utilisateur décrit un projet (ex: "je veux un site e-commerce", "une app de livraison"), réponds EXCLUSIVEMENT par un JSON valide.

RÈGLE SUR LES URLS (TRÈS IMPORTANTE) :
- DONNE CHAQUE URL UNE SEULE FOIS. NE LA RÉPÈTE JAMAIS.
- Exemple correct : "https://actoos.com" (pas "https://actoos.comhttps://actoos.com").
- Si tu dois mentionner une URL, écris-la une seule fois.

FORMAT DU JSON (à utiliser UNIQUEMENT pour les descriptions de projet) :
{
  "briefing": {
    "projectName": "Nom du projet",
    "objective": "Objectif principal",
    "targetUsers": "Utilisateurs cibles",
    "sector": "Secteur d'activité",
    "type": "Type d'application",
    "features": ["Fonctionnalité 1", "Fonctionnalité 2", ...],
    "pages": ["Page 1", "Page 2", ...],
    "roles": ["Rôle 1", "Rôle 2", ...],
    "modules": ["Module 1", "Module 2", ...],
    "integrations": ["Intégration 1", "Intégration 2", ...],
    "constraints": ["Contrainte 1", "Contrainte 2", ...],
    "complexity": "faible | moyenne | elevée | très élevée",
    "architecture": "...",
    "stack": ["Technologie 1", "Technologie 2", ...],
    "priority": "basse | standard | haute | critique",
    "maturityScore": 5,
    "priorityScore": 5
  },
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

CHAMPS OBLIGATOIRES : projectName, type, features, pages, architecture, complexity, stack.

EXEMPLE POUR "UBER EATS LIKE" :
{
  "briefing": {
    "projectName": "Plateforme de livraison de repas",
    "objective": "Commander des repas en ligne avec suivi en temps réel",
    "targetUsers": "Particuliers urbains",
    "sector": "Food",
    "type": "Application mobile et web",
    "features": ["Recherche de restaurants", "Passation de commande", "Paiement en ligne", "Suivi de livraison", "Gestion des avis"],
    "pages": ["Accueil", "Recherche", "Panier", "Suivi de commande", "Profil utilisateur", "Admin restaurant"],
    "roles": ["Client", "Restaurant", "Livreur", "Administrateur"],
    "modules": ["Commandes", "Paiements", "Livraisons", "Authentification"],
    "integrations": ["Google Maps", "Stripe", "Notifications"],
    "constraints": ["Sécurité", "Temps réel", "Scalabilité"],
    "complexity": "moyenne",
    "architecture": "Microservices",
    "stack": ["React Native", "Node.js", "PostgreSQL", "Redis", "Docker"],
    "priority": "standard",
    "maturityScore": 5,
    "priorityScore": 6
  },
  "suggestions": ["Recommandation IA", "Mode hors-ligne livreurs", "Programme de fidélité"]
}

N'INVENTE PAS DE CHAMPS. JAMAIS DE TEXTE AUTOUR DU JSON.

LANGUE : français.`,

  designer: `Tu es un générateur de code React premium pour ACTOOS.

Tu ne réponds QUE par du code.

Génère UNIQUEMENT un composant React fonctionnel nommé "App" avec "export default function App() { ... }".
La première ligne DOIT être : import React from "react";

OBJECTIF :
Créer une interface moderne, belle, navigable et interactive dans un panneau de preview intégré.

RÈGLES :
- Le composant doit être totalement autonome.
- N'utilise PAS Tailwind CSS.
- N'utilise PAS de dépendance externe de style.
- Utilise un bloc <style> intégré dans le composant.
- Le rendu doit être propre, premium, responsive et lisible.
- Évite min-h-screen et h-screen.
- Utilise un wrapper principal en width: 100% et height: 100%.
- Utilise React.useState si nécessaire.
- Le visiteur doit pouvoir naviguer dans l'interface (sidebar, tabs, cards, sections, boutons, modals, scroll, etc.).

STYLE ATTENDU :
- SaaS premium
- moderne
- élégant
- ombres douces
- gradients subtils
- spacing propre
- UX claire
- navigation simulée

NE RAJOUTE AUCUN TEXTE AVANT OU APRÈS LE CODE.
NE METS PAS DE MARKDOWN.
NE METS PAS DE BACKTICKS.`,

  commercial: `Tu es l'Agent Commercial d'ACTOOS. À partir de la conversation, rédige un devis structuré en JSON : {"ready":true,"proposal":{"title":"...","description":"...","features":["...","..."],"technologies":["...","..."],"budget":"...","timeline":"..."}}. Utilise la grille tarifaire standard.`,

  frontend: `Tu es l'Agent Frontend d'ACTOOS. Modifie le code React existant selon la demande. Retourne uniquement le code JSX complet modifié.`,

  innovation: `Tu es l'Agent Innovation d'ACTOOS. 
Propose UNE seule amélioration concrète et originale pour le projet en cours, en français.

RÈGLES IMPORTANTES :
- Analyse l'historique de la conversation pour comprendre le projet.
- Ne répète JAMAIS une suggestion déjà présente dans l'historique.
- Varie les catégories : SEO, design, fonctionnalité, performance, monétisation, accessibilité, sécurité, contenu, UX, notifications, etc.
- Reste dans le domaine du projet.
- Réponds UNIQUEMENT par la suggestion (une phrase courte et claire), sans introduction.`,

  step_planner: `Tu es un planificateur de projet pour ACTOOS. À partir de la conversation, propose une liste d'étapes concrètes pour réaliser le projet.
Retourne UNIQUEMENT un tableau JSON avec les étapes, dans l'ordre logique. Chaque étape a un champ "name" et un champ "status" qui doit être "à_faire".
Exemple :
[
  {"name": "Brief et découverte", "status": "à_faire"},
  {"name": "Design et maquettes", "status": "à_faire"},
  {"name": "Développement frontend", "status": "à_faire"},
  {"name": "Mise en ligne", "status": "à_faire"}
]
NE RETOURNE QUE LE JSON.`,
};

// --------------- FONCTIONS UTILITAIRES ---------------
function cleanReactCode(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/```(?:jsx?|react)?\s*([\s\S]*?)```/g, "$1").trim();
  const importIndex = cleaned.indexOf("import React");
  const exportIndex = cleaned.indexOf("export default");
  let startIndex = -1;
  if (importIndex !== -1) startIndex = importIndex;
  else if (exportIndex !== -1) startIndex = exportIndex;
  if (startIndex > 0) cleaned = cleaned.substring(startIndex);
  cleaned = cleaned.replace(/min-h-screen/g, "h-full").replace(/h-screen/g, "h-full").replace(/fixed inset-0/g, "").replace(/absolute inset-0/g, "");
  if (!cleaned.includes("import React") && !cleaned.includes("export default")) {
    const lines = text.split("\n");
    const codeStartIndex = lines.findIndex((line) => line.trim().startsWith("import") || line.trim().startsWith("export"));
    if (codeStartIndex > 0) cleaned = lines.slice(codeStartIndex).join("\n").trim();
  }
  return cleaned.trim();
}

function normalizeProposal(raw: any) {
  const p = raw?.proposal || raw;
  return {
    title: p.title || p.titre || "Projet",
    description: p.description || p.desc || "",
    features: Array.isArray(p.features || p.fonctionnalites) ? (p.features || p.fonctionnalites) : ["Non spécifié"],
    technologies: Array.isArray(p.technologies) ? p.technologies : ["À définir"],
    budget: p.budget || p.cout || "Non communiqué",
    timeline: p.timeline || p.delai || "À définir",
  };
}

// --------------- NETTOYAGE SIMPLE ET ROBUSTE DES URLS ---------------
function cleanDuplicateUrls(text: string): string {
  // Séparer les URLs collées (ex: https://a.comhttps://a.com)
  text = text.replace(/(https?:\/\/[^\s]+?)(?=https?:\/\/)/g, '$1 ');
  
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlRegex) || [];
  if (matches.length === 0) return text;

  // Dédupliquer
  const uniqueUrls: string[] = [];
  const seen = new Set<string>();
  for (const url of matches) {
    const normalized = url.replace(/[.,;:!?]+$/, '').replace(/\/+$/, '');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueUrls.push(normalized);
    }
  }

  // Supprimer les URLs du texte et réinsérer les uniques
  let result = text.replace(/https?:\/\/[^\s]+/g, '');
  result = result.replace(/\s+/g, ' ').trim();
  if (uniqueUrls.length > 0) {
    if (result.endsWith('.') || result.endsWith('!') || result.endsWith('?')) {
      result = result + ' ' + uniqueUrls.join(', ');
    } else {
      result = result + '. ' + uniqueUrls.join(', ');
    }
  }
  result = result.replace(/\.\./g, '.');
  return result;
}
// --------------- VALIDATION ET NORMALISATION DU BRIEF ---------------
function normalizeBriefResponse(parsed: any): any {
  const brief = parsed.briefing || parsed;
  let suggestions = parsed.suggestions || brief.suggestions || [];
  if (brief.suggestions) delete brief.suggestions;
  const required = ['type', 'features', 'pages', 'architecture', 'complexity', 'stack'];
  const isValid = required.every(key => {
    const val = brief[key];
    if (key === 'features' || key === 'pages' || key === 'stack') {
      return Array.isArray(val) && val.length > 0;
    }
    return typeof val === 'string' && val.trim().length > 0;
  });
  if (!isValid) return null;
  return { briefing: brief, suggestions };
}

// --------------- FONCTIONS IA AVEC TIMEOUT ---------------
async function callOpenRouterModel(messages: any[], systemPrompt: string, model: string, timeoutMs: number = 6000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.2,
        max_tokens: 3000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function callWithFallback(messages: any[], role: string, customSystemPrompt?: string, lang?: string) {
  let systemPrompt = customSystemPrompt || PROMPTS_BY_ROLE[role] || PROMPTS_BY_ROLE.analyst;

  if (!customSystemPrompt && lang) {
    const langInstruction = lang === 'en'
      ? 'IMPORTANT: You must reply in English. All your responses, including JSON keys and values, must be in English. Do not use French.'
      : 'Réponds en français. Tous les textes, y compris les valeurs JSON, doivent être en français.';
    if (!systemPrompt.includes(langInstruction)) {
      systemPrompt = langInstruction + '\n' + systemPrompt;
    }
  }

  const roleModels = MODELS_BY_ROLE[role] || [];
  for (const model of roleModels) {
    const result = await callOpenRouterModel(messages, systemPrompt, model, 6000);
    if (result) return result;
  }
  for (const model of MODELS_BY_ROLE.global_fallback) {
    const result = await callOpenRouterModel(messages, systemPrompt, model, 6000);
    if (result) return result;
  }
  return null;
}

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Actoos <noreply@actoos.com>", to, subject, html }),
  });
}

// --------------- ROUTEUR PRINCIPAL ---------------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const language = body.language || 'fr';

    const {
      action, role, messages, name, email, message, html, modification,
      currentBrief, currentCode, client_name, client_email, client_message,
      brief, client_token, conversation, modules,
      previousSuggestions,
      // ✅ NOUVEAUX CHAMPS DU FORMULAIRE
      project_name,
      project_type,
      budget,
    } = body;
    const safeMessages = Array.isArray(messages) ? messages : [];

    // 1) Chat normal
    if (action === "chat" || (!action && safeMessages.length > 0)) {
      const effectiveRole = role || "analyst";
      let response = await callWithFallback(safeMessages, effectiveRole, undefined, language);
      
      if (!response || response.trim() === '') {
        return new Response(JSON.stringify({ 
          response: language === 'en' ? "I'm processing your request, please wait..." : "Je traite votre demande, patientez..." 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 🔥 Nettoyage simple et radical des URLs dupliquées
      response = cleanDuplicateUrls(response);

      let parsed = null;
      try { parsed = JSON.parse(response); } catch {}
      if (parsed) {
        const normalized = normalizeBriefResponse(parsed);
        if (normalized) {
          return new Response(JSON.stringify(normalized), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ ready: false, response }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Ajuster le brief
    if (action === "adjust-brief") {
      const adjustmentMessage = language === 'en'
        ? `Modify the brief according to this request: ${modification}. Current brief: ${JSON.stringify(currentBrief)}`
        : `Modifie le brief avec cette demande : ${modification}. Brief actuel : ${JSON.stringify(currentBrief)}`;

      const combinedMessages = [
        ...safeMessages,
        { role: "user", content: adjustmentMessage },
      ];
      let response = await callWithFallback(combinedMessages, "analyst", undefined, language);
      if (!response) {
        return new Response(JSON.stringify({ 
          response: language === 'en' ? "I didn't get a response, please try again." : "Je n'ai pas obtenu de réponse, réessayez." 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 🔥 Nettoyage simple et radical des URLs dupliquées
      response = cleanDuplicateUrls(response);

      let parsed = null;
      try { parsed = JSON.parse(response); } catch {}
      if (parsed) {
        const normalized = normalizeBriefResponse(parsed);
        if (normalized) {
          return new Response(JSON.stringify(normalized), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Mise à jour manuelle (fallback)
      let updatedBrief = currentBrief ? { ...currentBrief } : null;
      if (updatedBrief) {
        const lower = response.toLowerCase();
        if (lower.includes('orange money') || lower.includes('moov') || lower.includes('paiement')) {
          if (!updatedBrief.integrations) updatedBrief.integrations = [];
          if (!updatedBrief.integrations.includes('Orange Money')) updatedBrief.integrations.push('Orange Money');
          if (!updatedBrief.integrations.includes('Moov')) updatedBrief.integrations.push('Moov');
        }
        const nameMatch = response.match(/nom (?:de l'|du |de la )?(?:application|plateforme|projet) (?:est )?["']?([^"',.\n]+)/i);
        if (nameMatch && nameMatch[1]) {
          updatedBrief.projectName = nameMatch[1].trim();
        }
        const testBrief = { ...updatedBrief };
        const required = ['type', 'features', 'pages', 'architecture', 'complexity', 'stack'];
        const isValid = required.every(key => {
          const val = testBrief[key];
          if (key === 'features' || key === 'pages' || key === 'stack') {
            return Array.isArray(val) && val.length > 0;
          }
          return typeof val === 'string' && val.trim().length > 0;
        });
        if (isValid) {
          const suggestions = ["Ajouter la géolocalisation", "Ajouter un système de fidélité"];
          return new Response(JSON.stringify({ briefing: updatedBrief, suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      return new Response(JSON.stringify({ ready: false, response }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Preview (designer)
    if (action === "generate-preview") {
      const response = await callWithFallback(safeMessages, "designer", undefined, language);
      if (!response) {
        return new Response(JSON.stringify({ error: "Aucun agent designer disponible" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const code = cleanReactCode(response);
      if (!code || (!code.includes("import React") && !code.includes("export default"))) {
        return new Response(JSON.stringify({ error: "Le modèle n'a pas généré de code valide" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ previewCode: code }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4) Ajuster preview (frontend)
    if (action === "adjust-preview") {
      const combinedMessages = [
        ...safeMessages,
        { role: "user", content: `Modifie le code React suivant et retourne uniquement le code complet final :\n\nCODE ACTUEL :\n${currentCode || ""}\n\nDEMANDE :\n${modification || ""}` },
      ];
      const response = await callWithFallback(combinedMessages, "frontend", undefined, language);
      if (!response) {
        return new Response(JSON.stringify({ error: "Aucun agent frontend disponible" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const code = cleanReactCode(response);
      return new Response(JSON.stringify({ previewCode: code }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5) Devis (commercial)
    if (action === "generate-proposal") {
      const response = await callWithFallback(safeMessages, "commercial", undefined, language);
      if (!response) {
        return new Response(JSON.stringify({ error: "Aucun agent commercial disponible" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      try {
        const parsed = JSON.parse(response);
        if (parsed.ready && parsed.proposal) {
          parsed.proposal = normalizeProposal(parsed);
          return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch {
        const match = response.match(/\{[\s\S]*"proposal"[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (parsed.proposal) {
              parsed.ready = true;
              parsed.proposal = normalizeProposal(parsed);
              return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
          } catch { /* échec */ }
        }
      }
      return new Response(JSON.stringify({ ready: false, response }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 6) Planification
    if (action === "plan-steps") {
      const response = await callWithFallback(safeMessages, "step_planner", undefined, language);
      if (!response) {
        return new Response(JSON.stringify({ error: "Aucun agent disponible pour planifier" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      let steps;
      try {
        steps = JSON.parse(response);
      } catch {
        const match = response.match(/\[[\s\S]*\]/);
        if (match) {
          try { steps = JSON.parse(match[0]); } catch {
            return new Response(JSON.stringify({ error: "Format d'étapes invalide" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        } else {
          return new Response(JSON.stringify({ error: "Aucune étape trouvée" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      steps = steps.map((s: any) => ({ name: s.name || s.title || (language === 'en' ? "Step" : "Étape"), status: "à_faire" }));
      return new Response(JSON.stringify({ steps }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 7) Innovation
    if (action === "innovation") {
      const previousSuggestions: string[] = body.previousSuggestions || [];
      const currentBrief = body.currentBrief || {};
      const langInstruction = language === 'en'
        ? 'IMPORTANT: You must reply in English.'
        : 'Réponds en français.';

      const innovationSystemPrompt = `Tu es l'Agent Innovation d'ACTOOS.
Propose UNE seule amélioration concrète et courte pour le projet en cours, ${langInstruction.toLowerCase()}.
Ne donne pas de liste. Reste dans le domaine du projet.
Ne répète jamais une suggestion déjà faite.
Suggestions déjà proposées : ${previousSuggestions.join(', ') || 'aucune'}
Brief actuel : ${JSON.stringify(currentBrief)}

Réponds UNIQUEMENT par la suggestion.`;

      const response = await callWithFallback(safeMessages, 'innovation', innovationSystemPrompt, language);
      if (!response) {
        return new Response(JSON.stringify({ error: "Aucun agent innovation disponible" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ready: false, response }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 8) Email
    if (action === "send-email") {
      if (!name || !email) {
        return new Response(JSON.stringify({ error: "Champs requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const emailHtml = html || `<h2>Nouveau message</h2><p>Nom: ${name}</p><p>Email: ${email}</p><p>Message: ${message || "-"}</p>`;
      await sendEmail(email, `Nouveau projet : ${name}`, emailHtml);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 9) Sauvegarde
    if (action === "save-project") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      if (!client_name || !client_email) {
        return new Response(JSON.stringify({ error: "Champs requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const token = client_token || crypto.randomUUID();

      // ✅ Construction du payload avec les nouveaux champs
      const payload = {
        client_name,
        client_email,
        client_message: client_message || "",
        brief: brief || {},
        client_token: token,
        conversation: conversation || [],
        status: "nouveau",
        relance_count: 0,
        language: language || 'fr',
        // 🔥 NOUVEAUX CHAMPS
        project_name: project_name || null,
        project_type: project_type || null,
        budget: budget || null,
      };

      const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/projets`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });

      if (!supabaseRes.ok) {
        const errorText = await supabaseRes.text();
        console.error("Erreur Supabase:", errorText);
        return new Response(JSON.stringify({ error: "Erreur sauvegarde projet" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const created = await supabaseRes.json();
      const projectId = created?.[0]?.id || null;

      return new Response(JSON.stringify({ success: true, projectId, clientToken: token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error("Erreur handle-request:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});