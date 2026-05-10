"""
PostgreSQL Direct Access Layer for ACTOOS PRO
High-performance database operations without MongoDB compatibility overhead
"""
import os
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL', '')

# Initialize SQLAlchemy
engine = None
if DATABASE_URL:
    try:
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        from sqlalchemy import text
        
        pg_url = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://").replace("postgresql://", "postgresql+asyncpg://")
        
        engine = create_async_engine(
            pg_url,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=300,
            pool_pre_ping=True,
            connect_args={
                "statement_cache_size": 0,
                "prepared_statement_cache_size": 0,
            }
        )
        logger.info("PostgreSQL engine initialized")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL: {e}")


def _serialize_value(value):
    """Serialize value for PostgreSQL"""
    if isinstance(value, (list, dict)):
        return json.dumps(value)
    return value


def _deserialize_row(row) -> Dict:
    """Convert SQLAlchemy row to dict with proper types"""
    if row is None:
        return None
    
    result = dict(row._mapping)
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


class PostgresDB:
    """Direct PostgreSQL database operations"""
    
    # ==================== GENERIC OPERATIONS ====================
    
    @staticmethod
    async def find_one(table: str, filters: Dict, columns: str = "*") -> Optional[Dict]:
        """Find single record"""
        if not engine:
            return None
        
        conditions = []
        params = {}
        for key, value in filters.items():
            conditions.append(f"{key} = :{key}")
            params[key] = value
        
        where = " AND ".join(conditions) if conditions else "1=1"
        query = f"SELECT {columns} FROM {table} WHERE {where} LIMIT 1"
        
        async with engine.begin() as conn:
            result = await conn.execute(text(query), params)
            row = result.fetchone()
            return _deserialize_row(row)
    
    @staticmethod
    async def find_many(table: str, filters: Dict = None, columns: str = "*", 
                        order_by: str = None, limit: int = 1000) -> List[Dict]:
        """Find multiple records"""
        if not engine:
            return []
        
        conditions = []
        params = {}
        if filters:
            for key, value in filters.items():
                conditions.append(f"{key} = :{key}")
                params[key] = value
        
        where = " AND ".join(conditions) if conditions else "1=1"
        query = f"SELECT {columns} FROM {table} WHERE {where}"
        
        if order_by:
            query += f" ORDER BY {order_by}"
        query += f" LIMIT {limit}"
        
        async with engine.begin() as conn:
            result = await conn.execute(text(query), params)
            return [_deserialize_row(row) for row in result.fetchall()]
    
    @staticmethod
    async def insert(table: str, data: Dict) -> str:
        """Insert record and return ID"""
        if not engine:
            raise RuntimeError("Database not configured")
        
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
        if "created_at" not in data:
            data["created_at"] = datetime.now(timezone.utc)
        if "updated_at" not in data:
            data["updated_at"] = datetime.now(timezone.utc)
        
        # Serialize complex types
        serialized = {k: _serialize_value(v) for k, v in data.items() if v is not None}
        
        columns = ", ".join(serialized.keys())
        placeholders = ", ".join([f":{k}" for k in serialized.keys()])
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        
        async with engine.begin() as conn:
            await conn.execute(text(query), serialized)
        
        return data["id"]
    
    @staticmethod
    async def update(table: str, filters: Dict, data: Dict) -> int:
        """Update records and return count"""
        if not engine:
            raise RuntimeError("Database not configured")
        
        data["updated_at"] = datetime.now(timezone.utc)
        
        # Build SET clause
        set_parts = []
        params = {}
        for key, value in data.items():
            set_parts.append(f"{key} = :set_{key}")
            params[f"set_{key}"] = _serialize_value(value)
        
        # Build WHERE clause
        where_parts = []
        for key, value in filters.items():
            where_parts.append(f"{key} = :where_{key}")
            params[f"where_{key}"] = value
        
        query = f"UPDATE {table} SET {', '.join(set_parts)} WHERE {' AND '.join(where_parts)}"
        
        async with engine.begin() as conn:
            result = await conn.execute(text(query), params)
            return result.rowcount
    
    @staticmethod
    async def delete(table: str, filters: Dict) -> int:
        """Delete records and return count"""
        if not engine:
            raise RuntimeError("Database not configured")
        
        conditions = []
        params = {}
        for key, value in filters.items():
            conditions.append(f"{key} = :{key}")
            params[key] = value
        
        where = " AND ".join(conditions)
        query = f"DELETE FROM {table} WHERE {where}"
        
        async with engine.begin() as conn:
            result = await conn.execute(text(query), params)
            return result.rowcount
    
    @staticmethod
    async def count(table: str, filters: Dict = None) -> int:
        """Count records"""
        if not engine:
            return 0
        
        conditions = []
        params = {}
        if filters:
            for key, value in filters.items():
                conditions.append(f"{key} = :{key}")
                params[key] = value
        
        where = " AND ".join(conditions) if conditions else "1=1"
        query = f"SELECT COUNT(*) as cnt FROM {table} WHERE {where}"
        
        async with engine.begin() as conn:
            result = await conn.execute(text(query), params)
            row = result.fetchone()
            return row.cnt if row else 0
    
    @staticmethod
    async def execute(query: str, params: Dict = None) -> Any:
        """Execute raw SQL query"""
        if not engine:
            raise RuntimeError("Database not configured")
        
        async with engine.begin() as conn:
            result = await conn.execute(text(query), params or {})
            return result
    
    @staticmethod
    async def fetch_all(query: str, params: Dict = None) -> List[Dict]:
        """Execute query and fetch all results"""
        if not engine:
            return []
        
        async with engine.begin() as conn:
            result = await conn.execute(text(query), params or {})
            return [_deserialize_row(row) for row in result.fetchall()]
    
    @staticmethod
    async def fetch_one(query: str, params: Dict = None) -> Optional[Dict]:
        """Execute query and fetch one result"""
        if not engine:
            return None
        
        async with engine.begin() as conn:
            result = await conn.execute(text(query), params or {})
            row = result.fetchone()
            return _deserialize_row(row)
    
    # ==================== SPECIALIZED QUERIES ====================
    
    @staticmethod
    async def get_user_with_entreprise(email: str) -> Optional[Dict]:
        """Get user with entreprise info in single query"""
        query = """
        SELECT 
            u.id, u.email, u.password_hash, u.nom, u.prenom, u.role, u.statut,
            u.entreprise_id, u.telephone, u.two_factor_enabled, u.created_at,
            e.nom as entreprise_nom, e.plan, e.subscription_status, e.email as entreprise_email
        FROM users u
        JOIN entreprises e ON u.entreprise_id = e.id
        WHERE u.email = :email
        LIMIT 1
        """
        return await PostgresDB.fetch_one(query, {"email": email.lower()})
    
    @staticmethod
    async def get_interventions_with_details(entreprise_id: str, filters: Dict = None) -> List[Dict]:
        """Get interventions with client and technician names"""
        query = """
        SELECT 
            i.*,
            c.nom as client_nom, c.prenom as client_prenom,
            u.nom as technicien_nom, u.prenom as technicien_prenom
        FROM interventions i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN users u ON i.technicien_id = u.id
        WHERE i.entreprise_id = :entreprise_id
        """
        params = {"entreprise_id": entreprise_id}
        
        if filters:
            if "statut" in filters:
                query += " AND i.statut = :statut"
                params["statut"] = filters["statut"]
            if "technicien_id" in filters:
                query += " AND i.technicien_id = :technicien_id"
                params["technicien_id"] = filters["technicien_id"]
        
        query += " ORDER BY i.date_prevue DESC LIMIT 1000"
        
        return await PostgresDB.fetch_all(query, params)
    
    @staticmethod
    async def get_dashboard_stats(entreprise_id: str) -> Dict:
        """Get dashboard statistics in single query"""
        query = """
        SELECT
            (SELECT COUNT(*) FROM interventions WHERE entreprise_id = :ent_id) as total_interventions,
            (SELECT COUNT(*) FROM interventions WHERE entreprise_id = :ent_id AND statut = 'planifiee') as interventions_planifiees,
            (SELECT COUNT(*) FROM interventions WHERE entreprise_id = :ent_id AND statut = 'en_cours') as interventions_en_cours,
            (SELECT COUNT(*) FROM interventions WHERE entreprise_id = :ent_id AND statut = 'terminee') as interventions_terminees,
            (SELECT COUNT(*) FROM clients WHERE entreprise_id = :ent_id) as total_clients,
            (SELECT COUNT(*) FROM users WHERE entreprise_id = :ent_id AND role = 'technicien') as total_techniciens,
            (SELECT COUNT(*) FROM devis WHERE entreprise_id = :ent_id) as total_devis,
            (SELECT COUNT(*) FROM factures WHERE entreprise_id = :ent_id) as total_factures,
            (SELECT COALESCE(SUM(total_ttc), 0) FROM factures WHERE entreprise_id = :ent_id AND statut = 'payee') as ca_total
        """
        return await PostgresDB.fetch_one(query, {"ent_id": entreprise_id})


# Export singleton
pg = PostgresDB()
