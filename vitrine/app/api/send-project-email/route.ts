import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, html, to } = body;

    // Si le champ "to" est présent, on l'utilise, sinon on envoie à contact@actoos.com
    const recipient = to || 'contact@actoos.com';

    const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/handle-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-email',
        name,
        email: recipient,
        message,
        html,
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('send-project-email error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}