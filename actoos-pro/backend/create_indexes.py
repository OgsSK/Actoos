"""
MongoDB Index Creation Script for Actoos

This script creates indexes to optimize query performance.
Run this script once during deployment or as a startup task.
"""
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'actoos')


async def safe_create_index(collection, keys, **kwargs):
    """Create index, ignoring if it already exists with different options or has data issues"""
    try:
        return await collection.create_index(keys, **kwargs)
    except Exception as e:
        error_str = str(e)
        if any(x in error_str for x in ["IndexKeySpecsConflict", "IndexOptionsConflict", "DuplicateKey", "duplicate key"]):
            logger.warning(f"Index issue for {collection.name}, skipping: {keys} - {error_str[:100]}")
            return None
        raise


async def create_indexes():
    """Create MongoDB indexes for optimal query performance"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    logger.info("Creating MongoDB indexes...")
    
    # ==================== USERS ====================
    await safe_create_index(db.users, [("entreprise_id", 1)])
    await safe_create_index(db.users, [("email", 1)], unique=True)
    await safe_create_index(db.users, [("id", 1)], unique=True)
    await safe_create_index(db.users, [("entreprise_id", 1), ("role", 1)])
    logger.info("✓ Users indexes created")
    
    # ==================== ENTREPRISES ====================
    await safe_create_index(db.entreprises, [("id", 1)], unique=True)
    await safe_create_index(db.entreprises, [("stripe_customer_id", 1)], sparse=True)
    await safe_create_index(db.entreprises, [("subscription.status", 1)])
    logger.info("✓ Entreprises indexes created")
    
    # ==================== CLIENTS ====================
    await safe_create_index(db.clients, [("entreprise_id", 1)])
    await safe_create_index(db.clients, [("id", 1)], unique=True)
    await safe_create_index(db.clients, [("entreprise_id", 1), ("email", 1)])
    await safe_create_index(db.clients, [("entreprise_id", 1), ("nom", 1)])
    await safe_create_index(db.clients, [("portal_token", 1)], sparse=True)
    logger.info("✓ Clients indexes created")
    
    # ==================== INTERVENTIONS ====================
    await safe_create_index(db.interventions, [("entreprise_id", 1)])
    await safe_create_index(db.interventions, [("id", 1)], unique=True)
    await safe_create_index(db.interventions, [("entreprise_id", 1), ("statut", 1)])
    await safe_create_index(db.interventions, [("entreprise_id", 1), ("date_prevue", 1)])
    await safe_create_index(db.interventions, [("entreprise_id", 1), ("technicien_id", 1)])
    await safe_create_index(db.interventions, [("entreprise_id", 1), ("client_id", 1)])
    # Compound index for today's interventions query
    await safe_create_index(db.interventions, [
        ("entreprise_id", 1), 
        ("date_prevue", 1), 
        ("statut", 1)
    ])
    # Index for technician's interventions
    await safe_create_index(db.interventions, [
        ("entreprise_id", 1), 
        ("technicien_id", 1), 
        ("date_prevue", 1)
    ])
    logger.info("✓ Interventions indexes created")
    
    # ==================== DEVIS ====================
    await safe_create_index(db.devis, [("entreprise_id", 1)])
    await safe_create_index(db.devis, [("id", 1)], unique=True)
    await safe_create_index(db.devis, [("entreprise_id", 1), ("statut", 1)])
    await safe_create_index(db.devis, [("entreprise_id", 1), ("client_id", 1)])
    await safe_create_index(db.devis, [("entreprise_id", 1), ("created_at", -1)])
    await safe_create_index(db.devis, [("token_client", 1)], sparse=True)
    await safe_create_index(db.devis, [("numero_devis", 1)])
    logger.info("✓ Devis indexes created")
    
    # ==================== FACTURES ====================
    await safe_create_index(db.factures, [("entreprise_id", 1)])
    await safe_create_index(db.factures, [("id", 1)], unique=True)
    await safe_create_index(db.factures, [("entreprise_id", 1), ("statut", 1)])
    await safe_create_index(db.factures, [("entreprise_id", 1), ("paye", 1)])
    await safe_create_index(db.factures, [("entreprise_id", 1), ("client_id", 1)])
    await safe_create_index(db.factures, [("entreprise_id", 1), ("created_at", -1)])
    await safe_create_index(db.factures, [("token_client", 1)], sparse=True)
    await safe_create_index(db.factures, [("numero_facture", 1)])
    # Compound index for unpaid invoices
    await safe_create_index(db.factures, [
        ("entreprise_id", 1), 
        ("paye", 1), 
        ("statut", 1),
        ("date_echeance", 1)
    ])
    logger.info("✓ Factures indexes created")
    
    # ==================== CATEGORIES ====================
    await safe_create_index(db.categories, [("entreprise_id", 1)])
    await safe_create_index(db.categories, [("id", 1)], unique=True)
    logger.info("✓ Categories indexes created")
    
    # ==================== PUSH SUBSCRIPTIONS ====================
    await safe_create_index(db.push_subscriptions, [("user_id", 1)])
    await safe_create_index(db.push_subscriptions, [("entreprise_id", 1)])
    await safe_create_index(db.push_subscriptions, [("endpoint", 1)], unique=True)
    logger.info("✓ Push subscriptions indexes created")
    
    # ==================== AUDIT LOG ====================
    await safe_create_index(db.audit_log, [("entreprise_id", 1), ("created_at", -1)])
    await safe_create_index(db.audit_log, [("user_id", 1)])
    await safe_create_index(db.audit_log, [("entity_type", 1), ("entity_id", 1)])
    logger.info("✓ Audit log indexes created")
    
    # ==================== COMMUNICATION LOG ====================
    await safe_create_index(db.communication_log, [("entreprise_id", 1)])
    await safe_create_index(db.communication_log, [("client_id", 1)])
    await safe_create_index(db.communication_log, [("entreprise_id", 1), ("created_at", -1)])
    logger.info("✓ Communication log indexes created")
    
    # ==================== SITES ====================
    await safe_create_index(db.sites, [("entreprise_id", 1)])
    await safe_create_index(db.sites, [("client_id", 1)])
    await safe_create_index(db.sites, [("id", 1)], unique=True)
    logger.info("✓ Sites indexes created")
    
    # ==================== WEBHOOKS ====================
    await safe_create_index(db.webhooks, [("entreprise_id", 1)])
    await safe_create_index(db.webhooks, [("id", 1)], unique=True)
    logger.info("✓ Webhooks indexes created")
    
    # ==================== API KEYS ====================
    await safe_create_index(db.api_keys, [("entreprise_id", 1)])
    await safe_create_index(db.api_keys, [("key_hash", 1)], unique=True)
    logger.info("✓ API keys indexes created")
    
    logger.info("✅ All MongoDB indexes created successfully!")
    
    # List all indexes for verification
    logger.info("\n=== INDEX SUMMARY ===")
    collections = ["users", "entreprises", "clients", "interventions", "devis", "factures", "categories"]
    for coll_name in collections:
        indexes = await db[coll_name].index_information()
        logger.info(f"\n{coll_name}: {len(indexes)} indexes")
        for idx_name, idx_info in indexes.items():
            logger.info(f"  - {idx_name}: {idx_info.get('key')}")


if __name__ == "__main__":
    asyncio.run(create_indexes())
