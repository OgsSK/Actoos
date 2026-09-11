import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_FUNCTIONS_URL } from '../../../lib/supabase-functions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/handle-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('save-project error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}