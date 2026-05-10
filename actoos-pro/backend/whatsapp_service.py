"""
WhatsApp Business Cloud API Service for Actoos
Supports both shared Actoos WhatsApp and custom per-enterprise accounts.
"""
import os
import httpx
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Default Actoos WhatsApp Configuration (shared for all enterprises)
DEFAULT_WHATSAPP_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_NUMBER_ID')
DEFAULT_WHATSAPP_ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN')
DEFAULT_WHATSAPP_BUSINESS_ACCOUNT_ID = os.environ.get('WHATSAPP_BUSINESS_ACCOUNT_ID')
WHATSAPP_API_VERSION = "v21.0"
WHATSAPP_BASE_URL = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"


class WhatsAppService:
    """WhatsApp Business Cloud API Service"""
    
    def __init__(
        self,
        access_token: str = None,
        phone_number_id: str = None,
        business_account_id: str = None
    ):
        self.access_token = access_token or DEFAULT_WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = phone_number_id or DEFAULT_WHATSAPP_PHONE_NUMBER_ID
        self.business_account_id = business_account_id or DEFAULT_WHATSAPP_BUSINESS_ACCOUNT_ID
        self.base_url = WHATSAPP_BASE_URL
        self.timeout = 30.0
    
    @property
    def is_configured(self) -> bool:
        return bool(self.access_token and self.phone_number_id)
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def send_template_message(
        self,
        to_phone_number: str,
        template_name: str,
        template_language: str = "fr",
        template_params: Optional[list] = None,
        header_params: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Send a WhatsApp template message.
        
        Args:
            to_phone_number: Recipient phone in E.164 format (e.g., +32470123456)
            template_name: Approved template name
            template_language: Template language code (default: fr)
            template_params: List of body parameters
            header_params: List of header parameters (for media/document templates)
        """
        if not self.is_configured:
            return {"status": "error", "message": "WhatsApp non configuré"}
        
        # Clean phone number
        clean_phone = to_phone_number.replace(" ", "").replace("-", "")
        if clean_phone.startswith("+"):
            clean_phone = clean_phone[1:]
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": template_language
                }
            }
        }
        
        # Add template components if parameters provided
        components = []
        
        if header_params:
            components.append({
                "type": "header",
                "parameters": header_params
            })
        
        if template_params:
            components.append({
                "type": "body",
                "parameters": [
                    {"type": "text", "text": str(param)} for param in template_params
                ]
            })
        
        if components:
            payload["template"]["components"] = components
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self._get_headers())
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"WhatsApp message sent to {clean_phone}: {result.get('messages', [{}])[0].get('id')}")
                
                return {
                    "status": "success",
                    "message_id": result.get("messages", [{}])[0].get("id"),
                    "to": clean_phone
                }
        
        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else str(e)
            logger.error(f"WhatsApp API error: {error_detail}")
            return {
                "status": "error",
                "message": f"Erreur WhatsApp API: {error_detail}",
                "code": e.response.status_code
            }
        except Exception as e:
            logger.error(f"WhatsApp send error: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    async def send_text_message(
        self,
        to_phone_number: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send a simple text message (only works within 24h service window).
        """
        if not self.is_configured:
            return {"status": "error", "message": "WhatsApp non configuré"}
        
        clean_phone = to_phone_number.replace(" ", "").replace("-", "")
        if clean_phone.startswith("+"):
            clean_phone = clean_phone[1:]
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "text",
            "text": {
                "body": message
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self._get_headers())
                response.raise_for_status()
                result = response.json()
                
                return {
                    "status": "success",
                    "message_id": result.get("messages", [{}])[0].get("id"),
                    "to": clean_phone
                }
        
        except Exception as e:
            logger.error(f"WhatsApp text send error: {e}")
            return {"status": "error", "message": str(e)}
    
    async def send_document(
        self,
        to_phone_number: str,
        document_url: str,
        filename: str,
        caption: str = None
    ) -> Dict[str, Any]:
        """
        Send a document (PDF, etc.) via WhatsApp.
        """
        if not self.is_configured:
            return {"status": "error", "message": "WhatsApp non configuré"}
        
        clean_phone = to_phone_number.replace(" ", "").replace("-", "")
        if clean_phone.startswith("+"):
            clean_phone = clean_phone[1:]
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "document",
            "document": {
                "link": document_url,
                "filename": filename
            }
        }
        
        if caption:
            payload["document"]["caption"] = caption
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self._get_headers())
                response.raise_for_status()
                result = response.json()
                
                return {
                    "status": "success",
                    "message_id": result.get("messages", [{}])[0].get("id"),
                    "to": clean_phone
                }
        
        except Exception as e:
            logger.error(f"WhatsApp document send error: {e}")
            return {"status": "error", "message": str(e)}


