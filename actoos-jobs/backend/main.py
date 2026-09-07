import traceback
from fastapi import FastAPI, HTTPException, Request, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Union
import os
import stripe
from dotenv import load_dotenv
import resend
import httpx
import base64
from pathlib import Path
import json
from datetime import datetime, timedelta, timezone
import uuid
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
import re
import unicodedata
import time
import hashlib

LOGO_URL = "https://anfamlpwootbrzswnpyp.supabase.co/storage/v1/object/public/logos/actoos.png"

FOOTER_TRANSLATIONS = {
    "fr": "Actoos Jobs – Tous droits réservés",
    "en": "Actoos Jobs – All rights reserved",
    "es": "Actoos Jobs – Todos los derechos reservados",
    "ar": "Actoos Jobs – جميع الحقوق محفوظة",
    "it": "Actoos Jobs – Tutti i diritti riservati",
    "de": "Actoos Jobs – Alle Rechte vorbehalten",
    "nl": "Actoos Jobs – Alle rechten voorbehouden",
    "pt": "Actoos Jobs – Todos os direitos reservados"
}

STATUS_TRANSLATIONS = {
    "fr": {
        "viewed": "consultée",
        "shortlisted": "présélectionnée",
        "interview": "invité à un entretien",
        "accepted": "acceptée",
        "rejected": "n'a pas été retenue",
        "pending": "en attente"
    },
    "en": {
        "viewed": "viewed",
        "shortlisted": "shortlisted",
        "interview": "invited for an interview",
        "accepted": "accepted",
        "rejected": "has not been retained",
        "pending": "pending"
    },
    "es": {
        "viewed": "vista",
        "shortlisted": "preseleccionada",
        "interview": "invitado a una entrevista",
        "accepted": "aceptada",
        "rejected": "no ha sido retenida",
        "pending": "pendiente"
    },
    "ar": {
        "viewed": "تم الاطلاع عليها",
        "shortlisted": "تم اختيارها مبدئياً",
        "interview": "مدعو للمقابلة",
        "accepted": "مقبولة",
        "rejected": "لم يتم الاحتفاظ بها",
        "pending": "قيد الانتظار"
    },
    "it": {
        "viewed": "visualizzata",
        "shortlisted": "preselezionata",
        "interview": "invitato a un colloquio",
        "accepted": "accettata",
        "rejected": "non è stata trattenuta",
        "pending": "in sospeso"
    },
    "de": {
        "viewed": "angesehen",
        "shortlisted": "vorausgewählt",
        "interview": "zu einem Vorstellungsgespräch eingeladen",
        "accepted": "angenommen",
        "rejected": "wurde nicht berücksichtigt",
        "pending": "ausstehend"
    },
    "nl": {
        "viewed": "bekeken",
        "shortlisted": "voorlopig geselecteerd",
        "interview": "uitgenodigd voor een sollicitatiegesprek",
        "accepted": "geaccepteerd",
        "rejected": "is niet weerhouden",
        "pending": "in afwachting"
    },
    "pt": {
        "viewed": "visualizada",
        "shortlisted": "pré-selecionada",
        "interview": "convidado para uma entrevista",
        "accepted": "aceita",
        "rejected": "não foi retida",
        "pending": "pendente"
    }
}

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)
print(f"✅ Chargement du .env depuis : {env_path}")
print(f"   STRIPE_SECRET_KEY présente : {'oui' if os.getenv('STRIPE_SECRET_KEY') else 'non'}")
print(f"   RESEND_API_KEY présente : {'oui' if os.getenv('RESEND_API_KEY') else 'non'}")
print(f"   SUPABASE_URL présente : {'oui' if os.getenv('SUPABASE_URL') else 'non'}")
print(f"   SUPABASE_SERVICE_ROLE_KEY présente : {'oui' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'non'}")

# ==================== UTILITAIRES ====================
def slugify(text: str) -> str:
    text = unicodedata.normalize('NFD', text)
    text = text.encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    return text[:80]

def clean_subject(text: str, max_length: int = 50) -> str:
    cleaned = text.replace('\n', ' ').replace('\r', ' ')
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length-3] + '...'
    return cleaned

def get_plan_limit_static(plan, attribute):
    plan_data = PLAN_LIMITS_CONFIG.get(plan, PLAN_LIMITS_CONFIG["free"])
    return plan_data.get(attribute, PLAN_LIMITS_CONFIG["free"][attribute])

# ==================== GESTION DE LA LANGUE (CORRIGÉE) ====================
def get_user_language(email: str = None, request: Request = None) -> str:
    """
    Récupère la langue préférée de l'utilisateur dans l'ordre :
    1. Depuis la colonne `language` de la table `users` (via email)
    2. Depuis le header `Accept-Language` de la requête
    3. Par défaut : 'fr'
    """
    if email:
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if supabase_url and supabase_key:
                headers = {
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}"
                }
                resp = httpx.get(
                    f"{supabase_url}/rest/v1/users?select=language&email=eq.{email}",
                    headers=headers,
                    timeout=3.0
                )
                if resp.status_code == 200:
                    users = resp.json()
                    if users and isinstance(users, list) and len(users) > 0:
                        lang = users[0].get("language")
                        if lang and lang in {"fr", "en", "es", "ar", "it", "de", "nl", "pt"}:
                            print(f"[Langue] Utilisateur {email} → {lang} (depuis Supabase)")
                            return lang
        except Exception as e:
            print(f"[Langue] Erreur lecture Supabase : {e}")

    if request:
        accept_lang = request.headers.get("accept-language", "")
        if accept_lang:
            browser_lang = accept_lang.split(",")[0].split("-")[0].strip()
            if browser_lang in {"fr", "en", "es", "ar", "it", "de", "nl", "pt"}:
                print(f"[Langue] Utilisateur {email} → {browser_lang} (depuis navigateur)")
                return browser_lang

    print(f"[Langue] Utilisateur {email} → fr (par défaut)")
    return "fr"

