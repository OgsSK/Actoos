# 📘 CAHIER DE TEXTE — ÉVOLUTION ACTOOS PRO

**Objectif :** Faire passer Actoos Pro d'une solution fonctionnelle à une plateforme capable de rivaliser avec ServiceTitan et de dépasser Synchroteam/Organilog, tout en adoptant une tarification par utilisateur plus lisible et plus rentable.

---

## 1. FEUILLE DE ROUTE DES FONCTIONNALITÉS À AJOUTER

### 🔴 Phase 1 — Fondations critiques (MVP compétitif)

**Durée estimée :** 6-8 semaines  
**But :** Couvrir les besoins quotidiens indispensables des TPE/PME du bâtiment.

| # | Fonctionnalité | Description simple | Status |
|---|----------------|-------------------|--------|
| 1 | **Mode hors-ligne complet** | L'application mobile (PWA) fonctionne entièrement sans réseau : consultation du planning, saisie de rapport, photos, signature. Synchronisation automatique dès le retour du réseau. | ⬜ À faire |
| 2 | **Dispatch board temps réel** | Tableau de bord web où le dispatcheur voit en direct les interventions en cours, les retards, les techniciens disponibles. Glisser-déposer pour réassigner une mission, notification immédiate au technicien. | ⬜ À faire |
| 3 | **Carte avec position des techniciens** | Vue cartographique en temps réel de la localisation de chaque technicien sur le terrain (via le GPS du téléphone). | ⬜ À faire |
| 4 | **Devis multi-options (Good/Better/Best)** | Possibilité pour le technicien de proposer trois niveaux de prestation (économique, standard, premium) avec des prix et des contenus différents. | ⬜ À faire |
| 5 | **Pricebook (catalogue de prix)** | Base de données interne des services et pièces avec prix d'achat, prix de vente, marge. Le technicien navigue et sélectionne les articles pour les ajouter au devis ou à la facture. | ⬜ À faire |
| 6 | **Rappels RDV par email + SMS** | Envoi automatique d'un rappel la veille et/ou le matin même de l'intervention, par email et SMS, pour réduire les absences. | ⬜ À faire |
| 7 | **Paiement CB en ligne** | Envoi par email ou SMS d'un lien de paiement sécurisé (Stripe Checkout) pour régler une facture ou un acompte à distance. | ⬜ À faire |
| 8 | **Portail client** | Espace personnel sécurisé pour le client final : voir l'historique des interventions, les factures, prendre rendez-vous en ligne, signer un devis. | ⬜ À faire |
| 9 | **Dashboard analytics de base** | Page d'accueil avec les indicateurs clés : chiffre d'affaires du jour/de la semaine, nombre d'interventions, taux de transformation des devis, retard moyen. | ⬜ À faire |
| 10 | **Authentification 2FA** | Double authentification (code TOTP) pour sécuriser l'accès des utilisateurs, en natif via Supabase Auth. | ⬜ À faire |

---

### 🟡 Phase 2 — Avantage concurrentiel

**Durée estimée :** 2-3 mois après la Phase 1  
**But :** Apporter des fonctions que la concurrence n'a pas ou peu.

| # | Fonctionnalité | Description simple | Status |
|---|----------------|-------------------|--------|
| 11 | **Optimisation des tournées** | Algorithme simple qui réorganise l'ordre des interventions pour minimiser les kilomètres et le temps de trajet, en tenant compte des créneaux et des compétences. | ⬜ À faire |
| 12 | **Temps de trajet estimé** | Calcul automatique du temps de route entre deux interventions, affiché sur le planning et communiqué au client. | ⬜ À faire |
| 13 | **Paiement CB sur place (Tap to Pay)** | Le technicien peut encaisser directement avec son téléphone (sans terminal physique) grâce à Stripe Terminal SDK ou un équivalent. | ⬜ À faire |
| 14 | **Relances devis automatiques** | Envoi automatique de relances par email/SMS quand un devis n'a pas été signé après X jours. | ⬜ À faire |
| 15 | **Historique équipements client** | Fiche client enrichie avec la liste de tous ses équipements (marque, modèle, date de pose, numéro de série), pour suivi et maintenance. | ⬜ À faire |
| 16 | **Alertes maintenance préventive** | Notifications automatiques quand l'entretien périodique d'un équipement arrive à échéance (ex. chaudière). | ⬜ À faire |
| 17 | **Demande d'avis Google automatique** | Après une intervention terminée et payée, envoi automatique d'un SMS au client l'invitant à laisser un avis Google. | ⬜ À faire |
| 18 | **Intégration Zapier** | Exposition d'une API publique documentée pour connecter Actoos Pro à des centaines d'autres applications (comptabilité, CRM, emailing) sans développement spécifique. | ⬜ À faire |
| 19 | **Commissions techniciens** | Calcul automatique des commissions dues à chaque technicien en fonction des interventions réalisées, des ventes additionnelles, avec rapport intégré. | ⬜ À faire |

