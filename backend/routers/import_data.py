"""
Mass Data Import Router - CSV/Excel with Dynamic Column Mapping
Supports: Clients, Devis, Factures, Interventions
"""
import os
import io
import uuid
import logging
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field

from dependencies import db, serialize_doc, calculate_totals
from auth import get_current_user

router = APIRouter(prefix="/import", tags=["Data Import"])
logger = logging.getLogger(__name__)

# =====================================================
# MODELS
# =====================================================

class ColumnMapping(BaseModel):
    source_column: str  # Column name in uploaded file
    target_field: str   # Field in our system
    transform: Optional[str] = None  # Optional transformation

class ImportConfig(BaseModel):
    entity_type: str  # clients, interventions, devis, factures
    mappings: List[ColumnMapping]
    skip_header: bool = True
    date_format: str = "%d/%m/%Y"
    decimal_separator: str = ","

class ImportPreview(BaseModel):
    total_rows: int
    valid_rows: int
    error_rows: int
    sample_data: List[Dict]
    errors: List[Dict]
    columns: List[str]

class ImportResult(BaseModel):
    success: bool
    imported_count: int
    error_count: int
    errors: List[Dict]

# =====================================================
# FIELD DEFINITIONS FOR EACH ENTITY
# =====================================================

ENTITY_FIELDS = {
    "clients": {
        "required": ["nom"],
        "optional": ["prenom", "email", "telephone", "adresse", "code_postal", "ville", "pays", "type", "siret", "tva_intra", "notes"],
        "defaults": {
            "type": "particulier",
            "pays": "France"
        }
    },
    "interventions": {
        "required": ["titre", "client_id"],
        "optional": ["description", "date_debut", "date_fin", "adresse", "statut", "priorite", "categorie_id", "technicien_id", "notes"],
        "defaults": {
            "statut": "planifiee",
            "priorite": "normale"
        }
    },
    "devis": {
        "required": ["client_id"],
        "optional": ["objet", "lignes", "validite_jours", "conditions", "notes"],
        "defaults": {
            "validite_jours": 30,
            "statut": "brouillon"
        }
    },
    "factures": {
        "required": ["client_id"],
        "optional": ["objet", "lignes", "echeance_jours", "conditions_paiement", "notes"],
        "defaults": {
            "echeance_jours": 30,
            "statut": "brouillon"
        }
    }
}

# Suggested mappings for common CSV headers
SUGGESTED_MAPPINGS = {
    "clients": {
        "nom": ["nom", "name", "client_name", "raison_sociale", "société", "company"],
        "prenom": ["prenom", "firstname", "first_name", "prénom"],
        "email": ["email", "mail", "e-mail", "courriel"],
        "telephone": ["telephone", "tel", "phone", "mobile", "portable", "téléphone"],
        "adresse": ["adresse", "address", "rue", "street"],
        "code_postal": ["code_postal", "cp", "zip", "postal_code", "code postal"],
        "ville": ["ville", "city", "commune"],
        "siret": ["siret", "siren", "numero_siret"],
        "tva_intra": ["tva", "tva_intra", "vat", "numero_tva"]
    },
    "interventions": {
        "titre": ["titre", "title", "objet", "subject", "description"],
        "date_debut": ["date", "date_debut", "start_date", "date_intervention"],
        "adresse": ["adresse", "address", "lieu", "location"],
        "priorite": ["priorite", "priority", "urgence"],
        "notes": ["notes", "commentaire", "remarks", "observations"]
    }
}


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def parse_file(file_content: bytes, filename: str) -> pd.DataFrame:
    """Parse CSV or Excel file into DataFrame"""
    try:
        if filename.endswith('.csv'):
            # Try different encodings
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise ValueError("Unable to decode CSV file")
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise ValueError("Unsupported file format. Use CSV or Excel.")
        
        # Clean column names
        df.columns = df.columns.str.strip().str.lower()
        return df
    except Exception as e:
        logger.error(f"Error parsing file: {str(e)}")
        raise ValueError(f"Error parsing file: {str(e)}")