# ==================== HELPER FUNCTIONS ====================

def get_whatsapp_service_for_entreprise(entreprise: dict = None) -> Tuple[WhatsAppService, str]:
    """
    Get the appropriate WhatsApp service for an enterprise.
    Returns (service, mode) where mode is 'custom' or 'shared'.
    """
    if entreprise:
        # Check if enterprise has custom WhatsApp credentials
        custom_token = entreprise.get('whatsapp_access_token')
        custom_phone_id = entreprise.get('whatsapp_phone_number_id')
        
        if custom_token and custom_phone_id:
            service = WhatsAppService(
                access_token=custom_token,
                phone_number_id=custom_phone_id,
                business_account_id=entreprise.get('whatsapp_business_account_id')
            )
            if service.is_configured:
                return (service, 'custom')
    
    # Use shared Actoos WhatsApp
    shared_service = WhatsAppService()
    if shared_service.is_configured:
        return (shared_service, 'shared')
    
    return (WhatsAppService(), 'none')


def is_shared_whatsapp_available() -> bool:
    """Check if the shared Actoos WhatsApp is configured and available"""
    return bool(DEFAULT_WHATSAPP_ACCESS_TOKEN and DEFAULT_WHATSAPP_PHONE_NUMBER_ID)


def get_whatsapp_status_for_entreprise(entreprise: dict = None) -> dict:
    """
    Get the WhatsApp configuration status for an enterprise.
    """
    if entreprise:
        custom_token = entreprise.get('whatsapp_access_token')
        custom_phone_id = entreprise.get('whatsapp_phone_number_id')
        
        if custom_token and custom_phone_id:
            return {
                "configured": True,
                "mode": "custom",
                "description": "Votre propre WhatsApp Business"
            }
    
    if is_shared_whatsapp_available():
        return {
            "configured": True,
            "mode": "shared",
            "description": "Service WhatsApp partagé Actoos"
        }
    
    return {
        "configured": False,
        "mode": "none",
        "description": "WhatsApp non configuré"
    }


# ==================== MESSAGE TEMPLATES ====================

# These are the template names that need to be created in Meta Business Manager
ACTOOS_TEMPLATES = {
    "rappel_intervention": {
        "name": "rappel_intervention_actoos",
        "description": "Rappel d'intervention J-1",
        "params": ["prenom_client", "date_intervention", "heure_intervention", "nom_entreprise"],
        "example": "Bonjour {{1}}, rappel de votre intervention prévue le {{2}} à {{3}} avec {{4}}."
    },
    "nouveau_devis": {
        "name": "nouveau_devis_actoos",
        "description": "Notification nouveau devis",
        "params": ["prenom_client", "numero_devis", "montant", "nom_entreprise"],
        "example": "Bonjour {{1}}, votre devis n°{{2}} d'un montant de {{3}}€ est disponible. {{4}}"
    },
    "nouvelle_facture": {
        "name": "nouvelle_facture_actoos",
        "description": "Notification nouvelle facture",
        "params": ["prenom_client", "numero_facture", "montant", "date_echeance"],
        "example": "Bonjour {{1}}, votre facture n°{{2}} de {{3}}€ est disponible. Échéance: {{4}}"
    },
    "relance_paiement": {
        "name": "relance_paiement_actoos",
        "description": "Relance facture impayée",
        "params": ["prenom_client", "numero_facture", "montant", "jours_retard"],
        "example": "Bonjour {{1}}, votre facture n°{{2}} de {{3}}€ est en retard de {{4}} jours."
    },
    "confirmation_rdv": {
        "name": "confirmation_rdv_actoos",
        "description": "Confirmation de rendez-vous",
        "params": ["prenom_client", "date", "heure", "adresse"],
        "example": "Bonjour {{1}}, votre RDV est confirmé pour le {{2}} à {{3}}. Adresse: {{4}}"
    }
}