---

### 🟢 Phase 3 — Revenus récurrents & montée en gamme

**Durée estimée :** 3-4 mois après la Phase 2  
**But :** Permettre aux artisans de générer des revenus récurrents et de professionnaliser leur gestion.

| # | Fonctionnalité | Description simple | Status |
|---|----------------|-------------------|--------|
| 20 | **Contrats de maintenance** | Création de contrats d'entretien pour les clients, avec planning des visites, alertes, et facturation automatique. | ⬜ À faire |
| 21 | **Facturation récurrente (Stripe Billing)** | Prélèvement automatique mensuel/annuel pour les contrats, avec génération automatique des factures correspondantes. | ⬜ À faire |
| 22 | **Abonnements clients** | Gestion des abonnements (ex. contrat entretien chaudière à 15 €/mois), suivi des paiements, résiliation. | ⬜ À faire |
| 23 | **Gestion des stocks avancée** | Suivi des pièces détachées par entrepôt et par véhicule, alertes de réapprovisionnement, commandes fournisseurs, inventaire. | ⬜ À faire |
| 24 | **Financing (paiement fractionné)** | Intégration d'une solution de paiement en 3x ou 4x (type Alma/Klarna) pour faciliter la signature de gros travaux. | ⬜ À faire |

---

## 2. NOUVELLE GRILLE TARIFAIRE (PAR UTILISATEUR)

**Principe :** Chaque personne disposant d'un compte (technicien sur le terrain ou administrateur au bureau) est facturée au même tarif mensuel.  
**Formule :** Facture mensuelle = nombre d'utilisateurs × prix unitaire du plan choisi.

| Plan | Cible | Prix / utilisateur / mois (HT) | Engagement |
|------|-------|-------------------------------|------------|
| **Starter** | Indépendant (1 utilisateur) | **0 €** | Aucun |
| **Pro** | TPE (2 à 10 utilisateurs) | **25 €** | Mensuel ou annuel (-15 %) |
| **Business** | PME (11 à 50 utilisateurs) | **39 €** | Mensuel ou annuel (-15 %) |
| **Enterprise** | Grands comptes (50+) | **Sur devis** | Annuel |

---

## 📋 Limites et fonctionnalités par plan

