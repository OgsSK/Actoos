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
  eyebrow?: string;      // ← petit label au-dessus du titre (ex: "Projet reçu")
  preheader?: string;    // ← texte d'aperçu invisible dans la boîte mail
}

const footerTexts: Record<string, Record<string, string>> = {
  fr: {
    copyright: '© 2026 Actoos. Tous droits réservés.',
    terms: 'CGU',
    privacy: 'Confidentialité',
    contact: 'Contact',
    signature: 'Actoos — Infrastructure numérique des activités professionnelles',
  },
  en: {
    copyright: '© 2026 Actoos. All rights reserved.',
    terms: 'Terms',
    privacy: 'Privacy',
    contact: 'Contact',
    signature: 'Actoos — Digital infrastructure for professional activities',
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
  eyebrow,
  preheader,
}: ActoosEmail) {
  const logoUrl = 'https://actoos.com/logo-icon.png';
  const ft = footerTexts[lang] || footerTexts.fr;
  const preview = preheader || title;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased;">

      <!-- Preheader (texte d'aperçu invisible) -->
      <div style="display:none; font-size:1px; color:#f1f5f9; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
        ${preview}
      </div>

      <!-- Wrapper -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
        <tr>
          <td align="center" style="padding:48px 16px;">

            <!-- Container -->
            <table width="560" cellpadding="0" cellspacing="0" style="width:560px; max-width:560px; background-color:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e2e8f0;">

              <!-- Header : logo + wordmark -->
              <tr>
                <td style="padding:28px 40px 0;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <img src="${logoUrl}" width="28" height="28" alt="Actoos" style="display:block; border:none; border-radius:6px;" />
                      </td>
                      <td style="vertical-align:middle; padding-left:10px;">
                        <span style="font-size:15px; font-weight:600; color:#0f172a; letter-spacing:-0.01em;">Actoos</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Contenu principal -->
              <tr>
                <td style="padding:28px 40px 36px;">
                  ${eyebrow ? `
                  <p style="margin:0 0 10px; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#64748b;">
                    ${eyebrow}
                  </p>
                  ` : ''}

                  <h1 style="margin:0 0 16px; font-size:22px; font-weight:600; line-height:1.3; color:#0f172a; letter-spacing:-0.015em;">
                    ${title}
                  </h1>

                  <div style="font-size:15px; line-height:1.7; color:#475569; mso-line-height-rule:exactly;">
                    ${message}
                  </div>

                  ${buttonText && buttonUrl ? `
                  <table cellpadding="0" cellspacing="0" style="margin-top:28px;">
                    <tr>
                      <td style="background-color:#0f172a; border-radius:10px;">
                        <a href="${buttonUrl}" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:500; color:#ffffff; text-decoration:none; letter-spacing:-0.005em;">
                          ${buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                </td>
              </tr>

              <!-- Séparateur -->
              <tr>
                <td style="padding:0 40px;">
                  <div style="border-top:1px solid #e2e8f0;"></div>
                </td>
              </tr>

              <!-- Signature -->
              <tr>
                <td style="padding:22px 40px 0;">
                  <p style="margin:0; font-size:13px; color:#64748b; line-height:1.5;">
                    ${ft.signature}
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 40px 32px;">
                  <p style="margin:0 0 10px; font-size:12px; color:#94a3b8; line-height:1.5;">
                    ${ft.copyright}
                  </p>
                  <p style="margin:0; font-size:12px; line-height:1.5;">
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