async def send_intervention_reminder_whatsapp(
    client: dict,
    intervention: dict,
    entreprise: dict
) -> dict:
    """Send intervention reminder via WhatsApp"""
    service, mode = get_whatsapp_service_for_entreprise(entreprise)
    
    if not service.is_configured:
        return {"status": "error", "message": "WhatsApp non configuré"}
    
    phone = client.get("telephone")
    if not phone:
        return {"status": "error", "message": "Client sans numéro de téléphone"}
    
    # Format date
    date_str = intervention.get("date_debut", "")
    if date_str:
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            date_formatted = dt.strftime("%d/%m/%Y")
            heure_formatted = dt.strftime("%H:%M")
        except:
            date_formatted = date_str
            heure_formatted = ""
    else:
        date_formatted = "bientôt"
        heure_formatted = ""
    
    return await service.send_template_message(
        to_phone_number=phone,
        template_name="rappel_intervention_actoos",
        template_params=[
            client.get("prenom", client.get("nom", "Client")),
            date_formatted,
            heure_formatted,
            entreprise.get("nom", "Notre entreprise")
        ]
    )


async def send_devis_notification_whatsapp(
    client: dict,
    devis: dict,
    entreprise: dict,
    pdf_url: str = None
) -> dict:
    """Send quote notification via WhatsApp"""
    service, mode = get_whatsapp_service_for_entreprise(entreprise)
    
    if not service.is_configured:
        return {"status": "error", "message": "WhatsApp non configuré"}
    
    phone = client.get("telephone")
    if not phone:
        return {"status": "error", "message": "Client sans numéro de téléphone"}
    
    result = await service.send_template_message(
        to_phone_number=phone,
        template_name="nouveau_devis_actoos",
        template_params=[
            client.get("prenom", client.get("nom", "Client")),
            devis.get("numero", devis.get("id", "")[:8]),
            f"{devis.get('total_ttc', 0):.2f}",
            entreprise.get("nom", "")
        ]
    )
    
    # If PDF URL provided, send document in follow-up
    if pdf_url and result.get("status") == "success":
        await service.send_document(
            to_phone_number=phone,
            document_url=pdf_url,
            filename=f"Devis_{devis.get('numero', 'document')}.pdf",
            caption="Voici votre devis en pièce jointe."
        )
    
    return result


async def send_facture_notification_whatsapp(
    client: dict,
    facture: dict,
    entreprise: dict,
    pdf_url: str = None
) -> dict:
    """Send invoice notification via WhatsApp"""
    service, mode = get_whatsapp_service_for_entreprise(entreprise)
    
    if not service.is_configured:
        return {"status": "error", "message": "WhatsApp non configuré"}
    
    phone = client.get("telephone")
    if not phone:
        return {"status": "error", "message": "Client sans numéro de téléphone"}
    
    # Format due date
    date_echeance = facture.get("date_echeance", "")
    if date_echeance:
        try:
            dt = datetime.fromisoformat(date_echeance.replace('Z', '+00:00'))
            date_formatted = dt.strftime("%d/%m/%Y")
        except:
            date_formatted = date_echeance
    else:
        date_formatted = "30 jours"
    
    result = await service.send_template_message(
        to_phone_number=phone,
        template_name="nouvelle_facture_actoos",
        template_params=[
            client.get("prenom", client.get("nom", "Client")),
            facture.get("numero", facture.get("id", "")[:8]),
            f"{facture.get('total_ttc', 0):.2f}",
            date_formatted
        ]
    )
    
    # Send PDF if available
    if pdf_url and result.get("status") == "success":
        await service.send_document(
            to_phone_number=phone,
            document_url=pdf_url,
            filename=f"Facture_{facture.get('numero', 'document')}.pdf",
            caption="Voici votre facture en pièce jointe."
        )
    
    return result


async def send_payment_reminder_whatsapp(
    client: dict,
    facture: dict,
    entreprise: dict,
    jours_retard: int
) -> dict:
    """Send payment reminder via WhatsApp"""
    service, mode = get_whatsapp_service_for_entreprise(entreprise)
    
    if not service.is_configured:
        return {"status": "error", "message": "WhatsApp non configuré"}
    
    phone = client.get("telephone")
    if not phone:
        return {"status": "error", "message": "Client sans numéro de téléphone"}
    
    return await service.send_template_message(
        to_phone_number=phone,
        template_name="relance_paiement_actoos",
        template_params=[
            client.get("prenom", client.get("nom", "Client")),
            facture.get("numero", facture.get("id", "")[:8]),
            f"{facture.get('total_ttc', 0):.2f}",
            str(jours_retard)
        ]
    )