| Fonctionnalité | Starter | Pro | Business | Enterprise |
|----------------|---------|-----|----------|------------|
| Utilisateurs max | 1 | 50 | Illimité | Illimité |
| Clients actifs | 5 | Illimité | Illimité | Illimité |
| Interventions | 10/mois | Illimité | Illimité | Illimité |
| Planning de base | ✅ | ✅ | ✅ | ✅ |
| Devis & factures simples | ✅ | ✅ | ✅ | ✅ |
| Mode hors-ligne complet | ❌ | ✅ | ✅ | ✅ |
| Dispatch board temps réel | ❌ | ✅ | ✅ | ✅ |
| Carte avec position techniciens | ❌ | ✅ | ✅ | ✅ |
| Devis multi-options | ❌ | ✅ | ✅ | ✅ |
| Pricebook | ❌ | ✅ | ✅ | ✅ |
| Rappels RDV email + SMS | ❌ | 25 SMS/mois/utilisateur | 100 SMS/mois/utilisateur | 500 SMS/mois/utilisateur |
| Paiement CB en ligne | ❌ | ✅ | ✅ | ✅ |
| Portail client | ❌ | ✅ | ✅ | ✅ |
| Dashboard analytics de base | ❌ | ✅ | ✅ | ✅ |
| Authentification 2FA | ❌ | ✅ | ✅ | ✅ |
| Optimisation des tournées | ❌ | ❌ | ✅ | ✅ |
| Temps de trajet estimé | ❌ | ❌ | ✅ | ✅ |
| Paiement CB sur place | ❌ | ❌ | ✅ | ✅ |
| Relances devis auto | ❌ | ❌ | ✅ | ✅ |
| Historique équipements client | ❌ | ❌ | ✅ | ✅ |
| Alertes maintenance préventive | ❌ | ❌ | ✅ | ✅ |
| Demandes d'avis Google auto | ❌ | ❌ | ✅ | ✅ |
| Intégration Zapier | ❌ | ❌ | ✅ | ✅ |
| Commissions techniciens | ❌ | ❌ | ✅ | ✅ |
| Gestion des stocks | ❌ | ❌ | ❌ | ✅ |
| Contrats de maintenance | ❌ | ❌ | ❌ | ✅ |
| Facturation récurrente | ❌ | ❌ | ❌ | ✅ |
| Financing (paiement fractionné) | ❌ | ❌ | ❌ | ✅ |
| API personnalisée & SSO | ❌ | ❌ | ❌ | ✅ |
| Marque blanche | ❌ | ❌ | ❌ | ✅ |
| Support | Communauté | Email | Chat + Téléphone | Dédié |

---

## 🔢 Exemples de facture mensuelle (HT)

| Entreprise type | Plan choisi | Utilisateurs | Calcul | Mensualité |
|-----------------|-------------|--------------|--------|------------|
| Plombier solo | Starter | 1 (lui-même) | 1 × 0 € | **0 €** |
| Plombier + 1 apprenti | Pro | 2 | 2 × 25 € | **50 €** |
| PME 5 techniciens + 1 admin | Pro | 6 | 6 × 25 € | **150 €** |
| PME 12 techniciens + 2 admin | Business | 14 | 14 × 39 € | **546 €** |
| Grosse structure 60+ | Enterprise | 60 | Sur devis | **~2 500 € et +** |

---

## 3. COMPARAISON AVEC LA GRILLE ACTUELLE

| Élément | Grille actuelle | Nouvelle grille |
|---------|-----------------|-----------------|
| Unité de facturation | Forfait avec techniciens inclus + supplément | Par utilisateur standard |
| Plan de base | 19,99 €/mois pour 3 techniciens | 0 € pour 1 utilisateur (Starter) |
| Plan Pro | 49,99 €/mois pour 10 techniciens | 25 €/utilisateur/mois |
| Plan Business | 89,99 €/mois pour tech illimités | 39 €/utilisateur/mois |
| Mode hors-ligne | Pro et supérieur | Pro et supérieur |
| Portail client | Aucun | Pro et supérieur |
| Optimisation tournées | Smart Planning (Pro) | Business et supérieur |
| Gestion stocks | Aucune | Enterprise |

**Conséquence :** La nouvelle grille est plus simple, plus compétitive et mieux adaptée aux petites équipes qui ne veulent pas payer pour des fonctionnalités inutilisées. Elle génère également plus de revenus avec la croissance des clients.

---

## 4. PROCHAINES ÉTAPES

### Étape 0 : Stabilisation (PRIORITÉ ABSOLUE)
- [ ] Corriger tous les bugs actuels
- [ ] Documenter le schéma Supabase complet
- [ ] Créer des tests automatisés

### Étape 1 : Phase 1 - Fondations
- [ ] Implémenter les 10 fonctionnalités critiques
- [ ] Activer les plans Pro et Business

### Étape 2 : Mise à jour tarifaire
- [ ] Intégrer la nouvelle grille dans le code (`subscription_service.py`, `plan_limits.py`, vitrine)
- [ ] Mettre à jour la documentation commerciale

### Étape 3 : Communication
- [ ] Communiquer auprès des premiers utilisateurs sur la roadmap et les nouveaux tarifs

---

**Document créé le 10 Mai 2026**  
**Version 1.0**