def suggest_mappings(columns: List[str], entity_type: str) -> Dict[str, str]:
    """Suggest column mappings based on common header names"""
    suggestions = {}
    mappings = SUGGESTED_MAPPINGS.get(entity_type, {})
    
    for col in columns:
        col_lower = col.lower().strip()
        for target_field, possible_names in mappings.items():
            if col_lower in [n.lower() for n in possible_names]:
                suggestions[col] = target_field
                break
    
    return suggestions


def transform_value(value: Any, transform: Optional[str], date_format: str) -> Any:
    """Apply transformation to a value"""
    if pd.isna(value) or value == '':
        return None
    
    if transform == "date":
        try:
            if isinstance(value, datetime):
                return value.isoformat()
            return datetime.strptime(str(value), date_format).isoformat()
        except:
            return None
    elif transform == "float":
        try:
            if isinstance(value, str):
                value = value.replace(',', '.').replace(' ', '')
            return float(value)
        except:
            return None
    elif transform == "int":
        try:
            return int(float(value))
        except:
            return None
    elif transform == "bool":
        return str(value).lower() in ['true', '1', 'oui', 'yes', 'x']
    elif transform == "upper":
        return str(value).upper()
    elif transform == "lower":
        return str(value).lower()
    elif transform == "trim":
        return str(value).strip()
    
    return value


async def validate_row(row_data: Dict, entity_type: str, entreprise_id: str) -> tuple[bool, List[str]]:
    """Validate a row against entity requirements"""
    errors = []
    fields = ENTITY_FIELDS.get(entity_type, {})
    
    # Check required fields
    for field in fields.get("required", []):
        if field not in row_data or row_data[field] is None or row_data[field] == '':
            errors.append(f"Champ requis manquant: {field}")
    
    # Validate foreign keys
    if entity_type in ["interventions", "devis", "factures"] and "client_id" in row_data:
        client = await db.clients.find_one({
            "id": row_data["client_id"],
            "entreprise_id": entreprise_id
        })
        if not client:
            # Try to find by name
            client = await db.clients.find_one({
                "nom": {"$regex": f"^{row_data['client_id']}$", "$options": "i"},
                "entreprise_id": entreprise_id
            })
            if client:
                row_data["client_id"] = client["id"]
            else:
                errors.append(f"Client non trouvé: {row_data['client_id']}")
    
    return len(errors) == 0, errors


# =====================================================
# ENDPOINTS
# =====================================================

