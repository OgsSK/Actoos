"""
Client Statement routes - Monthly statements generation and sending
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
import logging

from auth import require_admin
from dependencies import db, serialize_doc, log_action
from statement_generator import generate_monthly_statements, generate_client_statement_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/statements", tags=["Statements"])


@router.get("/preview/{client_id}")
async def preview_client_statement(
    client_id: str,
    month: int = None,
    year: int = None,
    current_user: dict = Depends(require_admin)
):
    """Preview a client's statement PDF"""
    # Default to previous month
    if month is None or year is None:
        today = datetime.now(timezone.utc)
        last_month = today - relativedelta(months=1)
        month = last_month.month
        year = last_month.year
    
    # Calculate period
    period_start = datetime(year, month, 1, tzinfo=timezone.utc)
    period_end = period_start + relativedelta(months=1)
    
    # Get entreprise
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    
    # Get client
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get invoices for this period
    factures = await db.factures.find(
        {
            "entreprise_id": current_user["entreprise_id"],
            "client_id": client_id,
            "created_at": {
                "$gte": period_start.isoformat(),
                "$lt": period_end.isoformat()
            }
        },
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Generate PDF
    pdf_bytes = generate_client_statement_pdf(
        entreprise=entreprise,
        client=client,
        factures=factures,
        period_start=period_start,
        period_end=period_end
    )
    
    # Generate filename
    client_name = f"{client.get('prenom', '')}_{client.get('nom', '')}".strip().replace(' ', '_')
    filename = f"releve_{client_name}_{month:02d}_{year}.pdf"
    
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/generate")
async def generate_all_statements(
    month: int = None,
    year: int = None,
    current_user: dict = Depends(require_admin)
):
    """Generate statements for all clients with invoices in the period"""
    statements = await generate_monthly_statements(
        db=db,
        entreprise_id=current_user["entreprise_id"],
        month=month,
        year=year
    )
    
    # Return summary (without PDF bytes)
    return {
        "period": f"{month or (datetime.now().month - 1):02d}/{year or datetime.now().year}",
        "generated": len(statements),
        "clients": [
            {
                "client_id": s["client_id"],
                "client_name": s["client_name"],
                "client_email": s["client_email"],
                "facture_count": s["facture_count"]
            }
            for s in statements
        ]
    }


@router.post("/send")
async def send_statements(
    background_tasks: BackgroundTasks,
    month: int = None,
    year: int = None,
    current_user: dict = Depends(require_admin)
):
    """Generate and send statements to all clients with invoices"""
    from email_service import send_email_with_attachment
    
    # Generate statements
    statements = await generate_monthly_statements(
        db=db,
        entreprise_id=current_user["entreprise_id"],
        month=month,
        year=year
    )
    
    # Get entreprise for email
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "nom": 1, "email": 1}
    )
    
    sent_count = 0
    failed_count = 0
    
    for statement in statements:
        if not statement.get("client_email"):
            failed_count += 1
            continue
        
        try:
            # Prepare email
            period = statement["period"]
            subject = f"Votre relevé de compte - {period} - {entreprise.get('nom', '')}"
            
            html_content = f"""
            <h2>Relevé de compte</h2>
            <p>Bonjour {statement['client_name']},</p>
            <p>Veuillez trouver ci-joint votre relevé de compte pour la période {period}.</p>
            <p>Ce relevé inclut {statement['facture_count']} facture(s).</p>
            <p>Pour toute question, n'hésitez pas à nous contacter.</p>
            <p>Cordialement,<br>{entreprise.get('nom', '')}</p>
            """
            
            # Send email with PDF attachment
            filename = f"releve_{period.replace('/', '_')}.pdf"
            
            # Queue email sending in background
            background_tasks.add_task(
                send_email_with_attachment,
                to_email=statement["client_email"],
                subject=subject,
                html_content=html_content,
                attachment_bytes=statement["pdf_bytes"],
                attachment_filename=filename,
                from_name=entreprise.get('nom', 'Actoos')
            )
            
            sent_count += 1
            
            # Log the action
            await log_action(
                current_user["entreprise_id"],
                current_user["user_id"],
                "send_statement",
                "client",
                statement["client_id"],
                {"period": period, "email": statement["client_email"]}
            )
            
        except Exception as e:
            logger.error(f"Error sending statement to {statement['client_email']}: {e}")
            failed_count += 1
    
    return {
        "message": f"Envoi des relevés en cours",
        "queued": sent_count,
        "failed": failed_count,
        "total": len(statements)
    }


@router.get("/history")
async def get_statement_history(
    limit: int = 20,
    current_user: dict = Depends(require_admin)
):
    """Get history of sent statements"""
    logs = await db.audit_logs.find(
        {
            "entreprise_id": current_user["entreprise_id"],
            "action": "send_statement"
        },
        {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    
    return [serialize_doc(log) for log in logs]
