from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
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

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)
print(f"✅ Chargement du .env depuis : {env_path}")
print(f"   STRIPE_SECRET_KEY présente : {'oui' if os.getenv('STRIPE_SECRET_KEY') else 'non'}")
print(f"   RESEND_API_KEY présente : {'oui' if os.getenv('RESEND_API_KEY') else 'non'}")
print(f"   SUPABASE_URL présente : {'oui' if os.getenv('SUPABASE_URL') else 'non'}")
print(f"   SUPABASE_SERVICE_ROLE_KEY présente : {'oui' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'non'}")

app = FastAPI(title="Actoos Jobs API")

BUILD_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")

ALLOWED_ORIGINS = ["http://localhost:3000", "https://jobs.actoos.com"]
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
resend.api_key = os.environ.get("RESEND_API_KEY", "re_HSsCQxUj_HvzYvhZDoJzEHBciWmYDU3ZR")
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
    "business_monthly": {"amount": 149000, "name": "Plan Business - Mensuel", "type": "subscription", "interval": "month"},
    "business_annual": {"amount": 1430400, "name": "Plan Business - Annuel (-20%)", "type": "subscription", "interval": "year"},
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

def get_plan_limit_static(plan, attribute):
    plan_data = PLAN_LIMITS_CONFIG.get(plan, PLAN_LIMITS_CONFIG["free"])
    return plan_data.get(attribute, PLAN_LIMITS_CONFIG["free"][attribute])

# ----- Modèles -----
class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str
    job_id: Optional[str] = None
    user_email: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None

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
    context: Optional[str] = None
    language: Optional[str] = "fr"

class CancelSubscriptionRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None

class SendInterviewLinkRequest(BaseModel):
    email: str
    candidate_name: str
    job_title: str
    meeting_link: str
    company_name: Optional[str] = ""
    language: Optional[str] = "fr"

class UploadRequest(BaseModel):
    bucket: str
    folder: str
    filename: str
    file_data: str

class UploadDocumentRequest(BaseModel):
    user_id: str
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
    reporter_id: str
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
    email: str
    role: str = "recruiter"
    inviter_id: str
    language: Optional[str] = "fr"

class TeamUpdateRoleRequest(BaseModel):
    user_id: str
    company_id: Optional[str] = None
    role: str

class TeamRemoveRequest(BaseModel):
    user_id: str
    company_id: str

class TeamLeaveRequest(BaseModel):
    user_id: str
    company_id: str

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
    user_id: str
    company_id: str
    language: Optional[str] = "fr"

# Nouveaux modèles pour les notifications de validation/réactivation d'offre
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

def clean_subject(text: str, max_length: int = 50) -> str:
    cleaned = text.replace('\n', ' ').replace('\r', ' ')
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length-3] + '...'
    return cleaned

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

