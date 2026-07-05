import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ActoosEmail {
  to: string;
  subject: string;
  title: string;
  message: string;
  buttonText?: string;
  buttonUrl?: string;
  lang?: 'fr' | 'en';
}

const footerTexts = {
  fr: {
    rights: '© 2026 Actoos. Tous droits réservés.',
    legal: 'Mentions légales',
    privacy: 'Confidentialité',
    contact: 'Contact',
  },
  en: {
    rights: '© 2026 Actoos. All rights reserved.',
    legal: 'Legal notice',
    privacy: 'Privacy',
    contact: 'Contact',
  },
};

export async function sendActoosEmail({
  to,
  subject,
  title,
  message,
  buttonText,
  buttonUrl,
  lang = 'fr',
}: ActoosEmail) {
  const logoUrl = 'https://actoos.com/logo-icon.png';
  const ft = footerTexts[lang] || footerTexts.fr;

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; text-align: center;">
        <img src="${logoUrl}" alt="Actoos" style="height: 40px; margin-bottom: 12px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">${title}</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 20px;">
          ${message}
        </p>
        ${buttonText && buttonUrl ? `
        <div style="text-align: center; margin: 32px 0;">
          <a href="${buttonUrl}" style="display: inline-block; background: #D4AF37; color: #0f172a; padding: 14px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px;">
            ${buttonText}
          </a>
        </div>
        ` : ''}
      </div>
      <div style="background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #64748b; margin: 0 0 8px;">${ft.rights}</p>
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          <a href="https://actoos.com/legal" style="color: #94a3b8; text-decoration: underline;">${ft.legal}</a> · 
          <a href="https://actoos.com/privacy" style="color: #94a3b8; text-decoration: underline;">${ft.privacy}</a> · 
          <a href="mailto:contact@actoos.com" style="color: #94a3b8; text-decoration: underline;">${ft.contact}</a>
        </p>
      </div>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: 'Actoos <noreply@actoos.com>',
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
}