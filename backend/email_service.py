"""
Email Service for sending devis and factures via Resend
"""
import os
import asyncio
import logging
import resend
import base64
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

def get_devis_email_html(devis: dict, client: dict, entreprise: dict, portal_url: str) -> str:
    """Generate HTML email for devis"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">{entreprise.get('nom', 'Notre Entreprise')}</h1>
                                <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Devis N° {devis.get('numero_devis', '')}</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px;">
                                <p style="margin: 0 0 16px; font-size: 16px; color: #334155;">
                                    Bonjour {client.get('prenom', '')} {client.get('nom', '')},
                                </p>
                                <p style="margin: 0 0 24px; font-size: 16px; color: #334155; line-height: 1.6;">
                                    Veuillez trouver ci-joint notre devis pour les travaux demandés.
                                </p>
                                
                                <!-- Amount Box -->
                                <table role="presentation" style="width: 100%; background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
                                    <tr>
                                        <td style="padding: 24px; text-align: center;">
                                            <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">Montant total TTC</p>
                                            <p style="margin: 0; font-size: 32px; font-weight: 700; color: #0f172a;">{devis.get('total_ttc', 0):.2f} €</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- CTA Button -->
                                <table role="presentation" style="width: 100%;">
                                    <tr>
                                        <td style="text-align: center; padding-bottom: 24px;">
                                            <a href="{portal_url}" style="display: inline-block; padding: 14px 32px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 6px;">
                                                Voir et signer le devis
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
                                    Ce devis est valable jusqu'au {devis.get('date_expiration', '')[:10] if devis.get('date_expiration') else 'N/A'}.
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #64748b;">
                                    Le PDF est également joint à cet email.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                                <p style="margin: 0 0 8px; font-size: 14px; color: #334155; font-weight: 600;">{entreprise.get('nom', '')}</p>
                                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                                    {entreprise.get('adresse', '')}<br>
                                    {entreprise.get('code_postal', '')} {entreprise.get('ville', '')}<br>
                                    Tél: {entreprise.get('telephone', '')} | Email: {entreprise.get('email', '')}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def get_facture_email_html(facture: dict, client: dict, entreprise: dict) -> str:
    """Generate HTML email for facture"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">{entreprise.get('nom', 'Notre Entreprise')}</h1>
                                <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Facture N° {facture.get('numero_facture', '')}</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px;">
                                <p style="margin: 0 0 16px; font-size: 16px; color: #334155;">
                                    Bonjour {client.get('prenom', '')} {client.get('nom', '')},
                                </p>
                                <p style="margin: 0 0 24px; font-size: 16px; color: #334155; line-height: 1.6;">
                                    Veuillez trouver ci-joint votre facture pour les travaux réalisés.
                                </p>
                                
                                <!-- Amount Box -->
                                <table role="presentation" style="width: 100%; background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
                                    <tr>
                                        <td style="padding: 24px; text-align: center;">
                                            <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">Montant total TTC</p>
                                            <p style="margin: 0; font-size: 32px; font-weight: 700; color: #0f172a;">{facture.get('total_ttc', 0):.2f} €</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Payment Info -->
                                <table role="presentation" style="width: 100%; background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
                                    <tr>
                                        <td style="padding: 16px;">
                                            <p style="margin: 0; font-size: 14px; color: #92400e;">
                                                <strong>Échéance:</strong> {facture.get('date_echeance', '')[:10] if facture.get('date_echeance') else 'À réception'}<br>
                                                {facture.get('conditions_paiement', 'Paiement à réception de facture')}
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 0; font-size: 14px; color: #64748b;">
                                    La facture PDF est jointe à cet email.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                                <p style="margin: 0 0 8px; font-size: 14px; color: #334155; font-weight: 600;">{entreprise.get('nom', '')}</p>
                                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                                    {entreprise.get('adresse', '')}<br>
                                    {entreprise.get('code_postal', '')} {entreprise.get('ville', '')}<br>
                                    Tél: {entreprise.get('telephone', '')} | Email: {entreprise.get('email', '')}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def get_relance_email_html(facture: dict, client: dict, entreprise: dict, jours_retard: int) -> str:
    """Generate HTML email for payment reminder"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">{entreprise.get('nom', 'Notre Entreprise')}</h1>
                                <p style="margin: 8px 0 0; color: #dc2626; font-size: 14px; font-weight: 600;">Rappel de paiement</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px;">
                                <p style="margin: 0 0 16px; font-size: 16px; color: #334155;">
                                    Bonjour {client.get('prenom', '')} {client.get('nom', '')},
                                </p>
                                <p style="margin: 0 0 24px; font-size: 16px; color: #334155; line-height: 1.6;">
                                    Nous vous rappelons que la facture <strong>{facture.get('numero_facture', '')}</strong> 
                                    est en attente de règlement depuis <strong>{jours_retard} jour(s)</strong>.
                                </p>
                                
                                <!-- Amount Box -->
                                <table role="presentation" style="width: 100%; background-color: #fef2f2; border-radius: 8px; margin-bottom: 24px; border: 1px solid #fecaca;">
                                    <tr>
                                        <td style="padding: 24px; text-align: center;">
                                            <p style="margin: 0 0 8px; font-size: 14px; color: #dc2626;">Montant restant dû</p>
                                            <p style="margin: 0; font-size: 32px; font-weight: 700; color: #dc2626;">
                                                {(facture.get('total_ttc', 0) - facture.get('montant_paye', 0)):.2f} €
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                                    Merci de procéder au règlement dans les meilleurs délais. 
                                    Si vous avez déjà effectué le paiement, veuillez ignorer ce message.
                                </p>
                                
                                <p style="margin: 0; font-size: 14px; color: #64748b;">
                                    Pour toute question, n'hésitez pas à nous contacter.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                                <p style="margin: 0 0 8px; font-size: 14px; color: #334155; font-weight: 600;">{entreprise.get('nom', '')}</p>
                                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                                    Tél: {entreprise.get('telephone', '')} | Email: {entreprise.get('email', '')}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    pdf_attachment: Optional[bytes] = None,
    attachment_filename: Optional[str] = None
) -> dict:
    """Send email via Resend with optional PDF attachment"""
    
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not configured, email not sent")
        return {"status": "skipped", "message": "Email service not configured"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    # Add PDF attachment if provided
    if pdf_attachment and attachment_filename:
        params["attachments"] = [{
            "filename": attachment_filename,
            "content": base64.b64encode(pdf_attachment).decode('utf-8')
        }]
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent successfully to {to_email}")
        return {
            "status": "success",
            "message": f"Email envoyé à {to_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return {
            "status": "error",
            "message": f"Erreur lors de l'envoi: {str(e)}"
        }

async def send_devis_email(devis: dict, client: dict, entreprise: dict, pdf_bytes: bytes, portal_base_url: str) -> dict:
    """Send devis email to client with PDF attachment and portal link"""
    
    if not client.get('email'):
        return {"status": "skipped", "message": "Client n'a pas d'email"}
    
    portal_url = f"{portal_base_url}/portal/devis/{devis.get('token_client', '')}"
    
    html_content = get_devis_email_html(devis, client, entreprise, portal_url)
    subject = f"Devis {devis.get('numero_devis', '')} - {entreprise.get('nom', '')}"
    
    result = await send_email(
        to_email=client['email'],
        subject=subject,
        html_content=html_content,
        pdf_attachment=pdf_bytes,
        attachment_filename=f"devis_{devis.get('numero_devis', '')}.pdf"
    )
    
    # Add metadata for logging
    result["_log_data"] = {
        "recipient": client['email'],
        "subject": subject,
        "content_preview": f"Devis {devis.get('numero_devis')} envoyé au client {client.get('prenom', '')} {client.get('nom', '')}",
        "related_entity": "devis",
        "related_entity_id": devis.get("id")
    }
    
    return result

async def send_facture_email(facture: dict, client: dict, entreprise: dict, pdf_bytes: bytes) -> dict:
    """Send facture email to client with PDF attachment"""
    
    if not client.get('email'):
        return {"status": "skipped", "message": "Client n'a pas d'email"}
    
    html_content = get_facture_email_html(facture, client, entreprise)
    subject = f"Facture {facture.get('numero_facture', '')} - {entreprise.get('nom', '')}"
    
    result = await send_email(
        to_email=client['email'],
        subject=subject,
        html_content=html_content,
        pdf_attachment=pdf_bytes,
        attachment_filename=f"facture_{facture.get('numero_facture', '')}.pdf"
    )
    
    # Add metadata for logging
    result["_log_data"] = {
        "recipient": client['email'],
        "subject": subject,
        "content_preview": f"Facture {facture.get('numero_facture')} envoyée au client {client.get('prenom', '')} {client.get('nom', '')}",
        "related_entity": "facture",
        "related_entity_id": facture.get("id")
    }
    
    return result

async def send_relance_email(facture: dict, client: dict, entreprise: dict, jours_retard: int) -> dict:
    """Send payment reminder email to client"""
    
    if not client.get('email'):
        return {"status": "skipped", "message": "Client n'a pas d'email"}
    
    html_content = get_relance_email_html(facture, client, entreprise, jours_retard)
    subject = f"Rappel: Facture {facture.get('numero_facture', '')} en attente - {entreprise.get('nom', '')}"
    
    result = await send_email(
        to_email=client['email'],
        subject=subject,
        html_content=html_content
    )
    
    # Add metadata for logging
    result["_log_data"] = {
        "recipient": client['email'],
        "subject": subject,
        "content_preview": f"Relance paiement: Facture {facture.get('numero_facture')} ({jours_retard} jours de retard)",
        "related_entity": "facture",
        "related_entity_id": facture.get("id")
    }
    
    return result


async def send_email_with_attachment(
    to_email: str,
    subject: str,
    html_content: str,
    attachment_bytes: bytes,
    attachment_filename: str,
    from_name: str = None
) -> dict:
    """Send email with a file attachment (used for statements, reports, etc.)"""
    
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not configured, email not sent")
        return {"status": "skipped", "message": "Email service not configured"}
    
    # Build sender with custom name if provided
    sender = f"{from_name} <{SENDER_EMAIL}>" if from_name else SENDER_EMAIL
    
    params = {
        "from": sender,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "attachments": [{
            "filename": attachment_filename,
            "content": base64.b64encode(attachment_bytes).decode('utf-8')
        }]
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email with attachment sent successfully to {to_email}")
        return {
            "status": "success",
            "message": f"Email envoyé à {to_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email with attachment to {to_email}: {str(e)}")
        return {
            "status": "error",
            "message": f"Erreur lors de l'envoi: {str(e)}"
        }



async def send_super_admin_email(
    to_email: str,
    subject: str,
    message: str,
    entreprise_name: str = ""
) -> dict:
    """Send communication email from super admin to enterprise"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
            .message {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; }}
            .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 24px;">Actoos</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Message de l'équipe Actoos</p>
            </div>
            <div class="content">
                {f'<p>Bonjour <strong>{entreprise_name}</strong>,</p>' if entreprise_name else '<p>Bonjour,</p>'}
                <div class="message">{message}</div>
                <p>Cordialement,<br><strong>L'équipe Actoos</strong></p>
            </div>
            <div class="footer">
                <p>Actoos - Gestion d'interventions terrain</p>
                <p>Cet email vous a été envoyé car vous êtes client Actoos.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(to_email, f"[Actoos] {subject}", html_content)
