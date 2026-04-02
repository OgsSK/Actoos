"""
Google Calendar Integration Router
Allows technicians to sync their interventions with their Google Calendar
Supports both shared Actoos credentials and custom per-enterprise credentials
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from typing import Optional, Tuple
from datetime import datetime, timezone, timedelta
import os
import logging
import requests

from auth import get_current_user
from dependencies import db, serialize_doc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["Calendar Integration"])

# Default Actoos Google OAuth Configuration (shared)
DEFAULT_GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
DEFAULT_GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"
]

# Legacy aliases
GOOGLE_CLIENT_ID = DEFAULT_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = DEFAULT_GOOGLE_CLIENT_SECRET


async def get_google_credentials_for_entreprise(entreprise_id: str) -> Tuple[str, str, str]:
    """
    Get Google OAuth credentials for an enterprise.
    Returns (client_id, client_secret, mode) where mode is 'custom' or 'shared'.
    """
    entreprise = await db.entreprises.find_one(
        {"id": entreprise_id},
        {"_id": 0, "google_client_id": 1, "google_client_secret": 1, "use_shared_google": 1}
    )
    
    if entreprise:
        # Check if enterprise has custom Google credentials
        custom_id = entreprise.get("google_client_id")
        custom_secret = entreprise.get("google_client_secret")
        use_shared = entreprise.get("use_shared_google", True)
        
        if not use_shared and custom_id and custom_secret:
            return (custom_id, custom_secret, "custom")
    
    # Use shared Actoos credentials
    if DEFAULT_GOOGLE_CLIENT_ID and DEFAULT_GOOGLE_CLIENT_SECRET:
        return (DEFAULT_GOOGLE_CLIENT_ID, DEFAULT_GOOGLE_CLIENT_SECRET, "shared")
    
    return (None, None, "none")


def is_calendar_configured():
    """Check if Google Calendar credentials are configured (shared)"""
    return bool(DEFAULT_GOOGLE_CLIENT_ID and DEFAULT_GOOGLE_CLIENT_SECRET)


def is_shared_google_available():
    """Check if shared Actoos Google Calendar is available"""
    return bool(DEFAULT_GOOGLE_CLIENT_ID and DEFAULT_GOOGLE_CLIENT_SECRET)


@router.get("/status")
async def get_calendar_status(current_user: dict = Depends(get_current_user)):
    """
    Check if calendar integration is configured and if user is connected
    """
    # Get credentials for this enterprise
    client_id, client_secret, mode = await get_google_credentials_for_entreprise(current_user["entreprise_id"])
    
    configured = bool(client_id and client_secret)
    
    if not configured:
        return {
            "configured": False,
            "connected": False,
            "mode": "none",
            "shared_available": is_shared_google_available(),
            "message": "Google Calendar n'est pas configuré. Utilisez le service Actoos ou configurez vos propres credentials."
        }
    
    # Check if user has Google tokens
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    has_tokens = bool(user and user.get("google_calendar_tokens"))
    
    return {
        "configured": True,
        "connected": has_tokens,
        "mode": mode,
        "shared_available": is_shared_google_available(),
        "google_email": user.get("google_calendar_email") if has_tokens else None,
        "last_sync": user.get("calendar_last_sync") if has_tokens else None
    }


@router.get("/connect")
async def connect_google_calendar(current_user: dict = Depends(get_current_user)):
    """
    Start OAuth flow to connect Google Calendar
    Returns the authorization URL to redirect the user to
    """
    # Get credentials for this enterprise
    client_id, client_secret, mode = await get_google_credentials_for_entreprise(current_user["entreprise_id"])
    
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=503,
            detail="Google Calendar non configuré. Activez le service Actoos ou configurez vos propres credentials dans Paramètres > Intégrations."
        )
    
    # Build redirect URI if not set
    redirect_uri = GOOGLE_REDIRECT_URI
    if not redirect_uri:
        # Get from frontend env
        frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "")
        redirect_uri = f"{frontend_url}/api/calendar/callback"
    
    # Store state for security (include user_id and entreprise_id to link account after callback)
    import secrets
    state = f"{current_user['user_id']}:{current_user['entreprise_id']}:{secrets.token_urlsafe(16)}"
    
    # Store state in DB temporarily
    await db.oauth_states.insert_one({
        "state": state,
        "user_id": current_user["user_id"],
        "entreprise_id": current_user["entreprise_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    # Build authorization URL
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }
    
    query_string = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    authorization_url = f"{auth_url}?{query_string}"
    
    logger.info(f"Generated OAuth URL for user {current_user['user_id']} (mode: {mode})")
    
    return {
        "authorization_url": authorization_url,
        "mode": mode,
        "message": "Redirigez l'utilisateur vers cette URL pour connecter Google Calendar"
    }


@router.get("/callback")
async def google_calendar_callback(
    code: str = Query(...),
    state: str = Query(...)
):
    """
    Handle OAuth callback from Google
    """
    # Verify state
    oauth_state = await db.oauth_states.find_one({"state": state})
    if not oauth_state:
        raise HTTPException(status_code=400, detail="État OAuth invalide ou expiré")
    
    # Check expiration
    if datetime.fromisoformat(oauth_state["expires_at"]) < datetime.now(timezone.utc):
        await db.oauth_states.delete_one({"state": state})
        raise HTTPException(status_code=400, detail="État OAuth expiré")
    
    user_id = oauth_state["user_id"]
    entreprise_id = oauth_state.get("entreprise_id")
    
    # Get credentials for this enterprise
    client_id, client_secret, mode = await get_google_credentials_for_entreprise(entreprise_id) if entreprise_id else (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, "shared")
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="Google Calendar non configuré pour cette entreprise")
    
    # Build redirect URI
    redirect_uri = GOOGLE_REDIRECT_URI
    if not redirect_uri:
        frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "")
        redirect_uri = f"{frontend_url}/api/calendar/callback"
    
    # Exchange code for tokens
    token_response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
    )
    
    if token_response.status_code != 200:
        logger.error(f"Token exchange failed: {token_response.text}")
        raise HTTPException(status_code=400, detail="Échec de l'échange de tokens")
    
    tokens = token_response.json()
    
    # Get user info (email)
    userinfo_response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    
    google_email = None
    if userinfo_response.status_code == 200:
        google_email = userinfo_response.json().get("email")
    
    # Save tokens to user
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "google_calendar_tokens": {
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens.get("refresh_token"),
                    "expires_in": tokens.get("expires_in"),
                    "token_type": tokens.get("token_type"),
                    "obtained_at": datetime.now(timezone.utc).isoformat()
                },
                "google_calendar_email": google_email,
                "calendar_last_sync": None
            }
        }
    )
    
    # Clean up state
    await db.oauth_states.delete_one({"state": state})
    
    logger.info(f"Google Calendar connected for user {user_id} ({google_email})")
    
    # Redirect to frontend with success
    frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    return RedirectResponse(
        url=f"{frontend_url}/dashboard/settings?calendar=connected",
        status_code=302
    )


@router.post("/disconnect")
async def disconnect_google_calendar(current_user: dict = Depends(get_current_user)):
    """
    Disconnect Google Calendar from user account
    """
    # Remove tokens
    result = await db.users.update_one(
        {"id": current_user["user_id"]},
        {
            "$unset": {
                "google_calendar_tokens": "",
                "google_calendar_email": "",
                "calendar_last_sync": ""
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Also remove any synced event mappings
    await db.calendar_event_mappings.delete_many({"user_id": current_user["user_id"]})
    
    logger.info(f"Google Calendar disconnected for user {current_user['user_id']}")
    
    return {"message": "Google Calendar déconnecté"}


async def get_valid_credentials(user_id: str):
    """
    Get valid Google credentials for a user, refreshing if needed
    """
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("google_calendar_tokens"):
        return None
    
    tokens = user["google_calendar_tokens"]
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    
    # Check if token is expired (simple check based on obtained_at + expires_in)
    obtained_at = datetime.fromisoformat(tokens.get("obtained_at", "2000-01-01T00:00:00"))
    expires_in = tokens.get("expires_in", 3600)
    
    if datetime.now(timezone.utc) > obtained_at + timedelta(seconds=expires_in - 60):
        # Token expired or about to expire, refresh it
        if not refresh_token:
            logger.warning(f"No refresh token for user {user_id}")
            return None
        
        refresh_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }
        )
        
        if refresh_response.status_code != 200:
            logger.error(f"Token refresh failed for user {user_id}: {refresh_response.text}")
            return None
        
        new_tokens = refresh_response.json()
        
        # Update stored tokens
        await db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "google_calendar_tokens.access_token": new_tokens["access_token"],
                    "google_calendar_tokens.expires_in": new_tokens.get("expires_in", 3600),
                    "google_calendar_tokens.obtained_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        access_token = new_tokens["access_token"]
    
    return access_token


@router.get("/events")
async def get_calendar_events(
    time_min: Optional[str] = None,
    time_max: Optional[str] = None,
    max_results: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Get events from user's Google Calendar
    """
    access_token = await get_valid_credentials(current_user["user_id"])
    if not access_token:
        raise HTTPException(status_code=401, detail="Google Calendar non connecté ou session expirée")
    
    # Default time range: now to 30 days from now
    if not time_min:
        time_min = datetime.now(timezone.utc).isoformat()
    if not time_max:
        time_max = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    # Fetch events from Google Calendar
    response = requests.get(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        headers={"Authorization": f"Bearer {access_token}"},
        params={
            "timeMin": time_min,
            "timeMax": time_max,
            "maxResults": max_results,
            "singleEvents": "true",
            "orderBy": "startTime"
        }
    )
    
    if response.status_code != 200:
        logger.error(f"Failed to fetch calendar events: {response.text}")
        raise HTTPException(status_code=response.status_code, detail="Erreur lors de la récupération des événements")
    
    return response.json()