def get_user_language(email=None, request: Request = None):
    if email:
        try:
            user_resp = httpx.get(
                f"{SUPABASE_URL}/rest/v1/users?select=preferences&email=eq.{email}",
                headers={"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}
            )
            users = user_resp.json()
            if users and users[0].get('preferences') and users[0]['preferences'].get('language'):
                return users[0]['preferences']['language']
        except:
            pass
    if request and request.headers.get("accept-language"):
        browser_lang = request.headers.get("accept-language").split(",")[0].split("-")[0]
        if browser_lang in {"en", "it", "ar", "de", "nl", "pt", "es"}:
            return browser_lang
    return 'fr'

# ----- Fonctions d'email (templates en français uniquement) -----
def email_new_application(recruiter_name, candidate_name, job_title):
    return f"""
    <h2>Bonjour {recruiter_name},</h2>
    <p><strong>{candidate_name}</strong> vient de postuler à votre offre <strong>{job_title}</strong>.</p>
    <p>Consultez la candidature sur <a href="https://jobs.actoos.com/dashboard/entreprise/candidatures">Actoos Jobs</a>.</p>
    """

def email_status_change(candidate_name, job_title, new_status, company_name, reason=None):
    labels = {
        'viewed': 'a été consultée',
        'shortlisted': 'a été présélectionnée',
        'interview': 'vous êtes invité à un entretien',
        'accepted': 'a été acceptée',
        'rejected': "n'a malheureusement pas été retenue"
    }
    company_info = f" chez {company_name}" if company_name else ""
    reason_text = f" Raison : {reason}" if reason else ""
    status_text = labels.get(new_status, 'a été mise à jour')
    message = f"Votre candidature pour le poste <strong>{job_title}</strong>{company_info} {status_text}.{reason_text}"
    return f"<h2>Bonjour {candidate_name},</h2><p>{message}</p><p>Consultez vos candidatures sur <a href='https://jobs.actoos.com/mes-candidatures'>Actoos Jobs</a>.</p>"

def email_interview_invitation(candidate_name, job_title, meeting_link, company_name=None):
    company_info = f" chez {company_name}" if company_name else ""
    return f"""
    <h2>Bonjour {candidate_name},</h2>
    <p>Vous êtes invité à un entretien pour le poste <strong>{job_title}</strong>{company_info}.</p>
    <p>Voici le lien de visioconférence :</p>
    <p><a href="{meeting_link}">{meeting_link}</a></p>
    <p>À bientôt,<br/>L'équipe Actoos Jobs</p>
    """

def email_company_verified(owner_first_name, company_name):
    return f"""
    <h2>Félicitations {owner_first_name} !</h2>
    <p>Votre entreprise <strong>{company_name}</strong> a été validée par notre équipe. Vous pouvez maintenant publier des offres et recevoir des candidatures.</p>
    <p><a href="https://jobs.actoos.com/dashboard/entreprise">Accéder à mon espace recruteur</a></p>
    """

def email_account_suspended(first_name, duration_days=None, reason=None):
    duration_text = f" pour {duration_days} jour(s)" if duration_days else " définitivement"
    reason_text = f"\nRaison : {reason}" if reason else ""
    return f"<h2>Bonjour {first_name},</h2><p>Votre compte sur Actoos Jobs a été suspendu{duration_text}.{reason_text}</p><p>Contactez-nous si vous avez des questions.</p>"

def email_account_reactivated(first_name):
    return f"<h2>Bonjour {first_name},</h2><p>Votre compte sur Actoos Jobs a été réactivé.</p>"

def email_account_banned(first_name, reason=None):
    reason_text = reason or 'Non spécifiée'
    return f"<h2>Bonjour {first_name},</h2><p>Votre compte a été banni définitivement.<strong>Raison :</strong> {reason_text}</p>"

def email_account_deleted(first_name):
    return f"<h2>Bonjour {first_name},</h2><p>Votre compte a été supprimé par l'administrateur.</p>"

def email_company_deleted(company_name, first_name):
    return f"<h2>Bonjour {first_name},</h2><p>Votre entreprise <strong>{company_name}</strong> a été supprimée par l'administrateur.</p><p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter notre support.</p>"

def email_company_suspended(company_name, duration_days=None, reason=None):
    duration_text = f" pour {duration_days} jour(s)" if duration_days else " définitivement"
    reason_text = f" Raison : {reason}" if reason else ""
    return f"<h2>Information importante</h2><p>Votre entreprise <strong>{company_name}</strong> a été suspendue{duration_text}.{reason_text}</p>"

def email_company_rejected(owner_first_name, company_name, reason=None):
    reason_text = reason or 'Non spécifiée'
    return f"<h2>Désolé {owner_first_name},</h2><p>Votre entreprise <strong>{company_name}</strong> n'a pas été validée.</p><p><strong>Raison :</strong> {reason_text}</p>"

def email_job_suspended(job_title, reason=None):
    reason_text = reason or 'Non spécifiée'
    return f"<h2>Votre offre \"{job_title}\" a été suspendue</h2><p><strong>Raison :</strong> {reason_text}</p>"

def email_job_deleted(job_title, reason=None):
    reason_text = reason or 'Non spécifiée'
    return f"<h2>Votre offre \"{job_title}\" a été supprimée par l'administrateur</h2><p><strong>Raison :</strong> {reason_text}</p>"

def email_admin_message(greeting, content):
    return f"""
    <h2>Bonjour {greeting},</h2>
    <p>{content}</p>
    <p>Consultez vos messages sur <a href="https://jobs.actoos.com">Actoos Jobs</a>.</p>
    """

# ----- Agents IA -----
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
}

FALLBACK_MODELS = [
    "mistralai/mistral-7b-instruct:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-2-13b-chat:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "openai/gpt-3.5-turbo",
]

@app.post("/api/ai/agent")
async def ai_agent(req: AIAgentRequest, request: Request = None):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    target_language = req.language or "fr"
    if request:
        accept_lang = request.headers.get("accept-language", "")
        if target_language == "fr" and accept_lang:
            browser_lang = accept_lang.split(",")[0].split("-")[0]
            if browser_lang in ["en", "it", "ar", "de", "nl", "pt", "es"]:
                target_language = browser_lang

    LANG_NAMES = {
        "en": "anglais", "it": "italien", "ar": "arabe", "de": "allemand",
        "nl": "néerlandais", "pt": "portugais", "es": "espagnol"
    }

    if req.agent_id == "translator":
        system_prompt = AGENT_PROMPTS.get("translator")
        if not system_prompt:
            raise HTTPException(status_code=400, detail="Agent traducteur non configuré")
        lang_name = LANG_NAMES.get(target_language, "anglais")
        system_prompt = system_prompt.replace("{language}", lang_name)
        user_text = f"Texte à traduire :\n\n{req.text}"
        if req.context:
            user_text += f"\n\nContexte supplémentaire : {req.context}"
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
                        "max_tokens": 800
                    }
                )
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    improved_text = data["choices"][0]["message"]["content"].strip()
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

# ----- Fonction d'envoi d'email multilingue -----
async def send_translated_email(to_email: str, subject_fr: str, html_fr: str, language: str = "fr"):
    print(f"[Email] Appel send_translated_email pour {to_email}, langue={language}")
    try:
        if language != "fr":
            print(f"[Email] Traduction demandée vers {language}")
            subject_req = AIAgentRequest(agent_id="translator", text=subject_fr, language=language)
            subject_resp = await ai_agent(subject_req, None)
            translated_subject = subject_resp.get("result", subject_fr)
            print(f"[Email] Sujet traduit : {translated_subject}")

            html_req = AIAgentRequest(agent_id="translator", text=html_fr, language=language)
            html_resp = await ai_agent(html_req, None)
            translated_html = html_resp.get("result", html_fr)
            print(f"[Email] Corps traduit (début) : {translated_html[:100]}...")

            subject = translated_subject
            html = translated_html
        else:
            subject = subject_fr
            html = html_fr

        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": [to_email],
            "subject": subject,
            "html": html
        })
        print(f"[Email] Envoyé à {to_email} avec sujet final : {subject}")
    except Exception as e:
        print(f"[Email] Erreur traduction/envoi : {e} – envoi en français de secours")
        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": [to_email],
            "subject": subject_fr,
            "html": html_fr
        })
