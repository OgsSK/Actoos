import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, proposal, code, conversation } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 });
    }

    // Appel direct à l'API Resend (sans SDK)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Actoos <noreply@actoos.com>',
        to: 'contact@actoos.com',
        subject: `Nouveau projet : ${proposal?.title || 'Sans titre'}`,
        html: `
          <h2>Nouveau projet depuis la vitrine</h2>
          <p><strong>Client :</strong> ${name} (${email})</p>
          <p><strong>Message :</strong> ${message || '-'}</p>
          <hr />
          <h3>Proposition</h3>
          <pre>${JSON.stringify(proposal, null, 2)}</pre>
          <h3>Code React preview</h3>
          <pre>${code}</pre>
          <h3>Conversation</h3>
          <pre>${JSON.stringify(conversation, null, 2)}</pre>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend error:', errorText);
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('send-project-email error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}