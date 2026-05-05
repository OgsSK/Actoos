# 🔍 AUDIT MONGODB - ACTOOS PRO
## Date: 5 Mai 2026

---

## 📊 Résumé Général

| Métrique | Valeur |
|----------|--------|
| Collections | 30 |
| Documents totaux | 1,158 |
| Entreprises | 7 |
| Utilisateurs | 15 |
| Clients | 17 |
| Interventions | 32 |
| Devis | 17 |
| Factures | 7 |

---

## 📁 Collections par Catégorie

### 🏢 Core Business (Multi-tenant)
| Collection | Documents | Description |
|------------|-----------|-------------|
| entreprises | 7 | Entreprises clientes (tenants) |
| users | 15 | Utilisateurs (admins + techniciens) |
| clients | 17 | Clients des entreprises |
| categories | 13 | Catégories d'intervention |
| sites | 0 | Sites/adresses récurrentes |

### 📋 Opérations
| Collection | Documents | Description |
|------------|-----------|-------------|
| interventions | 32 | Interventions terrain |
| devis | 17 | Devis clients |
| factures | 7 | Factures |
| invoice_payments | 10 | Paiements partiels |
| payment_transactions | 29 | Transactions Stripe |
| photos | 0 | Photos d'intervention |

### 🔐 Sécurité & Auth
| Collection | Documents | Description |
|------------|-----------|-------------|
| password_reset_tokens | 3 | Tokens reset mot de passe |
| password_reset_requests | 14 | Requêtes reset (rate limiting) |
| oauth_states | 3 | États OAuth Google |
| api_keys | 6 | Clés API publiques |
| tech_invites | 7 | Invitations techniciens SMS |

### 📊 Analytics & Logs
| Collection | Documents | Description |
|------------|-----------|-------------|
| audit_logs | 954 | Logs d'audit |
| communication_log | 0 | Logs communications |
| notifications | 3 | Notifications push |
| chat_messages | 4 | Messages chat |

### 💳 Billing
| Collection | Documents | Description |
|------------|-----------|-------------|
| coupons | 4 | Codes promo |
| applied_coupons | 3 | Coupons appliqués |
| cancellation_feedback | 4 | Feedback annulation |

### 🔧 Système
| Collection | Documents | Description |
|------------|-----------|-------------|
| webhooks | 1 | Webhooks configurés |
| gdpr_deletions | 1 | Demandes RGPD |
| import_history | 1 | Historique imports |
| super_admin_communications | 3 | Communications admin |
| push_subscriptions | 0 | Abonnements push |

---

## 🔗 Diagramme des Relations

```
                    ┌─────────────────┐
                    │   ENTREPRISES   │
                    │     (tenant)    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐        ┌──────────┐        ┌───────────┐
    │  USERS  │        │ CLIENTS  │        │CATEGORIES │
    │(admins/ │        │          │        │           │
    │technici)│        │          │        │           │
    └────┬────┘        └────┬─────┘        └─────┬─────┘
         │                  │                    │
         │    ┌─────────────┼────────────────────┘
         │    │             │
         ▼    ▼             ▼
    ┌─────────────────────────────┐
    │       INTERVENTIONS         │
    │  (technicien_id, client_id, │
    │      categorie_id)          │
    └──────────────┬──────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    ┌─────────┐         ┌──────────┐
    │  DEVIS  │─────────│ FACTURES │
    │         │         │          │
    └─────────┘         └────┬─────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │INVOICE_PAYMENTS │
                    │(paiements part.)│
                    └─────────────────┘
```

---

## 🔑 Index Existants

### users
- `email_1` (unique)
- `entreprise_id_1`
- `entreprise_id_1_role_1`

### entreprises
- `stripe_customer_id_1`
- `subscription.status_1`

### interventions
- `entreprise_id_1_date_prevue_1`
- `entreprise_id_1_statut_1`
- `entreprise_id_1_technicien_id_1`
- `entreprise_id_1_client_id_1`
- `entreprise_id_1_date_prevue_1_statut_1`

### clients
- `entreprise_id_1_email_1`
- `entreprise_id_1_nom_1`
- `portal_token_1`

---

## ⚠️ Points d'Attention pour Migration

### 1. Champs JSONB (arrays/objects)
- `entreprises.plan_limits` → JSONB
- `interventions.photos` → JSONB ou table séparée
- `devis.lignes` → Table `devis_lignes` ou JSONB
- `factures.lignes` → Table `factures_lignes` ou JSONB

### 2. Multi-tenancy
- Toutes les tables principales ont `entreprise_id`
- Row Level Security (RLS) recommandé en PostgreSQL

### 3. Données sensibles
- `users.password_hash` → Restera hashé
- `devis.signature_client` → Base64 (peut être large)

### 4. Séquences
- `entreprises.sequence_devis` → Utiliser séquence PostgreSQL par tenant
- `entreprises.sequence_facture` → Idem

---

## 📈 Recommandations

### Court terme (garder MongoDB)
✅ L'application fonctionne bien avec MongoDB
✅ Volume de données faible (~1000 docs)
✅ Pas de requêtes SQL complexes nécessaires

### Migration PostgreSQL - Quand ?
Recommandé si :
- Volume > 100K documents
- Besoin de requêtes SQL complexes (reporting)
- Transactions ACID critiques
- Intégration avec outils BI (Metabase, etc.)

### Pour ACTOOS ONE (nouveau projet)
✅ Démarrer directement sur PostgreSQL
✅ Schéma relationnel propre dès le départ
✅ Partage possible de certaines tables (entreprises, users)

---

## 📅 Plan de Migration (si décidé)

### Phase 1 : Préparation (1 semaine)
- [ ] Créer schéma PostgreSQL
- [ ] Scripts de migration des données
- [ ] Tests en environnement de staging

### Phase 2 : Migration (1-2 jours)
- [ ] Mode maintenance
- [ ] Export MongoDB → Import PostgreSQL
- [ ] Vérification des données

### Phase 3 : Basculement (1 jour)
- [ ] Mise à jour des variables d'environnement
- [ ] Déploiement nouvelle version backend
- [ ] Tests de non-régression

### Phase 4 : Post-migration (1 semaine)
- [ ] Monitoring performances
- [ ] Optimisation requêtes
- [ ] Suppression code MongoDB