# ----- Nouveaux endpoints de notification (validation et réactivation) -----
@app.post("/api/notify-job-approved")
async def notify_job_approved(req: NotifyJobApprovedRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = req.language or "fr"
        subject = f"Votre offre \"{req.job_title}\" a été validée"
        html = f"""
        <h2>Félicitations {req.first_name} !</h2>
        <p>Votre offre <strong>{req.job_title}</strong> a été validée et est maintenant publiée.</p>
        <p><a href="https://jobs.actoos.com/dashboard/entreprise">Accéder à votre espace recruteur</a></p>
        """
        await send_translated_email(req.email, subject, html, lang)
        return {"success": True, "message": "Email envoyé au recruteur."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-job-reactivated")
async def notify_job_reactivated(req: NotifyJobReactivatedRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = req.language or "fr"
        subject = f"Votre offre \"{req.job_title}\" a été réactivée"
        html = f"""
        <h2>Bonjour {req.first_name},</h2>
        <p>Votre offre <strong>{req.job_title}</strong> a été réactivée et est à nouveau visible.</p>
        <p><a href="https://jobs.actoos.com/dashboard/entreprise">Accéder à votre espace recruteur</a></p>
        """
        await send_translated_email(req.email, subject, html, lang)
        return {"success": True, "message": "Email envoyé au recruteur."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- Endpoints -----
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "actoos-jobs-api", "currency": "XOF"}

@app.get("/api/pricing")
async def get_pricing():
    return {"subscriptions": SUBSCRIPTION_PLANS, "boosts": BOOST_PACKAGES, "currency": "XOF"}

@app.get("/api/config/currencies")
async def get_currencies():
    return {"currencies": SUPPORTED_CURRENCIES, "default": "XOF"}

@app.post("/api/checkout/session")
async def create_checkout_session(request: Request, checkout_request: CheckoutRequest):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    package_id = checkout_request.package_id
    if package_id in SUBSCRIPTION_PLANS:
        package = SUBSCRIPTION_PLANS[package_id]
        mode = "subscription"
        preferred_currency = (checkout_request.metadata or {}).get("currency", "xof")
        if preferred_currency.upper() not in SUPPORTED_CURRENCIES:
            preferred_currency = "xof"
        line_item = {
            'price_data': {
                'currency': preferred_currency.lower(),
                'product_data': {'name': package["name"]},
                'unit_amount': int(package["amount"]),
                'recurring': {'interval': package["interval"]},
            },
            'quantity': 1,
        }
    elif package_id in BOOST_PACKAGES:
        raise HTTPException(status_code=400, detail="Boosts non disponibles pour le moment")
    else:
        raise HTTPException(status_code=400, detail="Invalid package")
    origin = checkout_request.origin_url
    success_url = f"{origin}/paiement/succes?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/paiement/annule"
    metadata = {
        "package_id": package_id,
        "package_name": package["name"],
        "source": "actoos_jobs",
    }
    if checkout_request.job_id:
        metadata["job_id"] = checkout_request.job_id
    if checkout_request.user_email:
        metadata["user_email"] = checkout_request.user_email
    if checkout_request.user_id:
        metadata["user_id"] = checkout_request.user_id
    if checkout_request.metadata:
        metadata.update(checkout_request.metadata)
    user_id = checkout_request.user_id
    if user_id and package_id in SUBSCRIPTION_PLANS:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if supabase_url and supabase_key:
            headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
            company_resp = httpx.get(
                f"{supabase_url}/rest/v1/companies?owner_id=eq.{user_id}&select=id,subscription_plan",
                headers=headers
            )
            companies = company_resp.json()
            if companies:
                company = companies[0]
                current_plan = company.get("subscription_plan", "free")
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
                        raise HTTPException(status_code=400, detail=f"DOWNGRADE_BLOCKED:{active_jobs}:{target_limit}")
    STRIPE_LOCALES = {
        'ar', 'bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fi', 'fil',
        'fr', 'he', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'lt', 'lv', 'ms',
        'mt', 'nb', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'th',
        'tr', 'vi', 'zh'
    }
    user_language = get_user_language(email=checkout_request.user_email or "", request=request)
    stripe_locale = user_language if user_language in STRIPE_LOCALES else 'auto'
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[line_item],
            mode=mode,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            locale=stripe_locale,
        )
        payment_transactions[session.id] = {
            "session_id": session.id,
            "package_id": package_id,
            "amount": package["amount"],
            "currency": preferred_currency.lower(),
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
            event = stripe.Event.construct_from(await request.json(), stripe.api_key)
        if event.type == "checkout.session.completed":
            session = event.data.object
            if session.id in payment_transactions:
                payment_transactions[session.id]["payment_status"] = "paid"
                payment_transactions[session.id]["status"] = "completed"
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if supabase_url and supabase_key and session.metadata:
                user_id = session.metadata.get("user_id")
                package_id = session.metadata.get("package_id")
                job_id = session.metadata.get("job_id")
                if user_id and package_id and package_id in SUBSCRIPTION_PLANS:
                    company_resp = httpx.get(
                        f"{supabase_url}/rest/v1/companies?owner_id=eq.{user_id}&select=id",
                        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
                    )
                    companies = company_resp.json()
                    if companies and len(companies) > 0:
                        company = companies[0]
                        plan_name = "free"
                        if "pro" in package_id:
                            plan_name = "pro"
                        elif "business" in package_id:
                            plan_name = "business"
                        update_data = {
                            "subscription_plan": plan_name,
                            "stripe_subscription_id": session.subscription,
                            "stripe_customer_id": session.customer,
                            "subscription_expires_at": None
                        }
                        httpx.patch(
                            f"{supabase_url}/rest/v1/companies?id=eq.{company['id']}",
                            json=update_data,
                            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
                        )
                if job_id and package_id and package_id in BOOST_PACKAGES:
                    days = BOOST_PACKAGES[package_id]["days"]
                    boosted_until = datetime.utcnow() + timedelta(days=days)
                    httpx.patch(
                        f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}",
                        json={"boosted_until": boosted_until.isoformat()},
                        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
                    )
        elif event.type == "checkout.session.expired":
            session = event.data.object
            if session.id in payment_transactions:
                payment_transactions[session.id]["status"] = "expired"
        return {"received": True}
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"received": True, "error": str(e)}

@app.post("/api/subscription/cancel")
async def cancel_subscription(req: CancelSubscriptionRequest):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?owner_id=eq.{req.user_id}&select=id,stripe_subscription_id,subscription_plan",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = company_resp.json()
        if not companies or len(companies) == 0:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
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
                "cancellation_reason": req.reason or None,
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
    if not user_id:
        raise HTTPException(status_code=400, detail="ID utilisateur requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    company_resp = httpx.get(
        f"{supabase_url}/rest/v1/companies?owner_id=eq.{user_id}&select=stripe_customer_id",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    )
    companies = company_resp.json()
    if not companies or len(companies) == 0:
        raise HTTPException(status_code=404, detail="Aucune entreprise trouvée")
    customer_id = companies[0].get("stripe_customer_id")
    if not customer_id or customer_id.startswith("cus_test"):
        return {"url": "https://jobs.actoos.com/tarifs"}
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url="https://jobs.actoos.com/dashboard/entreprise",
        )
        return {"url": session.url}
    except stripe.error.InvalidRequestError as e:
        return {"url": "https://jobs.actoos.com/tarifs"}

