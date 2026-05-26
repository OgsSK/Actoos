from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Actoos Jobs API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stripe integration
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionRequest, 
    CheckoutSessionResponse,
    CheckoutStatusResponse
)

# Fixed pricing packages (amounts in EUR)
SUBSCRIPTION_PLANS = {
    "pro_monthly": {"amount": 49.00, "name": "Plan Pro - Mensuel", "type": "subscription"},
    "business_monthly": {"amount": 149.00, "name": "Plan Business - Mensuel", "type": "subscription"},
}

BOOST_PACKAGES = {
    "boost_7": {"amount": 9.99, "name": "Boost 7 jours", "days": 7},
    "boost_14": {"amount": 17.99, "name": "Boost 14 jours", "days": 14},
    "boost_30": {"amount": 29.99, "name": "Boost 30 jours", "days": 30},
    "featured": {"amount": 49.99, "name": "A la une (30 jours)", "days": 30},
}

# In-memory transaction store (in production, use Supabase)
payment_transactions = {}


class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str
    job_id: Optional[str] = None
    user_email: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "actoos-jobs-api"}


@app.get("/api/pricing")
async def get_pricing():
    """Get all available pricing packages"""
    return {
        "subscriptions": SUBSCRIPTION_PLANS,
        "boosts": BOOST_PACKAGES,
        "currency": "EUR"
    }


@app.post("/api/checkout/session")
async def create_checkout_session(request: Request, checkout_request: CheckoutRequest):
    """Create a Stripe checkout session"""
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Get package details
    package_id = checkout_request.package_id
    
    if package_id in SUBSCRIPTION_PLANS:
        package = SUBSCRIPTION_PLANS[package_id]
    elif package_id in BOOST_PACKAGES:
        package = BOOST_PACKAGES[package_id]
    else:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    # Build URLs
    origin = checkout_request.origin_url
    success_url = f"{origin}/paiement/succes?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/paiement/annule"
    
    # Build metadata
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
    
    # Initialize Stripe
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Create checkout request
    checkout_req = CheckoutSessionRequest(
        amount=float(package["amount"]),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    # Create session
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)
    
    # Store transaction (pending)
    payment_transactions[session.session_id] = {
        "session_id": session.session_id,
        "package_id": package_id,
        "amount": package["amount"],
        "currency": "eur",
        "status": "pending",
        "payment_status": "initiated",
        "metadata": metadata
    }
    
    return {
        "url": session.url,
        "session_id": session.session_id
    }


@app.get("/api/checkout/status/{session_id}")
async def get_checkout_status(session_id: str):
    """Get the status of a checkout session"""
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction status
        if session_id in payment_transactions:
            tx = payment_transactions[session_id]
            if tx["payment_status"] != "paid" and status.payment_status == "paid":
                tx["payment_status"] = "paid"
                tx["status"] = "completed"
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update transaction based on event
        if webhook_response.session_id and webhook_response.session_id in payment_transactions:
            tx = payment_transactions[webhook_response.session_id]
            tx["payment_status"] = webhook_response.payment_status
            
            if webhook_response.payment_status == "paid":
                tx["status"] = "completed"
            elif webhook_response.event_type == "checkout.session.expired":
                tx["status"] = "expired"
        
        return {"received": True}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"received": True, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
