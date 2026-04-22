"""
Authentication routes: login, register, invite, password reset
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import uuid
import logging
import os

logger = logging.getLogger(__name__)

from models import (
    UserResponse, UserLogin, UserInvite, UserPasswordReset, 
    UserSetPassword, TokenResponse, RegisterRequest
)
from auth import (
    get_password_hash, verify_password, create_access_token, decode_token,
    get_current_user, require_admin, create_invitation_token, create_reset_token
)
from dependencies import db, serialize_doc, log_action
from plan_limits import check_technician_limit, raise_limit_error

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register_entreprise(data: RegisterRequest):
    """
    DEPRECATED: Direct registration is disabled for security.
    All new accounts must go through Stripe checkout flow.
    
    This endpoint now only allows registration if:
    1. The user has a valid checkout session from Stripe
    2. OR has been invited by an existing admin
    
    For new accounts: Use /pricing → /signup flow which goes through Stripe
    """
    raise HTTPException(
        status_code=403, 
        detail="L'inscription directe est désactivée. Veuillez passer par la page tarifs pour créer votre compte avec un essai gratuit de 14 jours."
    )


@router.post("/register-from-checkout")
async def register_from_checkout(session_id: str, password: str = None):
    """
    Register enterprise after successful Stripe checkout.
    This is the ONLY way to create a new enterprise account.
    Called from the /signup/success page after Stripe payment/trial setup.
    """
    # Get the checkout session from payment_transactions
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Session de paiement introuvable")
    
    # Check if already processed
    if transaction.get("entreprise_created"):
        raise HTTPException(status_code=400, detail="Ce compte a déjà été créé")
    
    # Check payment/trial status with Stripe
    import stripe
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Configuration Stripe manquante")
    
    stripe.api_key = stripe_api_key
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        # Accept both paid and trialing subscriptions
        if session.payment_status not in ['paid', 'no_payment_required'] and session.status != 'complete':
            raise HTTPException(status_code=400, detail="Paiement non validé")
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail="Erreur de validation du paiement")
    
    # Extract info from transaction metadata
    plan_id = transaction.get("plan_id", "startup")
    billing_cycle = transaction.get("billing_cycle", "monthly")
    entreprise_name = transaction.get("entreprise_name", "Mon Entreprise")
    admin_email = transaction.get("admin_email")
    
    if not admin_email:
        raise HTTPException(status_code=400, detail="Email administrateur manquant")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": admin_email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Get plan limits
    from subscription_service import get_plan
    plan = get_plan(plan_id)
    if not plan:
        plan = get_plan("startup")
    
    # Calculate trial end date (14 days)
    from datetime import timedelta
    trial_ends_at = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    
    # Create entreprise with proper subscription status
    entreprise_id = str(uuid.uuid4())
    entreprise = {
        "id": entreprise_id,
        "nom": entreprise_name,
        "email": admin_email.lower(),
        "telephone": "",
        "sequence_devis": 1,
        "sequence_facture": 1,
        "couleur_primaire": "#059669",  # ACTOOS PRO green
        "plan": plan_id,
        "plan_limits": plan.get("limits", {}),
        "billing_cycle": billing_cycle,
        "subscription_status": "trialing",
        "trial_ends_at": trial_ends_at,
        "stripe_session_id": session_id,
        "stripe_customer_id": session.customer if session else None,
        "stripe_subscription_id": session.subscription if session else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_via": "stripe_checkout"
    }
    await db.entreprises.insert_one(entreprise)
    
    # Generate temporary password if not provided
    import secrets
    temp_password = password or secrets.token_urlsafe(12)
    
    # Create admin user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "entreprise_id": entreprise_id,
        "email": admin_email.lower(),
        "nom": "",
        "prenom": "",
        "password_hash": get_password_hash(temp_password),
        "role": "admin",
        "statut": "actif",
        "derniere_connexion": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Mark transaction as processed
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "entreprise_created": True,
            "entreprise_id": entreprise_id,
            "user_id": user_id,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send welcome email with credentials
    try:
        from email_service import send_email
        await send_email(
            to_email=admin_email,
            subject="Bienvenue sur ACTOOS PRO - Vos identifiants",
            html_content=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #059669; margin: 0;">ACTOOS PRO</h1>
                    <p style="color: #6b7280;">Gestion d'interventions terrain</p>
                </div>
                
                <h2 style="color: #1f2937;">Bienvenue {entreprise_name} !</h2>
                
                <p>Votre compte ACTOOS PRO a été créé avec succès.</p>
                
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #166534;">Vos identifiants de connexion</h3>
                    <p><strong>Email :</strong> {admin_email}</p>
                    <p><strong>Mot de passe temporaire :</strong> {temp_password}</p>
                    <p style="color: #166534; font-size: 13px;">
                        ⚠️ Nous vous recommandons de changer ce mot de passe dès votre première connexion.
                    </p>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;">
                        <strong>Essai gratuit de 14 jours</strong><br>
                        Votre période d'essai se termine le {trial_ends_at[:10]}. 
                        Profitez de toutes les fonctionnalités sans limite !
                    </p>
                </div>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="https://actoos.com/login" style="background: #059669; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Se connecter maintenant
                    </a>
                </p>
            </div>
            """
        )
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
    
    # Create access token
    token = create_access_token({"sub": user_id, "ent": entreprise_id, "role": "admin"})
    
    await log_action(entreprise_id, user_id, "create", "entreprise", entreprise_id, {"via": "stripe_checkout"})
    
    logger.info(f"New enterprise created via Stripe checkout: {entreprise_name} ({admin_email})")
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id, entreprise_id=entreprise_id, email=admin_email,
            nom="", prenom="", role="admin", statut="actif",
            derniere_connexion=user["derniere_connexion"], created_at=user["created_at"]
        ),
        entreprise={
            "id": entreprise_id,
            "nom": entreprise_name,
            "plan": plan_id,
            "subscription_status": "trialing",
            "trial_ends_at": trial_ends_at
        }
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Login user with subscription validation"""
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if user["statut"] == "desactive":
        raise HTTPException(status_code=401, detail="Compte désactivé")
    
    if user["statut"] == "invite":
        raise HTTPException(status_code=401, detail="Veuillez d'abord activer votre compte via le lien d'invitation")
    
    # Get entreprise
    entreprise = await db.entreprises.find_one({"id": user["entreprise_id"]}, {"_id": 0})
    
    if not entreprise:
        raise HTTPException(status_code=401, detail="Entreprise non trouvée")
    
    # Check subscription status for admin users
    if user["role"] == "admin":
        subscription_status = entreprise.get("subscription_status", "none")
        
        # Check if trial has expired
        if subscription_status == "trialing":
            trial_ends_at = entreprise.get("trial_ends_at")
            if trial_ends_at:
                try:
                    trial_end = datetime.fromisoformat(trial_ends_at.replace('Z', '+00:00'))
                    if datetime.now(timezone.utc) > trial_end:
                        # Trial expired - update status
                        await db.entreprises.update_one(
                            {"id": user["entreprise_id"]},
                            {"$set": {"subscription_status": "expired"}}
                        )
                        subscription_status = "expired"
                except:
                    pass
        
        # Block access for expired/cancelled/none subscriptions
        if subscription_status in ["expired", "cancelled", "none", "past_due"]:
            raise HTTPException(
                status_code=403, 
                detail={
                    "code": "subscription_required",
                    "message": "Votre abonnement a expiré ou n'est pas actif. Veuillez renouveler votre abonnement pour continuer.",
                    "subscription_status": subscription_status,
                    "redirect": "/pricing"
                }
            )
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"derniere_connexion": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_access_token({"sub": user["id"], "ent": user["entreprise_id"], "role": user["role"]})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], entreprise_id=user["entreprise_id"], email=user["email"],
            nom=user["nom"], prenom=user["prenom"], telephone=user.get("telephone"),
            role=user["role"], statut=user["statut"], skills=user.get("skills", []),
            derniere_connexion=datetime.now(timezone.utc).isoformat(), created_at=user["created_at"]
        ),
        entreprise=entreprise
    )


@router.get("/me", response_model=TokenResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    return TokenResponse(
        access_token="",
        user=UserResponse(
            id=user["id"], entreprise_id=user["entreprise_id"], email=user["email"],
            nom=user["nom"], prenom=user["prenom"], telephone=user.get("telephone"),
            role=user["role"], statut=user["statut"], skills=user.get("skills", []),
            derniere_connexion=user.get("derniere_connexion"), created_at=user["created_at"]
        ),
        entreprise=entreprise
    )


@router.post("/invite")
async def invite_technician(data: UserInvite, current_user: dict = Depends(require_admin)):
    """Invite a technician (admin only) - allows extras with billing"""
    # Check technician info (always allowed but may incur extra cost)
    limit_check = await check_technician_limit(db, current_user["entreprise_id"])
    
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "entreprise_id": current_user["entreprise_id"],
        "email": data.email,
        "nom": data.nom,
        "prenom": data.prenom,
        "telephone": data.telephone,
        "password_hash": "",
        "role": "tech",
        "statut": "invite",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create invitation token
    invite_token = create_invitation_token(user_id, current_user["entreprise_id"])
    
    # Get entreprise name for email
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "nom": 1}
    )
    entreprise_name = entreprise.get("nom", "Notre Entreprise") if entreprise else "Notre Entreprise"
    
    # Send invitation email
    try:
        from email_service import send_email
        frontend_url = os.environ.get("FRONTEND_URL", "https://actoos.com")
        activation_url = f"{frontend_url}/activate?token={invite_token}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb; margin-bottom: 24px;">Bienvenue dans l'équipe {entreprise_name} !</h1>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Bonjour {data.prenom},
            </p>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Vous avez été ajouté comme technicien chez <strong>{entreprise_name}</strong>.
            </p>
            
            <div style="background: #f1f5f9; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: bold; color: #1e293b;">
                    📱 Pour commencer :
                </p>
                <ol style="margin: 0; padding-left: 20px; color: #475569;">
                    <li style="margin-bottom: 8px;">Cliquez sur le bouton ci-dessous pour activer votre compte</li>
                    <li style="margin-bottom: 8px;">Choisissez votre mot de passe</li>
                    <li style="margin-bottom: 8px;">Installez l'application sur votre téléphone</li>
                </ol>
            </div>
            
            <p style="text-align: center; margin: 32px 0;">
                <a href="{activation_url}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Activer mon compte
                </a>
            </p>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                Vos identifiants de connexion :<br>
                <strong>Email :</strong> {data.email}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            
            <p style="font-size: 12px; color: #9ca3af;">
                Ce lien expire dans 7 jours. Si vous n'avez pas demandé ce compte, ignorez cet email.
            </p>
        </div>
        """
        
        await send_email(
            to_email=data.email,
            subject=f"Bienvenue chez {entreprise_name} - Activez votre compte Actoos",
            html_content=html_content
        )
        logger.info(f"Invitation email sent to {data.email}")
    except Exception as e:
        logger.error(f"Failed to send invitation email: {e}")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "invite", "user", user_id)
    
    # Calculate if this is an extra technician
    new_check = await check_technician_limit(db, current_user["entreprise_id"])
    extra_count = new_check.get("extra_count", 0)
    extra_cost = new_check.get("extra_cost", 0)
    
    response = {
        "message": "Invitation envoyée", 
        "user_id": user_id, 
        "invite_token": invite_token
    }
    
    if extra_count > 0:
        response["billing_info"] = {
            "extra_technicians": extra_count,
            "extra_cost_monthly": extra_cost,
            "notice": f"Ce technicien est facturé {new_check.get('price_per_extra', 5)}€/mois en supplément"
        }
    
    return response


