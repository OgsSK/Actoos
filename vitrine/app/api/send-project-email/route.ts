import { NextRequest, NextResponse } from 'next/server';
import { sendActoosEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, title, message, buttonText, buttonUrl, language } = body;

    if (!to || !subject || !title || !message) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const result = await sendActoosEmail({
      to,
      subject,
      title,
      message,
      buttonText,
      buttonUrl,
      lang: language || 'fr',
    });

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}