# ----- Contact & Newsletter -----
@app.post("/api/contact")
async def contact_form(contact: ContactRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = contact.language or "fr"
        # Notification admin (toujours en français)
        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": ["contact@actoos.com"],
            "reply_to": contact.email,
            "subject": f"[Contact] {contact.subject}",
            "html": f"<h2>Nouveau message de {contact.name}</h2><p><strong>Email :</strong> {contact.email}</p><p><strong>Sujet :</strong> {contact.subject}</p><p><strong>Message :</strong></p><p>{contact.message}</p>"
        })
        # Accusé de réception
        subject = f"Merci de nous avoir contacté - {clean_subject(contact.subject)}"
        html = f"<h2>Merci {contact.name} !</h2><p>Nous avons bien reçu votre message concernant \"<strong>{contact.subject}</strong>\".</p><p>Notre équipe vous répondra dans les plus brefs délais.</p><p>Cordialement,<br/>L'équipe Actoos Jobs</p>"
        await send_translated_email(contact.email, subject, html, lang)
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
        lang = req.language or "fr"
        subject = "Bienvenue à la newsletter Actoos Jobs"
        html = "<h1>Merci de vous être inscrit !</h1><p>Vous recevrez nos derniers conseils et offres d'emploi.</p>"
        await send_translated_email(req.email, subject, html, lang)
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
        lang = req.language or "fr"
        success_count = 0
        for sub in subscribers:
            email = sub["email"]
            unsubscribe_link = f"https://jobs.actoos.com/desabonnement?email={email}"
            footer = f'<br><br><small style="color:#888;">Vous recevez cet email car vous êtes inscrit à la newsletter Actoos Jobs. <a href="{unsubscribe_link}">Se désabonner</a></small>'
            html_personalized = req.content + footer
            try:
                await send_translated_email(email, req.subject, html_personalized, lang)
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

