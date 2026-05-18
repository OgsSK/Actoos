# ACTOOS PRO - Schéma Supabase Complet

**Document de référence - Ne pas modifier sans mettre à jour le code**

---

## 📋 Tables et Colonnes

### `entreprises`
| Colonne | Type |
|---------|------|
| id | uuid |
| nom | varchar |
| email | varchar |
| telephone | varchar |
| adresse | varchar |
| ville | varchar |
| code_postal | varchar |
| siret | varchar |
| tva_intra | varchar |
| logo_url | text |
| couleur_primaire | varchar |
| plan | varchar |
| plan_limits | jsonb |
| stripe_customer_id | varchar |
| stripe_subscription_id | varchar |
| subscription_status | varchar |
| trial_ends_at | timestamp |
| sequence_devis | integer |
| sequence_facture | integer |
| payment_settings | jsonb |
| is_demo | boolean |
| demo_last_reset | timestamp |
| demo_session_count | integer |
| discount_type | varchar |
| discount_value | numeric |
| discount_expires_at | timestamp |
| created_at | timestamp |
| updated_at | timestamp |
| sms_config | jsonb |
| integrations_config | jsonb |
| messaging_preference | varchar |
| devise | varchar |
| conditions_generales | text |
| mentions_devis | text |
| mentions_facture | text |
| footer_devis | text |
| footer_facture | text |
| couleur_principale | varchar |
| numero_tva | varchar |
| iban | varchar |
| bic | varchar |
| message_client_devis | text |
| message_client_facture | text |
| validite_devis_jours | integer |
| devis_footer | text |
| facture_footer | text |
| conditions_paiement | text |
| delai_paiement_jours | integer |
| mentions_legales | text |
| prefixe_devis | varchar |
| prefixe_facture | varchar |
| max_users | integer |
| max_interventions | integer |
| max_clients | integer |

---

### `users`
| Colonne | Type |
|---------|------|
| id | uuid (FK → auth.users) |
| entreprise_id | uuid (FK → entreprises) |
| email | varchar |
| password_hash | varchar |
| nom | varchar |
| prenom | varchar |
| telephone | varchar |
| role | varchar (`admin`, `tech`, `manager`, `super_admin`) |
| statut | varchar |
| skills | jsonb |
| specialites | jsonb |
| two_factor_enabled | boolean |
| two_factor_secret | varchar |
| derniere_connexion | timestamp |
| created_at | timestamp |
| updated_at | timestamp |
| push_subscription | jsonb |

---

### `clients`
| Colonne | Type |
|---------|------|
| id | uuid |
| entreprise_id | uuid |
| nom | varchar |
| prenom | varchar |
| email | varchar |
| telephone | varchar |
| adresse | text |
| ville | varchar |
| code_postal | varchar |
| type_client | enum |
| notes | text |
| portal_token | uuid |
| tags | jsonb |
| created_at | timestamp |
| updated_at | timestamp |
| statut | varchar |

---

### `interventions`
| Colonne | Type | ⚠️ Attention |
|---------|------|--------------|
| id | uuid | |
| entreprise_id | uuid | |
| client_id | uuid | |
| technicien_id | uuid | |
| categorie_id | uuid | ⚠️ Pas `category_id` |
| site_id | uuid | |
| titre | varchar | |
| description | text | |
| adresse | text | |
| ville | varchar | |
| code_postal | varchar | |
| date_prevue | date | ⚠️ Pas `date_intervention` |
| heure_debut | time | |
| duree_estimee | integer | |
| statut | varchar | `planifie`, `accepte`, `en_cours`, `termine`, `annule` |
| priorite | varchar | |
| notes_internes | text | |
| notes_technicien | text | ⚠️ Pas `notes_terrain` |
| rapport | text | |
| photos | jsonb | |
| checklist_completed | jsonb | |
| signature_client | text | ⚠️ Pas `signature` |
| nom_signataire | varchar | ⚠️ Pas `signature_nom` |
| date_signature | timestamp | ⚠️ Pas `signature_date` |
| date_debut_reelle | timestamp | |
| date_fin_reelle | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | |
| created_by | uuid | |

---

### `photos`
| Colonne | Type |
|---------|------|
| id | uuid |
| intervention_id | uuid |
| url | text |
| type_photo | varchar (`avant`, `pendant`, `apres`, `autre`) |
| description | text |
| created_at | timestamp |

---

### `devis`
| Colonne | Type |
|---------|------|
| id | uuid |
| entreprise_id | uuid |
| client_id | uuid |
| intervention_id | uuid |
| technicien_id | uuid |
| numero_devis | varchar |
| statut | enum (`brouillon`, `envoye`, `signe`, `refuse`, `expire`, `facture`) |
| total_ht | numeric |
| total_tva | numeric |
| total_ttc | numeric |
| lignes | jsonb |
| conditions | text |
| message_client | text |
| validite_jours | integer |
| date_expiration | timestamp |
| token_client | uuid |
| signature_client | text |
| nom_signataire | varchar |
| date_signature | timestamp |
| created_at | timestamp |
| updated_at | timestamp |
| date_validite | timestamp |
| montant_total | numeric |
| numero | varchar |
| date_echeance | date |

---

### `devis_lignes`
| Colonne | Type |
|---------|------|
| id | uuid |
| devis_id | uuid |
| description | text |
| quantite | numeric |
| prix_unitaire | numeric |
| tva | numeric |

---

### `factures`
| Colonne | Type |
|---------|------|
| id | uuid |
| entreprise_id | uuid |
| client_id | uuid |
| devis_id | uuid |
| intervention_id | uuid |
| technicien_id | uuid |
| numero_facture | varchar |
| statut | varchar |
| total_ht | numeric |
| total_tva | numeric |
| total_ttc | numeric |
| montant_paye | numeric |
| lignes | jsonb |
| conditions_paiement | text |
| echeance_jours | integer |
| date_echeance | date |
| date_paiement | timestamp |
| mode_paiement | varchar |
| token_client | uuid |
| created_at | timestamp |
| updated_at | timestamp |
| paye | boolean |
| montant_total | numeric |
| numero | varchar |
| notes | text |
| date_emission | date |

---

### `facture_lignes`
| Colonne | Type |
|---------|------|
| id | uuid |
| facture_id | uuid |
| description | text |
| quantite | numeric |
| prix_unitaire | numeric |
| tva | numeric |
| montant_ht | numeric |
| montant_ttc | numeric |
| ordre | integer |
| created_at | timestamp |

---

### `categories`
| Colonne | Type |
|---------|------|
| id | uuid |
| entreprise_id | uuid |
| nom | varchar |
| description | text |
| couleur | varchar |
| icone | varchar |
| checklist | jsonb |
| created_at | timestamp |

---

## ⚠️ Points d'attention pour le code

1. **Interventions** :
   - Utiliser `date_prevue` (pas `date_intervention`)
   - Utiliser `notes_technicien` (pas `notes_terrain`)
   - Utiliser `categorie_id` (pas `category_id`)

2. **Photos** :
   - Pas de colonne `entreprise_id`
   - Pas de colonne `uploaded_by`
   - Pas de colonne `devis_id`

3. **Devis** :
   - `numero_devis` est le bon nom
   - Les colonnes de signature existent : `signature_client`, `nom_signataire`, `date_signature`

---

**Dernière mise à jour : 10 Mai 2026**
