"""
Shared dependencies and helpers for all routers
"""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize communication logging
import communication_log
communication_log.set_db(db)

# ==================== HELPERS ====================
def serialize_datetime(obj):
    """Convert datetime to ISO string"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document, converting datetimes and removing _id"""
    if doc is None:
        return None
    if '_id' in doc:
        del doc['_id']
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

def calculate_totals(lignes: list) -> tuple:
    """Calculate total_ht, total_tva, total_ttc from lines"""
    total_ht = sum(l.get('quantite', 1) * l.get('prix_unitaire', 0) for l in lignes)
    total_tva = sum(l.get('quantite', 1) * l.get('prix_unitaire', 0) * l.get('tva', 20) / 100 for l in lignes)
    total_ttc = total_ht + total_tva
    return round(total_ht, 2), round(total_tva, 2), round(total_ttc, 2)

async def log_action(entreprise_id: str, user_id: str, action: str, entity: str, entity_id: str, details: dict = None):
    """Log an audit action"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "entreprise_id": entreprise_id,
        "user_id": user_id,
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log_entry)

def get_db():
    """Get database instance"""
    return db
