"""
Routers package for modular API endpoints
"""
from . import (
    auth, users, technicians, clients, categories, 
    push, analytics, communications, entreprise, 
    search, stats, statements, interventions, devis,
    factures, portal, sms, subscription, photos, rapports, audit, public_api,
    import_data, scheduled_tasks, sites, calendar, accounting_export,
    admin_analytics, gdpr, offline_sync, super_admin, settings,
    integrations, dashboard, chat, two_factor, demo
)

__all__ = [
    'auth', 'users', 'technicians', 'clients', 'categories',
    'push', 'analytics', 'communications', 'entreprise',
    'search', 'stats', 'statements', 'interventions', 'devis',
    'factures', 'portal', 'sms', 'subscription', 'photos', 'rapports', 'audit', 'public_api',
    'import_data', 'scheduled_tasks', 'sites', 'calendar', 'accounting_export',
    'admin_analytics', 'gdpr', 'offline_sync', 'super_admin', 'settings',
    'integrations', 'dashboard', 'chat', 'two_factor', 'demo'
]
