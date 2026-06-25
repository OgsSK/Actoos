import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeKey || !supabaseUrl || !supabaseKey) {
  throw new Error('Variables d\'environnement manquantes');
}

const stripe = new Stripe(stripeKey, { apiVersion: '2026-06-24.dahlia' });
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ error: 'session_id manquant' }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const projetId = session.metadata?.projet_id;
    if (!projetId) return NextResponse.json({ error: 'projet_id manquant dans la session' }, { status: 400 });

    const { data: projet, error } = await supabase
      .from('projets')
      .select('client_token')
      .eq('id', projetId)
      .single();

    if (error || !projet) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });

    return NextResponse.json({ client_token: projet.client_token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}