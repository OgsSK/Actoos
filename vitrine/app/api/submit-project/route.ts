import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, modules, conversation } = await req.json();

    if (!name || !email || !modules || modules.length === 0) {
      return NextResponse.json({ error: "Champs requis" }, { status: 400 });
    }

    // Construire l'email
    let modulesHtml = '';
    modules.forEach((mod: any, i: number) => {
      modulesHtml += `
        <div style="margin-bottom:20px;padding:15px;border:1px solid #e5e7eb;border-radius:12px">
          <h3 style="color:#2563eb">Module ${i + 1} : ${mod.name}</h3>
          <pre style="background:#f9fafb;padding:10px;border-radius:8px;overflow-x:auto">${mod.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </div>
      `;
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
        <h2 style="color:#2563eb;border-bottom:2px solid #e5e7eb;padding-bottom:8px">Nouveau projet complet</h2>
        <p><strong>Client :</strong> ${name} (${email})</p>
        <p><strong>Message :</strong> ${message || '-'}</p>
        <hr style="border:1px solid #e5e7eb;margin:20px 0" />
        <h3>📦 Modules (${modules.length})</h3>
        ${modulesHtml}
        <hr style="border:1px solid #e5e7eb;margin:20px 0" />
        <h3>💬 Conversation</h3>
        <pre style="background:#f9fafb;padding:10px;border-radius:8px;max-height:300px;overflow-y:auto">${JSON.stringify(conversation, null, 2)}</pre>
        <p style="color:#6b7280;font-size:12px;margin-top:20px">Envoyé depuis la vitrine Actoos.</p>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Actoos <noreply@actoos.com>',
        to: 'contact@actoos.com',
        subject: `Nouveau projet : ${modules.length} module(s)`,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend error:', errorText);
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('submit-project error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}