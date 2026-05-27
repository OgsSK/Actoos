from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import os
import stripe
from dotenv import load_dotenv

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
    metadata: Optional[Dict[str, str]] = None

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
            event = stripe.Event.construct_from(request.json(), stripe.api_key)
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)