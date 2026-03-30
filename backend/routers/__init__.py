"""
Routers package for modular API endpoints
"""
from . import (
    auth, users, technicians, clients, categories, 
    push, analytics, communications, entreprise, 
    search, stats
)

__all__ = [
    'auth', 'users', 'technicians', 'clients', 'categories',
    'push', 'analytics', 'communications', 'entreprise',
    'search', 'stats'
]
