import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, html, to } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 });
    }

    // Utiliser le destinataire fourni, sinon envoyer à Actoos
    const recipient = to || 'contact@actoos.com';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Actoos <noreply@actoos.com>',
        to: recipient,
        subject: `Nouveau projet : ${name}`,
        html: html || buildDefaultEmail(name, email, message),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur Resend:', response.status, errorText);
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔥 send-project-email error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

function buildDefaultEmail(name: string, email: string, message: string): string {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Nouveau message depuis la vitrine</h2>
      <p><strong>Nom :</strong> ${name}</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Message :</strong> ${message || '-'}</p>
      <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 12px;">Envoyé depuis la page contact.</p>
    </div>
  `;
}