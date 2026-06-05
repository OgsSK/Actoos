from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import os
import stripe
from dotenv import load_dotenv
import resend
import httpx
import random
import base64
import uuid

from pathlib import Path
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)
print(f"✅ Chargement du .env depuis : {env_path}")
print(f"   STRIPE_SECRET_KEY présente : {'oui' if os.getenv('STRIPE_SECRET_KEY') else 'non'}")
print(f"   RESEND_API_KEY présente : {'oui' if os.getenv('RESEND_API_KEY') else 'non'}")

app = FastAPI(title="Actoos Jobs API")

# CORS
ALLOWED_ORIGINS = ["http://localhost:3000", "https://jobs.actoos.com"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

resend.api_key = os.environ.get("RESEND_API_KEY", "re_HSsCQxUj_HvzYvhZDoJzEHBciWmYDU3ZR")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

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

class NewsletterRequest(BaseModel):
    email: str

class AIAgentRequest(BaseModel):
    agent_id: str
    text: str
    context: Optional[str] = None

class CancelSubscriptionRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None  # ajout de la raison

class SendInterviewLinkRequest(BaseModel):
    email: str
    candidate_name: str
    job_title: str
    meeting_link: str
    company_name: Optional[str] = ""

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

class NotifyStatusChangeRequest(BaseModel):
    candidate_email: str
    candidate_name: str
    job_title: str
    new_status: str
    company_name: Optional[str] = ""
    reason: Optional[str] = None

class AdminNewsletterRequest(BaseModel):
    subject: str
    content: str

class AdminActionRequest(BaseModel):
    id: str
    reason: Optional[str] = ""

class AdminVerifyCompanyRequest(BaseModel):
    id: str

class ReportRequest(BaseModel):
    reporter_id: str
    reported_item_type: str
    reported_item_id: str
    reason: str

class AdminToggleUserStatusRequest(BaseModel):
    user_id: str
    is_active: bool

class AdminBanUserRequest(BaseModel):
    user_id: str
    reason: Optional[str] = ""

def clean_subject(text: str, max_length: int = 50) -> str:
    cleaned = text.replace('\n', ' ').replace('\r', ' ')
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length-3] + '...'
    return cleaned

# ----- Endpoints -----
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "actoos-jobs-api", "currency": "XOF"}

@app.get("/api/pricing")
async def get_pricing():
    return {
        "subscriptions": SUBSCRIPTION_PLANS,
        "boosts": BOOST_PACKAGES,
        "currency": "XOF"
    }

