import { NextRequest, NextResponse } from 'next/server';
import { sendActoosEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, title, message, buttonText, buttonUrl, language } = body;

    // Si l'ancien format (html) est encore utilisé, on le convertit temporairement
    if (body.html && !message) {
      const { html, name, email } = body;
      const result = await sendActoosEmail({
        to: to || 'contact@actoos.com',
        subject: subject || 'Message Actoos',
        title: name ? `Message de ${name}` : 'Nouveau message',
        message: html || '',
        lang: language || 'fr',
      });
      return result.success
        ? NextResponse.json({ success: true })
        : NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Nouveau format : vérifier les champs requis
    if (!to || !subject || !title || !message) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }

    // Envoyer avec la langue passée en paramètre (fallback sur 'fr')
    const result = await sendActoosEmail({
      to,
      subject,
      title,
      message,
      buttonText: buttonText || undefined,
      buttonUrl: buttonUrl || undefined,
      lang: language || 'fr',
    });

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error('send-project-email error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}