import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, title, message, buttonText, buttonUrl, language } = body;

    // Détermine le destinataire (utilise "to" si présent, sinon contact@actoos.com)
    const recipient = to || 'contact@actoos.com';

    // Construire le HTML premium avec logo
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Inter', Arial, sans-serif; background: #f5f5f5; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 30px; text-align: center;">
                <img src="https://actoos.com/logo.png" alt="Actoos" style="height: 40px; margin-bottom: 10px;" />
                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; color: #1f2937; line-height: 1.6;">
                ${message}
              </td>
            </tr>
            ${buttonUrl && buttonText ? `
            <tr>
              <td style="padding: 0 30px 30px; text-align: center;">
                <a href="${buttonUrl}" style="display: inline-block; background: #D4AF37; color: #0f172a; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">${buttonText}</a>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
                Actoos • <a href="mailto:contact@actoos.com" style="color: #D4AF37;">contact@actoos.com</a>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Appeler l'Edge Function avec le HTML généré
    const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/handle-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-email',
        name: 'Actoos', // ou utilise ton propre nom
        email: recipient,
        message: subject,
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