# ==================== CONSTRUCTION HTML EMAIL ====================
def _build_email_html(body: str, language: str, logo_url: str) -> str:
    footer_text = FOOTER_TRANSLATIONS.get(language, FOOTER_TRANSLATIONS["fr"])
    footer = f"""
    <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="color:#888;font-size:12px;text-align:center;">
        {footer_text}<br>
        <a href="https://jobs.actoos.com" style="color:#1e3a8a;text-decoration:none;">jobs.actoos.com</a>
    </p>
    """
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;margin-bottom:20px;">
            <img src="{logo_url}" alt="Actoos Jobs" style="max-width:150px;height:auto;">
        </div>
        {body}
        {footer}
    </div>
    """

# ==================== ENVOI D'EMAIL MULTILINGUE ====================
EMAIL_TEMPLATES_FILE = Path(__file__).parent / 'email_templates.json'

async def send_translated_email(
    to_email: str,
    template_name: str,
    data: dict,
    language: str = "fr",
    from_name: str = "Actoos Jobs"
):
    if not resend.api_key:
        print("[Email] Clé Resend non configurée")
        return

    try:
        with open(EMAIL_TEMPLATES_FILE, 'r', encoding='utf-8') as f:
            templates = json.load(f)
    except Exception as e:
        print(f"[Email] Erreur chargement templates : {e}")
        return

    template = templates.get(template_name, {}).get(language)
    if not template:
        template = templates.get(template_name, {}).get("fr")
        if not template:
            raise ValueError(f"Template '{template_name}' non trouvé pour la langue {language}")

    try:
        subject = template["subject"].format(**data)
        body = template["body"].format(**data)
    except KeyError as e:
        print(f"[Email] Placeholder manquant : {e}. On le remplace par vide.")
        for key in re.findall(r'\{(\w+)\}', template["body"] + template["subject"]):
            if key not in data:
                data[key] = ""
        subject = template["subject"].format(**data)
        body = template["body"].format(**data)

    subject = ' '.join(subject.split())
    if len(subject) > 200:
        subject = subject[:197] + '...'

    full_html = _build_email_html(body, language, LOGO_URL)

    try:
        resend.Emails.send({
            "from": f"{from_name} <noreply@actoos.com>",
            "to": [to_email],
            "subject": subject,
            "html": full_html
        })
        print(f"[Email] Envoyé avec succès à {to_email} (template: {template_name}, langue: {language})")
    except Exception as e:
        print(f"[Email] Erreur envoi : {e}")

# ==================== APP FASTAPI ====================
app = FastAPI(title="Actoos Jobs API")
BUILD_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
ALLOWED_ORIGINS = ["http://localhost:3000", "https://jobs.actoos.com"]
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
resend.api_key = os.environ.get("RESEND_API_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

SUPPORTED_CURRENCIES = {
    "XOF": "FCFA", "EUR": "EUR", "USD": "USD", "MAD": "MAD",
    "GBP": "GBP", "BRL": "BRL", "ARS": "ARS", "NGN": "NGN",
    "ZAR": "ZAR", "SAR": "SAR", "AED": "AED", "EGP": "EGP",
    "DZD": "DZD", "TND": "TND", "CHF": "CHF", "XAF": "XAF",
    "GNF": "GNF", "CDF": "CDF", "MGA": "MGA"
}
SUBSCRIPTION_PLANS = {
    "pro_monthly": {"amount": 49000, "name": "Plan Pro - Mensuel", "type": "subscription", "interval": "month"},
    "pro_annual": {"amount": 470400, "name": "Plan Pro - Annuel (-20%)", "type": "subscription", "interval": "year"},
    "business_monthly": {"amount": 84618, "name": "Plan Business - Mensuel", "type": "subscription", "interval": "month"},
    "business_annual": {"amount": 812110, "name": "Plan Business - Annuel (-20%)", "type": "subscription", "interval": "year"},
}
BOOST_PACKAGES = {
    "boost_7": {"amount": 9990, "name": "Boost 7 jours", "days": 7},
    "boost_14": {"amount": 17990, "name": "Boost 14 jours", "days": 14},
    "boost_30": {"amount": 29990, "name": "Boost 30 jours", "days": 30},
    "featured": {"amount": 49990, "name": "À la une (30 jours)", "days": 30},
}
payment_transactions = {}
PLAN_LIMITS_CONFIG = {
    "free": {"jobs": 3, "members": 1, "expiration_days": 15},
    "pro": {"jobs": 25, "members": 5, "expiration_days": 30},
    "business": {"jobs": float("inf"), "members": float("inf"), "expiration_days": 60},
    "enterprise": {"jobs": float("inf"), "members": float("inf"), "expiration_days": 90},
}

# ==================== MODÈLES ====================
class CheckoutRequest(BaseModel):
    user_id: str
    company_id: str
    package_id: str
    origin_url: str
    job_id: Optional[str] = None
    user_email: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    preferred_currency: Optional[str] = "XOF"

class ContactRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str
    language: Optional[str] = "fr"

class NewsletterRequest(BaseModel):
    email: str
    language: Optional[str] = "fr"

class AIAgentRequest(BaseModel):
    agent_id: str
    text: str
    context: Optional[Union[str, dict]] = None
    language: Optional[str] = "fr"

class CancelSubscriptionRequest(BaseModel):
    user_id: str
    company_id: str
    reason: Optional[str] = None

class SendInterviewLinkRequest(BaseModel):
    email: str
    candidate_name: str
    job_title: str
    meeting_link: str
    company_name: Optional[str] = ""
    language: Optional[str] = "fr"

class SendInterviewDetailsRequest(BaseModel):
    email: str
    candidate_name: str
    job_title: str
    meeting_link: str
    interview_date: str
    interview_time: str
    company_name: Optional[str] = ""
    language: Optional[str] = "fr"

class CancelInterviewRequest(BaseModel):
    application_id: str
    candidate_email: str
    candidate_name: str
    job_title: str
    company_name: Optional[str] = ""
    language: Optional[str] = "fr"
    reason: Optional[str] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None

class UploadRequest(BaseModel):
    bucket: str
    folder: str
    filename: str
    file_data: str

class UploadDocumentRequest(BaseModel):
    file_data: str
    filename: str
    file_type: str = 'other'

class NotifyNewApplicationRequest(BaseModel):
    recruiter_email: str
    recruiter_name: str
    candidate_name: str
    job_title: str
    company_name: Optional[str] = ""
    language: Optional[str] = "fr"

class NotifyStatusChangeRequest(BaseModel):
    candidate_email: str
    candidate_name: str
    job_title: str
    new_status: str
    company_name: Optional[str] = ""
    reason: Optional[str] = None
    language: Optional[str] = "fr"

class AdminNewsletterRequest(BaseModel):
    subject: str
    content: str
    language: Optional[str] = "fr"

class AdminActionRequest(BaseModel):
    id: str
    reason: Optional[str] = ""
    language: Optional[str] = "fr"

class AdminVerifyCompanyRequest(BaseModel):
    id: str
    language: Optional[str] = "fr"

class ReportRequest(BaseModel):
    user_id: str
    reported_item_type: str
    reported_item_id: str
    reason: str

class AdminToggleUserStatusRequest(BaseModel):
    user_id: str
    is_active: bool
    language: Optional[str] = "fr"

class AdminBanUserRequest(BaseModel):
    user_id: str
    reason: Optional[str] = ""
    language: Optional[str] = "fr"

class NewCompanyNotificationRequest(BaseModel):
    company_name: str
    owner_email: str
    owner_name: str
    language: Optional[str] = "fr"

class NotifyAdminNewJobRequest(BaseModel):
    job_title: str
    company_name: str
    company_email: str
    language: Optional[str] = "fr"

class BlogGenerateRequest(BaseModel):
    title: str
    keywords: Optional[str] = ""
    audience: Optional[str] = "all"
    category: Optional[str] = "Carrière"
    read_time: Optional[str] = "5 min"
    author: Optional[str] = "Équipe Actoos"
    icon: Optional[str] = "FileText"
    color: Optional[str] = "blue"

class BlogUpdateRequest(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    audience: Optional[str] = None
    read_time: Optional[str] = None
    author: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class UpdatePlanFromSessionRequest(BaseModel):
    session_id: str

class AdminSuspendUserRequest(BaseModel):
    user_id: str
    duration_days: Optional[int] = None
    reason: Optional[str] = None
    language: Optional[str] = "fr"

class AdminSuspendCompanyRequest(BaseModel):
    id: str
    reason: Optional[str] = ""
    duration_days: Optional[int] = None
    language: Optional[str] = "fr"

class AdminSendMessagesRequest(BaseModel):
    recipient_ids: list[str]
    subject: str
    content: str
    expire_value: Optional[int] = None
    expire_unit: Optional[str] = None
    language: Optional[str] = "fr"

class AdminUpdateMessageRequest(BaseModel):
    subject: Optional[str] = None
    content: Optional[str] = None
    expire_value: Optional[int] = None
    expire_unit: Optional[str] = None

class RoleChangeRequestRequest(BaseModel):
    requested_role: str
    reason: Optional[str] = None

class AdminHandleRoleRequest(BaseModel):
    request_id: str
    action: str
    admin_message: Optional[str] = None
    language: Optional[str] = "fr"

class NotifyAdminRoleRequest(BaseModel):
    user_email: str
    user_name: str
    current_role: str
    requested_role: str

class SendRoleChangeEmailRequest(BaseModel):
    email: str
    first_name: str
    action: str
    requested_role: str
    admin_message: Optional[str] = None

class TeamInviteRequest(BaseModel):
    company_id: str
    user_id: str
    email: str
    role: str = "recruiter"
    language: Optional[str] = "fr"

class TeamUpdateRoleRequest(BaseModel):
    user_id: str
    role: str

class TeamRemoveRequest(BaseModel):
    company_id: str
    user_id: str

class TeamLeaveRequest(BaseModel):
    company_id: str
    user_id: str

class AcceptInvitationRequest(BaseModel):
    token: str
    user_id: str

class AdminDeleteUserRequest(BaseModel):
    language: Optional[str] = "fr"

class AdminDeleteJobRequest(BaseModel):
    language: Optional[str] = "fr"

class AdminDeleteCompanyRequest(BaseModel):
    language: Optional[str] = "fr"

class CompanyDeleteRequest(BaseModel):
    company_id: str
    language: Optional[str] = "fr"

class NotifyJobApprovedRequest(BaseModel):
    email: str
    first_name: str
    job_title: str
    language: Optional[str] = "fr"

class NotifyJobReactivatedRequest(BaseModel):
    email: str
    first_name: str
    job_title: str
    language: Optional[str] = "fr"

class NotifyAcceptedCandidateRequest(BaseModel):
    candidate_email: str
    candidate_name: str
    job_title: str
    company_name: Optional[str] = ""
    message: Optional[str] = None
    language: Optional[str] = "fr"

class RequestDocumentsRequest(BaseModel):
    application_id: str
    candidate_email: str
    candidate_name: str
    job_title: str
    company_name: Optional[str] = ""
    document_types: list[str] = ['contract', 'id_card', 'diploma']
    message: Optional[str] = None
    language: Optional[str] = "fr"

class UploadDocumentRequest(BaseModel):
    application_id: str
    document_type: str
    file_data: str
    filename: str

class NotifyDocumentValidationRequest(BaseModel):
    candidate_email: str
    candidate_name: str
    document_type: str
    language: Optional[str] = "fr"

class NotifyDocumentRejectedRequest(BaseModel):
    candidate_email: str
    candidate_name: str
    document_type: str
    reason: Optional[str] = None
    language: Optional[str] = "fr"

class FinalizeHiringRequest(BaseModel):
    application_id: str
    message: Optional[str] = None
    language: Optional[str] = "fr"

class NotifyOtherCandidatesRequest(BaseModel):
    application_id: str
    message: Optional[str] = None
    language: Optional[str] = "fr"

class ProposeInterviewRequest(BaseModel):
    application_id: str
    company_id: str
    duration_minutes: int = 30
    date_start: str
    date_end: str
    time_start: str
    time_end: str
    message: Optional[str] = None
    language: Optional[str] = "fr"

class CancelInterviewRequest(BaseModel):
    application_id: str
    company_id: str
    language: Optional[str] = "fr"

class FinishInterviewRequest(BaseModel):
    application_id: str
    company_id: str
    language: Optional[str] = "fr"

class CalcomBookingWebhook(BaseModel):
    triggerEvent: str
    payload: dict

# ==================== IA AGENTS ====================
AGENT_PROMPTS = {
    "job-description": "Tu es un expert en recrutement au Mali. Améliore le texte suivant pour une offre d'emploi. Rend-le attractif, clair, bien structuré, et inclusif. Retourne uniquement le texte amélioré, sans commentaire.",
    "job-title": "Génère 3 titres d'offre d'emploi accrocheurs (maximum 10 mots chacun) à partir de la description suivante. Retourne les titres sous forme de liste numérotée, sans commentaire.",
    "job-requirements": "Reformule la section 'Profil recherché' ou 'Compétences requises' suivante de manière professionnelle, en utilisant des verbes d'action. Retourne uniquement le texte reformulé.",
    "job-missions": "Reformule la liste des missions ou responsabilités du poste ci-dessous en les rendant dynamiques et motivantes. Retourne uniquement le texte reformulé.",
    "cv-summary": "Tu es un coach en carrière. Résume en 2-3 phrases percutantes le profil candidat ci-dessous, en mettant en avant ses compétences et sa valeur ajoutée. Retourne uniquement le résumé, sans commentaire.",
    "cv-experience": "Reformule l'expérience professionnelle suivante en utilisant des verbes d'action et en quantifiant les résultats. Garde le même sens mais rends-le plus impactant. Retourne uniquement la version reformulée.",
    "cv-skills": "À partir de la description d'expérience ou du texte suivant, extrais et suggère une liste de compétences clés pertinentes (5 à 10 compétences). Retourne la liste sous forme de puces, sans commentaire.",
    "cover-letter": "Rédige une lettre de motivation professionnelle et personnalisée en français, basée sur le profil du candidat et l'offre d'emploi fournis. Structure la lettre avec : introduction, motivation, compétences, conclusion. Adapte le ton à l'entreprise et au poste. Retourne uniquement la lettre.",
    "interview-questions": "Génère 5 à 7 questions d'entretien probables basées sur l'offre d'emploi et le profil du candidat. Alterne entre questions techniques, comportementales et de motivation. Retourne une liste numérotée.",
    "interview-answers": "Pour chaque question d'entretien fournie, propose une réponse type structurée et convaincante. Utilise la méthode STAR quand c'est pertinent. Retourne les questions et les réponses.",
    "interview-tips": "Donne des conseils personnalisés pour réussir l'entretien ciblant ce poste spécifique. Inclus des recommandations sur la tenue, le langage corporel, les questions à poser, et les points à mettre en avant. Maximum 5 conseils. Retourne une liste à puces.",
    "cv-analysis": "Tu es un expert en recrutement et en rédaction de CV. Analyse le CV suivant et donne 3 à 5 suggestions concrètes pour l'améliorer, sans le réécrire. Mentionne les points faibles, les incohérences, et les éléments manquants. Sois constructif. Retourne uniquement les suggestions, sous forme de liste à puces.",
    "blog-post": (
        "Tu es un rédacteur professionnel spécialisé en emploi et recrutement à l'international. "
        "Rédige un article de blog complet sur le sujet donné. "
        "Ne mentionne aucun pays, aucune ville, aucun continent, aucune région, aucune devise spécifique. "
        "Si un exemple géographique est nécessaire, utilise 'un pays' ou 'une région' sans précision. "
        "Structure la réponse en HTML avec des titres <h2>, des paragraphes <p>, des listes <ul>. "
        "Fournis également un extrait (2 phrases) et une catégorie pertinente. "
        "Format de réponse JSON : {\"title\":\"...\", \"excerpt\":\"...\", \"content\":\"...\", \"category\":\"...\"}"
    ),
    "translator": "Tu es un traducteur professionnel. Traduis le texte suivant en {language}. Retourne uniquement la traduction, sans commentaire.",
    "job-full-generation": (
        "Tu es un expert en recrutement. À partir du titre d'offre suivant, génère une offre d'emploi complète pour le pays {pays} avec la devise {devise}. "
        "Utilise les catégories disponibles : {categories}. "
        "Retourne uniquement un JSON valide (pas de texte autour) avec les clés suivantes : "
        "title, description, requirements, responsibilities, benefits, category_slug (un slug parmi ceux fournis), "
        "contract_type (cdi, cdd, freelance, stage, alternance), experience_level (junior, intermediaire, senior, expert), "
        "salary_min (nombre entier, en {devise}), salary_max (nombre entier, en {devise}), "
        "is_remote (true/false), skills_required (liste de 5 à 10 compétences), city_name (optionnel). "
        "Adapte le salaire au marché local pour ce poste dans ce pays."
    ),
}
AGENT_PROMPTS_EN = {
    "job-title": "Generate 3 catchy job offer titles (maximum 10 words each) based on the following description. Return the titles as a numbered list, with no comment.",
    "job-description": "You are a recruitment expert. Improve the following job offer text. Make it attractive, clear, well-structured and inclusive. Return only the improved text, with no comment.",
    "job-requirements": "Reformulate the following 'Candidate profile' or 'Required skills' section in a professional manner, using action verbs. Return only the reformulated text.",
    "job-missions": "Reformulate the list of missions or responsibilities below, making them dynamic and motivating. Return only the reformulated text.",
    "cv-summary": "You are a career coach. Summarize the candidate profile below in 2-3 impactful sentences, highlighting skills and added value. Return only the summary, with no comment.",
    "cv-experience": "Reformulate the following professional experience using action verbs and quantifying results. Keep the same meaning but make it more impactful. Return only the reformulated version.",
    "cv-skills": "From the experience description or text below, extract and suggest a list of relevant key skills (5 to 10 skills). Return the list as bullet points, with no comment.",
    "cover-letter": "Write a professional and personalized cover letter, based on the candidate's profile and the job offer provided. Structure the letter with: introduction, motivation, skills, conclusion. Adapt the tone to the company and position. Return only the letter.",
    "interview-questions": "Generate 5 to 7 likely interview questions based on the job offer and candidate profile. Alternate between technical, behavioral and motivational questions. Return a numbered list.",
    "interview-answers": "For each interview question provided, propose a structured and convincing answer. Use the STAR method when relevant. Return the questions and answers.",
    "interview-tips": "Give personalized tips to succeed in the interview targeting this specific position. Include recommendations on dress, body language, questions to ask, and points to highlight. Maximum 5 tips. Return a bullet list.",
    "cv-analysis": "You are an expert in recruitment and CV writing. Analyze the following CV and give 3 to 5 concrete suggestions for improvement, without rewriting it. Mention weaknesses, inconsistencies, and missing elements. Be constructive. Return only the suggestions, as a bullet list.",
    "blog-post": (
        "You are a professional writer specialized in international employment and recruitment. "
        "Write a complete blog post on the given topic. "
        "Do not mention any specific country, city, continent, region, or currency. "
        "If a geographic example is necessary, use 'a country' or 'a region' without details. "
        "Structure the answer in HTML with <h2> titles, <p> paragraphs, <ul> lists. "
        "Also provide an excerpt (2 sentences) and a relevant category. "
        "JSON response format: {\"title\":\"...\", \"excerpt\":\"...\", \"content\":\"...\", \"category\":\"...\"}."
    ),
    "job-full-generation": (
        "You are a recruitment expert. Based on the following job title, generate a complete job offer for the country {country} with the currency {currency}. "
        "Use the available categories: {categories}. "
        "Return only a valid JSON (no extra text) with the following keys: "
        "title, description, requirements, responsibilities, benefits, category_slug (one of the provided slugs), "
        "contract_type (cdi, cdd, freelance, stage, alternance), experience_level (junior, intermediaire, senior, expert), "
        "salary_min (integer, in {currency}), salary_max (integer, in {currency}), "
        "is_remote (true/false), skills_required (list of 5-10 skills), city_name (optional). "
        "Adapt the salary to the local market for this position in this country."
    ),
}
FALLBACK_MODELS = [
    "mistralai/mistral-7b-instruct:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-2-13b-chat:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "openai/gpt-3.5-turbo",
]
LANG_NAMES = {
    "en": "anglais", "it": "italien", "ar": "arabe", "de": "allemand",
    "nl": "néerlandais", "pt": "portugais", "es": "espagnol"
}

def get_local_salary_stats(country: str, category_slug: str):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        return None
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    payload = {"p_country": country, "p_category_slug": category_slug}
    try:
        resp = httpx.post(
            f"{supabase_url}/rest/v1/rpc/get_salary_stats",
            json=payload,
            headers=headers
        )
        if resp.status_code == 200 and resp.json():
            return resp.json()[0]
    except Exception as e:
        print(f"[Stats] Erreur récupération stats: {e}")
    return None

@app.post("/api/ai/agent")
async def ai_agent(req: AIAgentRequest, request: Request = None):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
    target_language = req.language or "fr"
    max_tokens = 800

    if req.agent_id == "job-full-generation":
        ctx = req.context if isinstance(req.context, dict) else {}
        country = ctx.get("country", "non spécifié")
        currency = ctx.get("currency", "XOF")
        categories = ctx.get("categories", [])
        categories_str = ", ".join(categories) if categories else "général"
        if target_language != "fr":
            system_prompt = AGENT_PROMPTS_EN.get("job-full-generation", AGENT_PROMPTS["job-full-generation"])
            system_prompt = system_prompt.replace("{country}", country).replace("{currency}", currency).replace("{categories}", categories_str)
            lang_name = LANG_NAMES.get(target_language, "anglais")
            user_text = f"Job title: {req.text}\nGenerate the complete job offer in {lang_name}."
        else:
            system_prompt = AGENT_PROMPTS["job-full-generation"]
            system_prompt = system_prompt.replace("{pays}", country).replace("{devise}", currency).replace("{categories}", categories_str)
            user_text = f"Titre de l'offre : {req.text}\nGénère l'offre complète en français."
        if categories:
            stats = get_local_salary_stats(country, categories[0])
            if stats and stats.get("count_rows", 0) > 2:
                salary_hint = (
                    f" IMPORTANT : Pour ce poste dans ce pays, les salaires observés via les corrections d'utilisateurs sont "
                    f"strictement compris entre {int(stats['avg_salary_min'])} et {int(stats['avg_salary_max'])} {currency}. "
                    f"Tu dois absolument utiliser cette fourchette pour les champs salary_min et salary_max, sans la dépasser."
                )
                user_text += salary_hint
    elif req.agent_id == "translator":
        system_prompt = AGENT_PROMPTS.get("translator")
        if not system_prompt:
            raise HTTPException(status_code=400, detail="Agent traducteur non configuré")
        lang_name = LANG_NAMES.get(target_language, "anglais")
        system_prompt = system_prompt.replace("{language}", lang_name)
        user_text = f"Texte à traduire :\n\n{req.text}"
        if req.context:
            user_text += f"\n\nContexte supplémentaire : {req.context}"
        max_tokens = 300
    elif target_language != "fr" and req.agent_id in AGENT_PROMPTS_EN:
        system_prompt = AGENT_PROMPTS_EN[req.agent_id]
        lang_name = LANG_NAMES.get(target_language, "anglais")
        user_text = f"Improve the following text and answer in {lang_name}:\n\n{req.text}"
        if req.context:
            user_text += f"\n\nAdditional context: {req.context}"
    else:
        system_prompt = AGENT_PROMPTS.get(req.agent_id)
        if not system_prompt:
            raise HTTPException(status_code=400, detail="Invalid agent_id")
        user_text = f"Texte à améliorer :\n\n{req.text}"
        if req.context:
            user_text += f"\n\nContexte supplémentaire : {req.context}"
        user_text += "\n\nRéponds en français uniquement."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text}
    ]
    last_error = None
    for model in FALLBACK_MODELS:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "HTTP-Referer": "https://jobs.actoos.com",
                        "X-Title": "Actoos Jobs AI"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": max_tokens
                    }
                )
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    improved_text = data["choices"][0]["message"]["content"].strip()
                    if req.agent_id == "job-full-generation":
                        try:
                            generated_json = json.loads(improved_text)
                            if categories:
                                stats = get_local_salary_stats(country, categories[0])
                                if stats and stats.get("count_rows", 0) > 2:
                                    if "salary_min" in generated_json:
                                        generated_json["salary_min"] = int(stats["avg_salary_min"])
                                    if "salary_max" in generated_json:
                                        generated_json["salary_max"] = int(stats["avg_salary_max"])
                            improved_text = json.dumps(generated_json, ensure_ascii=False)
                        except Exception:
                            pass
                    return {
                        "success": True,
                        "result": improved_text,
                        "model_used": model
                    }
                if data.get("error", {}).get("code") == 429:
                    continue
                last_error = data
        except Exception as e:
            print(f"[IA] Erreur avec {model}: {str(e)}")
            continue
    raise HTTPException(status_code=502, detail=f"Tous les modèles ont échoué. Dernière erreur : {last_error}")

# ==================== CACHE BLOG ====================
BLOG_FILE = Path(__file__).parent / 'data' / 'blog.json'
def load_blog_posts():
    if not BLOG_FILE.exists():
        return []
    with open(BLOG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)
def save_blog_posts(posts):
    BLOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(BLOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=2, ensure_ascii=False, default=str)

_blog_cache = {"posts": None, "timestamp": 0}
def get_blog_posts_cached():
    if time.time() - _blog_cache["timestamp"] > 300:
        _blog_cache["posts"] = load_blog_posts()
        _blog_cache["timestamp"] = time.time()
    return _blog_cache["posts"]
def invalidate_blog_cache():
    _blog_cache["timestamp"] = 0

# ==================== AUTH / ROLES ====================
async def get_current_active_user(request: Request) -> str:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Non authentifié")
    token = auth_header.replace("Bearer ", "")
    user_resp = httpx.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}"}
    )
    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    user_id = user_resp.json()["id"]
    return user_id

def get_user_role_in_company(user_id: str, company_id: str) -> str:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    owner_check = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{user_id}&select=id",
        headers=headers
    )
    if owner_check.json():
        return "owner"
    member_check = httpx.get(
        f"{supabase_url}/rest/v1/company_members?company_id=eq.{company_id}&user_id=eq.{user_id}&select=role",
        headers=headers
    )
    members = member_check.json()
    if members:
        return members[0]["role"]
    return None

def planHasFeature(plan: str, feature: str) -> bool:
    features = {
        "free": ["basicJobs"],
        "pro": ["basicJobs", "canUseInterviewTools"],
        "business": ["basicJobs", "canUseInterviewTools", "canAccessCvBank", "canCreateMultipleCompanies"],
        "enterprise": ["basicJobs", "canUseInterviewTools", "canAccessCvBank", "canCreateMultipleCompanies"],
    }
    return feature in features.get(plan, [])

def set_user_entities_status(user_id: str, active: bool):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    companies_resp = httpx.get(
        f"{supabase_url}/rest/v1/companies?owner_id=eq.{user_id}&select=id",
        headers=headers
    )
    companies = companies_resp.json()
    for company in companies:
        company_id = company["id"]
        httpx.patch(
            f"{supabase_url}/rest/v1/companies?id=eq.{company_id}",
            json={"is_active": active, "suspended_until": None},
            headers=headers
        )
        if not active:
            jobs_resp = httpx.get(
                f"{supabase_url}/rest/v1/jobs?company_id=eq.{company_id}&status=eq.active&select=id",
                headers=headers
            )
            for job in jobs_resp.json():
                httpx.patch(
                    f"{supabase_url}/rest/v1/jobs?id=eq.{job['id']}",
                    json={"status": "suspended"},
                    headers=headers
                )
        else:
            jobs_resp = httpx.get(
                f"{supabase_url}/rest/v1/jobs?company_id=eq.{company_id}&status=eq.suspended&select=id",
                headers=headers
            )
            for job in jobs_resp.json():
                httpx.patch(
                    f"{supabase_url}/rest/v1/jobs?id=eq.{job['id']}",
                    json={"status": "active"},
                    headers=headers
                )
    try:
        httpx.post(
            f"{supabase_url}/auth/v1/admin/users/{user_id}/sessions/logout",
            headers=headers
        )
    except Exception as e:
        print(f"Erreur déconnexion sessions: {e}")

# ==================== ENDPOINTS PUBLICS ====================
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "actoos-jobs-api", "currency": "XOF"}

@app.get("/api/pricing")
async def get_pricing():
    return {"subscriptions": SUBSCRIPTION_PLANS, "boosts": BOOST_PACKAGES, "currency": "XOF"}

@app.get("/api/config/currencies")
async def get_currencies():
    return {"currencies": SUPPORTED_CURRENCIES, "default": "XOF"}

# ==================== STRIPE ====================
@app.post("/api/checkout/session")
async def create_checkout_session(checkout_request: CheckoutRequest, request: Request):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    user_id = checkout_request.user_id
    company_id = checkout_request.company_id
    if not user_id or not company_id:
        raise HTTPException(status_code=400, detail="user_id et company_id requis")
    package_id = checkout_request.package_id
    if package_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid package")
    package = SUBSCRIPTION_PLANS[package_id]
    currency = (checkout_request.preferred_currency or "XOF").upper()
    if currency not in SUPPORTED_CURRENCIES:
        currency = "XOF"
    RATES_TO_XOF = {
        "XOF": 1, "EUR": 655.957, "USD": 603.5, "MAD": 60.5,
        "GBP": 754.2, "BRL": 115.3, "ARS": 0.72, "NGN": 0.4, "ZAR": 32.5,
        "SAR": 160.9, "AED": 164.3, "EGP": 19.5, "DZD": 4.48, "TND": 194.5,
        "CHF": 722.3, "XAF": 1, "GNF": 0.07, "CDF": 0.22, "MGA": 0.15
    }
    rate = RATES_TO_XOF.get(currency, 1)
    amount_fcfa = package["amount"]
    converted_amount = round(amount_fcfa / rate)
    if currency in ("EUR", "USD", "GBP", "MAD", "BRL", "ARS", "NGN", "ZAR",
                    "SAR", "AED", "EGP", "DZD", "TND", "CHF"):
        converted_amount = converted_amount * 100
    line_item = {
        'price_data': {
            'currency': currency.lower(),
            'product_data': {'name': package["name"]},
            'unit_amount': converted_amount,
            'recurring': {'interval': package["interval"]},
        },
        'quantity': 1,
    }
    origin = checkout_request.origin_url
    success_url = f"{origin}/paiement/succes?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/paiement/annule"
    metadata = {
        "package_id": package_id,
        "package_name": package["name"],
        "source": "actoos_jobs",
        "user_id": user_id,
        "company_id": company_id,
        "billing_cycle": "annual" if "annual" in package_id else "monthly"
    }
    if checkout_request.job_id:
        metadata["job_id"] = checkout_request.job_id
    if checkout_request.user_email:
        metadata["user_email"] = checkout_request.user_email
    if checkout_request.metadata:
        metadata.update(checkout_request.metadata)
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    discounts = None
    if supabase_url and supabase_key:
        headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{user_id}&select=id,subscription_plan,launch_coupon_used",
            headers=headers
        )
        companies = company_resp.json()
        if not companies:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée ou non autorisée")
        company = companies[0]
        current_plan = company.get("subscription_plan", "free")
        launch_used = company.get("launch_coupon_used", False)
        target_plan = "free"
        if "pro" in package_id:
            target_plan = "pro"
        elif "business" in package_id:
            target_plan = "business"
        plan_rank = {"free": 0, "pro": 1, "business": 2, "enterprise": 3}
        if plan_rank.get(target_plan, 0) < plan_rank.get(current_plan, 0):
            jobs_resp = httpx.get(
                f"{supabase_url}/rest/v1/jobs?company_id=eq.{company['id']}&status=eq.active&select=id",
                headers={**headers, "Prefer": "count=exact"}
            )
            active_jobs = 0
            if "content-range" in jobs_resp.headers:
                active_jobs = int(jobs_resp.headers["content-range"].split("/")[1])
            target_limit = get_plan_limit_static(target_plan, "jobs")
            if active_jobs > target_limit:
                raise HTTPException(
                    status_code=400,
                    detail=f"DOWNGRADE_BLOCKED:{active_jobs}:{target_limit}"
                )
        if package_id == "business_monthly" and not launch_used:
            discounts = [{"coupon": "ynlMXDgS"}]
        elif package_id == "business_annual" and not launch_used:
            discounts = [{"coupon": "tZOA4q5A"}]
        if discounts is not None:
            try:
                httpx.patch(
                    f"{supabase_url}/rest/v1/companies?id=eq.{company_id}",
                    headers=headers,
                    json={"launch_coupon_used": True}
                )
            except Exception as e:
                print(f"Erreur mise à jour launch_coupon_used: {e}")
    STRIPE_LOCALES = {
        'auto', 'bg', 'cs', 'da', 'de', 'el', 'en', 'en-GB', 'es', 'es-419',
        'et', 'fi', 'fil', 'fr', 'fr-CA', 'hr', 'hu', 'id', 'it', 'ja',
        'ko', 'lt', 'lv', 'ms', 'mt', 'nb', 'nl', 'pl', 'pt', 'pt-BR',
        'ro', 'ru', 'sk', 'sl', 'sv', 'th', 'tr', 'vi', 'zh', 'zh-HK', 'zh-TW'
    }
    user_language = get_user_language(email=checkout_request.user_email or "", request=request)
    stripe_locale = user_language if user_language in STRIPE_LOCALES else 'auto'
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[line_item],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            locale=stripe_locale,
            discounts=discounts,
        )
        payment_transactions[session.id] = {
            "session_id": session.id,
            "package_id": package_id,
            "amount": amount_fcfa,
            "currency": currency.lower(),
            "status": "pending",
            "payment_status": "initiated",
            "metadata": metadata
        }
        return {"url": session.url, "session_id": session.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/checkout/status/{session_id}")
async def get_checkout_status(session_id: str):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session_id in payment_transactions:
            tx = payment_transactions[session_id]
            if tx["payment_status"] != "paid" and session.payment_status == "paid":
                tx["payment_status"] = "paid"
                tx["status"] = "completed"
        return {
            "status": session.status,
            "payment_status": session.payment_status,
            "amount_total": session.amount_total,
            "currency": session.currency,
            "metadata": session.metadata
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        if webhook_secret and sig_header:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            print("⚠️ Webhook secret not configured. Accepting event without verification.")
            event = stripe.Event.construct_from(await request.json(), stripe.api_key)
    except stripe.error.SignatureVerificationError as e:
        print(f"Webhook signature verification failed: {e}")
        return {"received": False, "error": "Signature verification failed"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"received": False, "error": str(e)}
    try:
        if event.type == "checkout.session.completed":
            session = event.data.object
            if session.id in payment_transactions:
                payment_transactions[session.id]["payment_status"] = "paid"
                payment_transactions[session.id]["status"] = "completed"
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if supabase_url and supabase_key and session.metadata:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
                    user_id = session.metadata.get("user_id")
                    package_id = session.metadata.get("package_id")
                    job_id = session.metadata.get("job_id")
                    if user_id and package_id and package_id in SUBSCRIPTION_PLANS:
                        company_id = session.metadata.get("company_id")
                        if not company_id:
                            resp = await client.get(
                                f"{supabase_url}/rest/v1/companies?owner_id=eq.{user_id}&select=id",
                                headers=headers
                            )
                            companies = resp.json()
                            if companies:
                                company_id = companies[0]["id"]
                        if company_id:
                            plan_name = "free"
                            if "pro" in package_id:
                                plan_name = "pro"
                            elif "business" in package_id:
                                plan_name = "business"
                            update_data = {
                                "subscription_plan": plan_name,
                                "stripe_subscription_id": session.subscription,
                                "stripe_customer_id": session.customer,
                                "subscription_expires_at": None,
                                "billing_cycle": session.metadata.get("billing_cycle")
                            }
                            if session.get("total_details") and session["total_details"].get("discounts"):
                                applied_coupons = [d["discount"]["coupon"]["id"] for d in session["total_details"]["discounts"]]
                                launch_coupon_ids = ["N9rSzhf6", "bJA4SCvq"]
                                if any(cid in applied_coupons for cid in launch_coupon_ids):
                                    update_data["launch_coupon_used"] = True
                            await client.patch(
                                f"{supabase_url}/rest/v1/companies?id=eq.{company_id}",
                                json=update_data,
                                headers=headers
                            )
                    if job_id and package_id and package_id in BOOST_PACKAGES:
                        days = BOOST_PACKAGES[package_id]["days"]
                        boosted_until = datetime.utcnow() + timedelta(days=days)
                        await client.patch(
                            f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}",
                            json={"boosted_until": boosted_until.isoformat()},
                            headers=headers
                        )
        elif event.type == "checkout.session.expired":
            session = event.data.object
            if session.id in payment_transactions:
                payment_transactions[session.id]["status"] = "expired"
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if supabase_url and supabase_key and session.metadata:
                company_id = session.metadata.get("company_id")
                if company_id:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
                        await client.patch(
                            f"{supabase_url}/rest/v1/companies?id=eq.{company_id}",
                            json={"launch_coupon_used": False},
                            headers=headers
                        )
    except Exception as e:
        print(f"Webhook processing error: {e}")
        return {"received": True, "error": str(e)}
    return {"received": True}

@app.post("/api/subscription/cancel")
async def cancel_subscription(req: CancelSubscriptionRequest):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    user_id = req.user_id
    company_id = req.company_id
    if not company_id:
        raise HTTPException(status_code=400, detail="company_id requis")
    reason = req.reason
    try:
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{user_id}&select=id,stripe_subscription_id,subscription_plan",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = company_resp.json()
        if not companies:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée ou non autorisée")
        company = companies[0]
        previous_plan = company.get("subscription_plan", "free")
        if previous_plan != "free":
            jobs_resp = httpx.get(
                f"{supabase_url}/rest/v1/jobs?company_id=eq.{company['id']}&status=eq.active&select=id",
                headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}", "Prefer": "count=exact"}
            )
            active_jobs = 0
            if "content-range" in jobs_resp.headers:
                active_jobs = int(jobs_resp.headers["content-range"].split("/")[1])
            free_limit = get_plan_limit_static("free", "jobs")
            if active_jobs > free_limit:
                raise HTTPException(status_code=400, detail=f"DOWNGRADE_BLOCKED:{active_jobs}:{free_limit}")
        subscription_id = company.get("stripe_subscription_id")
        if subscription_id and not subscription_id.startswith("sub_test"):
            try:
                stripe.Subscription.delete(subscription_id)
            except stripe.error.InvalidRequestError as e:
                print(f"Stripe subscription already deleted or invalid: {e}")
        httpx.patch(
            f"{supabase_url}/rest/v1/companies?id=eq.{company['id']}",
            json={
                "stripe_subscription_id": None,
                "subscription_plan": "free",
                "subscription_expires_at": None,
                "cancellation_reason": reason or None,
                "previous_subscription_plan": previous_plan
            },
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        return {"success": True, "message": "Abonnement résilié avec succès."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/stripe/portal")
async def stripe_portal(request: Request):
    data = await request.json()
    user_id = data.get("user_id")
    company_id = data.get("company_id")
    if not user_id or not company_id:
        raise HTTPException(status_code=400, detail="user_id et company_id requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    company_resp = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{user_id}&select=stripe_customer_id",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    companies = company_resp.json()
    if not companies:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée ou non autorisée")
    customer_id = companies[0].get("stripe_customer_id")
    if not customer_id or customer_id.startswith("cus_test"):
        return {"url": "https://jobs.actoos.com/tarifs"}
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url="https://jobs.actoos.com/dashboard/entreprise",
        )
        return {"url": session.url}
    except stripe.error.InvalidRequestError:
        return {"url": "https://jobs.actoos.com/tarifs"}

@app.post("/api/checkout/complete")
async def checkout_complete(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis")
    session = stripe.checkout.Session.retrieve(session_id)
    if session.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Paiement non effectué")
    metadata = session.metadata or {}
    package_id = metadata.get("package_id")
    amount_total = session.amount_total
    currency = session.currency.upper()
    billing_cycle = metadata.get("billing_cycle")
    plan_name = None
    if package_id in SUBSCRIPTION_PLANS:
        user_id = metadata.get("user_id")
        company_id = metadata.get("company_id")
        if not user_id or not company_id:
            raise HTTPException(status_code=400, detail="Métadonnées manquantes")
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{user_id}&select=id",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = company_resp.json()
        if not companies:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée ou non autorisée")
        plan_name = "free"
        if "pro" in package_id:
            plan_name = "pro"
        elif "business" in package_id:
            plan_name = "business"
        update_data = {
            "subscription_plan": plan_name,
            "stripe_subscription_id": session.subscription,
            "stripe_customer_id": session.customer,
            "subscription_expires_at": None,
            "billing_cycle": billing_cycle,
        }
        httpx.patch(
            f"{supabase_url}/rest/v1/companies?id=eq.{company_id}",
            json=update_data,
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
    package_name = metadata.get("package_name") or "Achat"
    is_boost = package_id in BOOST_PACKAGES if package_id else False
    return {
        "success": True,
        "plan": plan_name,
        "planLabel": package_name,
        "amount": amount_total,
        "currency": currency,
        "isBoost": is_boost,
        "billingCycle": billing_cycle,
    }

# ==================== CONTACT & NEWSLETTER ====================
@app.post("/api/contact")
async def contact_form(contact: ContactRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = contact.language or "fr"
        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": ["contact@actoos.com"],
            "reply_to": contact.email,
            "subject": f"[Contact] {contact.subject}",
            "html": f"<h2>Nouveau message de {contact.name}</h2><p><strong>Email :</strong> {contact.email}</p><p><strong>Sujet :</strong> {contact.subject}</p><p><strong>Message :</strong></p><p>{contact.message}</p>"
        })
        data = {"nom": contact.name, "sujet": contact.subject}
        await send_translated_email(contact.email, "contact_confirmation", data, lang)
        return {"success": True, "message": "Votre message a bien été envoyé."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/newsletter")
async def newsletter_subscribe(req: NewsletterRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if supabase_url and supabase_key:
        try:
            resp = httpx.post(
                f"{supabase_url}/rest/v1/newsletter_subscribers",
                json={"email": req.email, "is_active": True},
                headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}", "Prefer": "return=minimal"}
            )
            if resp.status_code == 409:
                return {"success": True, "message": "Vous êtes déjà inscrit."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    try:
        lang = get_user_language(email=destinataire_email) or req.language or "fr"
        await send_translated_email(req.email, "newsletter_subscription", {}, lang)
    except Exception as e:
        print(f"Erreur envoi email bienvenue: {e}")
    return {"success": True, "message": "Inscription réussie."}

@app.get("/api/newsletter/unsubscribe")
async def newsletter_unsubscribe(email: str = Query(...)):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        resp = httpx.get(
            f"{supabase_url}/rest/v1/newsletter_subscribers?email=eq.{email}&is_active=eq.true",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        if resp.status_code != 200 or not resp.json():
            return {"success": False, "message": "Adresse non trouvée ou déjà désabonnée."}
        httpx.patch(
            f"{supabase_url}/rest/v1/newsletter_subscribers?email=eq.{email}",
            json={"is_active": False, "unsubscribed_at": "now()"},
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        return {"success": True, "message": "Vous avez été désabonné avec succès."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/send-newsletter")
async def admin_send_newsletter(req: AdminNewsletterRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        subscribers_resp = httpx.get(
            f"{supabase_url}/rest/v1/newsletter_subscribers?select=email&is_active=eq.true",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        subscribers = subscribers_resp.json()
        if not isinstance(subscribers, list) or len(subscribers) == 0:
            return {"success": True, "message": "Aucun abonné trouvé.", "sent": 0, "total": 0}
        lang = get_user_language(email=destinataire_email) or req.language or "fr"
        success_count = 0
        for sub in subscribers:
            email = sub["email"]
            unsubscribe_link = f"https://jobs.actoos.com/desabonnement?email={email}"
            footer = f'<br><br><hr style="border:0; border-top:1px solid #e2e8f0; margin:24px 0;"><p style="color:#888; font-size:12px;">Vous recevez cet email car vous êtes inscrit à la newsletter. <a href="{unsubscribe_link}" style="display:inline-block;padding:12px 28px;background:#ffffff;color:#1e3a8a;border:1px solid #1e3a8a;border-radius:6px;font-weight:bold;text-decoration:none;text-align:center;font-size:16px;margin:8px 0;">Se désabonner</a></p>'
            html_personalized = req.content + footer
            try:
                resend.Emails.send({
                    "from": "Actoos Jobs <noreply@actoos.com>",
                    "to": [email],
                    "subject": req.subject,
                    "html": html_personalized
                })
                success_count += 1
            except Exception as e:
                print(f"Erreur envoi à {email}: {e}")
        return {
            "success": True,
            "message": "Newsletter envoyée avec succès.",
            "sent": success_count,
            "total": len(subscribers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CANDIDATE PUBLIC PROFILE ====================
@app.get("/api/candidate/{candidate_id}")
async def get_candidate_public_profile(candidate_id: str):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        user_resp = httpx.get(
            f"{supabase_url}/rest/v1/users?id=eq.{candidate_id}&select=id,email,first_name,last_name,phone,avatar_url,is_active,is_banned",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        users = user_resp.json()
        if not users:
            raise HTTPException(status_code=404, detail="Candidat introuvable")
        user = users[0]
        profile_resp = httpx.get(
            f"{supabase_url}/rest/v1/candidate_profiles?user_id=eq.{candidate_id}&select=*",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        profiles = profile_resp.json()
        profile = profiles[0] if profiles else {}
        city = None
        if profile.get("city_id"):
            city_resp = httpx.get(
                f"{supabase_url}/rest/v1/cities?id=eq.{profile['city_id']}&select=name",
                headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
            )
            cities_list = city_resp.json()
            if cities_list:
                city = cities_list[0]["name"]
        result = {
            "id": user["id"],
            "email": user.get("email"),
            "first_name": user.get("first_name") or "",
            "last_name": user.get("last_name") or "",
            "phone": user.get("phone"),
            "avatar_url": user.get("avatar_url"),
            "is_active": user.get("is_active"),
            "is_banned": user.get("is_banned"),
            "title": profile.get("title"),
            "bio": profile.get("bio"),
            "skills": profile.get("skills") or [],
            "experience_level": profile.get("experience_level"),
            "experience": profile.get("experience") or [],
            "education": profile.get("education") or [],
            "languages": profile.get("languages") or [],
            "certifications": profile.get("certifications") or [],
            "linkedin_url": profile.get("linkedin_url"),
            "portfolio_url": profile.get("portfolio_url"),
            "cv_url": profile.get("cv_url"),
            "city": city,
            "desired_salary_min": profile.get("desired_salary_min"),
            "desired_salary_max": profile.get("desired_salary_max"),
            "preferred_contract_types": profile.get("preferred_contract_types") or [],
            "is_available": profile.get("is_available", True),
            "is_open_to_remote": profile.get("is_open_to_remote", False),
            "links": profile.get("links") or [],
        }
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== TEAM MANAGEMENT ====================
@app.get("/api/team/members")
async def get_team_members_v2(company_id: str, user_id: str = Query(...)):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    role = get_user_role_in_company(user_id, company_id)
    if role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    members_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?company_id=eq.{company_id}&select=id,user:users(id,email,first_name,last_name,avatar_url),role,status,invitation_token",
        headers=headers
    )
    raw_members = members_resp.json()
    clean_members = []
    for m in raw_members:
        user_obj = m.get("user")
        if isinstance(user_obj, list) and len(user_obj) > 0:
            user_obj = user_obj[0]
        if not isinstance(user_obj, dict):
            user_obj = {}
        clean_members.append({
            "id": str(m.get("id") or ""),
            "role": str(m.get("role") or "viewer"),
            "status": str(m.get("status") or "active"),
            "user_id": str(m.get("user_id") or ""),
            "invitation_token": str(m.get("invitation_token") or ""),
            "invitation_email": str(m.get("invitation_email") or ""),
            "user": {
                "id": str(user_obj.get("id") or ""),
                "email": str(user_obj.get("email") or ""),
                "first_name": str(user_obj.get("first_name") or ""),
                "last_name": str(user_obj.get("last_name") or ""),
                "avatar_url": str(user_obj.get("avatar_url") or ""),
            }
        })
    return clean_members

@app.post("/api/team/invite")
async def invite_team_member_v2(req: TeamInviteRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    inviter_id = req.user_id
    inviter_role = get_user_role_in_company(inviter_id, req.company_id)
    if inviter_role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent inviter des membres")
    comp_info = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{req.company_id}&select=name",
        headers=headers
    )
    comp_json = comp_info.json()
    company_name = comp_json[0]["name"] if comp_json else ""
    plan_resp = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{req.company_id}&select=subscription_plan",
        headers=headers
    )
    plan = plan_resp.json()[0].get("subscription_plan", "free")
    max_members = get_plan_limit_static(plan, "members")
    count_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?company_id=eq.{req.company_id}&select=id",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}", "Prefer": "count=exact"}
    )
    current_count = 0
    if "content-range" in count_resp.headers:
        current_count = int(count_resp.headers["content-range"].split("/")[1])
    if current_count >= max_members:
        raise HTTPException(status_code=400, detail=f"Limite de {max_members} membres atteinte. Passez au plan supérieur.")
    user_to_invite = httpx.get(
        f"{supabase_url}/rest/v1/users?email=eq.{req.email}&select=id,email,first_name,last_name",
        headers=headers
    )
    users = user_to_invite.json()
    if users:
        invited_user = users[0]
        existing = httpx.get(
            f"{supabase_url}/rest/v1/company_members?company_id=eq.{req.company_id}&user_id=eq.{invited_user['id']}&select=id",
            headers=headers
        )
        if len(existing.json()) > 0:
            raise HTTPException(status_code=400, detail="Cet utilisateur est déjà membre de l'entreprise")
        valid_roles = ["admin", "recruiter", "viewer"]
        if req.role not in valid_roles:
            req.role = "recruiter"
        insert_resp = httpx.post(
            f"{supabase_url}/rest/v1/company_members",
            json={"company_id": req.company_id, "user_id": invited_user["id"], "role": req.role, "status": "active"},
            headers={**headers, "Prefer": "return=representation"}
        )
        if insert_resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Erreur ajout membre : {insert_resp.text}")
        return {"success": True, "member": insert_resp.json()}
    else:
        token_str = str(uuid.uuid4())
        valid_roles = ["admin", "recruiter", "viewer"]
        if req.role not in valid_roles:
            req.role = "recruiter"
        insert_resp = httpx.post(
            f"{supabase_url}/rest/v1/company_members",
            json={"company_id": req.company_id, "user_id": None, "role": req.role, "status": "pending", "invitation_token": token_str},
            headers={**headers, "Prefer": "return=representation"}
        )
        if insert_resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Erreur création invitation : {insert_resp.text}")
        invitation_link = f"https://jobs.actoos.com/invitation?token={token_str}"
        lang = get_user_language(email=req.email) or req.language or "fr"
        data = {"nom_entreprise": company_name, "role": req.role, "lien_invitation": invitation_link}
        await send_translated_email(req.email, "team_invitation", data, lang)
        return {"success": True, "message": "Invitation envoyée par email."}

@app.post("/api/team/accept-invitation")
async def accept_invitation_v2(req: AcceptInvitationRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    inv_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?invitation_token=eq.{req.token}&status=eq.pending&select=id,company_id,role",
        headers=headers
    )
    invitations = inv_resp.json()
    if not invitations:
        raise HTTPException(status_code=404, detail="Invitation introuvable ou déjà utilisée.")
    invitation = invitations[0]
    update_resp = httpx.patch(
        f"{supabase_url}/rest/v1/company_members?id=eq.{invitation['id']}",
        json={"user_id": req.user_id, "status": "active", "invitation_token": None},
        headers=headers
    )
    if update_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur lors de l'activation du membre.")
    return {"success": True, "company_id": invitation["company_id"]}

@app.put("/api/team/members/{member_id}/role")
async def update_member_role_v2(member_id: str, req: TeamUpdateRoleRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    current_user_id = req.user_id
    member_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?id=eq.{member_id}&select=company_id,user_id",
        headers=headers
    )
    members = member_resp.json()
    if not members:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    target_company_id = members[0]["company_id"]
    role = get_user_role_in_company(current_user_id, target_company_id)
    if role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent changer les rôles")
    is_owner_target = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{target_company_id}&owner_id=eq.{members[0]['user_id']}&select=id",
        headers=headers
    )
    if len(is_owner_target.json()) > 0:
        raise HTTPException(status_code=403, detail="Impossible de modifier le rôle du propriétaire")
    valid_roles = ["admin", "recruiter", "viewer"]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Rôle invalide")
    httpx.patch(
        f"{supabase_url}/rest/v1/company_members?id=eq.{member_id}",
        json={"role": req.role},
        headers=headers
    )
    return {"success": True}

@app.delete("/api/team/members/{member_id}")
async def remove_team_member_v2(member_id: str, req: TeamRemoveRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    current_user_id = req.user_id
    company_id = req.company_id
    role = get_user_role_in_company(current_user_id, company_id)
    if role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent retirer des membres")
    member_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?id=eq.{member_id}&select=company_id,user_id",
        headers=headers
    )
    members = member_resp.json()
    if not members:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    if members[0]["company_id"] != company_id:
        raise HTTPException(status_code=400, detail="Le membre n'appartient pas à cette entreprise")
    is_owner_target = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{members[0]['user_id']}&select=id",
        headers=headers
    )
    if len(is_owner_target.json()) > 0:
        raise HTTPException(status_code=403, detail="Impossible de retirer le propriétaire de l'entreprise")
    httpx.delete(
        f"{supabase_url}/rest/v1/company_members?id=eq.{member_id}",
        headers=headers
    )
    return {"success": True}

@app.post("/api/team/leave")
async def leave_company_v2(req: TeamLeaveRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    user_id = req.user_id
    company_id = req.company_id
    member_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?company_id=eq.{company_id}&user_id=eq.{user_id}&select=id",
        headers=headers
    )
    if len(member_resp.json()) == 0:
        raise HTTPException(status_code=404, detail="Vous n'êtes pas membre de cette entreprise")
    owner_check = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{user_id}&select=id",
        headers=headers
    )
    if len(owner_check.json()) > 0:
        raise HTTPException(status_code=400, detail="Le propriétaire ne peut pas quitter l'entreprise. Veuillez transférer la propriété d'abord.")
    httpx.delete(
        f"{supabase_url}/rest/v1/company_members?company_id=eq.{company_id}&user_id=eq.{user_id}",
        headers=headers
    )
    return {"success": True}

# ==================== APPLICATIONS ====================
@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: str, user_id: str = Depends(get_current_active_user)):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    app_resp = httpx.get(
        f"{supabase_url}/rest/v1/applications?id=eq.{application_id}&select=job_id",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    apps = app_resp.json()
    if not apps:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    job_id = apps[0]["job_id"]
    member_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?user_id=eq.{user_id}&select=company_id",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    members = member_resp.json()
    company_ids = [m["company_id"] for m in members]
    job_resp = httpx.get(
        f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}&select=company_id",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    jobs = job_resp.json()
    if not jobs or jobs[0]["company_id"] not in company_ids:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à supprimer cette candidature")
    httpx.delete(
        f"{supabase_url}/rest/v1/applications?id=eq.{application_id}",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    return {"success": True, "message": "Candidature supprimée"}

@app.get("/api/users/search")
async def search_users(q: str = Query(...), user_id: str = Depends(get_current_active_user)):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    query = f"email.ilike.*{q}*,first_name.ilike.*{q}*,last_name.ilike.*{q}*"
    resp = httpx.get(
        f"{supabase_url}/rest/v1/users?select=id,email,first_name,last_name,role&or=({query})&order=email.asc&limit=10",
        headers=headers
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur recherche utilisateurs")
    users = resp.json()
    return users

# ==================== NOTIFICATIONS ====================
@app.post("/api/notify-job-approved")
async def notify_job_approved(req: NotifyJobApprovedRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = get_user_language(email=req.email)
        data = {"prenom_recruteur": req.first_name, "offre_titre": req.job_title, "lien_dashboard": "https://jobs.actoos.com/dashboard/entreprise"}
        await send_translated_email(req.email, "notify_job_approved", data, lang)
        return {"success": True, "message": "Email envoyé au recruteur."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-job-reactivated")
async def notify_job_reactivated(req: NotifyJobReactivatedRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = get_user_language(email=req.email)
        data = {"prenom_recruteur": req.first_name, "offre_titre": req.job_title, "lien_dashboard": "https://jobs.actoos.com/dashboard/entreprise"}
        await send_translated_email(req.email, "notify_job_reactivated", data, lang)
        return {"success": True, "message": "Email envoyé au recruteur."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send-interview-link")
async def send_interview_link(req: SendInterviewLinkRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = get_user_language(email=req.email)
        data = {"candidat_nom": req.candidate_name, "offre_titre": req.job_title, "lien": req.meeting_link, "societe_info": f" chez {req.company_name}" if req.company_name else ""}
        await send_translated_email(req.email, "interview_invitation", data, lang)
        return {"success": True, "message": "Email envoyé avec succès."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send-interview-details")
async def send_interview_details(req: SendInterviewDetailsRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = get_user_language(email=req.email)
        data = {"candidat_nom": req.candidate_name, "offre_titre": req.job_title, "lien": req.meeting_link, "date": req.interview_date, "heure": req.interview_time, "societe_info": f" chez {req.company_name}" if req.company_name else ""}
        await send_translated_email(req.email, "interview_details", data, lang)
        return {"success": True, "message": "Email envoyé avec succès."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cancel-interview")
async def cancel_interview(req: CancelInterviewRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    app_resp = httpx.get(
        f"{supabase_url}/rest/v1/applications?id=eq.{req.application_id}&select=id",
        headers=headers
    )
    if app_resp.status_code != 200 or not app_resp.json():
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    update_resp = httpx.patch(
        f"{supabase_url}/rest/v1/applications?id=eq.{req.application_id}",
        json={"meeting_link": None, "interview_date": None, "interview_time": None},
        headers=headers
    )
    if update_resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Erreur lors de l'annulation en base")
    if resend.api_key and req.candidate_email:
        lang = get_user_language(email=req.candidate_email)
        details = ""
        if req.interview_date or req.interview_time or req.reason:
            details = f"""
            <div style="background-color:#f9fafb; padding:16px; border-radius:6px; margin:16px 0;">
                <p style="margin:0 0 8px;"><strong>Détails de l'entretien annulé :</strong></p>
                {f'<p><strong>📅 Date :</strong> {req.interview_date}</p>' if req.interview_date else ''}
                {f'<p><strong>🕒 Heure :</strong> {req.interview_time}</p>' if req.interview_time else ''}
                {f'<p><strong>Raison :</strong> {req.reason}</p>' if req.reason else ''}
            </div>
            """
        data = {"candidat_nom": req.candidate_name, "offre_titre": req.job_title, "societe_info": f" chez {req.company_name}" if req.company_name else "", "details_annulation": details}
        await send_translated_email(req.candidate_email, "interview_cancelled", data, lang)
    return {"success": True, "message": "Entretien annulé et email envoyé."}

@app.post("/api/notify-new-application")
async def notify_new_application(req: NotifyNewApplicationRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = get_user_language(email=req.recruiter_email)
        data = {
            "recruteur_nom": req.recruiter_name,
            "candidat_nom": req.candidate_name,
            "offre_titre": req.job_title,
            "lien_candidatures": "https://jobs.actoos.com/dashboard/entreprise/candidatures"
        }
        await send_translated_email(req.recruiter_email, "new_application", data, lang)
        return {"success": True, "message": "Email envoyé au recruteur."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-status-change")
async def notify_status_change(req: NotifyStatusChangeRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = get_user_language(email=req.candidate_email)
        statut_translated = STATUS_TRANSLATIONS.get(lang, STATUS_TRANSLATIONS["fr"]).get(req.new_status, req.new_status)
        style_map = {
            "viewed": "info",
            "shortlisted": "info",
            "interview": "success",
            "accepted": "success",
            "rejected": "danger",
            "pending": "info"
        }
        style = style_map.get(req.new_status, "info")
        couleurs = {
            'info': {'fond': 'eff6ff', 'bordure': '3b82f6'},
            'success': {'fond': 'ecfdf5', 'bordure': '10b981'},
            'danger': {'fond': 'fef2f2', 'bordure': 'ef4444'}
        }
        couleur = couleurs.get(style, couleurs['info'])
        raison_html = f"<br><strong>Raison :</strong> {req.reason}" if req.reason else ""
        data = {
            "candidat_nom": req.candidate_name,
            "offre_titre": req.job_title,
            "societe_info": f" chez {req.company_name}" if req.company_name else "",
            "statut_libelle": statut_translated,
            "raison_html": raison_html,
            "couleur_fond": couleur['fond'],
            "couleur_bordure": couleur['bordure'],
            "lien_candidatures": "https://jobs.actoos.com/mes-candidatures"
        }
        await send_translated_email(req.candidate_email, "status_change", data, lang)
        return {"success": True, "message": "Email envoyé au candidat."}
    except Exception as e:
        print(f"[ERREUR] notify_status_change: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-accepted-candidate")
async def notify_accepted_candidate(req: NotifyAcceptedCandidateRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        import re
        raw_title = (req.job_title or "").strip()
        parts = re.split(r'\d+\.\s*', raw_title)
        clean_title = ""
        for part in parts:
            part = part.strip().rstrip('.')
            if part:
                clean_title = part
                break
        if not clean_title:
            clean_title = raw_title.split('\n')[0].strip().rstrip('.')
        if len(clean_title) > 120:
            clean_title = clean_title[:117] + '...'
        lang = get_user_language(email=req.candidate_email)
        data = {
            "candidat_nom": req.candidate_name,
            "offre_titre": clean_title,
            "societe_info": f" chez <strong>{req.company_name}</strong>" if req.company_name else "",
            "message_html": f"<p><strong>Message du recruteur :</strong> {req.message}</p>" if req.message else ""
        }
        await send_translated_email(req.candidate_email, "notify_accepted_candidate", data, lang)
        return {"success": True, "message": "Email envoyé au candidat."}
    except Exception as e:
        print(f"[ERREUR] notify-accepted-candidate : {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ADMIN ENDPOINTS ====================
@app.post("/api/admin/verify-company")
async def admin_verify_company(req: AdminVerifyCompanyRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?id=eq.{req.id}&select=*,owner:users(email,first_name,last_name)",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = company_resp.json()
        if not isinstance(companies, list) or len(companies) == 0:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        company = companies[0]
        httpx.patch(
            f"{supabase_url}/rest/v1/companies?id=eq.{req.id}",
            json={"is_verified": True},
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        owner = company.get("owner", {})
        owner_email = owner.get("email")
        owner_first_name = owner.get("first_name") or "Cher recruteur"
        if owner_email and resend.api_key:
            # ✅ Correction ici : utiliser get_user_language
            lang = get_user_language(email=owner_email) or req.language or "fr"
            data = {
                "proprietaire_prenom": owner_first_name,
                "nom_entreprise": company['name'],
                "lien_dashboard": "https://jobs.actoos.com/dashboard/entreprise"
            }
            await send_translated_email(owner_email, "company_verified", data, lang)
        return {"success": True, "message": "Entreprise validée et email envoyé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-admin-new-company")
async def notify_admin_new_company(req: NewCompanyNotificationRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        # ✅ On récupère la langue de l'admin (ou fallback fr)
        lang = get_user_language(email="contact@actoos.com") or "fr"
        data = {
            "sujet": f"Nouvelle entreprise à valider : {req.company_name}",
            "titre": "Nouvelle entreprise en attente de validation",
            "contenu": f"<strong>Entreprise :</strong> {req.company_name}<br><strong>Propriétaire :</strong> {req.owner_name} ({req.owner_email})",
            "lien": "https://jobs.actoos.com/admin"
        }
        await send_translated_email("contact@actoos.com", "admin_notification", data, lang)
        return {"success": True, "message": "Notification envoyée à l'administrateur"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-admin-new-job")
async def notify_admin_new_job(req: NotifyAdminNewJobRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = get_user_language(email="contact@actoos.com") or "fr"
        data = {
            "sujet": f"Nouvelle offre à valider : {req.job_title}",
            "titre": "Nouvelle offre en attente de validation",
            "contenu": f"<strong>Offre :</strong> {req.job_title}<br><strong>Entreprise :</strong> {req.company_name} ({req.company_email})",
            "lien": "https://jobs.actoos.com/admin"
        }
        await send_translated_email("contact@actoos.com", "admin_notification", data, lang)
        return {"success": True, "message": "Notification envoyée à l'administrateur"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/api/admin/cancellations")
async def get_cancellations():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?select=id,name,cancellation_reason,subscription_plan,previous_subscription_plan,stripe_subscription_id,updated_at&cancellation_reason=not.is.null&order=updated_at.desc",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        return {"success": True, "cancellations": resp.json()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/delete-company/{company_id}")
async def admin_delete_company(company_id: str, request: Request, language: str = Query("fr")):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&select=id,name,owner:users(email,first_name)",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = company_resp.json()
        if not companies:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        company = companies[0]
        owner_email = company.get("owner", {}).get("email")
        owner_first_name = company.get("owner", {}).get("first_name") or "Utilisateur"
        httpx.delete(
            f"{supabase_url}/rest/v1/companies?id=eq.{company_id}",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        if owner_email and resend.api_key:
            lang = get_user_language(email=owner_email) or language
            data = {"proprietaire_prenom": owner_first_name, "nom_entreprise": company['name']}
            await send_translated_email(owner_email, "company_deleted", data, lang)
        return {"success": True, "message": "Entreprise supprimée et notification envoyée"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/company/delete")
async def delete_own_company(request: Request):
    data = await request.json()
    user_id = data.get("user_id")
    company_id = data.get("company_id")
    language = data.get("language", "fr")
    if not user_id or not company_id:
        raise HTTPException(status_code=400, detail="user_id et company_id sont requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    company_resp = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&select=id,name,owner_id,owner:users(email,first_name,last_name)",
        headers=headers
    )
    companies = company_resp.json()
    if not companies:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    company = companies[0]
    if company["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas le propriétaire de cette entreprise")
    httpx.delete(f"{supabase_url}/rest/v1/jobs?company_id=eq.{company_id}", headers=headers)
    httpx.delete(f"{supabase_url}/rest/v1/company_members?company_id=eq.{company_id}", headers=headers)
    httpx.delete(f"{supabase_url}/rest/v1/companies?id=eq.{company_id}", headers=headers)
    owner = company.get("owner")
    if isinstance(owner, list) and len(owner) > 0:
        owner = owner[0]
    owner_email = owner.get("email") if owner else None
    if owner_email and resend.api_key:
        first_name = owner.get("first_name") or "Utilisateur"
        lang = get_user_language(email=owner_email) or language
        data = {"proprietaire_prenom": first_name, "nom_entreprise": company['name']}
        await send_translated_email(owner_email, "company_deleted", data, lang)
    return {"success": True, "message": "Entreprise supprimée"}

@app.delete("/api/admin/delete-user/{user_id}")
async def admin_delete_user(user_id: str, request: Request, language: str = Query("fr")):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        user_resp = httpx.get(
            f"{supabase_url}/rest/v1/users?id=eq.{user_id}&select=email,first_name",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        users = user_resp.json()
        if not users:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        user_email = users[0].get("email")
        user_first_name = users[0].get("first_name") or "Utilisateur"
        httpx.delete(
            f"{supabase_url}/rest/v1/users?id=eq.{user_id}",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        httpx.delete(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        if user_email and resend.api_key:
            lang = get_user_language(email=user_email) or language
            data = {"prenom_utilisateur": user_first_name}
            await send_translated_email(user_email, "account_deleted", data, lang)
        return {"success": True, "message": "Utilisateur supprimé et notification envoyée"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/reject-company")
async def admin_reject_company(req: AdminActionRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?id=eq.{req.id}&select=*,owner:users(email,first_name,last_name)",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = company_resp.json()
        if not isinstance(companies, list) or len(companies) == 0:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        company = companies[0]
        httpx.patch(
            f"{supabase_url}/rest/v1/companies?id=eq.{req.id}",
            json={"is_verified": False, "is_active": False},
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        owner_email = company.get("owner", {}).get("email")
        if owner_email and resend.api_key:
            owner_first_name = company['owner'].get('first_name', '')
            lang = get_user_language(email=owner_email) or req.language or "fr"
            data = {"proprietaire_prenom": owner_first_name, "nom_entreprise": company['name'], "raison": req.reason or "Non spécifiée"}
            await send_translated_email(owner_email, "company_rejected", data, lang)
        return {"success": True, "message": "Entreprise rejetée"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/suspend-company")
async def admin_suspend_company(req: AdminSuspendCompanyRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?id=eq.{req.id}&select=*,owner:users(email,first_name,last_name)",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = company_resp.json()
        if not companies:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        company = companies[0]
        update_data = {"is_active": False}
        if req.duration_days:
            suspended_until = datetime.utcnow() + timedelta(days=req.duration_days)
            update_data["suspended_until"] = suspended_until.isoformat()
        else:
            update_data["suspended_until"] = None
        httpx.patch(
            f"{supabase_url}/rest/v1/companies?id=eq.{req.id}",
            json=update_data,
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        active_jobs_resp = httpx.get(
            f"{supabase_url}/rest/v1/jobs?company_id=eq.{req.id}&status=eq.active&select=id",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        active_jobs = active_jobs_resp.json()
        for job in active_jobs:
            httpx.patch(
                f"{supabase_url}/rest/v1/jobs?id=eq.{job['id']}",
                json={"status": "suspended"},
                headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
            )
        owner_email = company.get("owner", {}).get("email")
        if owner_email and resend.api_key:
            lang = get_user_language(email=owner_email) or req.language or "fr"
            duree = f" pour {req.duration_days} jour(s)" if req.duration_days else " définitivement"
            raison_html = f"<br><strong>Raison :</strong> {req.reason}" if req.reason else ""
            data = {"nom_entreprise": company['name'], "duree": duree, "raison_html": raison_html}
            await send_translated_email(owner_email, "company_suspended", data, lang)
        return {"success": True, "message": "Entreprise suspendue"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/reactivate-company")
async def reactivate_company(request: Request):
    data = await request.json()
    company_id = data.get("id")
    language = data.get("language", "fr")
    if not company_id:
        raise HTTPException(status_code=400, detail="id requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    company_resp = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&select=*,owner:users(email,first_name)",
        headers=headers
    )
    companies = company_resp.json()
    if not companies:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    company = companies[0]
    httpx.patch(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}",
        json={"is_active": True, "suspended_until": None},
        headers=headers
    )
    suspended_jobs_resp = httpx.get(
        f"{supabase_url}/rest/v1/jobs?company_id=eq.{company_id}&status=eq.suspended&select=id",
        headers=headers
    )
    suspended_jobs = suspended_jobs_resp.json()
    for job in suspended_jobs:
        httpx.patch(
            f"{supabase_url}/rest/v1/jobs?id=eq.{job['id']}",
            json={"status": "active"},
            headers=headers
        )
    owner = company.get("owner", {})
    if isinstance(owner, list) and len(owner) > 0:
        owner = owner[0]
    owner_email = owner.get("email") if owner else None
    if owner_email and resend.api_key:
        first_name = owner.get("first_name") or "Recruteur"
        lang = get_user_language(email=owner_email) or language
        data = {"proprietaire_prenom": first_name, "nom_entreprise": company['name']}
        await send_translated_email(owner_email, "company_reactivated", data, lang)
    return {"success": True, "message": "Entreprise réactivée et offres réactivées"}

@app.post("/api/admin/suspend-job")
async def admin_suspend_job(req: AdminActionRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        job_resp = httpx.get(
            f"{supabase_url}/rest/v1/jobs?id=eq.{req.id}&select=*,company:companies(name),posted_by_user:users(email,first_name,last_name)",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        jobs = job_resp.json()
        if not isinstance(jobs, list) or len(jobs) == 0:
            raise HTTPException(status_code=404, detail="Offre non trouvée")
        job = jobs[0]
        httpx.patch(
            f"{supabase_url}/rest/v1/jobs?id=eq.{req.id}",
            json={"status": "suspended"},
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        owner_email = job.get("posted_by_user", {}).get("email")
        if owner_email and resend.api_key:
            lang = get_user_language(email=owner_email) or req.language or "fr"
            raison_html = f"<br><strong>Raison :</strong> {req.reason}" if req.reason else ""
            data = {"offre_titre": job['title'], "raison_html": raison_html}
            await send_translated_email(owner_email, "job_suspended", data, lang)
        return {"success": True, "message": "Offre suspendue"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/delete-job")
async def admin_delete_job(req: AdminActionRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        job_resp = httpx.get(
            f"{supabase_url}/rest/v1/jobs?id=eq.{req.id}&select=title,posted_by_user:users(email,first_name,last_name)",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        jobs = job_resp.json()
        if not isinstance(jobs, list) or len(jobs) == 0:
            raise HTTPException(status_code=404, detail="Offre non trouvée")
        job = jobs[0]
        httpx.delete(
            f"{supabase_url}/rest/v1/jobs?id=eq.{req.id}",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        owner_email = job.get("posted_by_user", {}).get("email")
        if owner_email and resend.api_key:
            lang = get_user_language(email=owner_email) or req.language or "fr"
            raison_html = f"<br><strong>Raison :</strong> {req.reason}" if req.reason else ""
            data = {"offre_titre": job['title'], "raison_html": raison_html}
            await send_translated_email(owner_email, "job_deleted", data, lang)
        return {"success": True, "message": "Offre supprimée"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/reactivate-job")
async def reactivate_job(req: AdminActionRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    try:
        resp = httpx.patch(
            f"{supabase_url}/rest/v1/jobs?id=eq.{req.id}",
            json={"status": "active"},
            headers=headers
        )
        if resp.status_code not in (200, 204):
            raise Exception(f"Supabase error {resp.status_code}: {resp.text}")
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/send-messages")
async def admin_send_messages(req: AdminSendMessagesRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    expires_at = None
    if req.expire_value and req.expire_value > 0 and req.expire_unit:
        now = datetime.utcnow()
        if req.expire_unit == 'minutes':
            expires_at = (now + timedelta(minutes=req.expire_value)).isoformat()
        elif req.expire_unit == 'hours':
            expires_at = (now + timedelta(hours=req.expire_value)).isoformat()
        elif req.expire_unit == 'days':
            expires_at = (now + timedelta(days=req.expire_value)).isoformat()
    lang = get_user_language(email=destinataire_email) or req.language or "fr"
    success_count = 0
    errors = []
    for user_id in req.recipient_ids:
        user_resp = httpx.get(
            f"{supabase_url}/rest/v1/users?id=eq.{user_id}&select=email,first_name,last_name",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        users = user_resp.json()
        if not users:
            errors.append(f"Utilisateur {user_id} introuvable")
            continue
        user = users[0]
        email = user.get("email")
        if not email:
            errors.append(f"Email manquant pour {user_id}")
            continue
        insert_data = {"recipient_id": user_id, "subject": req.subject, "content": req.content, "expires_at": expires_at}
        insert_resp = httpx.post(
            f"{supabase_url}/rest/v1/admin_messages",
            json=insert_data,
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}", "Prefer": "return=minimal"}
        )
        if insert_resp.status_code not in (200, 201):
            errors.append(f"Erreur insertion pour {user_id}")
            continue
        first_name = user.get('first_name') or "Utilisateur"
        user_lang = get_user_language(email=email) or lang
        data = {"destinataire": first_name, "contenu": req.content, "lien": "https://jobs.actoos.com"}
        await send_translated_email(email, "admin_message", data, user_lang)
        success_count += 1
    return {"success": True, "sent": success_count, "errors": errors}

@app.get("/api/admin/messages")
async def get_admin_messages():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        resp = httpx.get(
            f"{supabase_url}/rest/v1/admin_messages?select=*,recipient:users(email,first_name,last_name)&deleted_at=is.null&order=sent_at.desc",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        if resp.status_code != 200:
            raise Exception(resp.text)
        return {"success": True, "messages": resp.json()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/messages/{message_id}")
async def admin_update_message(message_id: str, req: AdminUpdateMessageRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    update_data = {}
    if req.subject is not None:
        update_data["subject"] = req.subject
    if req.content is not None:
        update_data["content"] = req.content
    if req.expire_value is not None and req.expire_unit is not None:
        if req.expire_value > 0:
            now = datetime.utcnow()
            if req.expire_unit == 'minutes':
                update_data["expires_at"] = (now + timedelta(minutes=req.expire_value)).isoformat()
            elif req.expire_unit == 'hours':
                update_data["expires_at"] = (now + timedelta(hours=req.expire_value)).isoformat()
            elif req.expire_unit == 'days':
                update_data["expires_at"] = (now + timedelta(days=req.expire_value)).isoformat()
        else:
            update_data["expires_at"] = None
    if update_data:
        update_data["updated_at"] = datetime.utcnow().isoformat()
        resp = httpx.patch(
            f"{supabase_url}/rest/v1/admin_messages?id=eq.{message_id}",
            json=update_data,
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail=resp.text)
    return {"success": True, "message": "Message mis à jour"}

@app.delete("/api/admin/messages/{message_id}")
async def admin_delete_message(message_id: str):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    resp = httpx.patch(
        f"{supabase_url}/rest/v1/admin_messages?id=eq.{message_id}",
        json={"deleted_at": datetime.utcnow().isoformat()},
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=resp.text)
    return {"success": True, "message": "Message supprimé"}

@app.delete("/api/admin/messages/{message_id}/permanent")
async def admin_permanent_delete_message(message_id: str):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    resp = httpx.delete(
        f"{supabase_url}/rest/v1/admin_messages?id=eq.{message_id}",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=resp.text)
    return {"success": True, "message": "Message supprimé définitivement"}

@app.post("/api/admin/messages/{message_id}/restore")
async def admin_restore_message(message_id: str):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    resp = httpx.patch(
        f"{supabase_url}/rest/v1/admin_messages?id=eq.{message_id}",
        json={"deleted_at": None},
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=resp.text)
    return {"success": True, "message": "Message restauré"}

@app.post("/api/user/request-role-change")
async def request_role_change(req: RoleChangeRequestRequest, user_id: str = Depends(get_current_active_user)):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    current_user = httpx.get(
        f"{supabase_url}/rest/v1/users?id=eq.{user_id}&select=role",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    ).json()
    if not current_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    current_role = current_user[0]["role"]
    if req.requested_role == "admin":
        raise HTTPException(status_code=400, detail="Le rôle admin n'est pas demandable")
    existing = httpx.get(
        f"{supabase_url}/rest/v1/role_change_requests?user_id=eq.{user_id}&status=eq.pending",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    ).json()
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà une demande en cours")
    try:
        response = httpx.post(
            f"{supabase_url}/rest/v1/role_change_requests",
            json={"user_id": user_id, "current_role": current_role, "requested_role": req.requested_role, "reason": req.reason},
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}", "Content-Type": "application/json", "Prefer": "return=representation"}
        )
        if response.status_code not in (200, 201):
            raise Exception(f"Insert failed: {response.text}")
        return {"success": True, "message": "Demande envoyée"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/role-requests")
async def get_role_requests(status: Optional[str] = None):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    query = f"{supabase_url}/rest/v1/role_change_requests?select=*,user:users(email,first_name,last_name)&order=created_at.desc"
    if status:
        query += f"&status=eq.{status}"
    try:
        response = httpx.get(query, headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        return {"success": True, "requests": response.json()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/handle-role-request")
async def admin_handle_role_request(req: AdminHandleRoleRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    req_resp = httpx.get(
        f"{supabase_url}/rest/v1/role_change_requests?id=eq.{req.request_id}&select=*,user:users(email,first_name,last_name)",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    ).json()
    if not req_resp:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    role_req = req_resp[0]
    if role_req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Demande déjà traitée")
    new_status = "approved" if req.action == "approve" else "rejected"
    try:
        httpx.patch(
            f"{supabase_url}/rest/v1/role_change_requests?id=eq.{req.request_id}",
            json={"status": new_status, "admin_message": req.admin_message, "updated_at": "now()"},
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        user_email = role_req["user"]["email"]
        user_first = role_req["user"].get("first_name") or "Utilisateur"
        if new_status == "approved":
            httpx.patch(
                f"{supabase_url}/rest/v1/users?id=eq.{role_req['user_id']}",
                json={"role": role_req["requested_role"]},
                headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
            )
            httpx.put(
                f"{supabase_url}/auth/v1/admin/users/{role_req['user_id']}",
                json={"user_metadata": {"role": role_req["requested_role"]}},
                headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
            )
        if resend.api_key and user_email:
            lang = get_user_language(email=user_email) or req.language or "fr"
            subject = "Votre demande de changement de rôle a été approuvée" if new_status == "approved" else "Votre demande de changement de rôle a été refusée"
            body = f"""
            <h2 style="color:#1a202c;">Bonjour {user_first},</h2>
            <div style="background-color:{"#ecfdf5" if new_status == "approved" else "#fef2f2"}; border-left:4px solid {"#10b981" if new_status == "approved" else "#ef4444"}; padding:16px; border-radius:4px;">
                Votre demande pour devenir <strong>{role_req['requested_role']}</strong> a été { 'approuvée ✅' if new_status == 'approved' else 'refusée ❌' }.
            </div>
            {f'<p><strong>Message de l\'admin :</strong> {req.admin_message}</p>' if req.admin_message else ''}
            """
            try:
                resend.Emails.send({
                    "from": "Actoos Jobs <noreply@actoos.com>",
                    "to": [user_email],
                    "subject": subject,
                    "html": body
                })
            except Exception as e:
                print(f"Erreur envoi email role change: {e}")
        return {"success": True, "message": f"Demande {new_status}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/suspend-user")
async def admin_suspend_user(req: AdminSuspendUserRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        user_resp = httpx.get(
            f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}&select=email,first_name,last_name",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        users = user_resp.json()
        if not users:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        user = users[0]
        update_data = {"is_active": False}
        if req.duration_days:
            suspended_until = datetime.utcnow() + timedelta(days=req.duration_days)
            update_data["suspended_until"] = suspended_until.isoformat()
        else:
            update_data["suspended_until"] = None
        httpx.patch(
            f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}",
            json=update_data,
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        set_user_entities_status(req.user_id, False)
        if resend.api_key:
            lang = get_user_language(email=user["email"]) or req.language or "fr"
            duree = f" pour {req.duration_days} jour(s)" if req.duration_days else " définitivement"
            raison_html = f"<br><strong>Raison :</strong> {req.reason}" if req.reason else ""
            data = {"prenom_utilisateur": user['first_name'], "duree": duree, "raison_html": raison_html}
            await send_translated_email(user["email"], "account_suspended", data, lang)
        return {"success": True, "message": "Utilisateur suspendu"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/toggle-user-status")
async def toggle_user_status(req: AdminToggleUserStatusRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        user_resp = httpx.get(
            f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}&select=email,first_name,last_name",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        users = user_resp.json()
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        user = users[0]
        httpx.patch(
            f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}",
            json={"is_active": req.is_active, "suspended_until": None},
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        if req.is_active:
            set_user_entities_status(req.user_id, True)
        else:
            set_user_entities_status(req.user_id, False)
        if resend.api_key:
            lang = get_user_language(email=user["email"]) or req.language or "fr"
            first_name = user.get('first_name') or 'Utilisateur'
            if req.is_active:
                data = {"prenom_utilisateur": first_name}
                await send_translated_email(user["email"], "account_reactivated", data, lang)
            else:
                data = {"prenom_utilisateur": first_name, "duree": "", "raison_html": ""}
                await send_translated_email(user["email"], "account_suspended", data, lang)
        return {"success": True, "message": f"Compte {'réactivé' if req.is_active else 'suspendu'}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/ban-user")
async def ban_user(req: AdminBanUserRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        user_resp = httpx.get(
            f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}&select=email,first_name,last_name",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        users = user_resp.json()
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        user = users[0]
        httpx.patch(
            f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}",
            json={"is_active": False, "is_banned": True},
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        set_user_entities_status(req.user_id, False)
        if resend.api_key:
            lang = get_user_language(email=user["email"]) or req.language or "fr"
            data = {"prenom_utilisateur": user['first_name'], "raison": req.reason or "Non spécifiée"}
            await send_translated_email(user["email"], "account_banned", data, lang)
        return {"success": True, "message": "Utilisateur banni"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/unban-user")
async def unban_user(request: Request):
    data = await request.json()
    user_id = data.get("user_id")
    language = data.get("language", "fr")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    user_resp = httpx.get(
        f"{supabase_url}/rest/v1/users?id=eq.{user_id}&select=email,first_name,is_banned",
        headers=headers
    )
    users = user_resp.json()
    if not users:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    user = users[0]
    httpx.patch(
        f"{supabase_url}/rest/v1/users?id=eq.{user_id}",
        json={"is_active": True, "is_banned": False, "suspended_until": None},
        headers=headers
    )
    set_user_entities_status(user_id, True)
    if user.get("email") and resend.api_key:
        lang = get_user_language(email=user["email"]) or language
        first_name = user.get("first_name") or "Utilisateur"
        data = {"prenom_utilisateur": first_name}
        await send_translated_email(user["email"], "account_reactivated", data, lang)
    return {"success": True, "message": "Utilisateur débanni et réactivé"}

@app.post("/api/report")
async def create_report(req: ReportRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    user_check = httpx.get(
        f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}&select=id,is_active,is_banned",
        headers=headers
    )
    users = user_check.json()
    if not users:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user = users[0]
    if not user.get("is_active", True) or user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Compte désactivé ou banni")
    try:
        response = httpx.post(
            f"{supabase_url}/rest/v1/reports",
            json={
                "reporter_id": req.user_id,
                "reported_item_type": req.reported_item_type,
                "reported_item_id": req.reported_item_id,
                "reason": req.reason,
                "status": "pending"
            },
            headers={**headers, "Content-Type": "application/json", "Prefer": "return=minimal"}
        )
        if response.status_code not in (200, 201):
            raise Exception(f"Report creation failed: {response.text}")
        return {"success": True, "message": "Signalement envoyé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/reports")
async def get_reports():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        response = httpx.get(
            f"{supabase_url}/rest/v1/reports?select=*,reporter:users(email,first_name,last_name)&order=created_at.desc",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        return {"success": True, "reports": response.json()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/reports/{report_id}")
async def admin_delete_report(report_id: str):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    check = httpx.get(
        f"{supabase_url}/rest/v1/reports?id=eq.{report_id}&select=id",
        headers=headers
    )
    if not check.json():
        raise HTTPException(status_code=404, detail="Signalement non trouvé")
    resp = httpx.delete(
        f"{supabase_url}/rest/v1/reports?id=eq.{report_id}",
        headers=headers
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du signalement")
    return {"success": True, "message": "Signalement supprimé avec succès"}

# ==================== CANDIDATE DASHBOARD ====================
@app.get("/api/candidate/dashboard")
async def candidate_dashboard(user_id: str = Query(...), limit: int = Query(6)):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    try:
        jobs_resp = httpx.get(
            f"{supabase_url}/rest/v1/jobs?status=eq.active&limit={limit}&order=created_at.desc",
            headers=headers
        )
        if jobs_resp.status_code != 200:
            raise Exception(f"Erreur Supabase : {jobs_resp.text}")
        jobs = jobs_resp.json()
        enriched = []
        for job in jobs:
            comp_resp = httpx.get(
                f"{supabase_url}/rest/v1/companies?id=eq.{job['company_id']}&select=name,logo_url",
                headers=headers
            )
            company = comp_resp.json()[0] if comp_resp.status_code == 200 and comp_resp.json() else {}
            city_resp = httpx.get(
                f"{supabase_url}/rest/v1/cities?id=eq.{job.get('city_id')}&select=name",
                headers=headers
            )
            city = city_resp.json()[0] if city_resp.status_code == 200 and city_resp.json() else {}
            enriched.append({
                "id": job["id"],
                "title": job["title"],
                "salary_min": job.get("salary_min"),
                "salary_max": job.get("salary_max"),
                "company": {"name": company.get("name"), "logo_url": company.get("logo_url")},
                "city": {"name": city.get("name")}
            })
        return {"recommendedJobs": enriched}
    except Exception as e:
        print("❌ Erreur /api/candidate/dashboard :", e)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==================== COMPANY FOLLOW ====================
@app.post("/api/companies/{company_id}/follow")
async def follow_company(company_id: str, request: Request):
    data = await request.json()
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    company_check = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&select=id",
        headers=headers
    )
    if company_check.status_code != 200 or not company_check.json():
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    insert_resp = httpx.post(
        f"{supabase_url}/rest/v1/company_followers",
        json={"user_id": user_id, "company_id": company_id},
        headers=headers
    )
    if insert_resp.status_code == 409:
        pass
    elif insert_resp.status_code not in (200, 201):
        print("❌ Erreur insertion follow :", insert_resp.text)
        raise HTTPException(status_code=500, detail=f"Erreur insertion suivi: {insert_resp.text}")
    count_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_followers?company_id=eq.{company_id}&select=id",
        headers={**headers, "Prefer": "count=exact"}
    )
    total_followers = 0
    if count_resp.status_code == 200:
        content_range = count_resp.headers.get("content-range", "")
        if "/" in content_range:
            total_followers = int(content_range.split("/")[-1])
    httpx.patch(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}",
        json={"followers_count": total_followers},
        headers=headers
    )
    return {"success": True, "followers_count": total_followers}

@app.delete("/api/companies/{company_id}/follow")
async def unfollow_company(company_id: str, request: Request):
    data = await request.json()
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    company_check = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&select=id",
        headers=headers
    )
    if company_check.status_code != 200 or not company_check.json():
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    httpx.delete(
        f"{supabase_url}/rest/v1/company_followers?user_id=eq.{user_id}&company_id=eq.{company_id}",
        headers=headers
    )
    count_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_followers?company_id=eq.{company_id}&select=id",
        headers={**headers, "Prefer": "count=exact"}
    )
    total_followers = 0
    if count_resp.status_code == 200:
        content_range = count_resp.headers.get("content-range", "")
        if "/" in content_range:
            total_followers = int(content_range.split("/")[-1])
    httpx.patch(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}",
        json={"followers_count": total_followers},
        headers=headers
    )
    return {"success": True, "followers_count": total_followers}

@app.get("/api/candidate/followed-companies-v2")
def get_followed_companies_v2(user_id: str = Query(...)):
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        resp = httpx.get(
            f"{supabase_url}/rest/v1/company_followers?user_id=eq.{user_id}&select=company_id",
            headers=headers
        )
        if resp.status_code != 200:
            print("followers error", resp.status_code, resp.text)
            return {"companies": []}
        follows = resp.json()
        company_ids = [f["company_id"] for f in follows if f.get("company_id")]
        if not company_ids:
            return {"companies": []}
        companies = []
        for cid in company_ids:
            comp_resp = httpx.get(
                f"{supabase_url}/rest/v1/companies?id=eq.{cid}&select=id,name,logo_url,industry,subscription_plan,followers_count",
                headers=headers
            )
            if comp_resp.status_code == 200 and comp_resp.json():
                comp = comp_resp.json()[0]
                jobs_resp = httpx.get(
                    f"{supabase_url}/rest/v1/jobs?company_id=eq.{cid}&status=eq.active&select=id,title,contract_type,salary_min,salary_max,created_at&limit=3",
                    headers=headers
                )
                comp["recent_jobs"] = jobs_resp.json() if jobs_resp.status_code == 200 else []
                companies.append(comp)
        return {"companies": companies}
    except Exception as e:
        print("ERROR followed-companies-v2:", e)
        import traceback
        traceback.print_exc()
        return {"companies": []}

@app.get("/api/companies/{company_id}/follow-status")
async def get_follow_status(company_id: str, user_id: str = Query(...)):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    resp = httpx.get(
        f"{supabase_url}/rest/v1/company_followers?user_id=eq.{user_id}&company_id=eq.{company_id}&select=id",
        headers=headers
    )
    if resp.status_code != 200:
        return {"is_following": False}
    data = resp.json()
    return {"is_following": len(data) > 0}

@app.post("/api/jobs/{job_id}/notify-followers")
async def notify_followers_new_job(job_id: str, request: Request):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    
    data = await request.json()
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id requis")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    
    # Récupérer les infos du job
    job_resp = httpx.get(
        f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}&select=title,company_id,company:companies(name,logo_url)",
        headers=headers
    )
    jobs = job_resp.json()
    if not jobs:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    job = jobs[0]
    company_name = job.get("company", {}).get("name", "Une entreprise")
    job_title = job["title"]
    offer_link = f"https://jobs.actoos.com/emplois/{job_id}"
    
    # Récupérer les followers
    followers_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_followers?company_id=eq.{job['company_id']}&select=user_id",
        headers=headers
    )
    followers = followers_resp.json()
    if not followers:
        return {"success": True, "message": "Aucun abonné à notifier"}
    
    user_ids = [f["user_id"] for f in followers]
    # Requête pour récupérer les infos des utilisateurs
    users_resp = httpx.get(
        f"{supabase_url}/rest/v1/users?id=in.({','.join(user_ids)})&select=id,email,first_name,language",
        headers=headers
    )
    
    # Gérer le cas où la réponse est un objet (ex: {"data": [...]}) au lieu d'une liste
    users_data = users_resp.json()
    if isinstance(users_data, dict) and "data" in users_data:
        users = users_data["data"]
    elif isinstance(users_data, list):
        users = users_data
    else:
        users = []  # fallback

    sent_count = 0
    for u in users:
        try:
            # u doit être un dictionnaire
            if not isinstance(u, dict):
                continue
            email_addr = u.get("email")
            if not email_addr:
                continue
            
            # Récupérer la langue de l'utilisateur (colonne 'language')
            lang = u.get("language") or get_user_language(email=email_addr)
            first_name = u.get("first_name") or ""
            
            # Utiliser le template 'followers_notification'
            data_template = {
                "prenom_abonne": first_name,
                "nom_entreprise": company_name,
                "offre_titre": job_title,
                "lien_offre": offer_link
            }
            
            await send_translated_email(
                to_email=email_addr,
                template_name="followers_notification",
                data=data_template,
                language=lang
            )
            sent_count += 1
        except Exception as e:
            print(f"Erreur envoi email au follower {u.get('email') if isinstance(u, dict) else 'inconnu'}: {e}")
    
    return {"success": True, "message": f"{sent_count} notification(s) envoyée(s)"}

# ==================== CV BANK ====================
def compute_match_score(job: dict, candidate_profile: dict, category_slug: str = None) -> int:
    score = 0.0
    cand_title = (candidate_profile.get("title") or "").lower()
    cand_skills = [s.lower() for s in candidate_profile.get("skills") or []]
    if category_slug:
        if category_slug in cand_title or any(category_slug in skill for skill in cand_skills):
            score += 30
    job_skills = [skill.lower().strip() for skill in (job.get("skills_required") or [])]
    if job_skills:
        matched = 0
        for js in job_skills:
            js_words = set(js.split())
            for cs in cand_skills:
                cs_words = set(cs.split())
                if js_words & cs_words:
                    matched += 1
                    break
        score += (matched / len(job_skills)) * 40
    exp_levels = ["junior", "intermediaire", "senior", "expert"]
    job_lvl = job.get("experience_level")
    cand_lvl = candidate_profile.get("experience_level")
    if job_lvl and cand_lvl and job_lvl in exp_levels and cand_lvl in exp_levels:
        job_idx = exp_levels.index(job_lvl)
        cand_idx = exp_levels.index(cand_lvl)
        if cand_idx >= job_idx:
            score += 10
        else:
            diff = job_idx - cand_idx
            if diff == 1:
                score += 5
            else:
                score += 2
    j_min, j_max = job.get("salary_min"), job.get("salary_max")
    c_min, c_max = candidate_profile.get("desired_salary_min"), candidate_profile.get("desired_salary_max")
    if j_min and j_max and c_min and c_max:
        if c_min <= j_max and c_max >= j_min:
            score += 10
    job_city = job.get("city_id")
    cand_city = candidate_profile.get("city_id")
    is_remote = job.get("is_remote", False)
    cand_remote = candidate_profile.get("is_open_to_remote", False)
    if job_city and cand_city and str(job_city) == str(cand_city):
        score += 10
    elif is_remote and cand_remote:
        score += 7
    else:
        job_country = job.get("country_id")
        cand_country = candidate_profile.get("country_id")
        if job_country and cand_country and str(job_country) == str(cand_country):
            score += 4
    return min(100, int(score))

@app.get("/api/candidates/bank")
async def get_candidates_bank(
    user_id: str = Query(...),
    subscription_plan: str = Query(None),
    search: str = Query(""),
    city_id: str = Query(""),
    experience_level: str = Query(""),
    contract_type: str = Query(""),
    salary_min: int = Query(None),
    is_available_only: bool = Query(False),
    sort_by: str = Query("updated_at"),
    page: int = Query(1),
    page_size: int = Query(12),
    job_id: Optional[str] = Query(None),
):
    if subscription_plan and subscription_plan != 'business':
        raise HTTPException(status_code=403, detail="Fonctionnalité réservée au plan Business")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    job = None
    if job_id:
        job_resp = httpx.get(
            f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}&select=*",
            headers=headers
        )
        if job_resp.status_code == 200 and job_resp.json():
            job = job_resp.json()[0]
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{supabase_url}/rest/v1/candidate_profiles?select=*&is_visible_in_cv_bank=eq.true",
            headers=headers
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Erreur Supabase")
        candidates = resp.json()
        enriched = []
        for c in candidates:
            user_info = {}
            if c.get("user_id"):
                user_resp = await client.get(
                    f"{supabase_url}/rest/v1/users?id=eq.{c['user_id']}&select=first_name,last_name,avatar_url",
                    headers=headers
                )
                if user_resp.status_code == 200 and user_resp.json():
                    user_info = user_resp.json()[0]
            city_info = {}
            if c.get("city_id"):
                city_resp = await client.get(
                    f"{supabase_url}/rest/v1/cities?id=eq.{c['city_id']}&select=name",
                    headers=headers
                )
                if city_resp.status_code == 200 and city_resp.json():
                    city_info = city_resp.json()[0]
            enriched.append({**c, "user": user_info, "city": city_info})
    if search:
        s = search.lower()
        enriched = [c for c in enriched if
                    s in (c.get("title") or "").lower() or
                    s in " ".join(c.get("skills") or []).lower() or
                    s in (c.get("user", {}).get("first_name") or "").lower() or
                    s in (c.get("user", {}).get("last_name") or "").lower()]
    if city_id:
        enriched = [c for c in enriched if c.get("city_id") == city_id]
    if experience_level:
        enriched = [c for c in enriched if c.get("experience_level") == experience_level]
    if contract_type:
        enriched = [c for c in enriched if contract_type in (c.get("preferred_contract_types") or [])]
    if salary_min is not None:
        enriched = [c for c in enriched if (c.get("desired_salary_min") or 0) >= salary_min]
    if is_available_only:
        enriched = [c for c in enriched if c.get("is_available")]
    if job:
        for c in enriched:
            try:
                cand_profile = {
                    "skills": c.get("skills") or [],
                    "experience_level": c.get("experience_level"),
                    "desired_salary_min": c.get("desired_salary_min"),
                    "desired_salary_max": c.get("desired_salary_max"),
                    "city_id": c.get("city_id"),
                    "is_open_to_remote": c.get("is_open_to_remote", False),
                    "preferred_contract_types": c.get("preferred_contract_types") or [],
                    "education": c.get("education") or [],
                }
                score = compute_match_score(job, cand_profile)
                c["match_score"] = score
            except Exception:
                c["match_score"] = 0
    if sort_by == "match_score" and job:
        enriched.sort(key=lambda c: c.get("match_score", 0), reverse=True)
    elif sort_by == "name":
        enriched.sort(key=lambda c: (c.get("user", {}).get("first_name") or "").lower())
    else:
        enriched.sort(key=lambda c: c.get("updated_at") or "", reverse=True)
    total = len(enriched)
    start = (page - 1) * page_size
    end = start + page_size
    page_candidates = enriched[start:end]
    return {
        "candidates": page_candidates,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": -(-total // page_size)
    }

# ==================== BLOG ====================
@app.get("/api/blog/posts")
async def get_blog_posts(audience: Optional[str] = None):
    posts = get_blog_posts_cached()
    if audience and audience != "all":
        posts = [p for p in posts if p.get("audience") == audience or p.get("audience") == "all"]
    return posts

@app.get("/api/blog/posts/{slug}")
async def get_blog_post(slug: str):
    posts = get_blog_posts_cached()
    for post in posts:
        if post.get("slug") == slug:
            return post
    raise HTTPException(status_code=404, detail="Article introuvable")

@app.post("/api/admin/blog/generate")
async def generate_blog_post(req: BlogGenerateRequest):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
    prompt = (
        f"Titre : {req.title}\n"
        f"Mots-clés : {req.keywords or 'Aucun'}\n"
        f"Audience : {req.audience}\n"
        "RÈGLE ABSOLUE : Ne mentionne aucun pays, aucune ville, aucun continent, aucune région, aucune devise. "
        "Si un exemple est nécessaire, utilise 'un pays' ou 'une région' sans précision.\n"
        "Génère l'article au format JSON avec les clés : title, excerpt, content, category."
    )
    messages = [
        {"role": "system", "content": AGENT_PROMPTS["blog-post"]},
        {"role": "user", "content": prompt}
    ]
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in FALLBACK_MODELS:
            try:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "HTTP-Referer": "https://jobs.actoos.com",
                        "X-Title": "Actoos Jobs AI"
                    },
                    json={"model": model, "messages": messages, "temperature": 0.8, "max_tokens": 1500}
                )
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    text = data["choices"][0]["message"]["content"].strip()
                    try:
                        article = json.loads(text)
                    except Exception:
                        article = {
                            "title": req.title,
                            "excerpt": req.keywords or "Article généré automatiquement",
                            "content": f"<p>{text}</p>",
                            "category": req.category
                        }
                    GEO_TERMS = [
                        "Afrique", "Afrique de l'Ouest", "Mali", "Sénégal", "Côte d'Ivoire",
                        "Bénin", "Togo", "Burkina Faso", "Niger", "Guinée", "Ghana", "Nigeria",
                        "Cameroun", "Gabon", "Congo", "RDC", "Rwanda", "Burundi", "Kenya",
                        "Tanzanie", "Ouganda", "Afrique du Sud", "Maroc", "Algérie", "Tunisie",
                        "Libye", "Égypte", "Soudan", "Éthiopie", "Somalie",
                        "Dakar", "Bamako", "Abidjan", "Lomé", "Cotonou", "Ouagadougou", "Niamey",
                        "Conakry", "Accra", "Lagos", "Yaoundé", "Libreville", "Brazzaville",
                        "Kinshasa", "Kigali", "Bujumbura", "Nairobi", "Dar es Salaam", "Kampala",
                        "Johannesburg", "Le Cap", "Casablanca", "Alger", "Tunis", "Tripoli",
                        "Le Caire", "Khartoum", "Addis Abeba", "Mogadiscio",
                        "FCFA", "XOF", "franc CFA", "euro", "dollar", "€", "$", "MAD", "GBP",
                        "BRL", "ARS", "NGN", "ZAR", "SAR", "AED", "EGP", "DZD", "TND", "CHF"
                    ]
                    import re
                    for term in GEO_TERMS:
                        article["title"] = re.sub(r'\b' + re.escape(term) + r'\b', 'notre plateforme', article["title"], flags=re.IGNORECASE)
                        article["excerpt"] = re.sub(r'\b' + re.escape(term) + r'\b', 'notre plateforme', article["excerpt"], flags=re.IGNORECASE)
                        article["content"] = re.sub(r'\b' + re.escape(term) + r'\b', 'notre plateforme', article["content"], flags=re.IGNORECASE)
                    slug = slugify(req.title)
                    posts = load_blog_posts()
                    new_id = max([p.get("id", 0) for p in posts], default=0) + 1
                    new_post = {
                        "id": new_id,
                        "title": article.get("title", req.title),
                        "slug": slug,
                        "excerpt": article.get("excerpt", ""),
                        "content": article.get("content", ""),
                        "category": article.get("category", req.category),
                        "audience": req.audience,
                        "read_time": req.read_time,
                        "author": req.author,
                        "icon": req.icon,
                        "color": req.color,
                        "published_at": datetime.utcnow().isoformat()
                    }
                    posts.append(new_post)
                    save_blog_posts(posts)
                    invalidate_blog_cache()
                    return new_post
            except Exception as e:
                print(f"Erreur modèle {model}: {e}")
                continue
    raise HTTPException(status_code=502, detail="Échec de la génération par IA")

@app.put("/api/admin/blog/{slug}")
async def update_blog_post(slug: str, req: BlogUpdateRequest):
    posts = load_blog_posts()
    for i, post in enumerate(posts):
        if post.get("slug") == slug:
            updates = req.dict(exclude_unset=True)
            posts[i].update(updates)
            save_blog_posts(posts)
            invalidate_blog_cache()
            return posts[i]
    raise HTTPException(status_code=404, detail="Article non trouvé")

@app.delete("/api/admin/blog/{slug}")
async def delete_blog_post(slug: str):
    posts = load_blog_posts()
    initial_len = len(posts)
    posts = [p for p in posts if p.get("slug") != slug]
    if len(posts) == initial_len:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    save_blog_posts(posts)
    invalidate_blog_cache()
    return {"success": True}

# ==================== JOB ALERTS ====================
@app.post("/api/send-job-alerts")
async def send_job_alerts():
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    alerts_resp = httpx.get(
        f"{supabase_url}/rest/v1/job_alerts?select=*,user:users(email,preferences,first_name,language)&is_active=eq.true",
        headers=headers
    )
    alerts = alerts_resp.json()
    if not isinstance(alerts, list) or len(alerts) == 0:
        return {"success": True, "message": "Aucune alerte active"}
    count_sent = 0
    for alert in alerts:
        user = alert.get("user", {})
        user_email = user.get("email")
        user_id = alert.get("user_id")
        user_first_name = user.get("first_name") or "Utilisateur"
        if not user_email or not user_id:
            continue
        last_sent = alert.get("last_sent_at")
        now = datetime.now(timezone.utc)
        freq = alert.get("frequency", "daily")
        if last_sent:
            last_sent_dt = datetime.fromisoformat(last_sent.replace("Z", "+00:00"))
            if freq == "instant" and now - last_sent_dt < timedelta(hours=1):
                continue
            elif freq == "daily" and now - last_sent_dt < timedelta(days=1):
                continue
            elif freq == "weekly" and now - last_sent_dt < timedelta(weeks=1):
                continue
        keywords = alert.get("keywords", "")
        category_id = alert.get("category_id")
        city_id = alert.get("city_id")
        contract_types = alert.get("contract_types")
        salary_min = alert.get("salary_min")
        user_prefs = user.get("preferences") or {}
        country_code = user_prefs.get("country")
        country_id = None
        if country_code:
            country_resp = httpx.get(
                f"{supabase_url}/rest/v1/countries?select=id&code=eq.{country_code}",
                headers=headers
            )
            countries = country_resp.json()
            if countries:
                country_id = countries[0]["id"]
        rpc_payload = {
            "p_keywords": keywords if keywords else None,
            "p_user_id": user_id,
            "p_category_id": category_id,
            "p_city_id": city_id,
            "p_contract_types": contract_types,
            "p_salary_min": salary_min,
            "p_country_id": str(country_id) if country_id else None
        }
        try:
            rpc_resp = httpx.post(
                f"{supabase_url}/rest/v1/rpc/search_jobs_for_alert",
                json=rpc_payload,
                headers=headers
            )
            jobs = rpc_resp.json()
        except Exception as e:
            print(f"Erreur RPC alerte {alert.get('id')}: {e}")
            continue
        if not isinstance(jobs, list) or len(jobs) == 0:
            continue
        job_links = "<br>".join([
            f"<a href='https://jobs.actoos.com/emplois/{j['id']}'>{j['title']}</a>" for j in jobs
        ])
        # Langue : priorité à la colonne 'language' de l'utilisateur
        lang = user.get("language") or get_user_language(email=user_email)
        mots_cles = keywords if keywords else "Nouvelles offres"
        data = {
            "prenom_abonne": user_first_name,
            "mots_cles": mots_cles,
            "liste_offres": job_links
        }
        await send_translated_email(user_email, "job_alert", data, lang)
        httpx.patch(
            f"{supabase_url}/rest/v1/job_alerts?id=eq.{alert['id']}",
            json={"last_sent_at": now.isoformat()},
            headers=headers
        )
        count_sent += 1
    return {"success": True, "message": f"Emails envoyés pour {count_sent}/{len(alerts)} alerte(s)."}

# ==================== HIRING DOCUMENTS ====================
@app.post("/api/hiring/request-documents")
async def request_documents(req: RequestDocumentsRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    app_resp = httpx.get(
        f"{supabase_url}/rest/v1/applications?id=eq.{req.application_id}&select=candidate_id,job:jobs(company_id)",
        headers=headers,
    )
    if app_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération de la candidature")
    apps = app_resp.json()
    if not isinstance(apps, list) or len(apps) == 0:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    app = apps[0]
    candidate_id = app.get("candidate_id")
    if not candidate_id:
        raise HTTPException(status_code=400, detail="Candidat introuvable dans la candidature")
    job_data = app.get("job") or {}
    company_id = job_data.get("company_id") if isinstance(job_data, dict) else None
    if not company_id:
        raise HTTPException(status_code=400, detail="Impossible de récupérer l'entreprise liée à l'offre")
    for doc_type in req.document_types:
        insert_resp = httpx.post(
            f"{supabase_url}/rest/v1/hiring_documents",
            json={
                "application_id": req.application_id,
                "candidate_id": candidate_id,
                "company_id": company_id,
                "document_type": doc_type,
                "status": "pending",
            },
            headers={**headers, "Prefer": "return=minimal"},
        )
        if insert_resp.status_code not in (200, 201):
            print(f"Erreur insertion document {doc_type}: {insert_resp.text}")
    doc_labels = {"contract": "Contrat signé", "id_card": "Pièce d'identité", "diploma": "Diplôme", "other": "Autre"}
    doc_list = ''.join(f'<li style="margin-bottom:4px;">✅ {doc_labels.get(d, d)}</li>' for d in req.document_types)
    lang = get_user_language(email=req.candidate_email) or req.language or "fr"
    data = {
        "candidat_nom": req.candidate_name,
        "offre_titre": req.job_title,
        "nom_entreprise": req.company_name,
        "liste_documents": doc_list,
        "message_html": f"<p><strong>Message du recruteur :</strong> {req.message}</p>" if req.message else "",
        "lien_depot": "https://jobs.actoos.com/dashboard/candidat"
    }
    await send_translated_email(req.candidate_email, "document_request", data, lang)
    return {"success": True, "message": "Demande envoyée et email notifié."}

@app.post("/api/hiring/upload-document")
async def upload_document(req: UploadDocumentRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    get_resp = httpx.get(
        f"{supabase_url}/rest/v1/hiring_documents?application_id=eq.{req.application_id}&document_type=eq.{req.document_type}&status=not.eq.validated",
        headers=headers
    )
    if get_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur récupération document")
    docs = get_resp.json()
    if not isinstance(docs, list) or len(docs) == 0:
        raise HTTPException(status_code=404, detail="Aucune demande de document modifiable trouvée")
    doc = docs[0]
    try:
        file_bytes = base64.b64decode(req.file_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Données base64 invalides: {str(e)}")
    file_path = f"{req.application_id}/{req.document_type}/{req.filename}"
    upload_resp = httpx.post(
        f"{supabase_url}/storage/v1/object/hiring-documents/{file_path}",
        headers={**headers, "Content-Type": "application/octet-stream", "x-upsert": "true"},
        content=file_bytes
    )
    if upload_resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Erreur upload fichier: {upload_resp.text}")
    file_url = f"{supabase_url}/storage/v1/object/public/hiring-documents/{file_path}"
    update_resp = httpx.patch(
        f"{supabase_url}/rest/v1/hiring_documents?id=eq.{doc['id']}",
        json={"file_url": file_url, "status": "uploaded", "updated_at": "now()"},
        headers=headers
    )
    if update_resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail=f"Erreur mise à jour document: {update_resp.text}")
    try:
        app_resp = httpx.get(
            f"{supabase_url}/rest/v1/applications?id=eq.{req.application_id}&select=candidate:users(first_name,last_name),job:jobs(company:companies(owner_id,name))",
            headers=headers
        )
        if app_resp.status_code == 200:
            apps = app_resp.json()
            if apps:
                app = apps[0]
                candidate = app.get("candidate") or {}
                job = app.get("job") or {}
                company = job.get("company") or {}
                owner_id = company.get("owner_id")
                if owner_id:
                    owner_resp = httpx.get(
                        f"{supabase_url}/rest/v1/users?id=eq.{owner_id}&select=email,first_name",
                        headers=headers
                    )
                    if owner_resp.status_code == 200:
                        owners = owner_resp.json()
                        if owners:
                            owner_email = owners[0].get("email")
                            owner_first_name = owners[0].get("first_name") or "Recruteur"
                            if owner_email:
                                lang_recruiter = get_user_language(email=owner_email) or "en"
                                candidate_name = f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip()
                                subject = f"📎 {candidate_name} a téléversé un document – {req.document_type}"
                                html = f"""
                                <h2 style="color:#1a202c;">Bonjour {owner_first_name},</h2>
                                <div style="background-color:#eff6ff; border-left:4px solid #3b82f6; padding:16px; border-radius:4px;">Le candidat <strong>{candidate_name}</strong> vient de téléverser le document <strong>{req.document_type}</strong>.</div>
                                <p style="text-align:center; margin:24px 0;"><a href="https://jobs.actoos.com/dashboard/entreprise/candidatures/{req.application_id}" style="display:inline-block; padding:12px 28px; background:#1e3a8a; color:white; border-radius:6px; text-decoration:none;">Consulter la candidature</a></p>
                                """
                                resend.Emails.send({
                                    "from": "Actoos Jobs <noreply@actoos.com>",
                                    "to": [owner_email],
                                    "subject": subject,
                                    "html": html
                                })
    except Exception as e:
        print(f"Erreur notification recruteur: {e}")
    return {"success": True, "file_url": file_url}

@app.get("/api/candidate/documents")
async def get_candidate_documents(user_id: str = Depends(get_current_active_user)):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    docs_resp = httpx.get(
        f"{supabase_url}/rest/v1/hiring_documents?candidate_id=eq.{user_id}&select=id,document_type,status,file_url,application_id,created_at&order=created_at.desc",
        headers=headers,
    )
    if docs_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur récupération documents")
    return docs_resp.json()

@app.post("/api/notify-document-validated")
async def notify_document_validated(req: NotifyDocumentValidationRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = get_user_language(email=req.candidate_email) or req.language or "fr"
        data = {"candidat_nom": req.candidate_name, "nom_document": req.document_type}
        await send_translated_email(req.candidate_email, "document_validated", data, lang)
        return {"success": True, "message": "Email envoyé au candidat."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-document-rejected")
async def notify_document_rejected(req: NotifyDocumentRejectedRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = get_user_language(email=req.candidate_email) or req.language or "fr"
        raison_html = f"<br><strong>Raison :</strong> {req.reason}" if req.reason else ""
        data = {"candidat_nom": req.candidate_name, "nom_document": req.document_type, "raison_html": raison_html}
        await send_translated_email(req.candidate_email, "document_rejected", data, lang)
        return {"success": True, "message": "Email envoyé au candidat."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/hiring/finalize")
async def finalize_hiring(req: FinalizeHiringRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    app_resp = httpx.get(
        f"{supabase_url}/rest/v1/applications?id=eq.{req.application_id}&select=id,status,candidate:users(email,first_name,last_name),job:jobs(title,company:companies(name))",
        headers=headers
    )
    if app_resp.status_code != 200 or not app_resp.json():
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    app = app_resp.json()[0]
    if app["status"] != "accepted":
        raise HTTPException(status_code=400, detail="La candidature doit être acceptée avant d'être finalisée")
    update_resp = httpx.patch(
        f"{supabase_url}/rest/v1/applications?id=eq.{req.application_id}",
        json={"status": "completed"},
        headers=headers
    )
    if update_resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Erreur lors de la finalisation")
    candidate = app.get("candidate", {})
    candidate_email = candidate.get("email")
    if candidate_email:
        candidate_name = f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip()
        job_title = app.get("job", {}).get("title", "")
        company_name = app.get("job", {}).get("company", {}).get("name", "votre entreprise")
        lang = get_user_language(email=candidate_email) or req.language or "fr"
        data = {
            "candidat_nom": candidate_name,
            "offre_titre": job_title,
            "nom_entreprise": company_name,
            "message_html": f"<p><strong>Message du recruteur :</strong><br/>{req.message}</p>" if req.message else ""
        }
        await send_translated_email(candidate_email, "finalize_hiring", data, lang)
    return {"success": True, "message": "Recrutement finalisé"}

@app.post("/api/notify-other-candidates")
async def notify_other_candidates(req: NotifyOtherCandidatesRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}

    # 1. Récupérer la candidature source
    app_resp = httpx.get(
        f"{supabase_url}/rest/v1/applications?id=eq.{req.application_id}&select=job_id,job:jobs(title,company:companies(name))",
        headers=headers
    )
    if app_resp.status_code != 200 or not app_resp.json():
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    app = app_resp.json()[0]
    job_id = app["job_id"]
    job_title = app.get("job", {}).get("title", "")
    company_name = app.get("job", {}).get("company", {}).get("name", "")

    # 2. Récupérer TOUTES les candidatures pour ce job
    all_apps_resp = httpx.get(
        f"{supabase_url}/rest/v1/applications?job_id=eq.{job_id}&select=id,status,candidate_id",
        headers=headers
    )
    if all_apps_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur récupération candidatures")
    
    all_apps = all_apps_resp.json()
    excluded_statuses = ["accepted", "rejected", "completed"]
    others = [app for app in all_apps if app.get("status") not in excluded_statuses]

    if not others:
        return {"success": True, "count": 0, "message": "Aucun autre candidat à notifier"}

    # 3. Récupérer les IDs des candidats
    candidate_ids = [o["candidate_id"] for o in others if o.get("candidate_id")]
    if not candidate_ids:
        return {"success": True, "count": 0, "message": "Aucun candidat trouvé"}

    # 4. Récupérer les utilisateurs AVEC la colonne language
    users_resp = httpx.get(
        f"{supabase_url}/rest/v1/users?id=in.({','.join(candidate_ids)})&select=id,email,first_name,last_name,language",
        headers=headers
    )
    if users_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur récupération utilisateurs")
    
    users = {u["id"]: u for u in users_resp.json()}

    # 5. Mettre à jour le statut des autres en rejected
    ids_to_reject = [o["id"] for o in others]
    if ids_to_reject:
        ids_filter = ",".join(ids_to_reject)
        patch_resp = httpx.patch(
            f"{supabase_url}/rest/v1/applications?id=in.({ids_filter})",
            json={"status": "rejected"},
            headers=headers
        )
        if patch_resp.status_code not in (200, 204):
            print(f"[WARN] Échec mise à jour statuts: {patch_resp.text}")

    # 6. Envoyer les emails
    sent_count = 0
    for other in others:
        user_id = other.get("candidate_id")
        if not user_id:
            continue
        user = users.get(user_id)
        if not user:
            continue
        email = user.get("email")
        if not email:
            continue
        name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()

        # 🔥 Récupération DIRECTE de la langue depuis la colonne
        lang = user.get("language")  # prend la valeur de la colonne
        if not lang:
            # fallback sur la fonction (pour les emails sans colonne)
            lang = get_user_language(email=email) or req.language or "fr"
        
        print(f"[notify-other-candidates] Langue pour {email}: {lang} (colonne = {user.get('language')})")

        data = {
            "candidat_nom": name or "Candidat",
            "offre_titre": job_title,
            "nom_entreprise": company_name,
            "message_html": f"<p><strong>Message du recruteur :</strong> {req.message}</p>" if req.message else ""
        }
        
        await send_translated_email(email, "other_candidates", data, lang)
        sent_count += 1

    return {"success": True, "count": sent_count}

# ==================== INTERVIEWS ====================
@app.post("/api/interviews/propose")
async def propose_interview(req: ProposeInterviewRequest):
    headers = {"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}
    app_resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/applications?id=eq.{req.application_id}&select=id,job:jobs(company_id,title,company:companies(name)),candidate:users(email,first_name,last_name)",
        headers=headers
    )
    applications = app_resp.json()
    if not applications:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    application = applications[0]
    job_company_id = application.get("job", {}).get("company_id")
    if str(job_company_id) != str(req.company_id):
        raise HTTPException(status_code=403, detail="Candidature non liée à cette entreprise")
    booking_url = os.getenv("CALCOM_BOOKING_LINK")
    if not booking_url:
        raise HTTPException(status_code=500, detail="Lien de réservation Cal.com non configuré")
    update_resp = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/applications?id=eq.{req.application_id}",
        json={"booking_url": booking_url},
        headers=headers
    )
    if update_resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Impossible de mettre à jour la candidature")
    candidate = application["candidate"]
    candidate_email = candidate.get("email")
    candidate_name = f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip()
    job = application.get("job", {})
    job_title = job.get("title", "poste")
    company_name = job.get("company", {}).get("name", "")
    if candidate_email:
        plage_horaire = ""
        if req.date_start and req.date_end and req.time_start and req.time_end:
            plage_horaire = f"""
            <p><strong>📅 Période souhaitée :</strong> {req.date_start} au {req.date_end}</p>
            <p><strong>🕒 Heures souhaitées :</strong> {req.time_start} – {req.time_end}</p>
            """
        message_html = f"""
        <div style="background-color:#f9fafb;padding:16px;border-radius:6px;margin:16px 0;">
            <p style="margin:0;"><strong>Message du recruteur :</strong></p>
            <p style="margin:8px 0 0;">{req.message}</p>
        </div>
        """ if req.message else ""
        data = {
            "candidat_nom": candidate_name,
            "offre_titre": job_title,
            "societe_info": f" chez {company_name}" if company_name else "",
            "message_html": message_html,
            "plage_horaire": plage_horaire,
            "lien_booking": booking_url
        }
        lang = get_user_language(email=candidate_email) or req.language or "fr"
        await send_translated_email(candidate_email, "interview_proposal", data, lang)
    return {"success": True, "booking_url": booking_url}

@app.post("/api/interviews/cancel")
async def cancel_interview(req: CancelInterviewRequest):
    headers = {"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}
    app_resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/applications?id=eq.{req.application_id}&select=id,status,booking_url,candidate:users(email,first_name,last_name),job:jobs(title,company_id,company:companies(name))",
        headers=headers
    )
    applications = app_resp.json()
    if not applications:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    application = applications[0]
    job_company_id = application.get("job", {}).get("company_id")
    if str(job_company_id) != str(req.company_id):
        raise HTTPException(status_code=403, detail="Accès refusé")
    update_data = {"booking_url": None, "status": "shortlisted"}
    update_resp = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/applications?id=eq.{req.application_id}",
        json=update_data,
        headers=headers
    )
    if update_resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Impossible de mettre à jour la candidature")
    candidate = application["candidate"]
    candidate_email = candidate.get("email")
    candidate_name = f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip()
    job = application.get("job", {})
    job_title = job.get("title", "poste")
    company_name = job.get("company", {}).get("name", "")
    if candidate_email:
        lang = get_user_language(email=candidate_email) or req.language or "fr"
        data = {"candidat_nom": candidate_name, "offre_titre": job_title, "societe_info": f" chez {company_name}" if company_name else "", "details_annulation": ""}
        await send_translated_email(candidate_email, "interview_cancelled", data, lang)
    return {"success": True, "message": "Entretien annulé"}

@app.post("/api/interviews/finish")
async def finish_interview(req: FinishInterviewRequest):
    headers = {"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}
    app_resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/applications?id=eq.{req.application_id}&select=id,company:jobs(company_id)",
        headers=headers
    )
    applications = app_resp.json()
    if not applications:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    application = applications[0]
    job_company_id = application.get("company", {}).get("company_id")
    if str(job_company_id) != str(req.company_id):
        raise HTTPException(status_code=403, detail="Accès refusé")
    update_resp = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/applications?id=eq.{req.application_id}",
        json={"booking_url": None},
        headers=headers
    )
    if update_resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Impossible de mettre à jour la candidature")
    return {"success": True, "message": "Entretien terminé"}

@app.post("/api/interviews/booking-confirmed")
async def calcom_booking_confirmed(req: CalcomBookingWebhook):
    if req.triggerEvent == "PING":
        return {"success": True, "message": "pong"}
    payload = req.payload or {}
    booking = payload.get("booking", {})
    if not booking:
        return {"success": True, "message": "Aucune donnée de réservation"}
    booking_uid = booking.get("uid")
    if not booking_uid:
        return {"success": True, "message": "UID manquant, événement ignoré"}
    meeting_link = booking.get("location", "")
    start_time = booking.get("startTime", "")
    try:
        dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        interview_date = dt.strftime("%Y-%m-%d")
        interview_time = dt.strftime("%H:%M")
    except Exception:
        interview_date = None
        interview_time = None
    booking_url = booking.get("bookingUrl") or booking.get("booking_url") or ""
    if not booking_url:
        return {"success": False, "message": "URL de réservation manquante"}
    headers = {"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}
    app_resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/applications?booking_url=eq.{booking_url}&select=id,candidate:users(email,first_name,last_name,language),job:jobs(title,company_id,company:companies(name,recruiter_email,recruiter_name))",
        headers=headers
    )
    applications = app_resp.json()
    if not applications:
        print(f"[Webhook] Candidature non trouvée pour booking_url: {booking_url}")
        return {"success": False, "message": "Candidature introuvable"}
    application = applications[0]
    application_id = application["id"]
    update_data = {
        "status": "interview",
        "meeting_link": meeting_link,
        "interview_date": interview_date,
        "interview_time": interview_time,
    }
    update_resp = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/applications?id=eq.{application_id}",
        json=update_data,
        headers=headers
    )
    if update_resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Impossible de mettre à jour la candidature")
    candidate = application.get("candidate", {})
    candidate_email = candidate.get("email")
    candidate_name = f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip()
    candidate_language = candidate.get("language") or "fr"
    job = application.get("job", {})
    job_title = job.get("title", "poste")
    company_data = job.get("company", {})
    company_name = company_data.get("name", "")
    recruiter_email = company_data.get("recruiter_email")
    recruiter_name = company_data.get("recruiter_name") or "Recruteur"
    if candidate_email:
        lang = get_user_language(email=candidate_email) or candidate_language
        data = {"candidat_nom": candidate_name, "offre_titre": job_title, "lien": meeting_link, "date": interview_date, "heure": interview_time, "societe_info": f" chez {company_name}" if company_name else ""}
        await send_translated_email(candidate_email, "interview_details", data, lang)
    if recruiter_email:
        lang = get_user_language(email=recruiter_email) or "fr"
        data = {"candidat_nom": recruiter_name, "offre_titre": job_title, "lien": meeting_link, "date": interview_date, "heure": interview_time, "societe_info": f" chez {company_name}" if company_name else ""}
        await send_translated_email(recruiter_email, "interview_details", data, lang)
    return {"success": True, "message": "Candidature mise à jour et emails envoyés"}

# ==================== USER LANGUAGE ====================
@app.post("/api/user/language")
async def update_user_language(request: Request):
    print("="*60)
    print("[LANGUE] 🔥 Requête reçue sur /api/user/language")
    
    # 1. Récupérer le body
    try:
        data = await request.json()
        print(f"[LANGUE] 📦 Body reçu : {data}")
    except Exception as e:
        print(f"[LANGUE] ❌ Body invalide : {e}")
        raise HTTPException(status_code=400, detail="Body JSON invalide")
    
    user_id = data.get("user_id")
    language = data.get("language")
    
    if not user_id:
        print("[LANGUE] ❌ user_id manquant")
        raise HTTPException(status_code=400, detail="user_id requis")
    if not language:
        print("[LANGUE] ❌ language manquant")
        raise HTTPException(status_code=400, detail="language requis")
    
    # 2. Valider la langue
    valid_languages = {"fr", "en", "es", "ar", "it", "de", "nl", "pt"}
    if language not in valid_languages:
        print(f"[LANGUE] ❌ Langue invalide : {language}")
        raise HTTPException(status_code=400, detail="Langue non prise en charge")
    
    # 3. Vérifier que l'utilisateur existe (avec service_role pour contourner RLS)
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    # Vérifier l'utilisateur
    check_resp = httpx.get(
        f"{supabase_url}/rest/v1/users?id=eq.{user_id}&select=id",
        headers=headers
    )
    print(f"[LANGUE] 🔍 Vérification utilisateur {user_id} : status {check_resp.status_code}")
    
    if check_resp.status_code != 200:
        print(f"[LANGUE] ❌ Erreur Supabase : {check_resp.text}")
        raise HTTPException(status_code=500, detail="Erreur vérification utilisateur")
    
    users = check_resp.json()
    if not users:
        print("[LANGUE] ❌ Utilisateur non trouvé dans la table users")
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # 4. Mettre à jour la colonne language
    update_resp = httpx.patch(
        f"{supabase_url}/rest/v1/users?id=eq.{user_id}",
        json={"language": language},
        headers=headers
    )
    print(f"[LANGUE] 💾 Mise à jour : status {update_resp.status_code}")
    if update_resp.status_code not in (200, 204):
        print(f"[LANGUE] ❌ Erreur mise à jour : {update_resp.text}")
        raise HTTPException(status_code=500, detail=f"Erreur mise à jour : {update_resp.text}")
    
    print(f"[LANGUE] ✅ Langue mise à jour pour {user_id} → {language}")
    print("="*60)
    return {"success": True, "language": language}
@app.get("/api/user/language")
async def get_user_language_endpoint(request: Request):
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    token = auth_header.replace("Bearer ", "")
    user_resp = httpx.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}"}
    )
    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    user_id = user_resp.json()["id"]
    resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/users?select=language&id=eq.{user_id}",
        headers={"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}
    )
    if resp.status_code != 200 or not resp.json():
        return {"language": "fr"}
    return {"language": resp.json()[0].get("language", "fr")}

@app.delete("/api/user/delete-account")
async def delete_own_account(request: Request):
    data = await request.json()
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    try:
        user_resp = httpx.get(
            f"{supabase_url}/rest/v1/users?id=eq.{user_id}&select=id",
            headers=headers
        )
        if not user_resp.json():
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        httpx.delete(f"{supabase_url}/rest/v1/applications?candidate_id=eq.{user_id}", headers=headers)
        httpx.delete(f"{supabase_url}/rest/v1/saved_jobs?user_id=eq.{user_id}", headers=headers)
        httpx.delete(f"{supabase_url}/rest/v1/job_alerts?user_id=eq.{user_id}", headers=headers)
        httpx.delete(f"{supabase_url}/rest/v1/notifications?user_id=eq.{user_id}", headers=headers)
        httpx.delete(f"{supabase_url}/rest/v1/candidate_documents?user_id=eq.{user_id}", headers=headers)
        httpx.delete(f"{supabase_url}/rest/v1/candidate_profiles?user_id=eq.{user_id}", headers=headers)
        companies_resp = httpx.get(f"{supabase_url}/rest/v1/companies?owner_id=eq.{user_id}&select=id", headers=headers)
        companies = companies_resp.json()
        for company in companies:
            httpx.delete(f"{supabase_url}/rest/v1/companies?id=eq.{company['id']}", headers=headers)
        httpx.delete(f"{supabase_url}/rest/v1/users?id=eq.{user_id}", headers=headers)
        httpx.delete(f"{supabase_url}/auth/v1/admin/users/{user_id}", headers=headers)
        return {"success": True, "message": "Compte supprimé définitivement"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== STATIC FILES ====================
@app.get("/sw.js")
async def sw_js():
    return Response(content="", media_type="application/javascript")

@app.get("/favicon.ico")
async def favicon_ico():
    favicon_path = os.path.join(BUILD_DIR, "favicon.png")
    if os.path.isfile(favicon_path):
        return FileResponse(favicon_path, media_type="image/png")
    return Response(content="", media_type="image/x-icon")

@app.get("/assets/fonts/{font_name}")
async def fonts(font_name: str):
    return Response(content="", media_type="font/woff2")

@app.post("/api/companies/contact-follower")
async def contact_follower(request: Request):
    # --- FONCTIONS INTÉGRÉES (pour éviter l'erreur "not defined") ---
    def email_button(text: str, url: str, primary: bool = True) -> str:
        bg = "#1e3a8a" if primary else "#ffffff"
        color = "#ffffff" if primary else "#1e3a8a"
        border = "1px solid #1e3a8a" if not primary else "none"
        return f'<a href="{url}" style="display:inline-block;padding:12px 28px;background-color:{bg};color:{color};border:{border};border-radius:6px;font-weight:bold;text-decoration:none;text-align:center;font-size:16px;margin:8px 0;">{text}</a>'

    def email_info_box(content: str, type: str = "info") -> str:
        styles = {
            "info": {"border": "#3b82f6", "bg": "#eff6ff"},
            "warning": {"border": "#f59e0b", "bg": "#fffbeb"},
            "success": {"border": "#10b981", "bg": "#ecfdf5"},
            "danger": {"border": "#ef4444", "bg": "#fef2f2"},
        }
        style = styles.get(type, styles["info"])
        return f'<div style="background-color:{style["bg"]};border-left:4px solid {style["border"]};padding:16px 20px;margin:16px 0;border-radius:4px;">{content}</div>'

    # --- CORPS DE L'ENDPOINT ---
    try:
        data = await request.json()
        print(f"[contact-follower] 📦 Données reçues : {data}")

        user_id = data.get("user_id")
        follower_id = data.get("follower_id")
        company_id = data.get("company_id")
        message_type = data.get("message_type")
        subject = data.get("subject", "")
        body = data.get("body", "")
        job_id = data.get("job_id")
        language = data.get("language", "fr")

        if not user_id or not follower_id or not company_id or not message_type:
            raise HTTPException(status_code=400, detail="Paramètres manquants")

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}

        # Vérifier l'entreprise
        comp_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&select=owner_id,subscription_plan,name",
            headers=headers
        )
        if comp_resp.status_code != 200 or not comp_resp.json():
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        company = comp_resp.json()[0]

        if company["owner_id"] != user_id:
            raise HTTPException(status_code=403, detail="Action non autorisée")
        if company.get("subscription_plan") not in ("business", "enterprise"):
            raise HTTPException(status_code=402, detail="Fonctionnalité réservée au plan Business")

        # Récupérer le follower
        follower_resp = httpx.get(
            f"{supabase_url}/rest/v1/users?id=eq.{follower_id}&select=email,first_name",
            headers=headers
        )
        if follower_resp.status_code != 200 or not follower_resp.json():
            raise HTTPException(status_code=404, detail="Follower non trouvé")
        follower = follower_resp.json()[0]

        to_email = follower.get("email")
        if not to_email:
            raise HTTPException(status_code=400, detail="Email du follower introuvable")

        company_name = company["name"]
        prenom_abonne = follower.get("first_name") or ""

        # --- TRADUCTIONS ---
        translations = {
            "fr": {
                "invite_subject": f"Invitation à postuler chez {company_name} – ",
                "invite_message": f"Nous avons repéré votre profil et pensons que vous pourriez être intéressé par l'offre ",
                "invite_button": "Postuler maintenant",
                "quick_subject": f"Message de {company_name}",
                "quick_message": f"Vous avez reçu un message de la part de {company_name} :<br><br>",
                "recruiter_message": "Message du recruteur :"
            },
            "en": {
                "invite_subject": f"Invitation to apply at {company_name} – ",
                "invite_message": f"We've spotted your profile and think you might be interested in the job ",
                "invite_button": "Apply now",
                "quick_subject": f"Message from {company_name}",
                "quick_message": f"You have received a message from {company_name}:<br><br>",
                "recruiter_message": "Recruiter's message:"
            },
            "es": {
                "invite_subject": f"Invitación a postular en {company_name} – ",
                "invite_message": f"Hemos visto tu perfil y creemos que podrías estar interesado en la oferta ",
                "invite_button": "Postular ahora",
                "quick_subject": f"Mensaje de {company_name}",
                "quick_message": f"Has recibido un mensaje de {company_name}:<br><br>",
                "recruiter_message": "Mensaje del reclutador:"
            },
            "ar": {
                "invite_subject": f"دعوة للتقدم إلى {company_name} – ",
                "invite_message": f"لاحظنا ملفك الشخصي ونعتقد أنك قد تكون مهتمًا بالوظيفة ",
                "invite_button": "تقدم الآن",
                "quick_subject": f"رسالة من {company_name}",
                "quick_message": f"لقد تلقيت رسالة من {company_name}:<br><br>",
                "recruiter_message": "رسالة المسؤول عن التوظيف:"
            }
        }
        lang_data = translations.get(language, translations["fr"])

        # --- CONSTRUCTION DU MESSAGE ---
        if message_type == "invite_to_apply" and job_id:
            job_resp = httpx.get(
                f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}&select=title",
                headers=headers
            )
            job_title = job_resp.json()[0]["title"] if job_resp.status_code == 200 and job_resp.json() else "cette offre"
            email_subject = subject or f"{lang_data['invite_subject']}{job_title}"
            message_content = email_info_box(
                f"{lang_data['invite_message']}<strong>{job_title}</strong> chez {company_name}.",
                "info"
            )
            message_content += email_button(
                lang_data['invite_button'],
                f"https://jobs.actoos.com/emplois/{job_id}"
            )
            if body:
                message_content += f"<p><strong>{lang_data['recruiter_message']}</strong><br>{body}</p>"
        else:
            email_subject = subject or lang_data["quick_subject"]
            if body:
                message_content = email_info_box(
                    f"{lang_data['quick_message']}{body}",
                    "info"
                )
            else:
                message_content = email_info_box(
                    f"{lang_data['quick_message']}L'entreprise souhaite entrer en contact avec vous.",
                    "info"
                )

        # Sécurité : si message_content est vide
        if not message_content:
            message_content = "<p>Veuillez contacter l'entreprise directement.</p>"

        # --- ENVOI DE L'EMAIL ---
        print(f"[contact-follower] Email subject: {email_subject}")
        print(f"[contact-follower] Message content length: {len(message_content)}")

        await send_translated_email(
            to_email=to_email,
            template_name="contact_follower",
            data={
                "prenom_abonne": prenom_abonne,
                "sujet": email_subject,
                "message": message_content
            },
            language=language,
            from_name=company_name
        )

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Erreur contact-follower] {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if os.path.isdir(BUILD_DIR):
    app.mount("/static", StaticFiles(directory=os.path.join(BUILD_DIR, "static")), name="static")
    app.mount("/", StaticFiles(directory=BUILD_DIR, html=True), name="root")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))