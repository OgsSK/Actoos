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
    <body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">
              <!-- Logo -->
              <tr>
                <td style="padding:28px 32px 20px; text-align:left;">
                  <img src="${logoUrl}" alt="Actoos" style="width:80px; height:auto; border:none; display:block;" />
                </td>
              </tr>
              <!-- Contenu -->
              <tr>
                <td style="padding:0 32px 28px;">
                  <h2 style="font-size:19px; font-weight:600; margin:0 0 14px; color:#0f172a; letter-spacing:-0.01em; line-height:1.3;">${title}</h2>
                  <p style="font-size:15px; line-height:1.65; color:#475569; margin:0 0 24px;">
                    ${message}
                  </p>
                  ${buttonText && buttonUrl ? `
                  <div style="text-align:left; margin-bottom:8px;">
                    <a href="${buttonUrl}" style="display:inline-block; background-color:#0f172a; color:#ffffff; padding:11px 24px; border-radius:8px; font-weight:500; text-decoration:none; font-size:14px;">
                      ${buttonText}
                    </a>
                  </div>
                  ` : ''}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:18px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8;">
                  <p style="margin:0 0 6px;">${ft.copyright}</p>
                  <p style="margin:0;">
                    <a href="https://actoos.com/legal" style="color:#64748b; text-decoration:none;">${ft.terms}</a>
                    <span style="color:#cbd5e1;"> · </span>
                    <a href="https://actoos.com/privacy" style="color:#64748b; text-decoration:none;">${ft.privacy}</a>
                    <span style="color:#cbd5e1;"> · </span>
                    <a href="mailto:contact@actoos.com" style="color:#64748b; text-decoration:none;">${ft.contact}</a>
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