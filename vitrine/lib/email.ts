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

const footerTexts: Record<string, Record<string, string>> = {
  fr: {
    copyright: '© 2026 Actoos. Tous droits réservés.',
    terms: 'CGU',
    privacy: 'Confidentialité',
    contact: 'Contact',
  },
  en: {
    copyright: '© 2026 Actoos. All rights reserved.',
    terms: 'Terms',
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

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              <!-- Logo -->
              <tr>
                <td style="padding:28px 30px 20px; text-align:left;">
                  <img src="${logoUrl}" alt="Actoos" style="width:90px; height:auto; border:none; display:block;" />
                </td>
              </tr>
              <!-- Contenu -->
              <tr>
                <td style="padding:0 30px 24px;">
                  <h2 style="font-size:20px; font-weight:700; margin:0 0 12px; color:#1a1a1a;">${title}</h2>
                  <p style="font-size:15px; line-height:1.6; color:#4a4a4a; margin:0 0 24px;">
                    ${message}
                  </p>
                  ${buttonText && buttonUrl ? `
                  <div style="text-align:left; margin-bottom:24px;">
                    <a href="${buttonUrl}" style="display:inline-block; background-color:#D4AF37; color:#ffffff; padding:12px 28px; border-radius:6px; font-weight:600; text-decoration:none; font-size:15px;">
                      ${buttonText}
                    </a>
                  </div>
                  ` : ''}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:16px 30px; background-color:#f9fafb; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280;">
                  <p style="margin:0 0 8px;">${ft.copyright}</p>
                  <p style="margin:0;">
                    <a href="https://actoos.com/legal" style="color:#6b7280; text-decoration:underline;">${ft.terms}</a> ·
                    <a href="https://actoos.com/privacy" style="color:#6b7280; text-decoration:underline;">${ft.privacy}</a> ·
                    <a href="mailto:contact@actoos.com" style="color:#6b7280; text-decoration:underline;">${ft.contact}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: 'Actoos <noreply@actoos.com>',
      to,
      subject,
      html: fullHtml,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
}