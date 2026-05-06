"""
Shared dependencies and helpers for all routers
PostgreSQL (Supabase) primary - MongoDB fallback optional

This module provides:
- Database connection (PostgreSQL or MongoDB)
- MongoDB-compatible interface for PostgreSQL
- Helper functions for serialization, logging, etc.
"""
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import uuid
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== DATABASE CONFIGURATION ====================

DATABASE_URL = os.environ.get('DATABASE_URL', '')
MONGO_URL = os.environ.get('MONGO_URL', '')

# Determine database mode
USE_POSTGRES = bool(DATABASE_URL)
USE_MONGO = bool(MONGO_URL) and not USE_POSTGRES

logger.info(f"Database mode: {'PostgreSQL' if USE_POSTGRES else 'MongoDB' if USE_MONGO else 'NONE'}")

# ==================== POSTGRESQL (SUPABASE) ====================

pg_engine = None
pg_session_factory = None

if USE_POSTGRES:
    try:
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        from sqlalchemy import text
        
        pg_url = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://").replace("postgresql://", "postgresql+asyncpg://")
        
        # Disable prepared statement cache for pgbouncer/Supabase Transaction Pooler compatibility
        pg_engine = create_async_engine(
            pg_url,
            echo=False,
            pool_size=20,
            max_overflow=30,
            pool_timeout=30,
            pool_recycle=1800,
            pool_pre_ping=True,
            connect_args={
                "statement_cache_size": 0,
                "prepared_statement_cache_size": 0,
            }
        )
        
        pg_session_factory = async_sessionmaker(
            pg_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        logger.info("PostgreSQL engine created successfully")
    except Exception as e:
        logger.error(f"Failed to create PostgreSQL engine: {e}")
        USE_POSTGRES = False

# ==================== MONGODB (FALLBACK) ====================

mongo_client = None
mongo_db = None

if USE_MONGO:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_client = AsyncIOMotorClient(MONGO_URL)
        mongo_db = mongo_client[os.environ.get('DB_NAME', 'actoos')]
        logger.info("MongoDB client created successfully")
    except Exception as e:
        logger.error(f"Failed to create MongoDB client: {e}")
        USE_MONGO = False

# ==================== SESSION HELPER ====================

@asynccontextmanager
async def get_pg_session():
    """Get PostgreSQL session with automatic cleanup"""
    if not pg_session_factory:
        raise RuntimeError("PostgreSQL not configured")
    
    session = pg_session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

# ==================== MONGODB-COMPATIBLE POSTGRESQL INTERFACE ====================

class PostgreSQLCollection:
    """MongoDB-compatible interface for a PostgreSQL table"""
    
    def __init__(self, table_name: str):
        self.table_name = table_name
        self._pg_available = USE_POSTGRES and pg_session_factory is not None
    
    def _convert_filter_to_sql(self, filter_dict: Dict) -> tuple:
        """Convert MongoDB filter to SQL WHERE clause"""
        conditions = []
        params = {}
        
        for key, value in filter_dict.items():
            if key == "$or":
                or_conditions = []
                for i, cond in enumerate(value):
                    for k, v in cond.items():
                        param_name = f"or_{i}_{k}"
                        or_conditions.append(f"{k} = :{param_name}")
                        params[param_name] = v
                if or_conditions:
                    conditions.append(f"({' OR '.join(or_conditions)})")
            elif key == "$and":
                and_conditions = []
                for i, cond in enumerate(value):
                    for k, v in cond.items():
                        param_name = f"and_{i}_{k}"
                        and_conditions.append(f"{k} = :{param_name}")
                        params[param_name] = v
                if and_conditions:
                    conditions.append(f"({' AND '.join(and_conditions)})")
            elif isinstance(value, dict):
                for op, val in value.items():
                    if op == "$lt":
                        conditions.append(f"{key} < :{key}_lt")
                        params[f"{key}_lt"] = val
                    elif op == "$lte":
                        conditions.append(f"{key} <= :{key}_lte")
                        params[f"{key}_lte"] = val
                    elif op == "$gt":
                        conditions.append(f"{key} > :{key}_gt")
                        params[f"{key}_gt"] = val
                    elif op == "$gte":
                        conditions.append(f"{key} >= :{key}_gte")
                        params[f"{key}_gte"] = val
                    elif op == "$ne":
                        conditions.append(f"{key} != :{key}_ne")
                        params[f"{key}_ne"] = val
                    elif op == "$in":
                        conditions.append(f"{key} = ANY(:{key}_in)")
                        params[f"{key}_in"] = val
                    elif op == "$regex":
                        conditions.append(f"{key} ILIKE :{key}_regex")
                        params[f"{key}_regex"] = f"%{val}%"
            else:
                conditions.append(f"{key} = :{key}")
                params[key] = value
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        return where_clause, params
    
    def _row_to_dict(self, row) -> Dict:
        """Convert SQLAlchemy row to dict"""
        if row is None:
            return None
        result = dict(row._mapping)
        for key, value in result.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            elif key == 'id' and hasattr(value, 'hex'):
                result[key] = str(value)
        return result
    
    async def find_one(self, filter_dict: Dict = None, projection: Dict = None) -> Optional[Dict]:
        """Find a single document"""
        if not self._pg_available:
            if USE_MONGO:
                doc = await mongo_db[self.table_name].find_one(filter_dict, projection)
                if doc and '_id' in doc:
                    del doc['_id']
                return doc
            return None
        
        filter_dict = filter_dict or {}
        where_clause, params = self._convert_filter_to_sql(filter_dict)
        query = f"SELECT * FROM {self.table_name} WHERE {where_clause} LIMIT 1"
        
        try:
            async with get_pg_session() as session:
                from sqlalchemy import text
                result = await session.execute(text(query), params)
                row = result.fetchone()
                return self._row_to_dict(row) if row else None
        except Exception as e:
            logger.error(f"PostgreSQL find_one error on {self.table_name}: {e}")
            return None
    
    def find(self, filter_dict: Dict = None, projection: Dict = None):
        """Return a cursor-like object"""
        return PostgreSQLCursor(self.table_name, filter_dict, projection, self._pg_available, self)
    
    async def insert_one(self, document: Dict):
        """Insert a single document"""
        if "id" not in document:
            document["id"] = str(uuid.uuid4())
        if "created_at" not in document:
            document["created_at"] = datetime.now(timezone.utc).isoformat()
        
        if not self._pg_available:
            if USE_MONGO:
                await mongo_db[self.table_name].insert_one(document)
                return type('InsertResult', (), {'inserted_id': document["id"]})()
            raise RuntimeError("No database configured")
        
        doc = {k: v for k, v in document.items() if v is not None and k != "_id"}
        for key in list(doc.keys()):
            if isinstance(doc[key], (list, dict)):
                doc[key] = json.dumps(doc[key])
        
        columns = ", ".join(doc.keys())
        placeholders = ", ".join([f":{k}" for k in doc.keys()])
        query = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"
        
        try:
            async with get_pg_session() as session:
                from sqlalchemy import text
                await session.execute(text(query), doc)
            return type('InsertResult', (), {'inserted_id': document["id"]})()
        except Exception as e:
            logger.error(f"PostgreSQL insert_one error on {self.table_name}: {e}")
            raise
    
    async def update_one(self, filter_dict: Dict, update: Dict, upsert: bool = False):
        """Update a single document"""
        if not self._pg_available:
            if USE_MONGO:
                result = await mongo_db[self.table_name].update_one(filter_dict, update, upsert=upsert)
                return type('UpdateResult', (), {'modified_count': result.modified_count, 'matched_count': result.matched_count})()
            raise RuntimeError("No database configured")
        
        where_clause, where_params = self._convert_filter_to_sql(filter_dict)
        set_data = update.get("$set", update)
        set_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        for key in list(set_data.keys()):
            if isinstance(set_data[key], (list, dict)):
                set_data[key] = json.dumps(set_data[key])
        
        set_clause = ", ".join([f"{k} = :set_{k}" for k in set_data.keys()])
        set_params = {f"set_{k}": v for k, v in set_data.items()}
        
        query = f"UPDATE {self.table_name} SET {set_clause} WHERE {where_clause}"
        all_params = {**where_params, **set_params}
        
        try:
            async with get_pg_session() as session:
                from sqlalchemy import text
                result = await session.execute(text(query), all_params)
                return type('UpdateResult', (), {'modified_count': result.rowcount, 'matched_count': result.rowcount})()
        except Exception as e:
            logger.error(f"PostgreSQL update_one error on {self.table_name}: {e}")
            raise
    
    async def delete_one(self, filter_dict: Dict):
        """Delete a single document"""
        if not self._pg_available:
            if USE_MONGO:
                result = await mongo_db[self.table_name].delete_one(filter_dict)
                return type('DeleteResult', (), {'deleted_count': result.deleted_count})()
            raise RuntimeError("No database configured")
        
        where_clause, params = self._convert_filter_to_sql(filter_dict)
        query = f"DELETE FROM {self.table_name} WHERE {where_clause}"
        
        try:
            async with get_pg_session() as session:
                from sqlalchemy import text
                result = await session.execute(text(query), params)
                return type('DeleteResult', (), {'deleted_count': result.rowcount})()
        except Exception as e:
            logger.error(f"PostgreSQL delete_one error on {self.table_name}: {e}")
            raise
    
    async def delete_many(self, filter_dict: Dict):
        """Delete multiple documents"""
        return await self.delete_one(filter_dict)  # Same logic, just no LIMIT
    
    async def count_documents(self, filter_dict: Dict = None) -> int:
        """Count documents"""
        if not self._pg_available:
            if USE_MONGO:
                return await mongo_db[self.table_name].count_documents(filter_dict or {})
            return 0
        
        filter_dict = filter_dict or {}
        where_clause, params = self._convert_filter_to_sql(filter_dict)
        query = f"SELECT COUNT(*) as cnt FROM {self.table_name} WHERE {where_clause}"
        
        try:
            async with get_pg_session() as session:
                from sqlalchemy import text
                result = await session.execute(text(query), params)
                row = result.fetchone()
                return row.cnt if row else 0
        except Exception as e:
            logger.error(f"PostgreSQL count_documents error on {self.table_name}: {e}")
            return 0
    
    async def create_index(self, *args, **kwargs):
        """No-op for PostgreSQL"""
        pass
    
    async def aggregate(self, pipeline: List[Dict]):
        """Simple aggregation - returns cursor"""
        return PostgreSQLCursor(self.table_name, {}, None, self._pg_available, self)


class PostgreSQLCursor:
    """MongoDB cursor-like interface"""
    
    def __init__(self, table_name: str, filter_dict: Dict, projection: Dict, pg_available: bool, collection):
        self.table_name = table_name
        self.filter_dict = filter_dict or {}
        self.projection = projection
        self._pg_available = pg_available
        self._collection = collection
        self._sort = []
        self._skip = 0
        self._limit_val = None
    
    def sort(self, key_or_list, direction=None):
        if isinstance(key_or_list, list):
            self._sort = key_or_list
        else:
            self._sort = [(key_or_list, direction or 1)]
        return self
    
    def skip(self, count: int):
        self._skip = count
        return self
    
    def limit(self, count: int):
        self._limit_val = count
        return self
    
    async def to_list(self, length: int = None) -> List[Dict]:
        if length:
            self._limit_val = length
        
        if not self._pg_available:
            if USE_MONGO:
                cursor = mongo_db[self.table_name].find(self.filter_dict, self.projection)
                if self._sort:
                    cursor = cursor.sort(self._sort)
                if self._skip:
                    cursor = cursor.skip(self._skip)
                if self._limit_val:
                    cursor = cursor.limit(self._limit_val)
                docs = await cursor.to_list(self._limit_val or 1000)
                for doc in docs:
                    if '_id' in doc:
                        del doc['_id']
                return docs
            return []
        
        where_clause, params = self._collection._convert_filter_to_sql(self.filter_dict)
        query = f"SELECT * FROM {self.table_name} WHERE {where_clause}"
        
        if self._sort:
            order_parts = []
            for field, direction in self._sort:
                order_parts.append(f"{field} {'DESC' if direction == -1 else 'ASC'}")
            query += f" ORDER BY {', '.join(order_parts)}"
        
        if self._limit_val:
            query += f" LIMIT {self._limit_val}"
        if self._skip:
            query += f" OFFSET {self._skip}"
        
        try:
            async with get_pg_session() as session:
                from sqlalchemy import text
                result = await session.execute(text(query), params)
                return [self._collection._row_to_dict(row) for row in result.fetchall()]
        except Exception as e:
            logger.error(f"PostgreSQL cursor error on {self.table_name}: {e}")
            return []


class CompatibleDatabase:
    """MongoDB-compatible database interface using PostgreSQL"""
    
    def __init__(self):
        self._collections = {}
    
    def __getattr__(self, name):
        if name.startswith('_'):
            return super().__getattribute__(name)
        if name not in self._collections:
            self._collections[name] = PostgreSQLCollection(name)
        return self._collections[name]
    
    async def command(self, cmd: str, *args, **kwargs):
        if cmd == "ping":
            if USE_POSTGRES:
                async with get_pg_session() as session:
                    from sqlalchemy import text
                    await session.execute(text("SELECT 1"))
                return {"ok": 1}
            elif USE_MONGO:
                return await mongo_db.command(cmd, *args, **kwargs)
        raise NotImplementedError(f"Command {cmd} not supported")


# Create the db instance - compatible interface
db = CompatibleDatabase()

# ==================== HELPER FUNCTIONS ====================

def serialize_datetime(obj):
    """Convert datetime to ISO string"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_doc(doc: dict) -> dict:
    """Serialize document, converting datetimes and removing _id"""
    if doc is None:
        return None
    if '_id' in doc:
        del doc['_id']
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif key in ('telephone', 'contact_telephone') and isinstance(value, (int, float)):
            doc[key] = str(int(value))
    return doc

def calculate_totals(lignes: list) -> tuple:
    """Calculate total_ht, total_tva, total_ttc from lines"""
    total_ht = sum(l.get('quantite', 1) * l.get('prix_unitaire', 0) for l in lignes)
    total_tva = sum(l.get('quantite', 1) * l.get('prix_unitaire', 0) * l.get('tva', 20) / 100 for l in lignes)
    total_ttc = total_ht + total_tva
    return round(total_ht, 2), round(total_tva, 2), round(total_ttc, 2)

async def log_action(entreprise_id: str, user_id: str = None, action: str = None, 
                     entity: str = None, entity_id: str = None, details: dict = None):
    """Log an audit action"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "entreprise_id": entreprise_id,
        "user_id": user_id,
        "action": action,
        "entity_type": entity,
        "entity_id": entity_id,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log_entry)

def get_db():
    """Get database instance"""
    return db
