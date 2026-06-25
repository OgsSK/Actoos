import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ error: 'session_id manquant' }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const projetId = session.metadata?.projet_id;
    const amount = (session.amount_total || 0) / 100;

    if (!projetId) return NextResponse.json({ error: 'projet_id manquant' }, { status: 400 });

    const { data: projet, error: fetchError } = await supabase
      .from('projets')
      .select('client_token, paid_amount, payment_amount')
      .eq('id', projetId)
      .single();

    if (fetchError || !projet) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });

    const newPaid = (projet.paid_amount || 0) + amount;
    const totalDue = projet.payment_amount || 0;
    const isComplete = newPaid >= totalDue;

    const { error: updateError } = await supabase
      .from('projets')
      .update({
        paid_amount: newPaid,
        payment_status: isComplete ? 'complet' : 'acompte_payé',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projetId);

    if (updateError) return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 });

    return NextResponse.json({
      client_token: projet.client_token,
      amount,
      isComplete,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}