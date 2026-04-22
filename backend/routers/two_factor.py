"""
Two-Factor Authentication (2FA) Router
Supports: Email OTP and TOTP (Google Authenticator)
"""
import os
import io
import base64
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

import pyotp
import qrcode
from qrcode.image.pure import PyPNGImage

from dependencies import db
from auth import get_current_user, create_access_token
from email_service import send_email

router = APIRouter(prefix="/2fa", tags=["Two-Factor Authentication"])
logger = logging.getLogger(__name__)

# =====================================================
# MODELS
# =====================================================

class Setup2FARequest(BaseModel):
    method: str = Field(..., pattern="^(email|totp)$")  # "email" or "totp"

class Verify2FARequest(BaseModel):
    code: str
    user_id: Optional[str] = None  # For login flow
    temp_token: Optional[str] = None  # Temporary token from login

class Disable2FARequest(BaseModel):
    password: str
    code: str  # Current 2FA code to confirm

class LoginWith2FARequest(BaseModel):
    temp_token: str
    code: str


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def generate_totp_secret() -> str:
    """Generate a new TOTP secret"""
    return pyotp.random_base32()


def generate_totp_uri(secret: str, email: str, issuer: str = "ACTOOS PRO") -> str:
    """Generate TOTP provisioning URI for QR code"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def verify_totp_code(secret: str, code: str) -> bool:
    """Verify a TOTP code"""
    totp = pyotp.TOTP(secret)
    # Allow 1 window tolerance for time drift
    return totp.verify(code, valid_window=1)


def generate_email_otp() -> str:
    """Generate a 6-digit OTP for email"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def generate_qr_code_base64(uri: str) -> str:
    """Generate QR code as base64 PNG"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


async def send_2fa_email(email: str, code: str, action: str = "connexion") -> bool:
    """Send 2FA code via email"""
    try:
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #059669; margin: 0;">ACTOOS PRO</h1>
                <p style="color: #6b7280;">Authentification à deux facteurs</p>
            </div>
            
            <h2 style="color: #1f2937;">Votre code de vérification</h2>
            
            <p>Utilisez ce code pour compléter votre {action} :</p>
            
            <div style="background: #f0fdf4; border: 2px solid #059669; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #059669; font-family: monospace;">
                    {code}
                </span>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>⚠️ Important :</strong><br>
                    • Ce code expire dans <strong>5 minutes</strong><br>
                    • Ne partagez jamais ce code avec qui que ce soit<br>
                    • ACTOOS ne vous demandera jamais ce code par téléphone
                </p>
            </div>
            
            <p style="color: #6b7280; font-size: 13px;">
                Si vous n'avez pas initié cette demande, ignorez cet email et sécurisez votre compte.
            </p>
        </div>
        """
        
        await send_email(
            to_email=email,
            subject=f"[ACTOOS PRO] Code de vérification : {code}",
            html_content=html_content
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send 2FA email: {e}")
        return False


# =====================================================
# SETUP ENDPOINTS
# =====================================================

@router.get("/status")
async def get_2fa_status(current_user: dict = Depends(get_current_user)):
    """Get current 2FA status for user"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {
        "enabled": user.get("2fa_enabled", False),
        "method": user.get("2fa_method"),  # "email" or "totp"
        "setup_at": user.get("2fa_setup_at")
    }


@router.post("/setup/start")
async def start_2fa_setup(data: Setup2FARequest, current_user: dict = Depends(get_current_user)):
    """Start 2FA setup process"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.get("2fa_enabled"):
        raise HTTPException(status_code=400, detail="2FA déjà activé. Désactivez-le d'abord.")
    
    if data.method == "totp":
        # Generate TOTP secret
        secret = generate_totp_secret()
        uri = generate_totp_uri(secret, user["email"])
        qr_code = generate_qr_code_base64(uri)
        
        # Store pending secret (not yet verified)
        await db.users.update_one(
            {"id": current_user["user_id"]},
            {"$set": {
                "2fa_pending_secret": secret,
                "2fa_pending_method": "totp",
                "2fa_pending_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "method": "totp",
            "secret": secret,  # For manual entry
            "qr_code": f"data:image/png;base64,{qr_code}",
            "message": "Scannez le QR code avec Google Authenticator ou une app compatible, puis entrez le code pour vérifier."
        }
    
    elif data.method == "email":
        # Generate and send email OTP
        code = generate_email_otp()
        
        # Store pending code
        await db.users.update_one(
            {"id": current_user["user_id"]},
            {"$set": {
                "2fa_pending_code": code,
                "2fa_pending_method": "email",
                "2fa_pending_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Send email
        await send_2fa_email(user["email"], code, "activation du 2FA")
        
        return {
            "method": "email",
            "message": f"Un code de vérification a été envoyé à {user['email'][:3]}***{user['email'][-10:]}"
        }


@router.post("/setup/verify")
async def verify_2fa_setup(data: Verify2FARequest, current_user: dict = Depends(get_current_user)):
    """Verify and complete 2FA setup"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    pending_method = user.get("2fa_pending_method")
    pending_at = user.get("2fa_pending_at")
    
    if not pending_method or not pending_at:
        raise HTTPException(status_code=400, detail="Aucune configuration 2FA en attente")
    
    # Check expiration (10 minutes for setup)
    try:
        setup_time = datetime.fromisoformat(pending_at.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > setup_time + timedelta(minutes=10):
            raise HTTPException(status_code=400, detail="Configuration expirée. Recommencez le processus.")
    except:
        raise HTTPException(status_code=400, detail="Erreur de validation")
    
    # Verify code
    is_valid = False
    
    if pending_method == "totp":
        secret = user.get("2fa_pending_secret")
        if secret:
            is_valid = verify_totp_code(secret, data.code)
    
    elif pending_method == "email":
        pending_code = user.get("2fa_pending_code")
        is_valid = pending_code and pending_code == data.code
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Code invalide")
    
    # Activate 2FA
    update_data = {
        "2fa_enabled": True,
        "2fa_method": pending_method,
        "2fa_setup_at": datetime.now(timezone.utc).isoformat()
    }
    
    if pending_method == "totp":
        update_data["2fa_secret"] = user.get("2fa_pending_secret")
    
    # Clear pending data
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {
            "$set": update_data,
            "$unset": {
                "2fa_pending_secret": "",
                "2fa_pending_code": "",
                "2fa_pending_method": "",
                "2fa_pending_at": ""
            }
        }
    )
    
    # Generate backup codes
    backup_codes = [secrets.token_hex(4) for _ in range(8)]
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {"2fa_backup_codes": backup_codes}}
    )
    
    logger.info(f"2FA enabled for user {current_user['user_id']} via {pending_method}")
    
    return {
        "success": True,
        "method": pending_method,
        "backup_codes": backup_codes,
        "message": "Authentification à deux facteurs activée avec succès. Conservez vos codes de récupération en lieu sûr."
    }


@router.post("/disable")
async def disable_2fa(data: Disable2FARequest, current_user: dict = Depends(get_current_user)):
    """Disable 2FA (requires password and current 2FA code)"""
    from auth import verify_password
    
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if not user.get("2fa_enabled"):
        raise HTTPException(status_code=400, detail="2FA n'est pas activé")
    
    # Verify password
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    
    # Verify 2FA code
    is_valid = False
    method = user.get("2fa_method")
    
    if method == "totp":
        secret = user.get("2fa_secret")
        if secret:
            is_valid = verify_totp_code(secret, data.code)
    elif method == "email":
        # For email method, we need to send a code first
        pending_code = user.get("2fa_disable_code")
        is_valid = pending_code and pending_code == data.code
    
    # Also check backup codes
    if not is_valid:
        backup_codes = user.get("2fa_backup_codes", [])
        if data.code in backup_codes:
            is_valid = True
            # Remove used backup code
            backup_codes.remove(data.code)
            await db.users.update_one(
                {"id": current_user["user_id"]},
                {"$set": {"2fa_backup_codes": backup_codes}}
            )
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Code 2FA invalide")
    
    # Disable 2FA
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {
            "$set": {"2fa_enabled": False},
            "$unset": {
                "2fa_method": "",
                "2fa_secret": "",
                "2fa_setup_at": "",
                "2fa_backup_codes": "",
                "2fa_disable_code": ""
            }
        }
    )
    
    logger.info(f"2FA disabled for user {current_user['user_id']}")
    
    return {"success": True, "message": "Authentification à deux facteurs désactivée"}


@router.post("/send-disable-code")
async def send_disable_code(current_user: dict = Depends(get_current_user)):
    """Send code to disable 2FA (for email method)"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.get("2fa_method") != "email":
        raise HTTPException(status_code=400, detail="Non applicable pour la méthode TOTP")
    
    code = generate_email_otp()
    
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {
            "2fa_disable_code": code,
            "2fa_disable_code_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await send_2fa_email(user["email"], code, "désactivation du 2FA")
    
    return {"message": "Code envoyé par email"}


# =====================================================
# LOGIN VERIFICATION
# =====================================================

@router.post("/send-login-code")
async def send_login_2fa_code(temp_token: str):
    """Send 2FA code for login (email method)"""
    from auth import decode_token
    
    try:
        payload = decode_token(temp_token)
        if payload.get("type") != "2fa_pending":
            raise HTTPException(status_code=400, detail="Token invalide")
    except:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.get("2fa_method") != "email":
        raise HTTPException(status_code=400, detail="Méthode 2FA non email")
    
    code = generate_email_otp()
    
    await db.login_2fa_codes.insert_one({
        "user_id": user["id"],
        "code": code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "used": False
    })
    
    await send_2fa_email(user["email"], code, "connexion")
    
    return {"message": "Code envoyé par email"}


@router.post("/verify-login")
async def verify_login_2fa(data: LoginWith2FARequest):
    """Verify 2FA code and complete login"""
    from auth import decode_token, TokenResponse, UserResponse
    
    try:
        payload = decode_token(data.temp_token)
        if payload.get("type") != "2fa_pending":
            raise HTTPException(status_code=400, detail="Token invalide")
    except:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Verify code
    is_valid = False
    method = user.get("2fa_method")
    
    if method == "totp":
        secret = user.get("2fa_secret")
        if secret:
            is_valid = verify_totp_code(secret, data.code)
    
    elif method == "email":
        # Check stored code
        code_record = await db.login_2fa_codes.find_one({
            "user_id": user["id"],
            "code": data.code,
            "used": False
        })
        
        if code_record:
            # Check expiration
            expires_at = datetime.fromisoformat(code_record["expires_at"].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) <= expires_at:
                is_valid = True
                # Mark as used
                await db.login_2fa_codes.update_one(
                    {"_id": code_record["_id"]},
                    {"$set": {"used": True}}
                )
    
    # Check backup codes if not valid
    if not is_valid:
        backup_codes = user.get("2fa_backup_codes", [])
        if data.code in backup_codes:
            is_valid = True
            backup_codes.remove(data.code)
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"2fa_backup_codes": backup_codes}}
            )
            logger.warning(f"Backup code used for login: user {user['id']}")
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Code invalide")
    
    # Generate real access token
    entreprise = await db.entreprises.find_one({"id": user["entreprise_id"]}, {"_id": 0})
    
    token = create_access_token({
        "sub": user["id"],
        "ent": user["entreprise_id"],
        "role": user["role"]
    })
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"derniere_connexion": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"2FA login successful for user {user['id']}")
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            entreprise_id=user["entreprise_id"],
            email=user["email"],
            nom=user["nom"],
            prenom=user["prenom"],
            telephone=user.get("telephone"),
            role=user["role"],
            statut=user["statut"],
            skills=user.get("skills", []),
            derniere_connexion=datetime.now(timezone.utc).isoformat(),
            created_at=user["created_at"]
        ),
        entreprise=entreprise
    )


@router.get("/backup-codes")
async def get_backup_codes(current_user: dict = Depends(get_current_user)):
    """Get remaining backup codes count"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    if not user or not user.get("2fa_enabled"):
        raise HTTPException(status_code=400, detail="2FA non activé")
    
    backup_codes = user.get("2fa_backup_codes", [])
    
    return {
        "count": len(backup_codes),
        "total": 8
    }


@router.post("/regenerate-backup-codes")
async def regenerate_backup_codes(data: Verify2FARequest, current_user: dict = Depends(get_current_user)):
    """Regenerate backup codes (requires current 2FA code)"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    if not user or not user.get("2fa_enabled"):
        raise HTTPException(status_code=400, detail="2FA non activé")
    
    # Verify current code
    is_valid = False
    method = user.get("2fa_method")
    
    if method == "totp":
        secret = user.get("2fa_secret")
        if secret:
            is_valid = verify_totp_code(secret, data.code)
    elif method == "email":
        pending_code = user.get("2fa_pending_code")
        is_valid = pending_code and pending_code == data.code
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Code invalide")
    
    # Generate new backup codes
    backup_codes = [secrets.token_hex(4) for _ in range(8)]
    
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {"2fa_backup_codes": backup_codes}}
    )
    
    return {
        "backup_codes": backup_codes,
        "message": "Nouveaux codes de récupération générés. Les anciens codes ne sont plus valides."
    }