@router.post("/upload")
async def upload_file_for_preview(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a file and get a preview with suggested column mappings
    """
    if entity_type not in ENTITY_FIELDS:
        raise HTTPException(status_code=400, detail=f"Type d'entité invalide: {entity_type}")
    
    # Read file
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB)")
    
    try:
        df = parse_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Get columns and suggest mappings
    columns = df.columns.tolist()
    suggested = suggest_mappings(columns, entity_type)
    
    # Get sample data (first 5 rows)
    sample = df.head(5).fillna('').to_dict(orient='records')
    
    # Get required and optional fields for this entity
    entity_fields = ENTITY_FIELDS[entity_type]
    
    return {
        "filename": file.filename,
        "total_rows": len(df),
        "columns": columns,
        "suggested_mappings": suggested,
        "sample_data": sample,
        "entity_fields": {
            "required": entity_fields["required"],
            "optional": entity_fields["optional"]
        }
    }


@router.post("/preview")
async def preview_import(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    mappings_json: str = Form(...),  # JSON string of mappings
    date_format: str = Form("%d/%m/%Y"),
    current_user: dict = Depends(get_current_user)
):
    """
    Preview import with applied mappings - shows what will be imported
    """
    import json
    
    try:
        mappings = json.loads(mappings_json)
    except:
        raise HTTPException(status_code=400, detail="Format de mapping invalide")
    
    content = await file.read()
    df = parse_file(content, file.filename)
    
    valid_rows = []
    error_rows = []
    
    for idx, row in df.iterrows():
        row_data = {}
        row_errors = []
        
        # Apply mappings
        for mapping in mappings:
            source_col = mapping.get("source_column", "").lower()
            target_field = mapping.get("target_field")
            transform = mapping.get("transform")
            
            if source_col in df.columns:
                value = row[source_col]
                row_data[target_field] = transform_value(value, transform, date_format)
        
        # Validate
        is_valid, errors = await validate_row(row_data, entity_type, current_user["entreprise_id"])
        
        if is_valid:
            valid_rows.append({"row": idx + 2, "data": row_data})
        else:
            error_rows.append({"row": idx + 2, "data": row_data, "errors": errors})
    
    return {
        "total_rows": len(df),
        "valid_rows": len(valid_rows),
        "error_rows": len(error_rows),
        "preview_valid": valid_rows[:10],
        "preview_errors": error_rows[:10],
        "ready_to_import": len(error_rows) == 0
    }


@router.post("/execute")
async def execute_import(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    mappings_json: str = Form(...),
    date_format: str = Form("%d/%m/%Y"),
    skip_errors: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    """
    Execute the import - create records in database
    """
    import json
    from currency_utils import get_exchange_rate
    
    try:
        mappings = json.loads(mappings_json)
    except:
        raise HTTPException(status_code=400, detail="Format de mapping invalide")
    
    content = await file.read()
    df = parse_file(content, file.filename)
    
    entreprise_id = current_user["entreprise_id"]
    entreprise = await db.entreprises.find_one({"id": entreprise_id}, {"_id": 0})
    devise = entreprise.get("devise", "EUR")
    taux_change = get_exchange_rate(devise, "EUR")
    
    imported = []
    errors = []
    
    # Get sequences for devis/factures
    seq_devis = entreprise.get("sequence_devis", 1)
    seq_facture = entreprise.get("sequence_facture", 1)
    year = datetime.now().year
    
    for idx, row in df.iterrows():
        row_data = {}
        
        # Apply mappings
        for mapping in mappings:
            source_col = mapping.get("source_column", "").lower()
            target_field = mapping.get("target_field")
            transform = mapping.get("transform")
            
            if source_col in df.columns:
                value = row[source_col]
                row_data[target_field] = transform_value(value, transform, date_format)
        
        # Validate
        is_valid, row_errors = await validate_row(row_data, entity_type, entreprise_id)
        
        if not is_valid:
            if skip_errors:
                errors.append({"row": idx + 2, "errors": row_errors})
                continue
            else:
                errors.append({"row": idx + 2, "errors": row_errors})
                continue
        
        try:
            # Create record based on entity type
            if entity_type == "clients":
                record = {
                    "id": str(uuid.uuid4()),
                    "entreprise_id": entreprise_id,
                    **ENTITY_FIELDS["clients"]["defaults"],
                    **row_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "import_source": "csv_import"
                }
                await db.clients.insert_one(record)
                imported.append({"id": record["id"], "nom": record.get("nom")})
                
            elif entity_type == "interventions":
                record = {
                    "id": str(uuid.uuid4()),
                    "entreprise_id": entreprise_id,
                    **ENTITY_FIELDS["interventions"]["defaults"],
                    **row_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "import_source": "csv_import"
                }
                await db.interventions.insert_one(record)
                imported.append({"id": record["id"], "titre": record.get("titre")})
                
            elif entity_type == "devis":
                numero = f"D{year}-{seq_devis:05d}"
                seq_devis += 1
                
                # Handle lignes if provided
                lignes = row_data.pop("lignes", [])
                if isinstance(lignes, str):
                    try:
                        lignes = json.loads(lignes)
                    except:
                        lignes = []
                
                total_ht, total_tva, total_ttc = calculate_totals(lignes) if lignes else (0, 0, 0)
                
                record = {
                    "id": str(uuid.uuid4()),
                    "entreprise_id": entreprise_id,
                    "numero_devis": numero,
                    "lignes": lignes,
                    "total_ht": total_ht,
                    "total_tva": total_tva,
                    "total_ttc": total_ttc,
                    "devise": devise,
                    "taux_change_eur": taux_change,
                    "token_client": str(uuid.uuid4()),
                    **ENTITY_FIELDS["devis"]["defaults"],
                    **row_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "date_expiration": (datetime.now(timezone.utc) + timedelta(days=row_data.get("validite_jours", 30))).isoformat(),
                    "import_source": "csv_import"
                }
                await db.devis.insert_one(record)
                imported.append({"id": record["id"], "numero": numero})
                
            elif entity_type == "factures":
                numero = f"F{year}-{seq_facture:05d}"
                seq_facture += 1
                
                lignes = row_data.pop("lignes", [])
                if isinstance(lignes, str):
                    try:
                        lignes = json.loads(lignes)
                    except:
                        lignes = []
                
                total_ht, total_tva, total_ttc = calculate_totals(lignes) if lignes else (0, 0, 0)
                
                record = {
                    "id": str(uuid.uuid4()),
                    "entreprise_id": entreprise_id,
                    "numero_facture": numero,
                    "lignes": lignes,
                    "total_ht": total_ht,
                    "total_tva": total_tva,
                    "total_ttc": total_ttc,
                    "devise": devise,
                    "taux_change_eur": taux_change,
                    "montant_paye": 0,
                    **ENTITY_FIELDS["factures"]["defaults"],
                    **row_data,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "date_echeance": (datetime.now(timezone.utc) + timedelta(days=row_data.get("echeance_jours", 30))).isoformat(),
                    "import_source": "csv_import"
                }
                await db.factures.insert_one(record)
                imported.append({"id": record["id"], "numero": numero})
                
        except Exception as e:
            errors.append({"row": idx + 2, "errors": [str(e)]})
    
    # Update sequences
    if entity_type == "devis":
        await db.entreprises.update_one(
            {"id": entreprise_id},
            {"$set": {"sequence_devis": seq_devis}}
        )
    elif entity_type == "factures":
        await db.entreprises.update_one(
            {"id": entreprise_id},
            {"$set": {"sequence_facture": seq_facture}}
        )
    
    logger.info(f"Import completed: {len(imported)} {entity_type} imported, {len(errors)} errors")
    
    return {
        "success": True,
        "imported_count": len(imported),
        "error_count": len(errors),
        "imported": imported[:50],  # First 50 for response size
        "errors": errors[:50]
    }


@router.get("/templates/{entity_type}")
async def get_import_template(
    entity_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a CSV template for the specified entity type
    """
    if entity_type not in ENTITY_FIELDS:
        raise HTTPException(status_code=400, detail=f"Type d'entité invalide: {entity_type}")
    
    fields = ENTITY_FIELDS[entity_type]
    all_fields = fields["required"] + fields["optional"]
    
    # Create template with headers and example row
    examples = {
        "clients": {
            "nom": "Dupont",
            "prenom": "Jean",
            "email": "jean.dupont@example.com",
            "telephone": "0612345678",
            "adresse": "123 Rue Example",
            "code_postal": "75001",
            "ville": "Paris",
            "pays": "France",
            "type": "particulier",
            "siret": "",
            "tva_intra": "",
            "notes": "Client fidèle"
        },
        "interventions": {
            "titre": "Dépannage plomberie",
            "client_id": "ID_CLIENT ou NOM_CLIENT",
            "description": "Fuite sous évier",
            "date_debut": "15/05/2026",
            "date_fin": "15/05/2026",
            "adresse": "123 Rue Example, 75001 Paris",
            "statut": "planifiee",
            "priorite": "normale",
            "categorie_id": "",
            "technicien_id": "",
            "notes": ""
        },
        "devis": {
            "client_id": "ID_CLIENT ou NOM_CLIENT",
            "objet": "Devis travaux plomberie",
            "validite_jours": "30",
            "conditions": "Paiement à réception",
            "notes": ""
        },
        "factures": {
            "client_id": "ID_CLIENT ou NOM_CLIENT",
            "objet": "Facture travaux plomberie",
            "echeance_jours": "30",
            "conditions_paiement": "Paiement à réception",
            "notes": ""
        }
    }
    
    template_data = {field: examples.get(entity_type, {}).get(field, "") for field in all_fields}
    
    return {
        "entity_type": entity_type,
        "headers": all_fields,
        "required_fields": fields["required"],
        "optional_fields": fields["optional"],
        "example_row": template_data,
        "csv_template": ",".join(all_fields) + "\n" + ",".join([str(template_data.get(f, "")) for f in all_fields])
    }