# ----- Stripe Checkout -----
@app.post("/api/checkout/session")
async def create_checkout_session(request: Request, checkout_request: CheckoutRequest):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    package_id = checkout_request.package_id
    if package_id in SUBSCRIPTION_PLANS:
        package = SUBSCRIPTION_PLANS[package_id]
    elif package_id in BOOST_PACKAGES:
        package = BOOST_PACKAGES[package_id]
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
    
    try:
        if package["type"] == "subscription":
            mode = "subscription"
            line_item = {
                'price_data': {
                    'currency': 'xof',
                    'product_data': {'name': package["name"]},
                    'unit_amount': int(package["amount"]),
                    'recurring': {'interval': package["interval"]},
                },
                'quantity': 1,
            }
        else:
            mode = "payment"
            line_item = {
                'price_data': {
                    'currency': 'xof',
                    'product_data': {'name': package["name"]},
                    'unit_amount': int(package["amount"]),
                },
                'quantity': 1,
            }
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[line_item],
            mode=mode,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
        
        payment_transactions[session.id] = {
            "session_id": session.id,
            "package_id": package_id,
            "amount": package["amount"],
            "currency": "xof",
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

# ----- Résiliation avec raison -----
@app.post("/api/subscription/cancel")
async def cancel_subscription(req: CancelSubscriptionRequest):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Récupérer l'entreprise
        company_resp = httpx.get(
            f"{supabase_url}/rest/v1/companies?owner_id=eq.{req.user_id}&select=id,stripe_subscription_id",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = company_resp.json()
        if not isinstance(companies, list) or len(companies) == 0:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        company = companies[0]
        subscription_id = company.get("stripe_subscription_id")
        if not subscription_id:
            raise HTTPException(status_code=400, detail="Aucun abonnement actif")
        
        # Annuler l'abonnement Stripe
        stripe.Subscription.delete(subscription_id)
        
        # Mettre à jour la base : plan gratuit + raison
        httpx.patch(
            f"{supabase_url}/rest/v1/companies?id=eq.{company['id']}",
            json={
                "stripe_subscription_id": None,
                "subscription_plan": "free",
                "subscription_expires_at": None,
                "cancellation_reason": req.reason or None
            },
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        
        return {"success": True, "message": "Abonnement résilié avec succès."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----- Contact & Newsletter -----
@app.post("/api/contact")
async def contact_form(contact: ContactRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": ["contact@actoos.com"],
            "reply_to": contact.email,
            "subject": f"[Contact] {contact.subject}",
            "html": f"<h2>Nouveau message de {contact.name}</h2><p><strong>Email :</strong> {contact.email}</p><p><strong>Sujet :</strong> {contact.subject}</p><p><strong>Message :</strong></p><p>{contact.message}</p>"
        })
        return {"success": True, "message": "Votre message a bien été envoyé."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/newsletter")
async def newsletter_subscribe(req: NewsletterRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if supabase_url and supabase_key:
            httpx.post(
                f"{supabase_url}/rest/v1/newsletter_subscribers",
                json={"email": req.email},
                headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
            )
        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": [req.email],
            "subject": "Bienvenue à la newsletter Actoos Jobs",
            "html": "<h1>Merci de vous être inscrit !</h1><p>Vous recevrez nos derniers conseils et offres d'emploi.</p>"
        })
        return {"success": True, "message": "Inscription réussie."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- Admin Newsletter -----
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
            return {"success": True, "message": "Aucun abonné trouvé."}
        emails = [s["email"] for s in subscribers]
        batch_size = 50
        for i in range(0, len(emails), batch_size):
            batch = emails[i:i+batch_size]
            resend.Emails.send({
                "from": "Actoos Jobs <noreply@actoos.com>",
                "to": batch,
                "subject": req.subject,
                "html": req.content
            })
        return {"success": True, "message": f"Newsletter envoyée à {len(emails)} abonnés."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- Send Interview Link -----
@app.post("/api/send-interview-link")
async def send_interview_link(req: SendInterviewLinkRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        safe_job_title = clean_subject(req.job_title)
        company_info = f" chez {req.company_name}" if req.company_name else ""
        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": [req.email],
            "subject": f"Entretien pour le poste : {safe_job_title}",
            "html": f"<h2>Bonjour {req.candidate_name},</h2><p>Vous êtes invité à un entretien pour le poste <strong>{req.job_title}</strong>{company_info}.</p><p>Voici le lien de visioconférence :</p><p><a href=\"{req.meeting_link}\">{req.meeting_link}</a></p><p>À bientôt,</p><p>L'équipe Actoos Jobs</p>"
        })
        return {"success": True, "message": "Email envoyé avec succès."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- IA Agents -----
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
async def ai_agent(req: AIAgentRequest):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
    system_prompt = AGENT_PROMPTS.get(req.agent_id)
    if not system_prompt:
        raise HTTPException(status_code=400, detail="Invalid agent_id")
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Texte à améliorer :\n\n{req.text}" + (f"\n\nContexte supplémentaire : {req.context}" if req.context else "")}
    ]
    last_error = None
    for model in FALLBACK_MODELS:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "HTTP-Referer": "https://jobs.actoos.com", "X-Title": "Actoos Jobs AI"},
                    json={"model": model, "messages": messages, "temperature": 0.7, "max_tokens": 800}
                )
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    improved_text = data["choices"][0]["message"]["content"].strip()
                    return {"success": True, "result": improved_text, "model_used": model}
                if data.get("error", {}).get("code") == 429:
                    continue
                last_error = data
        except Exception as e:
            print(f"Erreur avec {model}: {str(e)}")
            continue
    raise HTTPException(status_code=502, detail=f"Tous les modèles ont échoué. Dernière erreur : {last_error}")

# ----- Uploads -----
@app.post("/api/upload")
async def upload_file(req: UploadRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase storage not configured")
    try:
        header, encoded = req.file_data.split(",", 1) if "," in req.file_data else ("", req.file_data)
        file_bytes = base64.b64decode(encoded)
        file_path = f"{req.folder}/{req.filename}"
        headers = {"Authorization": f"Bearer {supabase_key}", "apikey": supabase_key}
        upload_url = f"{supabase_url}/storage/v1/object/{req.bucket}/{file_path}"
        response = httpx.put(upload_url, headers=headers, content=file_bytes)
        if response.status_code != 200:
            raise Exception(f"Upload failed: {response.text}")
        public_url = f"{supabase_url}/storage/v1/object/public/{req.bucket}/{file_path}"
        return {"success": True, "url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-document")
async def upload_document(req: UploadDocumentRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase storage not configured")
    try:
        header, encoded = req.file_data.split(",", 1) if "," in req.file_data else ("", req.file_data)
        file_bytes = base64.b64decode(encoded)
        file_path = f"{req.user_id}/{req.filename}"
        upload_headers = {"Authorization": f"Bearer {supabase_key}", "apikey": supabase_key}
        upload_url = f"{supabase_url}/storage/v1/object/candidate-documents/{file_path}"
        response = httpx.put(upload_url, headers=upload_headers, content=file_bytes)
        if response.status_code != 200:
            raise Exception(f"Upload failed: {response.text}")
        public_url = f"{supabase_url}/storage/v1/object/public/candidate-documents/{file_path}"
        insert_headers = {"Authorization": f"Bearer {supabase_key}", "apikey": supabase_key, "Content-Type": "application/json", "Prefer": "return=representation"}
        insert_data = {"user_id": req.user_id, "name": req.filename, "file_url": public_url, "file_type": req.file_type}
        insert_response = httpx.post(f"{supabase_url}/rest/v1/candidate_documents", headers=insert_headers, json=insert_data)
        if insert_response.status_code not in [200, 201]:
            raise Exception(f"Insert failed: {insert_response.text}")
        return {"success": True, "url": public_url, "document": insert_response.json()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- Notifications -----
@app.post("/api/notify-new-application")
async def notify_new_application(req: NotifyNewApplicationRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": [req.recruiter_email],
            "subject": f"Nouvelle candidature pour {clean_subject(req.job_title)}",
            "html": f"<h2>Bonjour {req.recruiter_name},</h2><p><strong>{req.candidate_name}</strong> vient de postuler à votre offre <strong>{req.job_title}</strong>.</p><p>Consultez la candidature sur <a href=\"https://jobs.actoos.com/dashboard/entreprise/candidatures\">Actoos Jobs</a>.</p>"
        })
        return {"success": True, "message": "Email envoyé au recruteur."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

STATUS_EMAIL_TEMPLATES = {
    "viewed": "Votre candidature pour le poste **{job_title}**{company_info} a été consultée par le recruteur.",
    "shortlisted": "Félicitations ! Votre candidature pour le poste **{job_title}**{company_info} a été présélectionnée.",
    "interview": "Vous êtes invité à un entretien pour le poste **{job_title}**{company_info}. Le recruteur vous contactera pour convenir d'une date.",
    "accepted": "Votre candidature pour le poste **{job_title}**{company_info} a été acceptée.",
    "rejected": "Votre candidature pour le poste **{job_title}**{company_info} n'a malheureusement pas été retenue."
}

@app.post("/api/notify-status-change")
async def notify_status_change(req: NotifyStatusChangeRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    safe_job_title = clean_subject(req.job_title)
    company_info = f" chez {req.company_name}" if req.company_name else ""
    reason_text = f" Raison : {req.reason}" if req.new_status == "rejected" and req.reason else ""
    template = STATUS_EMAIL_TEMPLATES.get(req.new_status, "Votre candidature pour le poste **{job_title}**{company_info} a été mise à jour : {new_status}.")
    message = template.replace("{job_title}", req.job_title).replace("{company_info}", company_info).replace("{new_status}", req.new_status) + reason_text
    html = f"<h2>Bonjour {req.candidate_name},</h2><p>{message}</p><p>Consultez vos candidatures sur <a href=\"https://jobs.actoos.com/mes-candidatures\">Actoos Jobs</a>.</p>"
    try:
        resend.Emails.send({"from": "Actoos Jobs <noreply@actoos.com>", "to": [req.candidate_email], "subject": f"Votre candidature - {safe_job_title}", "html": html})
        return {"success": True, "message": "Email envoyé au candidat."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send-job-alerts")
async def send_job_alerts():
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    alerts_resp = httpx.get(f"{supabase_url}/rest/v1/job_alerts?select=*,user:users(email)&is_active=eq.true", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
    alerts = alerts_resp.json()
    if not isinstance(alerts, list) or len(alerts) == 0:
        return {"success": True, "message": "Aucune alerte active"}
    count_sent = 0
    for alert in alerts:
        user_email = alert.get("user", {}).get("email")
        user_id = alert.get("user_id")
        if not user_email or not user_id:
            continue
        keywords = [k.strip() for k in alert.get("keywords", "").split(",") if k.strip()]
        if not keywords:
            continue
        rpc_url = f"{supabase_url}/rest/v1/rpc/search_jobs_for_alert"
        payload = {"keywords": keywords, "user_id": user_id}
        rpc_resp = httpx.post(rpc_url, json=payload, headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        jobs = rpc_resp.json()
        if not isinstance(jobs, list) or len(jobs) == 0:
            continue
        job_links = "<br>".join([f"<a href='https://jobs.actoos.com/emplois/{j['id']}'>{j['title']}</a>" for j in jobs])
        try:
            resend.Emails.send({"from": "Actoos Jobs <noreply@actoos.com>", "to": [user_email], "subject": f"Alerte emploi : {', '.join(keywords)}", "html": f"<h2>Nouvelles offres correspondant à votre alerte</h2><p>Voici les offres trouvées pour vos mots-clés :</p>{job_links}<p>Bonne recherche !</p>"})
            count_sent += 1
        except Exception as e:
            print(f"Erreur envoi alerte {alert.get('id')}: {e}")
    return {"success": True, "message": f"Emails envoyés pour {count_sent} alerte(s)."}

# ----- Admin -----
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
            resend.Emails.send({
                "from": "Actoos Jobs <noreply@actoos.com>",
                "to": [owner_email],
                "subject": "Votre entreprise a été validée",
                "html": f"""
                    <h2>Félicitations {owner_first_name} !</h2>
                    <p>Votre entreprise <strong>{company['name']}</strong> a été validée par notre équipe. Vous pouvez maintenant publier des offres et recevoir des candidatures.</p>
                    <p><a href="https://jobs.actoos.com/dashboard/entreprise">Accéder à mon espace recruteur</a></p>
                """
            })
        return {"success": True, "message": "Entreprise validée et email envoyé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class NewCompanyNotificationRequest(BaseModel):
    company_name: str
    owner_email: str
    owner_name: str

@app.post("/api/notify-admin-new-company")
async def notify_admin_new_company(req: NewCompanyNotificationRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": ["contact@actoos.com"],
            "subject": f"Nouvelle entreprise à valider : {req.company_name}",
            "html": f"""
                <h2>Nouvelle entreprise en attente de validation</h2>
                <p><strong>Entreprise :</strong> {req.company_name}</p>
                <p><strong>Propriétaire :</strong> {req.owner_name} ({req.owner_email})</p>
                <p><a href="https://jobs.actoos.com/admin">Accéder au dashboard admin</a></p>
            """
        })
        return {"success": True, "message": "Notification envoyée à l'administrateur"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/reject-company")
async def admin_reject_company(req: AdminActionRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        company_resp = httpx.get(f"{supabase_url}/rest/v1/companies?id=eq.{req.id}&select=*,owner:users(email,first_name,last_name)", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        companies = company_resp.json()
        if not isinstance(companies, list) or len(companies) == 0:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        company = companies[0]
        httpx.patch(f"{supabase_url}/rest/v1/companies?id=eq.{req.id}", json={"is_verified": False, "is_active": False}, headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        owner_email = company.get("owner", {}).get("email")
        if owner_email and resend.api_key:
            resend.Emails.send({"from": "Actoos Jobs <noreply@actoos.com>", "to": [owner_email], "subject": "Votre entreprise a été refusée", "html": f"<h2>Désolé {company['owner']['first_name']}</h2><p>Votre entreprise <strong>{company['name']}</strong> n'a pas été validée.</p><p><strong>Raison :</strong> {req.reason or 'Non spécifiée'}</p>"})
        return {"success": True, "message": "Entreprise rejetée"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/suspend-company")
async def admin_suspend_company(req: AdminActionRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        company_resp = httpx.get(f"{supabase_url}/rest/v1/companies?id=eq.{req.id}&select=*,owner:users(email,first_name,last_name)", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        companies = company_resp.json()
        if not isinstance(companies, list) or len(companies) == 0:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        company = companies[0]
        httpx.patch(f"{supabase_url}/rest/v1/companies?id=eq.{req.id}", json={"is_active": False, "is_verified": False}, headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        owner_email = company.get("owner", {}).get("email")
        if owner_email and resend.api_key:
            resend.Emails.send({"from": "Actoos Jobs <noreply@actoos.com>", "to": [owner_email], "subject": "Votre entreprise a été suspendue", "html": f"<h2>Information importante</h2><p>Votre entreprise <strong>{company['name']}</strong> a été suspendue.</p><p><strong>Raison :</strong> {req.reason or 'Non spécifiée'}</p>"})
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
        job_resp = httpx.get(f"{supabase_url}/rest/v1/jobs?id=eq.{req.id}&select=*,company:companies(name),posted_by_user:users(email,first_name,last_name)", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        jobs = job_resp.json()
        if not isinstance(jobs, list) or len(jobs) == 0:
            raise HTTPException(status_code=404, detail="Offre non trouvée")
        job = jobs[0]
        httpx.patch(f"{supabase_url}/rest/v1/jobs?id=eq.{req.id}", json={"status": "suspended"}, headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        owner_email = job.get("posted_by_user", {}).get("email")
        if owner_email and resend.api_key:
            resend.Emails.send({"from": "Actoos Jobs <noreply@actoos.com>", "to": [owner_email], "subject": "Votre offre a été suspendue", "html": f"<h2>Votre offre \"{job['title']}\" a été suspendue</h2><p><strong>Raison :</strong> {req.reason or 'Non spécifiée'}</p>"})
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
        job_resp = httpx.get(f"{supabase_url}/rest/v1/jobs?id=eq.{req.id}&select=title,posted_by_user:users(email,first_name,last_name)", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        jobs = job_resp.json()
        if not isinstance(jobs, list) or len(jobs) == 0:
            raise HTTPException(status_code=404, detail="Offre non trouvée")
        job = jobs[0]
        httpx.delete(f"{supabase_url}/rest/v1/jobs?id=eq.{req.id}", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        owner_email = job.get("posted_by_user", {}).get("email")
        if owner_email and resend.api_key:
            resend.Emails.send({"from": "Actoos Jobs <noreply@actoos.com>", "to": [owner_email], "subject": "Votre offre a été supprimée", "html": f"<h2>Votre offre \"{job['title']}\" a été supprimée par l'administrateur</h2><p><strong>Raison :</strong> {req.reason or 'Non spécifiée'}</p>"})
        return {"success": True, "message": "Offre supprimée"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- Reports -----
@app.post("/api/report")
async def create_report(req: ReportRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        response = httpx.post(
            f"{supabase_url}/rest/v1/reports",
            json={
                "reporter_id": req.reporter_id,
                "reported_item_type": req.reported_item_type,
                "reported_item_id": req.reported_item_id,
                "reason": req.reason,
                "status": "pending"
            },
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
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
        response = httpx.get(f"{supabase_url}/rest/v1/reports?select=*,reporter:users(email,first_name,last_name)&order=created_at.desc", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        reports = response.json()
        return {"success": True, "reports": reports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/admin/reports/{report_id}")
async def update_report_status(report_id: str, status: str = "reviewed"):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        response = httpx.patch(f"{supabase_url}/rest/v1/reports?id=eq.{report_id}", json={"status": status}, headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        if response.status_code != 200:
            raise Exception(f"Report update failed: {response.text}")
        return {"success": True, "message": "Statut du signalement mis à jour"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/toggle-user-status")
async def toggle_user_status(req: AdminToggleUserStatusRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        user_resp = httpx.get(f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}&select=email,first_name,last_name", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        users = user_resp.json()
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        user = users[0]
        httpx.patch(f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}", json={"is_active": req.is_active}, headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        if resend.api_key:
            status_text = "réactivé" if req.is_active else "suspendu"
            resend.Emails.send({"from": "Actoos Jobs <noreply@actoos.com>", "to": [user["email"]], "subject": f"Votre compte a été {status_text}", "html": f"<h2>Bonjour {user['first_name']},</h2><p>Votre compte sur Actoos Jobs a été {status_text}.</p><p>Si vous avez des questions, contactez-nous.</p>"})
        return {"success": True, "message": f"Compte {status_text}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/ban-user")
async def ban_user(req: AdminBanUserRequest):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        user_resp = httpx.get(f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}&select=email,first_name,last_name", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        users = user_resp.json()
        if not isinstance(users, list) or len(users) == 0:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        user = users[0]
        httpx.patch(f"{supabase_url}/rest/v1/users?id=eq.{req.user_id}", json={"is_active": False, "is_banned": True}, headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
        if resend.api_key:
            resend.Emails.send({"from": "Actoos Jobs <noreply@actoos.com>", "to": [user["email"]], "subject": "Votre compte a été banni", "html": f"<h2>Bonjour {user['first_name']},</h2><p>Votre compte sur Actoos Jobs a été banni définitivement.</p><p><strong>Raison :</strong> {req.reason or 'Non spécifiée'}</p>"})
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
            f"{supabase_url}/rest/v1/companies?select=id,name,cancellation_reason,subscription_plan,updated_at&cancellation_reason=not.is.null&order=updated_at.desc",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        )
        companies = resp.json()
        return {"success": True, "cancellations": companies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
def compute_match_score(job: dict, candidate_profile: dict) -> int:
    score = 0
    # Compétences (60 points)
    job_skills = job.get("skills_required") or []
    cand_skills = candidate_profile.get("skills") or []
    if job_skills:
        common = set(job_skills) & set(cand_skills)
        score += (len(common) / len(job_skills)) * 60

    # Niveau d'expérience (20 points)
    exp_levels = ["junior", "intermediaire", "senior", "expert"]
    job_lvl = job.get("experience_level")
    cand_lvl = candidate_profile.get("experience_level")
    if job_lvl and cand_lvl and job_lvl in exp_levels and cand_lvl in exp_levels:
        diff = abs(exp_levels.index(job_lvl) - exp_levels.index(cand_lvl))
        if diff == 0:
            score += 20
        elif diff == 1:
            score += 10
        else:
            score += 5

    # Prétentions salariales (20 points)
    j_min, j_max = job.get("salary_min"), job.get("salary_max")
    c_min, c_max = candidate_profile.get("desired_salary_min"), candidate_profile.get("desired_salary_max")
    if j_min and j_max and c_min and c_max:
        if c_min <= j_max and c_max >= j_min:
            score += 20
        elif c_min <= j_max or c_max >= j_min:
            score += 10

    return min(score, 100)

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
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)