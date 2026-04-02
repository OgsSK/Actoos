"""
Unified Notification Service for Actoos
Handles automatic notifications via WhatsApp, SMS, or Email based on enterprise preferences.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from dependencies import db
from whatsapp_service import (
    send_intervention_reminder_whatsapp,
    send_devis_notification_whatsapp,
    send_facture_notification_whatsapp,
    send_payment_reminder_whatsapp,
    get_whatsapp_status_for_entreprise
)
from sms_service import (
    send_intervention_reminder,
    send_devis_notification,
    send_facture_notification,
    send_payment_reminder,
    get_sms_status_for_entreprise
)
from email_service import (
    send_devis_email,
    send_facture_email,
    send_relance_email as send_payment_reminder_email
)

logger = logging.getLogger(__name__)


class NotificationService:
    """Unified notification service that routes to the appropriate channel"""
    
    @staticmethod
    async def get_notification_config(entreprise_id: str) -> Dict[str, Any]:
        """Get notification configuration for an enterprise"""
        entreprise = await db.entreprises.find_one(
            {"id": entreprise_id},
            {"_id": 0, "notification_settings": 1, "messaging_preference": 1,
             "whatsapp_access_token": 1, "whatsapp_phone_number_id": 1,
             "twilio_account_sid": 1, "twilio_auth_token": 1, "twilio_phone_number": 1,
             "use_shared_whatsapp": 1, "use_shared_twilio": 1}
        )
        
        if not entreprise:
            return {"enabled": False}
        
        settings = entreprise.get("notification_settings", {})
        preference = entreprise.get("messaging_preference", "whatsapp")
        
        # Check channel availability
        wa_status = get_whatsapp_status_for_entreprise(entreprise)
        sms_status = get_sms_status_for_entreprise(entreprise)
        
        return {
            "enabled": True,
            "preference": preference,
            "settings": settings,
            "whatsapp_available": wa_status.get("configured", False),
            "sms_available": sms_status.get("configured", False),
            "email_available": True,  # Email is always available
            "entreprise": entreprise
        }
    
    @staticmethod
    async def send_notification(
        entreprise_id: str,
        notification_type: str,
        client: Dict[str, Any],
        data: Dict[str, Any],
        entreprise: Dict[str, Any] = None,
        pdf_url: str = None
    ) -> Dict[str, Any]:
        """
        Send a notification via the preferred channel.
        
        Args:
            entreprise_id: Enterprise ID
            notification_type: Type of notification (intervention_reminder, devis, facture, payment_reminder)
            client: Client data (must have email and/or telephone)
            data: Notification data (intervention, devis, or facture)
            entreprise: Enterprise data (optional, will be fetched if not provided)
            pdf_url: URL to PDF attachment (for devis/factures)
        
        Returns:
            dict with status and details of sent notifications
        """
        config = await NotificationService.get_notification_config(entreprise_id)
        
        if not config.get("enabled"):
            return {"status": "skipped", "reason": "Notifications désactivées"}
        
        if not entreprise:
            entreprise = await db.entreprises.find_one(
                {"id": entreprise_id},
                {"_id": 0}
            )
        
        settings = config.get("settings", {})
        preference = config.get("preference", "whatsapp")
        results = {"channels": [], "errors": []}
        
        # Determine which notifications to send based on type and settings
        should_send = NotificationService._should_send_notification(notification_type, settings)
        
        if not should_send.get("any"):
            return {"status": "skipped", "reason": "Notification désactivée dans les paramètres"}
        
        # Try preferred channel first, then fallback
        channels_to_try = NotificationService._get_channel_order(preference, config)
        
        for channel in channels_to_try:
            if channel == "whatsapp" and should_send.get("whatsapp", should_send.get("sms")):
                result = await NotificationService._send_via_whatsapp(
                    notification_type, client, data, entreprise, pdf_url
                )
                if result.get("status") == "success":
                    results["channels"].append({"channel": "whatsapp", "result": result})
                    break
                else:
                    results["errors"].append({"channel": "whatsapp", "error": result.get("message")})
            
            elif channel == "sms" and should_send.get("sms"):
                result = await NotificationService._send_via_sms(
                    notification_type, client, data, entreprise
                )
                if result.get("status") == "success":
                    results["channels"].append({"channel": "sms", "result": result})
                    break
                else:
                    results["errors"].append({"channel": "sms", "error": result.get("message")})
            
            elif channel == "email" and should_send.get("email"):
                result = await NotificationService._send_via_email(
                    notification_type, client, data, entreprise, pdf_url
                )
                if result.get("status") == "success":
                    results["channels"].append({"channel": "email", "result": result})
                    # Don't break for email - we might want to send both
                else:
                    results["errors"].append({"channel": "email", "error": result.get("message")})
        
        if results["channels"]:
            return {"status": "success", "details": results}
        else:
            return {"status": "failed", "details": results}
    
    @staticmethod
    def _should_send_notification(notification_type: str, settings: Dict) -> Dict[str, bool]:
        """Determine which channels should be used for this notification type"""
        mapping = {
            "intervention_reminder": {
                "sms": settings.get("sms_intervention_reminder", True),
                "email": settings.get("email_intervention_reminder", False),
                "whatsapp": settings.get("sms_intervention_reminder", True)  # WhatsApp uses SMS settings
            },
            "devis": {
                "sms": settings.get("sms_devis_notification", True),
                "email": settings.get("email_devis_notification", True),
                "whatsapp": settings.get("sms_devis_notification", True)
            },
            "facture": {
                "sms": settings.get("sms_facture_notification", True),
                "email": settings.get("email_facture_notification", True),
                "whatsapp": settings.get("sms_facture_notification", True)
            },
            "payment_reminder": {
                "sms": settings.get("sms_payment_reminder", True),
                "email": settings.get("email_payment_reminder", True),
                "whatsapp": settings.get("sms_payment_reminder", True)
            }
        }
        
        result = mapping.get(notification_type, {"sms": False, "email": False, "whatsapp": False})
        result["any"] = any([result.get("sms"), result.get("email"), result.get("whatsapp")])
        return result
    
    @staticmethod
    def _get_channel_order(preference: str, config: Dict) -> List[str]:
        """Get the order of channels to try based on preference and availability"""
        available = []
        
        if preference == "whatsapp":
            if config.get("whatsapp_available"):
                available.append("whatsapp")
            if config.get("sms_available"):
                available.append("sms")
            available.append("email")
        elif preference == "sms":
            if config.get("sms_available"):
                available.append("sms")
            if config.get("whatsapp_available"):
                available.append("whatsapp")
            available.append("email")
        else:  # email
            available.append("email")
            if config.get("whatsapp_available"):
                available.append("whatsapp")
            if config.get("sms_available"):
                available.append("sms")
        
        return available
    
    @staticmethod
    async def _send_via_whatsapp(
        notification_type: str,
        client: Dict,
        data: Dict,
        entreprise: Dict,
        pdf_url: str = None
    ) -> Dict:
        """Send notification via WhatsApp"""
        if not client.get("telephone"):
            return {"status": "error", "message": "Client sans numéro de téléphone"}
        
        try:
            if notification_type == "intervention_reminder":
                return await send_intervention_reminder_whatsapp(client, data, entreprise)
            elif notification_type == "devis":
                return await send_devis_notification_whatsapp(client, data, entreprise, pdf_url)
            elif notification_type == "facture":
                return await send_facture_notification_whatsapp(client, data, entreprise, pdf_url)
            elif notification_type == "payment_reminder":
                jours_retard = data.get("jours_retard", 0)
                return await send_payment_reminder_whatsapp(client, data, entreprise, jours_retard)
            else:
                return {"status": "error", "message": f"Type de notification inconnu: {notification_type}"}
        except Exception as e:
            logger.error(f"WhatsApp notification error: {e}")
            return {"status": "error", "message": str(e)}
    
    @staticmethod
    async def _send_via_sms(
        notification_type: str,
        client: Dict,
        data: Dict,
        entreprise: Dict
    ) -> Dict:
        """Send notification via SMS"""
        if not client.get("telephone"):
            return {"status": "error", "message": "Client sans numéro de téléphone"}
        
        try:
            if notification_type == "intervention_reminder":
                return await send_intervention_reminder(client, data, entreprise)
            elif notification_type == "devis":
                return await send_devis_notification(client, data, entreprise)
            elif notification_type == "facture":
                return await send_facture_notification(client, data, entreprise)
            elif notification_type == "payment_reminder":
                jours_retard = data.get("jours_retard", 0)
                return await send_payment_reminder(client, data, entreprise, jours_retard)
            else:
                return {"status": "error", "message": f"Type de notification inconnu: {notification_type}"}
        except Exception as e:
            logger.error(f"SMS notification error: {e}")
            return {"status": "error", "message": str(e)}
    
    @staticmethod
    async def _send_via_email(
        notification_type: str,
        client: Dict,
        data: Dict,
        entreprise: Dict,
        pdf_url: str = None
    ) -> Dict:
        """Send notification via Email"""
        if not client.get("email"):
            return {"status": "error", "message": "Client sans adresse email"}
        
        try:
            if notification_type == "devis":
                success = await send_devis_email(client, data, entreprise, pdf_url)
                return {"status": "success" if success else "error", "message": "Email envoyé" if success else "Échec envoi email"}
            elif notification_type == "facture":
                success = await send_facture_email(client, data, entreprise, pdf_url)
                return {"status": "success" if success else "error", "message": "Email envoyé" if success else "Échec envoi email"}
            elif notification_type == "payment_reminder":
                jours_retard = data.get("jours_retard", 0)
                success = await send_payment_reminder_email(client, data, entreprise, jours_retard)
                return {"status": "success" if success else "error", "message": "Email envoyé" if success else "Échec envoi email"}
            elif notification_type == "intervention_reminder":
                # Email reminder not implemented yet
                return {"status": "skipped", "message": "Rappel email non implémenté"}
            else:
                return {"status": "error", "message": f"Type de notification inconnu: {notification_type}"}
        except Exception as e:
            logger.error(f"Email notification error: {e}")
            return {"status": "error", "message": str(e)}


# ==================== SCHEDULED TASKS FUNCTIONS ====================

async def send_intervention_reminders_j1():
    """
    Send J-1 reminders for interventions scheduled for tomorrow.
    This should be called by a scheduler (cron job) once per day.
    """
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    tomorrow_start = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_end = tomorrow.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Find all interventions scheduled for tomorrow
    interventions = await db.interventions.find({
        "date_debut": {
            "$gte": tomorrow_start.isoformat(),
            "$lte": tomorrow_end.isoformat()
        },
        "statut": {"$in": ["planifiee", "confirmee"]},
        "reminder_sent": {"$ne": True}
    }).to_list(length=1000)
    
    results = {"sent": 0, "failed": 0, "skipped": 0, "details": []}
    
    for intervention in interventions:
        try:
            # Get client
            client = await db.clients.find_one(
                {"id": intervention.get("client_id")},
                {"_id": 0}
            )
            
            if not client:
                results["skipped"] += 1
                continue
            
            # Get entreprise
            entreprise = await db.entreprises.find_one(
                {"id": intervention.get("entreprise_id")},
                {"_id": 0}
            )
            
            if not entreprise:
                results["skipped"] += 1
                continue
            
            # Check if auto reminders are enabled
            settings = entreprise.get("notification_settings", {})
            if not settings.get("auto_reminders_enabled", True):
                results["skipped"] += 1
                continue
            
            # Send notification
            result = await NotificationService.send_notification(
                entreprise_id=intervention.get("entreprise_id"),
                notification_type="intervention_reminder",
                client=client,
                data=intervention,
                entreprise=entreprise
            )
            
            if result.get("status") == "success":
                results["sent"] += 1
                # Mark as sent
                await db.interventions.update_one(
                    {"id": intervention.get("id")},
                    {"$set": {"reminder_sent": True, "reminder_sent_at": datetime.now(timezone.utc).isoformat()}}
                )
            else:
                results["failed"] += 1
            
            results["details"].append({
                "intervention_id": intervention.get("id"),
                "result": result
            })
            
        except Exception as e:
            logger.error(f"Error sending reminder for intervention {intervention.get('id')}: {e}")
            results["failed"] += 1
    
    logger.info(f"J-1 Reminders: {results['sent']} sent, {results['failed']} failed, {results['skipped']} skipped")
    return results


async def send_payment_reminders():
    """
    Send payment reminders for overdue invoices.
    This should be called by a scheduler (cron job) daily.
    """
    now = datetime.now(timezone.utc)
    
    # Find overdue invoices
    factures = await db.factures.find({
        "statut": {"$in": ["emise", "en_retard"]},
        "date_echeance": {"$lt": now.isoformat()},
        "$or": [
            {"last_reminder_sent": {"$exists": False}},
            {"last_reminder_sent": {"$lt": (now - timedelta(days=7)).isoformat()}}  # Min 7 days between reminders
        ]
    }).to_list(length=500)
    
    results = {"sent": 0, "failed": 0, "skipped": 0, "details": []}
    
    for facture in factures:
        try:
            # Get client
            client = await db.clients.find_one(
                {"id": facture.get("client_id")},
                {"_id": 0}
            )
            
            if not client:
                results["skipped"] += 1
                continue
            
            # Get entreprise
            entreprise = await db.entreprises.find_one(
                {"id": facture.get("entreprise_id")},
                {"_id": 0}
            )
            
            if not entreprise:
                results["skipped"] += 1
                continue
            
            # Check if auto reminders are enabled
            settings = entreprise.get("notification_settings", {})
            if not settings.get("auto_reminders_enabled", True):
                results["skipped"] += 1
                continue
            
            # Calculate days overdue
            date_echeance = datetime.fromisoformat(facture.get("date_echeance").replace('Z', '+00:00'))
            jours_retard = (now - date_echeance).days
            
            facture["jours_retard"] = jours_retard
            
            # Send notification
            result = await NotificationService.send_notification(
                entreprise_id=facture.get("entreprise_id"),
                notification_type="payment_reminder",
                client=client,
                data=facture,
                entreprise=entreprise
            )
            
            if result.get("status") == "success":
                results["sent"] += 1
                # Update facture
                await db.factures.update_one(
                    {"id": facture.get("id")},
                    {"$set": {
                        "last_reminder_sent": now.isoformat(),
                        "reminder_count": facture.get("reminder_count", 0) + 1,
                        "statut": "en_retard"
                    }}
                )
            else:
                results["failed"] += 1
            
            results["details"].append({
                "facture_id": facture.get("id"),
                "jours_retard": jours_retard,
                "result": result
            })
            
        except Exception as e:
            logger.error(f"Error sending payment reminder for facture {facture.get('id')}: {e}")
            results["failed"] += 1
    
    logger.info(f"Payment Reminders: {results['sent']} sent, {results['failed']} failed, {results['skipped']} skipped")
    return results


# ==================== HELPER FUNCTIONS FOR ROUTERS ====================

async def notify_devis_sent(devis_id: str, pdf_url: str = None) -> Dict:
    """Helper function to notify when a devis is sent"""
    devis = await db.devis.find_one({"id": devis_id}, {"_id": 0})
    if not devis:
        return {"status": "error", "message": "Devis non trouvé"}
    
    client = await db.clients.find_one({"id": devis.get("client_id")}, {"_id": 0})
    if not client:
        return {"status": "error", "message": "Client non trouvé"}
    
    entreprise = await db.entreprises.find_one({"id": devis.get("entreprise_id")}, {"_id": 0})
    
    return await NotificationService.send_notification(
        entreprise_id=devis.get("entreprise_id"),
        notification_type="devis",
        client=client,
        data=devis,
        entreprise=entreprise,
        pdf_url=pdf_url
    )


async def notify_facture_sent(facture_id: str, pdf_url: str = None) -> Dict:
    """Helper function to notify when a facture is sent"""
    facture = await db.factures.find_one({"id": facture_id}, {"_id": 0})
    if not facture:
        return {"status": "error", "message": "Facture non trouvée"}
    
    client = await db.clients.find_one({"id": facture.get("client_id")}, {"_id": 0})
    if not client:
        return {"status": "error", "message": "Client non trouvé"}
    
    entreprise = await db.entreprises.find_one({"id": facture.get("entreprise_id")}, {"_id": 0})
    
    return await NotificationService.send_notification(
        entreprise_id=facture.get("entreprise_id"),
        notification_type="facture",
        client=client,
        data=facture,
        entreprise=entreprise,
        pdf_url=pdf_url
    )
