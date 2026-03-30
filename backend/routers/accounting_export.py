"""
Accounting Export Router - Export data for accounting software (Enterprise only)
Supports CSV and Excel formats for factures, devis, and payments
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import csv
import io
import logging

from auth import get_current_user, require_admin
from dependencies import db, serialize_doc
from plan_limits import check_feature

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export", tags=["Accounting Export"])


async def verify_export_access(current_user: dict):
    """Verify user has accounting_export feature (Enterprise only)"""
    has_feature = await check_feature(db, current_user["entreprise_id"], "accounting_export")
    if not has_feature:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_not_available",
                "message": "L'export comptable est disponible uniquement avec le plan Enterprise (129€/mois).",
                "feature": "accounting_export",
                "required_plan": "enterprise"
            }
        )
    return True


@router.get("/factures")
async def export_factures_csv(
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    statut: Optional[str] = None,
    format: str = "csv",
    current_user: dict = Depends(require_admin)
):
    """
    Export factures for accounting (Enterprise only)
    Returns CSV file with all facture details for import into accounting software
    """
    await verify_export_access(current_user)
    
    # Build query
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if date_debut:
        query["created_at"] = {"$gte": date_debut}
    if date_fin:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_fin
        else:
            query["created_at"] = {"$lte": date_fin}
    if statut:
        query["statut"] = statut
    
    factures = await db.factures.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    
    # Get entreprise info
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "nom": 1, "siret": 1}
    )
    
    # Prepare CSV
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    
    # Header
    writer.writerow([
        "Numéro Facture",
        "Date Création",
        "Date Échéance",
        "Client ID",
        "Client Nom",
        "Statut",
        "Total HT",
        "Total TVA",
        "Total TTC",
        "Devise",
        "Date Paiement",
        "Mode Paiement",
        "Référence Devis",
        "Intervention ID",
        "Entreprise SIRET"
    ])
    
    # Data rows
    for facture in factures:
        # Get client name
        client = await db.clients.find_one({"id": facture.get("client_id")}, {"_id": 0, "nom": 1, "prenom": 1})
        client_nom = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else ""
        
        writer.writerow([
            facture.get("numero_facture", ""),
            facture.get("created_at", "")[:10] if facture.get("created_at") else "",
            facture.get("date_echeance", "")[:10] if facture.get("date_echeance") else "",
            facture.get("client_id", ""),
            client_nom,
            facture.get("statut", ""),
            f"{facture.get('total_ht', 0):.2f}",
            f"{facture.get('total_tva', 0):.2f}",
            f"{facture.get('total_ttc', 0):.2f}",
            "EUR",
            facture.get("paid_at", "")[:10] if facture.get("paid_at") else "",
            facture.get("payment_method", ""),
            facture.get("numero_devis_origine", ""),
            facture.get("intervention_id", ""),
            entreprise.get("siret", "") if entreprise else ""
        ])
    
    output.seek(0)
    
    # Generate filename
    today = datetime.now().strftime("%Y%m%d")
    filename = f"export_factures_{today}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),  # UTF-8 with BOM for Excel
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/factures-lignes")
async def export_factures_lignes_csv(
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """
    Export facture lines for detailed accounting (Enterprise only)
    Each line item appears as a separate row
    """
    await verify_export_access(current_user)
    
    # Build query
    query = {"entreprise_id": current_user["entreprise_id"]}
    if date_debut:
        query["created_at"] = {"$gte": date_debut}
    if date_fin:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_fin
        else:
            query["created_at"] = {"$lte": date_fin}
    
    factures = await db.factures.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    
    # Prepare CSV
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    
    # Header
    writer.writerow([
        "Numéro Facture",
        "Date",
        "Client",
        "Description Ligne",
        "Quantité",
        "Prix Unitaire HT",
        "TVA %",
        "Montant HT",
        "Montant TVA",
        "Montant TTC"
    ])
    
    # Data rows - one per ligne
    for facture in factures:
        client = await db.clients.find_one({"id": facture.get("client_id")}, {"_id": 0, "nom": 1, "prenom": 1})
        client_nom = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else ""
        
        for ligne in facture.get("lignes", []):
            qte = ligne.get("quantite", 1)
            prix = ligne.get("prix_unitaire", 0)
            tva_pct = ligne.get("tva", 20)
            montant_ht = qte * prix
            montant_tva = montant_ht * tva_pct / 100
            montant_ttc = montant_ht + montant_tva
            
            writer.writerow([
                facture.get("numero_facture", ""),
                facture.get("created_at", "")[:10] if facture.get("created_at") else "",
                client_nom,
                ligne.get("description", ""),
                qte,
                f"{prix:.2f}",
                f"{tva_pct:.1f}",
                f"{montant_ht:.2f}",
                f"{montant_tva:.2f}",
                f"{montant_ttc:.2f}"
            ])
    
    output.seek(0)
    
    today = datetime.now().strftime("%Y%m%d")
    filename = f"export_factures_lignes_{today}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/clients")
async def export_clients_csv(
    current_user: dict = Depends(require_admin)
):
    """Export clients list (Enterprise only)"""
    await verify_export_access(current_user)
    
    clients = await db.clients.find(
        {"entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    ).sort("nom", 1).to_list(10000)
    
    # Prepare CSV
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    
    writer.writerow([
        "ID Client",
        "Nom",
        "Prénom",
        "Email",
        "Téléphone",
        "Adresse",
        "Code Postal",
        "Ville",
        "Date Création"
    ])
    
    for client in clients:
        writer.writerow([
            client.get("id", ""),
            client.get("nom", ""),
            client.get("prenom", ""),
            client.get("email", ""),
            client.get("telephone", ""),
            client.get("adresse", ""),
            client.get("code_postal", ""),
            client.get("ville", ""),
            client.get("created_at", "")[:10] if client.get("created_at") else ""
        ])
    
    output.seek(0)
    
    today = datetime.now().strftime("%Y%m%d")
    filename = f"export_clients_{today}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/journal")
async def export_journal_comptable(
    date_debut: str,
    date_fin: str,
    current_user: dict = Depends(require_admin)
):
    """
    Export accounting journal (Enterprise only)
    Format compatible with most French accounting software
    """
    await verify_export_access(current_user)
    
    # Get factures in date range
    factures = await db.factures.find({
        "entreprise_id": current_user["entreprise_id"],
        "statut": {"$in": ["emise", "payee"]},
        "created_at": {"$gte": date_debut, "$lte": date_fin}
    }, {"_id": 0}).sort("created_at", 1).to_list(10000)
    
    # Prepare CSV (French accounting format)
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    
    # Header (FEC-like format)
    writer.writerow([
        "JournalCode",
        "JournalLib",
        "EcritureNum",
        "EcritureDate",
        "CompteNum",
        "CompteLib",
        "CompAuxNum",
        "CompAuxLib",
        "PieceRef",
        "PieceDate",
        "EcritureLib",
        "Debit",
        "Credit",
        "EcritureLet",
        "DateLet",
        "ValidDate",
        "Montantdevise",
        "Idevise"
    ])
    
    ecr_num = 1
    for facture in factures:
        client = await db.clients.find_one({"id": facture.get("client_id")}, {"_id": 0, "nom": 1})
        client_nom = client.get("nom", "Client") if client else "Client"
        
        date_facture = facture.get("created_at", "")[:10].replace("-", "")
        
        # Écriture client (Débit 411)
        writer.writerow([
            "VE",  # Journal Ventes
            "Ventes",
            str(ecr_num).zfill(6),
            date_facture,
            "411000",  # Compte clients
            "Clients",
            facture.get("client_id", "")[:8],
            client_nom,
            facture.get("numero_facture", ""),
            date_facture,
            f"Facture {facture.get('numero_facture', '')} - {client_nom}",
            f"{facture.get('total_ttc', 0):.2f}",
            "",
            "",
            "",
            date_facture,
            "",
            "EUR"
        ])
        
        # Écriture produit (Crédit 706)
        writer.writerow([
            "VE",
            "Ventes",
            str(ecr_num).zfill(6),
            date_facture,
            "706000",  # Prestations de services
            "Prestations de services",
            "",
            "",
            facture.get("numero_facture", ""),
            date_facture,
            f"Facture {facture.get('numero_facture', '')}",
            "",
            f"{facture.get('total_ht', 0):.2f}",
            "",
            "",
            date_facture,
            "",
            "EUR"
        ])
        
        # Écriture TVA (Crédit 44571)
        if facture.get("total_tva", 0) > 0:
            writer.writerow([
                "VE",
                "Ventes",
                str(ecr_num).zfill(6),
                date_facture,
                "445710",  # TVA collectée
                "TVA collectée",
                "",
                "",
                facture.get("numero_facture", ""),
                date_facture,
                f"TVA Facture {facture.get('numero_facture', '')}",
                "",
                f"{facture.get('total_tva', 0):.2f}",
                "",
                "",
                date_facture,
                "",
                "EUR"
            ])
        
        ecr_num += 1
    
    output.seek(0)
    
    filename = f"journal_comptable_{date_debut[:7]}_{date_fin[:7]}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/summary")
async def get_export_summary(
    date_debut: str,
    date_fin: str,
    current_user: dict = Depends(require_admin)
):
    """Get summary of data available for export (Enterprise only)"""
    await verify_export_access(current_user)
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "created_at": {"$gte": date_debut, "$lte": date_fin}
    }
    
    # Count various documents
    factures_count = await db.factures.count_documents(query)
    factures_payees = await db.factures.count_documents({**query, "statut": "payee"})
    devis_count = await db.devis.count_documents(query)
    interventions_count = await db.interventions.count_documents(query)
    
    # Sum totals
    factures = await db.factures.find(query, {"total_ht": 1, "total_ttc": 1}).to_list(10000)
    total_ht = sum(f.get("total_ht", 0) for f in factures)
    total_ttc = sum(f.get("total_ttc", 0) for f in factures)
    
    return {
        "periode": {"debut": date_debut, "fin": date_fin},
        "factures": {
            "total": factures_count,
            "payees": factures_payees,
            "montant_ht": round(total_ht, 2),
            "montant_ttc": round(total_ttc, 2)
        },
        "devis": devis_count,
        "interventions": interventions_count,
        "exports_disponibles": [
            {"endpoint": "/export/factures", "description": "Export factures (entêtes)"},
            {"endpoint": "/export/factures-lignes", "description": "Export lignes de facture"},
            {"endpoint": "/export/clients", "description": "Export liste clients"},
            {"endpoint": "/export/journal", "description": "Journal comptable (format FEC)"}
        ]
    }
