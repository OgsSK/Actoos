"""
Routers package for modular API endpoints
"""
from . import (
    auth, users, technicians, clients, categories, 
    push, analytics, communications, entreprise, 
    search, stats, statements, interventions, devis,
    factures, portal, sms, subscription, photos, rapports, audit, public_api,
    import_data, scheduled_tasks
)

__all__ = [
    'auth', 'users', 'technicians', 'clients', 'categories',
    'push', 'analytics', 'communications', 'entreprise',
    'search', 'stats', 'statements', 'interventions', 'devis',
    'factures', 'portal', 'sms', 'subscription', 'photos', 'rapports', 'audit', 'public_api',
    'import_data', 'scheduled_tasks'
]
