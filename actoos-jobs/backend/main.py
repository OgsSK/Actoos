import base64
import uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import os
import stripe
from dotenv import load_dotenv
import resend
import httpx
import random

load_dotenv()

app = FastAPI(title="Actoos Jobs API")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

resend.api_key = os.environ.get("RESEND_API_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

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

class SendInterviewLinkRequest(BaseModel):
    email: str
    candidate_name: str
    job_title: str
    meeting_link: str

# ----- Endpoints basiques -----
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

# ----- Stripe -----
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

# ----- Resend (emails) -----
@app.post("/api/contact")
async def contact_form(contact: ContactRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        r = resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": ["contact@actoos.com"],
            "reply_to": contact.email,
            "subject": f"[Contact] {contact.subject}",
            "html": f"""
                <h2>Nouveau message de {contact.name}</h2>
                <p><strong>Email :</strong> {contact.email}</p>
                <p><strong>Sujet :</strong> {contact.subject}</p>
                <p><strong>Message :</strong></p>
                <p>{contact.message}</p>
            """
        })
        return {"success": True, "message": "Votre message a bien été envoyé."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/newsletter")
async def newsletter_subscribe(req: NewsletterRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        r = resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": [req.email],
            "subject": "Bienvenue à la newsletter Actoos Jobs",
            "html": """
                <h1>Merci de vous être inscrit !</h1>
                <p>Vous recevrez nos derniers conseils et offres d'emploi.</p>
            """
        })
        return {"success": True, "message": "Inscription réussie. Vérifiez votre boîte mail."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send-interview-link")
async def send_interview_link(req: SendInterviewLinkRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    try:
        r = resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": [req.email],
            "subject": f"Entretien pour le poste : {req.job_title}",
            "html": f"""
                <h2>Bonjour {req.candidate_name},</h2>
                <p>Vous êtes invité à un entretien pour le poste <strong>{req.job_title}</strong>.</p>
                <p>Voici le lien de visioconférence :</p>
                <p><a href="{req.meeting_link}">{req.meeting_link}</a></p>
                <p>À bientôt,</p>
                <p>L'équipe Actoos Jobs</p>
            """
        })
        return {"success": True, "message": "Email envoyé avec succès."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- IA : +50 agents et fallback multi-modèles -----

AGENT_PROMPTS = {
    # Offres d'emploi
    "job-description": "Tu es un expert en recrutement au Mali. Améliore le texte suivant pour une offre d'emploi. Rend-le attractif, clair, bien structuré, et inclusif. Retourne uniquement le texte amélioré, sans commentaire.",
    "job-title": "Génère 3 titres d'offre d'emploi accrocheurs (maximum 10 mots chacun) à partir de la description suivante. Retourne les titres sous forme de liste numérotée, sans commentaire.",
    "job-requirements": "Reformule la section 'Profil recherché' ou 'Compétences requises' suivante de manière professionnelle, en utilisant des verbes d'action. Retourne uniquement le texte reformulé.",
    "job-missions": "Reformule la liste des missions ou responsabilités du poste ci-dessous en les rendant dynamiques et motivantes. Retourne uniquement le texte reformulé.",
    "job-benefits": "Rédige une liste d'avantages attractifs pour les employés à partir de la description de l'entreprise. Retourne une liste à puces.",
    "job-summary": "Résume l'offre d'emploi en un paragraphe de 3-4 phrases percutantes. Retourne uniquement le résumé.",
    "job-keywords": "Extrais 5 à 10 mots-clés pertinents pour cette offre d'emploi. Retourne une liste séparée par des virgules.",
    "job-salary-text": "Rédige une phrase attractive sur la rémunération à partir des chiffres fournis. Retourne uniquement la phrase.",
    "job-company-presentation": "Rédige un court paragraphe de présentation de l'entreprise pour une offre d'emploi. Retourne uniquement le texte.",
    "job-category-suggestion": "Suggère la catégorie d'emploi la plus appropriée pour cette offre. Retourne uniquement le nom de la catégorie.",

    # CV et profil candidat
    "cv-summary": "Tu es un coach en carrière. Résume en 2-3 phrases percutantes le profil candidat ci-dessous, en mettant en avant ses compétences et sa valeur ajoutée. Retourne uniquement le résumé, sans commentaire.",
    "cv-experience": "Reformule l'expérience professionnelle suivante en utilisant des verbes d'action et en quantifiant les résultats. Garde le même sens mais rends-le plus impactant. Retourne uniquement la version reformulée.",
    "cv-skills": "À partir de la description d'expérience ou du texte suivant, extrais et suggère une liste de compétences clés pertinentes (5 à 10 compétences). Retourne la liste sous forme de puces, sans commentaire.",
    "cv-education": "Reformule la formation ou le diplôme suivant pour le mettre en valeur. Retourne uniquement la version reformulée.",
    "cv-hobbies": "Suggère 3-4 loisirs ou centres d'intérêt pertinents à mentionner sur un CV, en fonction du profil. Retourne une liste.",
    "cv-linkedin-headline": "Crée un titre accrocheur pour un profil LinkedIn (maximum 120 caractères) basé sur le profil. Retourne uniquement le titre.",
    "cv-cover-letter-intro": "Rédige une introduction percutante pour une lettre de motivation. Retourne uniquement le paragraphe d'introduction.",
    "cv-cover-letter-body": "Rédige le corps d'une lettre de motivation mettant en avant les compétences pour le poste. Retourne uniquement le texte.",
    "cv-cover-letter-conclusion": "Rédige une conclusion polie et motivée pour une lettre de motivation. Retourne uniquement la conclusion.",
    "cv-full-letter": "Assemble et génère une lettre de motivation complète à partir des éléments fournis. Retourne la lettre entière.",

    # Entretien
    "interview-questions": "Génère 5 à 7 questions d'entretien probables basées sur l'offre d'emploi et le profil du candidat. Alterne entre questions techniques, comportementales et de motivation. Retourne une liste numérotée.",
    "interview-answers": "Pour chaque question d'entretien fournie, propose une réponse type structurée et convaincante. Utilise la méthode STAR quand c'est pertinent. Retourne les questions et les réponses.",
    "interview-tips": "Donne des conseils personnalisés pour réussir l'entretien ciblant ce poste spécifique. Inclus des recommandations sur la tenue, le langage corporel, les questions à poser, et les points à mettre en avant. Maximum 5 conseils. Retourne une liste à puces.",
    "interview-followup-email": "Rédige un email de remerciement après un entretien, personnalisé pour le candidat et l'entreprise. Retourne uniquement le texte de l'email.",
    "interview-self-evaluation": "Aide le candidat à évaluer sa performance en entretien en posant 5 questions d'auto-évaluation. Retourne une liste.",
    "interview-negotiation-tips": "Donne 5 conseils pour négocier son salaire ou ses avantages après une offre. Retourne une liste.",
    "interview-body-language": "Liste 5 points clés sur le langage corporel à adopter en entretien. Retourne une liste.",
    "interview-questions-to-ask": "Suggère 5 questions pertinentes que le candidat peut poser au recruteur. Retourne une liste.",
    "interview-virtual-tips": "Donne 5 conseils spécifiques pour réussir un entretien en visioconférence. Retourne une liste.",
    "interview-dress-code": "Conseille la tenue vestimentaire appropriée pour un entretien dans ce secteur. Retourne un court paragraphe.",

    # Recruteur / Entreprise
    "recruiter-screening-questions": "Génère 5 questions de présélection téléphonique pour ce poste. Retourne une liste.",
    "recruiter-job-posting-optimization": "Optimise le texte de l'offre pour attirer plus de candidats qualifiés. Retourne le texte amélioré.",
    "recruiter-candidate-evaluation": "Aide à évaluer un candidat en listant 5 critères objectifs basés sur l'offre. Retourne une liste.",
    "recruiter-rejection-email": "Rédige un email de refus poli et encourageant pour un candidat. Retourne uniquement le texte de l'email.",
    "recruiter-acceptance-email": "Rédige un email d'acceptation chaleureux pour un candidat retenu. Retourne uniquement le texte.",
    "recruiter-onboarding-plan": "Suggère un plan d'intégration de 5 étapes pour un nouveau collaborateur. Retourne une liste.",
    "recruiter-employer-branding": "Donne 5 idées pour améliorer la marque employeur de l'entreprise. Retourne une liste.",
    "recruiter-diversity-tips": "Donne 5 conseils pour rédiger une offre inclusive et attirer la diversité. Retourne une liste.",
    "recruiter-salary-benchmark": "Estime une fourchette de salaire pour ce poste au Mali. Retourne la fourchette avec une brève explication.",
    "recruiter-job-description-template": "Crée un modèle d'offre d'emploi structuré pour ce type de poste. Retourne le modèle.",

    # Carrière & développement
    "career-advice": "Donne 3 conseils de carrière personnalisés basés sur le profil. Retourne une liste.",
    "career-switch": "Suggère 3 pistes de reconversion professionnelle en fonction des compétences actuelles. Retourne une liste.",
    "career-goals": "Aide à définir 3 objectifs de carrière à court/moyen terme. Retourne une liste.",
    "career-skills-gap": "Identifie 3 compétences manquantes pour évoluer vers un poste supérieur. Retourne une liste.",
    "career-networking": "Donne 5 conseils pour développer son réseau professionnel. Retourne une liste.",
    "career-personal-branding": "Donne 5 astuces pour améliorer sa marque personnelle en ligne. Retourne une liste.",
    "career-mentoring": "Explique comment trouver un mentor et 3 questions à lui poser. Retourne un court paragraphe.",
    "career-freelance": "Donne 5 conseils pour se lancer en freelance dans ce domaine. Retourne une liste.",
    "career-remote-work": "Donne 5 conseils pour réussir en télétravail. Retourne une liste.",
    "career-burnout": "Donne 5 signes avant-coureurs de burnout et comment les éviter. Retourne une liste.",

    # Légal / administratif
    "legal-contract-tips": "Liste 5 points à vérifier dans un contrat de travail. Retourne une liste.",
    "legal-nda": "Explique brièvement ce qu'est un accord de confidentialité. Retourne un court paragraphe.",
    "legal-non-compete": "Explique les implications d'une clause de non-concurrence. Retourne un court paragraphe.",

    # Général / Utilitaires
    "translate-french": "Traduis le texte suivant en français. Retourne uniquement la traduction.",
    "summarize": "Résume le texte suivant en 3 phrases maximum. Retourne uniquement le résumé.",
    "improve-text": "Améliore la clarté et le style du texte suivant. Retourne uniquement le texte amélioré.",
    "cv-analysis": "Tu es un expert en recrutement et en rédaction de CV. Analyse le CV suivant et donne 3 à 5 suggestions concrètes pour l'améliorer, sans le réécrire. Mentionne les points faibles, les incohérences, et les éléments manquants. Sois constructif. Retourne uniquement les suggestions, sous forme de liste à puces.",
}

# Modèles de fallback (gratuits et fiables)
FALLBACK_MODELS = [
    "mistralai/mistral-7b-instruct:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-2-13b-chat:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "openai/gpt-3.5-turbo",   # payant mais fiable si les gratuits sont tous limités
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
        {"role": "user", "content": f"Texte à améliorer :\n\n{req.text}" +
                                      (f"\n\nContexte supplémentaire : {req.context}" if req.context else "")}
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
                        "X-Title": "Actoos Jobs AI",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 800,
                    }
                )
                data = response.json()

                if "choices" in data and len(data["choices"]) > 0:
                    improved_text = data["choices"][0]["message"]["content"].strip()
                    return {"success": True, "result": improved_text, "model_used": model}

                if data.get("error", {}).get("code") == 429:
                    print(f"Rate‑limit avec {model}, essai suivant…")
                    continue

                last_error = data
        except Exception as e:
            print(f"Erreur avec {model}: {str(e)}")
            continue

    raise HTTPException(status_code=502, detail=f"Tous les modèles ont échoué. Dernière erreur : {last_error}")

