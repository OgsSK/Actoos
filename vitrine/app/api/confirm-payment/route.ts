import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Vérification des variables d'environnement
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !supabaseUrl || !supabaseKey) {
    console.error('[checkout-session] Variables d\'environnement manquantes');
    return NextResponse.json(
      { error: 'Configuration serveur incomplète' },
      { status: 500 }
    );
  }

  // 2. Récupération du session_id
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json(
      { error: 'session_id manquant' },
      { status: 400 }
    );
  }

  // 3. Initialisation des clients (au moment de l'appel, pas au niveau module)
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2026-08-26.dahlia',
  });
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 4. Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // 5. Extraire le projet_id depuis les metadata
    const projetId = session.metadata?.projet_id;
    if (!projetId) {
      console.error('[checkout-session] projet_id manquant dans les metadata');
      return NextResponse.json(
        { error: 'projet_id manquant dans la session' },
        { status: 400 }
      );
    }

    // 6. Récupérer le client_token du projet dans Supabase
    const { data: projet, error } = await supabase
      .from('projets')
      .select('client_token')
      .eq('id', projetId)
      .single();

    if (error || !projet) {
      console.error('[checkout-session] Projet non trouvé:', error);
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      );
    }

    // 7. Retourner le client_token
    return NextResponse.json({
      success: true,
      client_token: projet.client_token,
    });
  } catch (err: any) {
    console.error('[checkout-session] Erreur:', err);
    return NextResponse.json(
      { error: err.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}