import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Appeler l'Edge Function Supabase qui a déjà RESEND_API_KEY
    const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/handle-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-email',
        name: body.name,
        email: body.email,
        message: body.message,
        html: buildEmailHtml(body),
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('submit-project error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

function buildEmailHtml({ name, email, message, modules, conversation }: any) {
  let modulesHtml = '';
  modules.forEach((mod: any, i: number) => {
    modulesHtml += `
      <div style="margin-bottom:20px;padding:15px;border:1px solid #e5e7eb;border-radius:12px">
        <h3 style="color:#2563eb">Module ${i + 1} : ${mod.name}</h3>
        <pre style="background:#f9fafb;padding:10px;border-radius:8px;overflow-x:auto">${mod.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </div>
    `;
  });

  return `
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
}