@app.post("/api/send-interview-link")
async def send_interview_link(req: SendInterviewLinkRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = req.language or "fr"
        html = email_interview_invitation(req.candidate_name, req.job_title, req.meeting_link, req.company_name)
        subject = f"Entretien pour le poste : {clean_subject(req.job_title)}"
        await send_translated_email(req.email, subject, html, lang)
        return {"success": True, "message": "Email envoyé avec succès."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-new-application")
async def notify_new_application(req: NotifyNewApplicationRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = req.language or "fr"
        html = email_new_application(req.recruiter_name, req.candidate_name, req.job_title)
        subject = f"Nouvelle candidature pour {clean_subject(req.job_title)}"
        await send_translated_email(req.recruiter_email, subject, html, lang)
        return {"success": True, "message": "Email envoyé au recruteur."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-status-change")
async def notify_status_change(req: NotifyStatusChangeRequest):
    print("[DEBUG] /api/notify-status-change appelé")  # ← Log pour vérifier l'appel
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = req.language or "fr"
        html = email_status_change(req.candidate_name, req.job_title, req.new_status, req.company_name, req.reason)
        subject = f"Votre candidature - {clean_subject(req.job_title)}"
        await send_translated_email(req.candidate_email, subject, html, lang)
        return {"success": True, "message": "Email envoyé au candidat."}
    except Exception as e:
        print(f"[ERREUR] notify_status_change: {e}")  # ← Log d'erreur
        raise HTTPException(status_code=500, detail=str(e))

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
        f"{supabase_url}/rest/v1/job_alerts?select=*,user:users(email,preferences)&is_active=eq.true",
        headers=headers
    )
    alerts = alerts_resp.json()
    if not isinstance(alerts, list) or len(alerts) == 0:
        return {"success": True, "message": "Aucune alerte active"}
    count_sent = 0
    for alert in alerts:
        user_email = alert.get("user", {}).get("email")
        user_id = alert.get("user_id")
        if not user_email or not user_id:
            continue
        last_sent = alert.get("last_sent_at")
        now = datetime.utcnow()
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
        user_prefs = alert.get("user", {}).get("preferences") or {}
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
        lang = get_user_language(email=user_email)
        subject = f"Alerte emploi : {keywords or 'Nouvelles offres'}"
        body_header = "<h2>Nouvelles offres correspondant à votre alerte</h2>"
        body_intro = "<p>Voici les offres trouvées pour vos critères :</p>"
        body_footer = "<p>Bonne recherche !</p>"
        html = f"{body_header}{body_intro}{job_links}{body_footer}"
        try:
            await send_translated_email(user_email, subject, html, lang)
            httpx.patch(
                f"{supabase_url}/rest/v1/job_alerts?id=eq.{alert['id']}",
                json={"last_sent_at": now.isoformat()},
                headers=headers
            )
            count_sent += 1
        except Exception as e:
            print(f"Erreur envoi alerte {alert.get('id')}: {e}")
    return {"success": True, "message": f"Emails envoyés pour {count_sent}/{len(alerts)} alerte(s)."}

@app.get("/api/candidate/{candidate_id}")
async def get_candidate_public_profile(candidate_id: str):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        user_resp = httpx.get(
            f"{supabase_url}/rest/v1/users?id=eq.{candidate_id}&select=id,email,first_name,last_name,avatar_url",
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
            cities = city_resp.json()
            if cities:
                city = cities[0]["name"]
        return {
            "id": user["id"],
            "email": user.get("email"),
            "first_name": user.get("first_name") or "",
            "last_name": user.get("last_name") or "",
            "avatar_url": user.get("avatar_url"),
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team/members")
async def get_team_members_v2(company_id: str, user_id: str):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    owner_check = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{user_id}&select=id",
        headers=headers
    )
    is_owner = len(owner_check.json()) > 0
    if not is_owner:
        member_check = httpx.get(
            f"{supabase_url}/rest/v1/company_members?company_id=eq.{company_id}&user_id=eq.{user_id}&role=eq.admin&select=id",
            headers=headers
        )
        if len(member_check.json()) == 0:
            raise HTTPException(status_code=403, detail="Accès refusé")
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
    inviter_id = req.inviter_id
    owner_check = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{req.company_id}&owner_id=eq.{inviter_id}&select=id,name",
        headers=headers
    )
    companies = owner_check.json()
    is_owner = len(companies) > 0
    company_name = companies[0]["name"] if is_owner else ""
    if not is_owner:
        member_check = httpx.get(
            f"{supabase_url}/rest/v1/company_members?company_id=eq.{req.company_id}&user_id=eq.{inviter_id}&role=eq.admin&select=id",
            headers=headers
        )
        if len(member_check.json()) == 0:
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
        import uuid
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
        lang = req.language or "fr"
        subject = f"Invitation à rejoindre {company_name} sur Actoos Jobs"
        html = f"""
        <h2>Bonjour !</h2>
        <p>Vous avez été invité(e) à rejoindre <strong>{company_name}</strong> sur Actoos Jobs en tant que {req.role}.</p>
        <p>Cliquez sur le lien ci-dessous pour créer votre compte et accepter l'invitation :</p>
        <p><a href="{invitation_link}">{invitation_link}</a></p>
        <p>Cette invitation expire dans 7 jours.</p>
        """
        try:
            await send_translated_email(req.email, subject, html, lang)
        except Exception as e:
            print(f"Erreur envoi email invitation: {e}")
        return {"success": True, "message": "Invitation envoyée par email."}

@app.post("/api/team/accept-invitation")
async def accept_invitation_v2(request: Request):
    data = await request.json()
    token = data.get("token")
    user_id = data.get("user_id")
    if not token or not user_id:
        raise HTTPException(status_code=400, detail="Token et user_id requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    inv_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?invitation_token=eq.{token}&status=eq.pending&select=id,company_id,role",
        headers=headers
    )
    invitations = inv_resp.json()
    if not invitations:
        raise HTTPException(status_code=404, detail="Invitation introuvable ou déjà utilisée.")
    invitation = invitations[0]
    update_resp = httpx.patch(
        f"{supabase_url}/rest/v1/company_members?id=eq.{invitation['id']}",
        json={"user_id": user_id, "status": "active", "invitation_token": None},
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
    member_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?id=eq.{member_id}&select=company_id,user_id",
        headers=headers
    )
    members = member_resp.json()
    if not members:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    company_id = req.company_id or members[0]["company_id"]
    is_owner_target = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{members[0]['user_id']}&select=id",
        headers=headers
    )
    if len(is_owner_target.json()) > 0:
        raise HTTPException(status_code=403, detail="Impossible de modifier le rôle du propriétaire")
    owner_check = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{company_id}&owner_id=eq.{req.user_id}&select=id",
        headers=headers
    )
    is_owner = len(owner_check.json()) > 0
    if not is_owner:
        admin_check = httpx.get(
            f"{supabase_url}/rest/v1/company_members?company_id=eq.{company_id}&user_id=eq.{req.user_id}&role=eq.admin&select=id",
            headers=headers
        )
        if len(admin_check.json()) == 0:
            raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent changer les rôles")
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
    member_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?id=eq.{member_id}&select=company_id,user_id",
        headers=headers
    )
    members = member_resp.json()
    if not members:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    target_company_id = members[0]["company_id"]
    owner_check = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{target_company_id}&owner_id=eq.{req.user_id}&select=id",
        headers=headers
    )
    is_owner = len(owner_check.json()) > 0
    if not is_owner:
        admin_check = httpx.get(
            f"{supabase_url}/rest/v1/company_members?company_id=eq.{target_company_id}&user_id=eq.{req.user_id}&role=eq.admin&select=id",
            headers=headers
        )
        if len(admin_check.json()) == 0:
            raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent retirer des membres")
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
    member_resp = httpx.get(
        f"{supabase_url}/rest/v1/company_members?company_id=eq.{req.company_id}&user_id=eq.{req.user_id}&select=id",
        headers=headers
    )
    if len(member_resp.json()) == 0:
        raise HTTPException(status_code=404, detail="Vous n'êtes pas membre de cette entreprise")
    owner_check = httpx.get(
        f"{supabase_url}/rest/v1/companies?id=eq.{req.company_id}&owner_id=eq.{req.user_id}&select=id",
        headers=headers
    )
    if len(owner_check.json()) > 0:
        raise HTTPException(status_code=400, detail="Le propriétaire ne peut pas quitter l'entreprise. Veuillez transférer la propriété d'abord.")
    httpx.delete(
        f"{supabase_url}/rest/v1/company_members?company_id=eq.{req.company_id}&user_id=eq.{req.user_id}",
        headers=headers
    )
    return {"success": True}

