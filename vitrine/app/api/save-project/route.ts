import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/handle-request', {
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