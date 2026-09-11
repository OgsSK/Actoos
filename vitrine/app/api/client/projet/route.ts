import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_FUNCTIONS_URL } from '../../../../lib/supabase-functions';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token requis' }, { status: 400 });
  }

  try {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-client-project?token=${token}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });
    }

    const projet = await res.json();
    return NextResponse.json(projet);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}