import base64
import uuid

class UploadRequest(BaseModel):
    bucket: str
    folder: str
    filename: str
    file_data: str

@app.post("/api/upload")
async def upload_file(req: UploadRequest):
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase storage not configured")
    
    try:
        header, encoded = req.file_data.split(",", 1) if "," in req.file_data else ("", req.file_data)
        file_bytes = base64.b64decode(encoded)
        file_path = f"{req.folder}/{req.filename}"
        
        headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": SUPABASE_SERVICE_ROLE_KEY
        }
        
        upload_url = f"{SUPABASE_URL}/storage/v1/object/{req.bucket}/{file_path}"
        response = httpx.put(upload_url, headers=headers, content=file_bytes)
        
        if response.status_code != 200:
            raise Exception(f"Upload failed: {response.text}")
        
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{req.bucket}/{file_path}"
        return {"success": True, "url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
class NotifyStatusChangeRequest(BaseModel):
    candidate_email: str
    candidate_name: str
    job_title: str
    new_status: str

STATUS_EMAIL_TEMPLATES = {
    "viewed": "Votre candidature pour le poste **{job_title}** a été consultée par le recruteur.",
    "shortlisted": "Félicitations ! Votre candidature pour le poste **{job_title}** a été présélectionnée.",
    "interview": "Vous êtes invité à un entretien pour le poste **{job_title}**. Le recruteur vous contactera pour convenir d'une date.",
    "accepted": "Votre candidature pour le poste **{job_title}** a été acceptée. Le recruteur va prendre contact avec vous.",
    "rejected": "Votre candidature pour le poste **{job_title}** n'a malheureusement pas été retenue. Nous vous encourageons à continuer vos recherches."
}

@app.post("/api/notify-status-change")
async def notify_status_change(req: NotifyStatusChangeRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")

    message = STATUS_EMAIL_TEMPLATES.get(req.new_status, f"Votre candidature pour le poste **{req.job_title}** a été mise à jour : {req.new_status}.")
    html = f"""
        <h2>Bonjour {req.candidate_name},</h2>
        <p>{message}</p>
        <p>Consultez vos candidatures sur <a href="https://jobs.actoos.com/mes-candidatures">Actoos Jobs</a>.</p>
    """

    try:
        resend.Emails.send({
            "from": "Actoos Jobs <noreply@actoos.com>",
            "to": [req.candidate_email],
            "subject": f"Votre candidature - {req.job_title}",
            "html": html
        })
        return {"success": True, "message": "Email de notification envoyé."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))