@router.post("/sync-intervention/{intervention_id}")
async def sync_intervention_to_calendar(
    intervention_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Sync a specific intervention to the user's Google Calendar
    """
    access_token = await get_valid_credentials(current_user["user_id"])
    if not access_token:
        raise HTTPException(status_code=401, detail="Google Calendar non connecté")
    
    # Get intervention
    intervention = await db.interventions.find_one({
        "id": intervention_id,
        "entreprise_id": current_user["entreprise_id"]
    }, {"_id": 0})
    
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Get client name
    client = await db.clients.find_one({"id": intervention["client_id"]}, {"_id": 0})
    client_name = f"{client['nom']} {client.get('prenom', '')}" if client else "Client inconnu"
    
    # Build event
    date_prevue = intervention["date_prevue"]
    if isinstance(date_prevue, str):
        date_prevue = datetime.fromisoformat(date_prevue.replace("Z", "+00:00"))
    
    duree = intervention.get("duree_estimee", 60)  # minutes
    date_fin = date_prevue + timedelta(minutes=duree)
    
    event_body = {
        "summary": f"[Actoos] {intervention['titre']}",
        "description": f"Client: {client_name}\n{intervention.get('description', '')}\n\nAdresse: {intervention.get('adresse', '')} {intervention.get('code_postal', '')} {intervention.get('ville', '')}",
        "start": {
            "dateTime": date_prevue.isoformat(),
            "timeZone": "Europe/Paris"
        },
        "end": {
            "dateTime": date_fin.isoformat(),
            "timeZone": "Europe/Paris"
        },
        "location": f"{intervention.get('adresse', '')} {intervention.get('code_postal', '')} {intervention.get('ville', '')}",
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 30}
            ]
        }
    }
    
    # Check if already synced
    existing_mapping = await db.calendar_event_mappings.find_one({
        "intervention_id": intervention_id,
        "user_id": current_user["user_id"]
    })
    
    if existing_mapping:
        # Update existing event
        response = requests.put(
            f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{existing_mapping['google_event_id']}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json=event_body
        )
        action = "updated"
    else:
        # Create new event
        response = requests.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json=event_body
        )
        action = "created"
    
    if response.status_code not in [200, 201]:
        logger.error(f"Failed to sync event: {response.text}")
        raise HTTPException(status_code=response.status_code, detail="Erreur lors de la synchronisation")
    
    google_event = response.json()
    
    # Save mapping
    if action == "created":
        await db.calendar_event_mappings.insert_one({
            "intervention_id": intervention_id,
            "user_id": current_user["user_id"],
            "google_event_id": google_event["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Update last sync time
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {"calendar_last_sync": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Intervention {intervention_id} {action} in Google Calendar for user {current_user['user_id']}")
    
    return {
        "message": f"Intervention synchronisée ({action})",
        "google_event_id": google_event["id"],
        "google_event_link": google_event.get("htmlLink")
    }


@router.delete("/sync-intervention/{intervention_id}")
async def remove_intervention_from_calendar(
    intervention_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove an intervention from Google Calendar
    """
    access_token = await get_valid_credentials(current_user["user_id"])
    if not access_token:
        raise HTTPException(status_code=401, detail="Google Calendar non connecté")
    
    # Find mapping
    mapping = await db.calendar_event_mappings.find_one({
        "intervention_id": intervention_id,
        "user_id": current_user["user_id"]
    })
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Événement non trouvé dans le calendrier")
    
    # Delete from Google Calendar
    response = requests.delete(
        f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{mapping['google_event_id']}",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    # 404 is OK (event already deleted)
    if response.status_code not in [200, 204, 404]:
        logger.error(f"Failed to delete event: {response.text}")
        raise HTTPException(status_code=response.status_code, detail="Erreur lors de la suppression")
    
    # Remove mapping
    await db.calendar_event_mappings.delete_one({"_id": mapping["_id"]})
    
    return {"message": "Événement supprimé du calendrier"}


@router.post("/sync-all")
async def sync_all_interventions(
    days_ahead: int = 14,
    current_user: dict = Depends(get_current_user)
):
    """
    Sync all upcoming interventions for the current technician to Google Calendar
    """
    access_token = await get_valid_credentials(current_user["user_id"])
    if not access_token:
        raise HTTPException(status_code=401, detail="Google Calendar non connecté")
    
    # Get upcoming interventions assigned to this tech
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=days_ahead)
    
    interventions = await db.interventions.find({
        "technicien_id": current_user["user_id"],
        "entreprise_id": current_user["entreprise_id"],
        "statut": {"$in": ["planifiee", "en_cours"]},
        "date_prevue": {"$gte": now.isoformat(), "$lte": future.isoformat()}
    }, {"_id": 0}).to_list(100)
    
    synced = 0
    errors = 0
    
    for intervention in interventions:
        try:
            await sync_intervention_to_calendar(intervention["id"], current_user)
            synced += 1
        except Exception as e:
            logger.error(f"Failed to sync intervention {intervention['id']}: {e}")
            errors += 1
    
    return {
        "message": f"{synced} intervention(s) synchronisée(s)",
        "synced": synced,
        "errors": errors,
        "total": len(interventions)
    }
