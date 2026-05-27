from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import os
import stripe
from dotenv import load_dotenv
import resend
import httpx
from supabase import create_client, Client

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

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
            
            if session.mode == "subscription" and session.metadata.get("user_id"):
                user_id = session.metadata.get("user_id")
                subscription_id = session.subscription
                plan = session.metadata.get("package_id", "pro_monthly")
                try:
                    supabase.table("companies").update({
                        "stripe_subscription_id": subscription_id,
                        "subscription_plan": plan,
                        "subscription_expires_at": None
                    }).eq("owner_id", user_id).execute()
                except Exception as e:
                    print(f"Erreur enregistrement abonnement: {e}")
        
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
    "interview-tips": "Donne des conseils personnalisés pour réussir l'entretien ciblant ce poste spécifique. Inclus des recommandations sur la tenue, le langage corporel, les questions à poser, et les points à mettre en avant. Maximum 5 conseils. Retourne une liste à puces."
}

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
                    "model": "google/gemini-2.0-flash-lite-preview-02-05:free",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 800,
                }
            )
            data = response.json()
            improved_text = data["choices"][0]["message"]["content"].strip()
            return {"success": True, "result": improved_text}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

@app.post("/api/subscription/cancel")
async def cancel_subscription(req: CancelSubscriptionRequest):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    try:
        company_res = supabase.table("companies").select("id, stripe_subscription_id").eq("owner_id", req.user_id).single().execute()
        if not company_res.data:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        company = company_res.data
        if not company.get("stripe_subscription_id"):
            raise HTTPException(status_code=400, detail="Aucun abonnement actif")
        
        stripe.Subscription.delete(company["stripe_subscription_id"])
        
        supabase.table("companies").update({
            "stripe_subscription_id": None,
            "subscription_plan": "free",
            "subscription_expires_at": None
        }).eq("id", company["id"]).execute()
        
        return {"success": True, "message": "Abonnement résilié avec succès."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