@router.post("/activate")
async def activate_account(data: UserSetPassword):
    """Activate invited account with password"""
    try:
        payload = decode_token(data.token)
        if payload.get("type") != "invite":
            raise HTTPException(status_code=400, detail="Token invalide")
    except:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user or user["statut"] != "invite":
        raise HTTPException(status_code=400, detail="Compte déjà activé ou inexistant")
    
    await db.users.update_one(
        {"id": payload["sub"]},
        {"$set": {"password_hash": get_password_hash(data.password), "statut": "actif"}}
    )
    
    return {"message": "Compte activé avec succès"}


@router.post("/request-password-reset")
async def request_password_reset(data: UserPasswordReset, request: Request):
    """
    Request password reset - Secure implementation
    - Rate limited (max 3 requests per email per hour)
    - Generic messages to prevent email enumeration
    - Token expires in 1 hour
    """
    from datetime import timedelta
    
    # Rate limiting: Check if too many requests for this email
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent_requests = await db.password_reset_requests.count_documents({
        "email": data.email.lower(),
        "created_at": {"$gte": one_hour_ago}
    })
    
    if recent_requests >= 3:
        # Don't reveal that we're rate limiting - just return generic message
        logger.warning(f"Rate limit exceeded for password reset: {data.email}")
        return {"message": "Si l'email existe, un lien de réinitialisation sera envoyé"}
    
    # Log this request for rate limiting
    await db.password_reset_requests.insert_one({
        "email": data.email.lower(),
        "ip_address": request.client.host if request.client else "unknown",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Look up user - but ALWAYS return generic message
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    
    if user:
        # Generate secure reset token with 1 hour expiration
        reset_token = create_reset_token(user["id"], user["entreprise_id"])
        
        # Save token to database with expiration for additional validation
        await db.password_reset_tokens.insert_one({
            "token": reset_token,
            "user_id": user["id"],
            "email": data.email.lower(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        })
        
        # Build reset URL
        origin = request.headers.get("origin", "https://actoos.com")
        reset_url = f"{origin}/reset-password?token={reset_token}"
        
        # Send email with reset link
        try:
            from email_service import send_email
            await send_email(
                to_email=data.email,
                subject="Réinitialisation de votre mot de passe ACTOOS PRO",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #059669; margin: 0;">ACTOOS PRO</h1>
                    </div>
                    <h2 style="color: #1f2937;">Réinitialisation de mot de passe</h2>
                    <p>Bonjour {user.get('prenom', '')},</p>
                    <p>Vous avez demandé la réinitialisation de votre mot de passe ACTOOS PRO.</p>
                    <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background: #059669; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Réinitialiser mon mot de passe
                        </a>
                    </p>
                    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>⚠️ Important :</strong> Ce lien expire dans <strong>1 heure</strong>.<br>
                            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                        </p>
                    </div>
                    <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
                        Pour des raisons de sécurité, ce lien ne peut être utilisé qu'une seule fois.
                    </p>
                </div>
                """
            )
            logger.info(f"Password reset email sent to {data.email}")
        except Exception as e:
            logger.error(f"Failed to send reset email: {e}")
    else:
        logger.info(f"Password reset requested for non-existent email: {data.email}")
    
    # ALWAYS return the same message to prevent email enumeration
    return {"message": "Si l'email existe, un lien de réinitialisation sera envoyé"}


@router.post("/reset-password")
async def reset_password(data: UserSetPassword):
    """
    Reset password with token - Secure implementation
    - Validates token exists in database
    - Ensures token hasn't been used
    - Ensures token hasn't expired
    - Invalidates token after use
    """
    try:
        payload = decode_token(data.token)
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Lien invalide")
    except:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")
    
    # Validate token in database
    token_record = await db.password_reset_tokens.find_one({
        "token": data.token,
        "used": False
    })
    
    if not token_record:
        raise HTTPException(status_code=400, detail="Ce lien a déjà été utilisé ou est invalide")
    
    # Check expiration
    expires_at = datetime.fromisoformat(token_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Ce lien a expiré. Veuillez faire une nouvelle demande.")
    
    # Validate password strength
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères")
    
    # Update password
    await db.users.update_one(
        {"id": payload["sub"]},
        {"$set": {"password_hash": get_password_hash(data.new_password)}}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token": data.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Invalidate all other reset tokens for this user
    await db.password_reset_tokens.update_many(
        {"user_id": payload["sub"], "used": False},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Password reset successful for user {payload['sub']}")
    
    return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."}


@router.post("/change-password")
async def change_password(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Change password for authenticated user.
    Requires current password verification.
    """
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Mot de passe actuel et nouveau requis")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 8 caractères")
    
    # Get user with password hash
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Verify current password
    if not verify_password(current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    # Check new password is different from current
    if verify_password(new_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit être différent de l'actuel")
    
    # Update password
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "password_hash": get_password_hash(new_password),
                "password_changed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Log action
    await log_action(
        entreprise_id=current_user["entreprise_id"],
        user_id=current_user["id"],
        action="password_changed",
        details={"user_email": current_user["email"]}
    )
    
    return {"message": "Mot de passe modifié avec succès"}


@router.delete("/delete-account")
async def delete_account(
    current_user: dict = Depends(require_admin)
):
    """
    Suppression définitive du compte et de toutes les données associées.
    ATTENTION: Cette action est irréversible!
    Conforme GDPR - Droit à l'effacement (Article 17)
    """
    entreprise_id = current_user["entreprise_id"]
    
    # Annuler l'abonnement Stripe si actif
    entreprise = await db.entreprises.find_one({"id": entreprise_id})
    if entreprise and entreprise.get("stripe_subscription_id"):
        try:
            import stripe
            import os
            stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
            stripe.Subscription.cancel(entreprise["stripe_subscription_id"])
        except Exception as e:
            # Log but continue with deletion
            pass
    
    # Supprimer toutes les données de l'entreprise
    collections_to_delete = [
        "users",
        "clients", 
        "interventions",
        "devis",
        "factures",
        "categories",
        "sites",
        "photos",
        "rapports",
        "statements",
        "audit_logs",
        "cancellation_feedback",
        "communications"
    ]
    
    deleted_counts = {}
    for collection in collections_to_delete:
        result = await db[collection].delete_many({"entreprise_id": entreprise_id})
        deleted_counts[collection] = result.deleted_count
    
    # Supprimer l'entreprise elle-même
    await db.entreprises.delete_one({"id": entreprise_id})
    
    # Log cette action critique (dans une collection séparée pour audit GDPR)
    await db.gdpr_deletions.insert_one({
        "entreprise_id": entreprise_id,
        "entreprise_nom": entreprise.get("nom") if entreprise else "Unknown",
        "deleted_by": current_user["user_id"],
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "deleted_counts": deleted_counts
    })
    
    return {
        "message": "Compte supprimé définitivement",
        "deleted": deleted_counts
    }
