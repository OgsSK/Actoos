import { NextRequest, NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.LLM_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const FALLBACK_MODELS = [
  'google/gemini-2.0-flash-001',
  'deepseek/deepseek-chat',
  'qwen/qwen-2.5-72b-instruct',
  'meta-llama/llama-4-maverick:free',
  'mistralai/mistral-7b-instruct',
  'meta-llama/llama-3.1-8b-instruct',
  'google/gemma-2-9b-it',
  'microsoft/phi-3-mini-128k-instruct',
  'nousresearch/hermes-2-pro-llama-3-8b',
  'openchat/openchat-7b',
  'undi95/toppy-m-7b',
  'huggingfaceh4/zephyr-7b-beta',
  'gryphe/mythomist-7b',
  'teknium/openhermes-2.5-mistral-7b',
  'cognitivecomputations/dolphin-2.5-mixtral-8x7b',
];

function normalizeProposal(raw: any) {
  const p = raw?.proposal || raw;
  return {
    title: p.title || p.titre || 'Projet',
    description: p.description || p.desc || '',
    features: Array.isArray(p.features || p.fonctionnalites)
      ? (p.features || p.fonctionnalites)
      : Object.values(p.features || p.fonctionnalites || {}).length > 0
        ? Object.values(p.features || p.fonctionnalites || {}).map(String)
        : ['Non spécifié'],
    technologies: Array.isArray(p.technologies)
      ? p.technologies
      : typeof p.technologies === 'string'
        ? p.technologies.split(',').map((t: string) => t.trim())
        : ['À définir'],
    budget: p.budget || p.cout || p.costs?.development || 'Non communiqué',
    timeline: p.timeline || p.delai || p.delai_realisation || 'À définir',
  };
}

const systemPrompt = `Tu es l'assistant IA d'ACTOOS, une entreprise créatrice de logiciels sur mesure.
Tu es intelligent, polyvalent et tu t'adaptes à la conversation.
Ton objectif est d'aider le visiteur comme le ferait un membre de l'équipe Actoos.

INFORMATIONS OFFICIELLES (à utiliser si on te les demande) :
- Email de contact : contact@actoos.com
- Site web : https://actoos.com
- Page contact : https://actoos.com/contact
- Nous n'avons pas de numéro de téléphone public pour le moment. Invite les visiteurs à utiliser l'email ou le formulaire de contact.
- Exemple de produit déjà disponible : Actoos Pro (gestion d'interventions terrain, https://pro.actoos.com)

IMPORTANT : Tu as accès à TOUT l'historique de la conversation. Si le client fait référence à un détail mentionné plus tôt, tu dois le retrouver.

RÈGLES :
- Si on te dit "bonjour", réponds de manière chaleureuse et professionnelle.
- Si le visiteur parle d'un projet, pose des questions pour bien le comprendre.
- Si le visiteur demande les coordonnées d'Actoos, donne UNIQUEMENT les informations ci-dessus (email, site).
- Si le visiteur veut parler d'autre chose (technologie, conseils, etc.), fais-le.
- Tu ne génères une proposition structurée (JSON) QUE si le visiteur le demande clairement (ex: "donne-moi un devis", "fais une proposition") OU si tu estimes avoir assez d'informations techniques pour le faire.
- Dans ce cas, réponds UNIQUEMENT avec ce JSON, sans texte avant/après :
{"ready":true,"proposal":{"title":"...","description":"...","features":["...","..."],"technologies":["...","..."],"budget":"...","timeline":"..."}}
- Sinon, réponds normalement en français (ou dans la langue du visiteur).
- JAMAIS de JSON dans les réponses normales.
- JAMAIS de markdown.
- JAMAIS de numéro de téléphone inventé.
- JAMAIS d'email inventé autre que contact@actoos.com.`;

async function callGroq(messages: any[]) {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️ Groq error:', response.status, errorText.substring(0, 200));
      return null;
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error: any) {
    console.error('🔥 Groq exception:', error.message);
    return null;
  }
}

async function callOpenRouter(messages: any[], model: string) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouter (${model}) error:`, response.status, errorText.substring(0, 300));
      return null;
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error: any) {
    console.error(`🔥 OpenRouter (${model}) exception:`, error.message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    let content = await callGroq(messages);

    for (const model of FALLBACK_MODELS) {
      if (content) break;
      console.log(`🔄 Basculement sur OpenRouter (${model})...`);
      content = await callOpenRouter(messages, model);
    }

    if (!content) {
      console.error('❌ Aucun service IA disponible');
      return NextResponse.json({ error: 'Tous les services IA sont indisponibles. Veuillez réessayer plus tard.' }, { status: 500 });
    }

    // Tente de parser directement
    try {
      const parsed = JSON.parse(content);
      if (parsed.ready === true) {
        parsed.proposal = normalizeProposal(parsed);
        return NextResponse.json(parsed);
      }
      return NextResponse.json({ ready: false, response: content });
    } catch {
      // Essaie d'extraire un JSON du texte
      const jsonMatch = content.match(/\{[\s\S]*"ready"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.ready === true) {
            parsed.proposal = normalizeProposal(parsed);
            return NextResponse.json(parsed);
          }
        } catch {}
      }
      return NextResponse.json({ ready: false, response: content });
    }
  } catch (error: any) {
    console.error('🔥 Erreur generate-proposal:', error.message);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}