@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: str, request: Request):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Non authentifié")
    token = auth_header.replace("Bearer ", "")
    user_resp = httpx.get(f"{supabase_url}/auth/v1/user", headers={"Authorization": f"Bearer {token}"})
    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token invalide")
    user_id = user_resp.json().get("id")
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
            lang = req.language or "fr"
            html = email_company_verified(owner_first_name, company['name'])
            subject = "Votre entreprise a été validée"
            await send_translated_email(owner_email, subject, html, lang)
        return {"success": True, "message": "Entreprise validée et email envoyé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notify-admin-new-company")
async def notify_admin_new_company(req: NewCompanyNotificationRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = req.language or "fr"
        subject = f"Nouvelle entreprise à valider : {req.company_name}"
        html = f"""
        <h2>Nouvelle entreprise en attente de validation</h2>
        <p><strong>Entreprise :</strong> {req.company_name}</p>
        <p><strong>Propriétaire :</strong> {req.owner_name} ({req.owner_email})</p>
        <p><a href='https://jobs.actoos.com/admin'>Accéder au dashboard admin</a></p>
        """
        await send_translated_email("contact@actoos.com", subject, html, lang)
        return {"success": True, "message": "Notification envoyée à l'administrateur"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@app.post("/api/notify-admin-new-job")
async def notify_admin_new_job(req: NotifyAdminNewJobRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        lang = req.language or "fr"
        subject = f"Nouvelle offre à valider : {req.job_title}"
        html = f"<h2>Nouvelle offre en attente de validation</h2><p><strong>Offre :</strong> {req.job_title}</p><p><strong>Entreprise :</strong> {req.company_name} ({req.company_email})</p><p><a href='https://jobs.actoos.com/admin'>Accéder au dashboard admin</a></p>"
        await send_translated_email("contact@actoos.com", subject, html, lang)
        return {"success": True, "message": "Notification envoyée à l'administrateur"}
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
            html = email_company_deleted(company['name'], owner_first_name)
            subject = "Votre entreprise a été supprimée"
            await send_translated_email(owner_email, subject, html, language)
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
        if not first_name or first_name.strip() == "":
            first_name = "Utilisateur"
        subject = "Votre entreprise a été supprimée"
        html = f"<h2>Bonjour {first_name},</h2><p>Votre entreprise <strong>{company['name']}</strong> a bien été supprimée.</p>"
        try:
            await send_translated_email(owner_email, subject, html, language)
        except Exception as e:
            print(f"Email error: {e}")
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
            html = email_account_deleted(user_first_name)
            subject = "Votre compte a été supprimé"
            await send_translated_email(user_email, subject, html, language)
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
            lang = req.language or "fr"
            html = email_company_rejected(owner_first_name, company['name'], req.reason)
            subject = "Votre entreprise a été refusée"
            await send_translated_email(owner_email, subject, html, lang)
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
        update_data = {"is_active": False, "is_verified": False}
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
        owner_email = company.get("owner", {}).get("email")
        if owner_email and resend.api_key:
            lang = req.language or "fr"
            html = email_company_suspended(company['name'], req.duration_days, req.reason)
            subject = "Votre entreprise a été suspendue"
            await send_translated_email(owner_email, subject, html, lang)
        return {"success": True, "message": "Entreprise suspendue"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            lang = req.language or "fr"
            html = email_job_suspended(job['title'], req.reason)
            subject = "Votre offre a été suspendue"
            await send_translated_email(owner_email, subject, html, lang)
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
            lang = req.language or "fr"
            html = email_job_deleted(job['title'], req.reason)
            subject = "Votre offre a été supprimée"
            await send_translated_email(owner_email, subject, html, lang)
        return {"success": True, "message": "Offre supprimée"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- Nouvel endpoint de réactivation (bypass RLS) -----
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
        # Accepter 200 (OK) ou 204 (No Content) comme succès
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
    lang = req.language or "fr"
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
        insert_data = {
            "recipient_id": user_id,
            "subject": req.subject,
            "content": req.content,
            "expires_at": expires_at
        }
        insert_resp = httpx.post(
            f"{supabase_url}/rest/v1/admin_messages",
            json=insert_data,
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}", "Prefer": "return=minimal"}
        )
        if insert_resp.status_code not in (200, 201):
            errors.append(f"Erreur insertion pour {user_id}")
            continue
        first_name = user.get('first_name') or "Utilisateur"
        html = email_admin_message(first_name, req.content)
        try:
            await send_translated_email(email, req.subject, html, lang)
            success_count += 1
        except Exception as e:
            errors.append(f"Échec envoi à {email}: {str(e)}")
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
async def request_role_change(req: RoleChangeRequestRequest, request: Request):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Non authentifié")
    token = auth_header.replace("Bearer ", "")
    user_resp = httpx.get(f"{supabase_url}/auth/v1/user", headers={"Authorization": f"Bearer {token}"})
    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token invalide")
    user_data = user_resp.json()
    user_id = user_data.get("id")
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
            lang = req.language or "fr"
            subject = "Votre demande de changement de rôle a été approuvée" if new_status == "approved" else "Votre demande de changement de rôle a été refusée"
            body = f"<h2>Bonjour {user_first},</h2><p>Votre demande pour devenir <strong>{role_req['requested_role']}</strong> a été {'approuvée' if new_status == 'approved' else 'refusée'}.</p>"
            if new_status != "approved":
                body += f"<p>Raison : {req.admin_message or 'Non spécifiée'}</p>"
            try:
                await send_translated_email(user_email, subject, body, lang)
            except Exception as e:
                print(f"Email error: {e}")
        return {"success": True, "message": f"Demande {new_status}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/report")
async def create_report(req: ReportRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        response = httpx.post(
            f"{supabase_url}/rest/v1/reports",
            json={"reporter_id": req.reporter_id, "reported_item_type": req.reported_item_type, "reported_item_id": req.reported_item_id, "reason": req.reason, "status": "pending"},
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}", "Content-Type": "application/json", "Prefer": "return=minimal"}
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
        if resend.api_key:
            lang = req.language or "fr"
            html = email_account_suspended(user['first_name'], req.duration_days, req.reason)
            subject = "Votre compte a été suspendu"
            await send_translated_email(user["email"], subject, html, lang)
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
        if resend.api_key:
            lang = req.language or "fr"
            if req.is_active:
                html = email_account_reactivated(user['first_name'])
                subject = "Votre compte a été réactivé"
            else:
                html = email_account_suspended(user['first_name'])
                subject = "Votre compte a été suspendu"
            await send_translated_email(user["email"], subject, html, lang)
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
        if resend.api_key:
            lang = req.language or "fr"
            html = email_account_banned(user['first_name'], req.reason)
            subject = "Votre compte a été banni"
            await send_translated_email(user["email"], subject, html, lang)
        return {"success": True, "message": "Utilisateur banni"}
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

@app.post("/api/boost/free")
async def activate_free_boost(request: Request):
    data = await request.json()
    job_id = data.get("job_id")
    user_id = data.get("user_id")
    if not job_id or not user_id:
        raise HTTPException(status_code=400, detail="job_id et user_id requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    company_resp = httpx.get(
        f"{supabase_url}/rest/v1/companies?owner_id=eq.{user_id}&select=id,subscription_plan,last_free_boost_at",
        headers=headers
    )
    companies = company_resp.json()
    if not companies:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    company = companies[0]
    if company["subscription_plan"] != "business":
        raise HTTPException(status_code=403, detail="Réservé au plan Business")
    now = datetime.now(timezone.utc)
    last_boost = company.get("last_free_boost_at")
    if last_boost:
        last_boost_dt = datetime.fromisoformat(last_boost.replace("Z", "+00:00"))
        if now - last_boost_dt < timedelta(days=30):
            raise HTTPException(status_code=429, detail="BOOST_ALREADY_USED")
    job_resp = httpx.get(
        f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}&select=id,status,company_id",
        headers=headers
    )
    jobs = job_resp.json()
    if not jobs or jobs[0]["status"] != "active" or jobs[0]["company_id"] != company["id"]:
        raise HTTPException(status_code=404, detail="Offre non trouvée ou non active")
    boosted_until = now + timedelta(days=7)
    httpx.patch(
        f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}",
        json={"boosted_until": boosted_until.isoformat()},
        headers=headers
    )
    httpx.patch(
        f"{supabase_url}/rest/v1/companies?id=eq.{company['id']}",
        json={"last_free_boost_at": now.isoformat()},
        headers=headers
    )
    return {"success": True, "message": "Boost gratuit activé pour 7 jours"}

@app.get("/api/blog/posts")
async def get_blog_posts(audience: Optional[str] = None):
    posts = load_blog_posts()
    if audience and audience != "all":
        posts = [p for p in posts if p.get("audience") == audience or p.get("audience") == "all"]
    return posts

@app.get("/api/blog/posts/{slug}")
async def get_blog_post(slug: str):
    posts = load_blog_posts()
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
                    slug = req.title.lower().replace(" ", "-")[:80]
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
    return {"success": True}

def compute_match_score(job: dict, candidate_profile: dict) -> int:
    score = 0.0
    job_skills = set(skill.lower().strip() for skill in (job.get("skills_required") or []))
    cand_skills = set(skill.lower().strip() for skill in (candidate_profile.get("skills") or []))
    if job_skills:
        common = job_skills & cand_skills
        score += (len(common) / len(job_skills)) * 35
    exp_levels = ["junior", "intermediaire", "senior", "expert"]
    job_lvl = job.get("experience_level")
    cand_lvl = candidate_profile.get("experience_level")
    if job_lvl and cand_lvl and job_lvl in exp_levels and cand_lvl in exp_levels:
        diff = abs(exp_levels.index(job_lvl) - exp_levels.index(cand_lvl))
        if diff == 0:
            score += 15
        elif diff == 1:
            score += 10
        else:
            score += 5
    j_min, j_max = job.get("salary_min"), job.get("salary_max")
    c_min, c_max = candidate_profile.get("desired_salary_min"), candidate_profile.get("desired_salary_max")
    if j_min and j_max and c_min and c_max:
        if c_min <= j_max and c_max >= j_min:
            overlap = min(j_max, c_max) - max(j_min, c_min)
            range_job = j_max - j_min
            if range_job > 0:
                score += (overlap / range_job) * 15
            else:
                score += 15
        elif c_min <= j_max or c_max >= j_min:
            score += 5
    job_city = job.get("city_id")
    cand_city = candidate_profile.get("city_id")
    is_remote = job.get("is_remote", False)
    cand_remote = candidate_profile.get("is_open_to_remote", False)
    if job_city and cand_city and str(job_city) == str(cand_city):
        score += 15
    elif is_remote and cand_remote:
        score += 10
    else:
        job_country = job.get("country_id")
        cand_country = candidate_profile.get("country_id")
        if job_country and cand_country and str(job_country) == str(cand_country):
            score += 5
    job_contract = job.get("contract_type")
    cand_contracts = candidate_profile.get("preferred_contract_types") or []
    if isinstance(cand_contracts, list) and job_contract in cand_contracts:
        score += 10
    job_req = (job.get("requirements") or "").lower()
    education = candidate_profile.get("education") or []
    if isinstance(education, list) and education and job_req:
        edu_text = " ".join([e.get("title", "") + " " + e.get("description", "") for e in education]).lower()
        keywords = ["bac", "licence", "master", "doctorat", "ingénieur", "bts", "dut"]
        matches = sum(1 for kw in keywords if kw in job_req and kw in edu_text)
        if matches:
            score += min(10, matches * 3)
    return min(100, int(score))

@app.get("/api/jobs/{job_id}/match-score")
async def get_match_score(job_id: str, user_id: str = Query(...)):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    job_resp = httpx.get(f"{supabase_url}/rest/v1/jobs?id=eq.{job_id}&select=*", headers=headers)
    jobs = job_resp.json()
    if not jobs:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    job = jobs[0]
    cand_resp = httpx.get(f"{supabase_url}/rest/v1/candidate_profiles?user_id=eq.{user_id}&select=*", headers=headers)
    cand = cand_resp.json()
    cand = cand[0] if cand else {}
    score = compute_match_score(job, cand)
    return {"score": score}

@app.delete("/api/user/delete-account")
async def delete_own_account(request: Request):
    data = await request.json()
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="ID utilisateur requis")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    try:
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
    plan_name = None
    if package_id in SUBSCRIPTION_PLANS:
        user_id = metadata.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Métadonnées manquantes")
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?owner_id=eq.{user_id}&select=id",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = company_resp.json()
        if not companies:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        plan_name = "free"
        if "pro" in package_id:
            plan_name = "pro"
        elif "business" in package_id:
            plan_name = "business"
        update_data = {
            "subscription_plan": plan_name,
            "stripe_subscription_id": session.subscription,
            "stripe_customer_id": session.customer,
            "subscription_expires_at": None
        }
        httpx.patch(
            f"{supabase_url}/rest/v1/companies?id=eq.{companies[0]['id']}",
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
        "isBoost": is_boost
    }

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

if os.path.isdir(BUILD_DIR):
    app.mount("/static", StaticFiles(directory=os.path.join(BUILD_DIR, "static")), name="static")
    app.mount("/", StaticFiles(directory=BUILD_DIR, html=True), name="root")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))
    
